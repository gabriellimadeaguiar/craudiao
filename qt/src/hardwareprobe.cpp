#include "hardwareprobe.h"
#include <QDnsLookup>
#include <QElapsedTimer>
#include <QFile>
#include <QJsonDocument>
#include <QJsonObject>
#include <QRandomGenerator>
#include <QRegularExpression>
#include <QStorageInfo>
#include <QSysInfo>
#include <QThread>
#include <QTimer>
#include <memory>

// Script da leitura no Windows. Cada bloco tem try/catch próprio: uma consulta que falha não derruba as outras.
static const char *kScript = R"PS(
$ErrorActionPreference = 'SilentlyContinue'
$o = [ordered]@{}
try { $os = Get-CimInstance Win32_OperatingSystem
  $o.os = [ordered]@{ caption = $os.Caption; version = $os.Version; build = $os.BuildNumber; display = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').DisplayVersion
    totalKb = [int64]$os.TotalVisibleMemorySize; freeKb = [int64]$os.FreePhysicalMemory } } catch {}
try { $c = Get-CimInstance Win32_Processor | Select-Object -First 1
  $o.cpu = [ordered]@{ name = $c.Name.Trim(); cores = $c.NumberOfCores; threads = $c.NumberOfLogicalProcessors; mhz = $c.MaxClockSpeed; load = $c.LoadPercentage } } catch {}
try { $g = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notmatch 'Basic|Virtual|Remote|Parsec|Meta|Mirage|Citrix' } | Sort-Object AdapterRAM -Descending
  $o.gpus = @($g | ForEach-Object { [ordered]@{ name = $_.Name; ram = [int64]$_.AdapterRAM; driver = $_.DriverVersion; driverDate = ($_.DriverDate -as [datetime]).ToString('yyyy-MM-dd')
    width = $_.CurrentHorizontalResolution; height = $_.CurrentVerticalResolution; hz = $_.CurrentRefreshRate; maxHz = $_.MaxRefreshRate } })
  # memória dedicada real (AdapterRAM satura em 4 GB): lê do registro do driver
  $q = Get-ItemProperty 'HKLM:\SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0*' -Name 'HardwareInformation.qwMemorySize' -ErrorAction SilentlyContinue
  $o.gpuMem = @($q | ForEach-Object { [int64]$_.'HardwareInformation.qwMemorySize' }) } catch {}
try { $m = Get-CimInstance Win32_PhysicalMemory
  $o.mem = [ordered]@{ modules = @($m).Count; speed = ($m | Measure-Object -Property ConfiguredClockSpeed -Maximum).Maximum; type = ($m | Select-Object -First 1).SMBIOSMemoryType } } catch {}
try { $letter = $env:SystemDrive.Substring(0,1); $part = Get-Partition -DriveLetter $letter; $disk = Get-Disk -Number $part.DiskNumber
  $pd = Get-PhysicalDisk | Where-Object { $_.DeviceId -eq [string]$disk.Number } | Select-Object -First 1
  $ld = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($env:SystemDrive)'"
  $o.disk = [ordered]@{ name = $disk.FriendlyName; bus = [string]$disk.BusType; media = [string]$pd.MediaType; size = [int64]$ld.Size; free = [int64]$ld.FreeSpace } } catch {}
try { $modes = Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorListedSupportedSourceModes | Select-Object -First 1
  $best = 0; foreach ($md in $modes.MonitorSourceModes) { if ($md.VerticalRefreshRateDenominator -gt 0) { $hz = [math]::Round($md.VerticalRefreshRateNumerator / $md.VerticalRefreshRateDenominator); if ($hz -gt $best) { $best = $hz } } }
  $o.monitorMaxHz = $best } catch {}
try { $a = Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | Sort-Object -Property @{Expression={ if ($_.PhysicalMediaType -match '802.3') {0} else {1} }} | Select-Object -First 1
  $o.net = [ordered]@{ name = $a.Name; desc = $a.InterfaceDescription; media = [string]$a.PhysicalMediaType; speed = [string]$a.LinkSpeed }
  if ($a.PhysicalMediaType -match '802.11|Wireless') {
    $w = netsh wlan show interfaces | Out-String
    if ($w -match '(?m)^\s*(Signal|Sinal|Se.al)\s*:\s*(\d+)%') { $o.net.signal = [int]$Matches[2] }
    if ($w -match '(?m)^\s*(Radio type|Tipo de r.dio|Tipo de radio)\s*:\s*(.+)$') { $o.net.radio = $Matches[2].Trim() }
    if ($w -match '(?m)^\s*(Band|Banda)\s*:\s*(.+)$') { $o.net.band = $Matches[2].Trim() }
    if ($w -match '(?m)^\s*(Channel|Canal)\s*:\s*(\d+)') { $o.net.channel = [int]$Matches[2] } } } catch {}
try { $o.dns = @(Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $_.ServerAddresses.Count -gt 0 -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet' } | Select-Object -First 1 -ExpandProperty ServerAddresses) } catch {}
try { $o.processes = (Get-Process).Count } catch {}
try { $o.startup = @(Get-CimInstance Win32_StartupCommand).Count } catch {}
try { $p = (powercfg /getactivescheme | Out-String); if ($p -match '([0-9a-f]{8}-[0-9a-f-]{27})') { $o.powerGuid = $Matches[1] }; if ($p -match '\((.+)\)') { $o.powerName = $Matches[1] } } catch {}
try { $gm = Get-ItemProperty 'HKCU:\Software\Microsoft\GameBar' -Name AutoGameModeEnabled -ErrorAction Stop; $o.gameMode = [int]$gm.AutoGameModeEnabled } catch { $o.gameMode = 1 }
$o | ConvertTo-Json -Depth 5 -Compress
)PS";

HardwareProbe::HardwareProbe(QObject *parent) : QObject(parent) {}

void HardwareProbe::run()
{
    if (m_running) return;
    m_running = true; emit runningChanged();
#ifdef Q_OS_WIN
    m_proc = new QProcess(this);
    connect(m_proc, &QProcess::finished, this, [this](int, QProcess::ExitStatus) {
        const QByteArray out = m_proc->readAllStandardOutput();
        m_proc->deleteLater(); m_proc = nullptr;
        // o JSON é a última linha não vazia (avisos do PowerShell podem vir antes)
        QByteArray json = out.trimmed();
        const int brace = json.indexOf('{');
        if (brace > 0) json = json.mid(brace);
        QJsonParseError err;
        const QJsonDocument doc = QJsonDocument::fromJson(json, &err);
        QVariantMap data = doc.isObject() ? doc.object().toVariantMap() : QVariantMap();
        data.insert(QStringLiteral("source"), QStringLiteral("windows"));
        if (!doc.isObject()) data.insert(QStringLiteral("error"), err.errorString());
        measureDns(data);
    });
    m_proc->setProgram(QStringLiteral("powershell.exe"));
    m_proc->setArguments({ QStringLiteral("-NoProfile"), QStringLiteral("-NonInteractive"), QStringLiteral("-ExecutionPolicy"), QStringLiteral("Bypass"),
                           QStringLiteral("-Command"), QString::fromUtf8(kScript) });
    m_proc->start();
    QTimer::singleShot(25000, this, [this] { if (m_proc) m_proc->kill(); });
#else
    // leitura reduzida fora do Windows; a interface marca o que não foi lido
    QTimer::singleShot(400, this, [this] { measureDns(readLinux()); });
#endif
}

QVariantMap HardwareProbe::readLinux() const
{
    QVariantMap o;
    o.insert("source", "linux");
    o.insert("os", QVariantMap{ { "caption", QSysInfo::prettyProductName() }, { "version", QSysInfo::kernelVersion() } });
    QFile cpu("/proc/cpuinfo");
    if (cpu.open(QIODevice::ReadOnly)) {
        const QString t = QString::fromUtf8(cpu.readAll());
        const auto name = QRegularExpression("model name\\s*:\\s*(.+)").match(t).captured(1).trimmed();
        const auto cores = QRegularExpression("cpu cores\\s*:\\s*(\\d+)").match(t).captured(1).toInt();
        const int threads = QThread::idealThreadCount();
        const auto mhz = QRegularExpression("cpu MHz\\s*:\\s*([\\d.]+)").match(t).captured(1).toDouble();
        o.insert("cpu", QVariantMap{ { "name", name }, { "cores", cores ? cores : threads }, { "threads", threads }, { "mhz", int(mhz) } });
    }
    QFile mem("/proc/meminfo");
    if (mem.open(QIODevice::ReadOnly)) {
        const QString t = QString::fromUtf8(mem.readAll());
        const qint64 total = QRegularExpression("MemTotal:\\s*(\\d+)").match(t).captured(1).toLongLong();
        const qint64 avail = QRegularExpression("MemAvailable:\\s*(\\d+)").match(t).captured(1).toLongLong();
        QVariantMap os = o.value("os").toMap(); os.insert("totalKb", total); os.insert("freeKb", avail); o.insert("os", os);
    }
    const QStorageInfo root = QStorageInfo::root();
    o.insert("disk", QVariantMap{ { "name", QString::fromUtf8(root.device()) }, { "media", "Unknown" }, { "bus", "" }, { "size", root.bytesTotal() }, { "free", root.bytesAvailable() } });
    return o;
}

// DNS: 4 consultas a nomes que não existem (o resolvedor precisa perguntar de verdade, sem cache) e pega a mediana
void HardwareProbe::measureDns(QVariantMap data)
{
    auto times = std::make_shared<QList<double>>();
    auto left = std::make_shared<int>(4);
    auto done = std::make_shared<bool>(false);
    auto complete = [=]() mutable {
        if (*done) return;
        *done = true;
        std::sort(times->begin(), times->end());
        if (!times->isEmpty()) data.insert(QStringLiteral("dnsMs"), times->at(times->size() / 2));
        finish(data);
    };
    QTimer::singleShot(4000, this, complete); // sem rede: não trava a análise
    for (int i = 0; i < 4; ++i) {
        auto *dns = new QDnsLookup(QDnsLookup::A, QStringLiteral("xl%1.example.com").arg(QRandomGenerator::global()->generate() % 1000000), this);
        auto timer = std::make_shared<QElapsedTimer>(); timer->start();
        connect(dns, &QDnsLookup::finished, this, [=]() mutable {
            if (dns->error() == QDnsLookup::NoError || dns->error() == QDnsLookup::NotFoundError) times->append(timer->nsecsElapsed() / 1e6);
            dns->deleteLater();
            if (--*left == 0) complete();
        });
        QTimer::singleShot(i * 120, dns, [dns] { dns->lookup(); });
    }
}

void HardwareProbe::finish(QVariantMap data)
{
    m_result = data;
    m_running = false;
    emit runningChanged();
    emit finished(m_result);
}

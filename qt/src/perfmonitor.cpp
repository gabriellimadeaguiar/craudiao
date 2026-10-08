#include "perfmonitor.h"
#include <QCoreApplication>
#include <QDir>
#include <QQuickWindow>
#include <QTextStream>
#include <QThread>
#include <cstdio>

#ifdef Q_OS_WIN
#  include <windows.h>
#  include <psapi.h>
#else
#  include <sys/resource.h>
#  include <time.h>
#  include <unistd.h>
#endif

static QElapsedTimer &processClock() { static QElapsedTimer t; return t; }
void PerfMonitor::markProcessStart() { processClock().start(); }

PerfMonitor::PerfMonitor(QObject *parent) : QObject(parent)
{
    m_cores = QThread::idealThreadCount();
    QString path;
    for (const QString &a : QCoreApplication::arguments()) {
        if (a == QLatin1String("--perf")) { m_log = true; path = QDir::temp().filePath(QStringLiteral("perf.log")); }
        else if (a.startsWith(QLatin1String("--perf="))) { m_log = true; path = a.mid(7); }
        else if (a.startsWith(QLatin1String("--quit-after="))) QTimer::singleShot(a.mid(13).toInt(), qApp, &QCoreApplication::quit);
    }
    if (m_log) { m_file.setFileName(path); m_file.open(QIODevice::WriteOnly | QIODevice::Text | QIODevice::Truncate); }
    m_timer.setInterval(1000);
    connect(&m_timer, &QTimer::timeout, this, &PerfMonitor::sample);
}

void PerfMonitor::attach(QQuickWindow *window)
{
    if (!window || m_window == window) return;
    m_window = window;
    // frameSwapped vem da thread de render; contar ali é barato (sem fila de eventos)
    connect(window, &QQuickWindow::frameSwapped, this, [this] {
        if (m_startupMs == 0 && processClock().isValid()) m_startupMs = processClock().elapsed();
        if (m_frameClock.isValid()) {
            const double dt = m_frameClock.nsecsElapsed() / 1e6;
            m_sumInterval += dt; ++m_intervals;
            if (dt > m_maxInterval) m_maxInterval = dt;
        }
        m_frameClock.restart();
        ++m_frames;
    }, Qt::DirectConnection);
    m_wall.start();
    m_lastCpu = processCpuSeconds();
    m_lastUi = threadCpuSeconds();
    m_timer.start();
}

void PerfMonitor::sample()
{
    const double wall = m_wall.nsecsElapsed() / 1e9, cpu = processCpuSeconds(), ui = threadCpuSeconds();
    const double dw = wall - m_lastWall;
    m_cpu = dw > 0 ? (cpu - m_lastCpu) / dw * 100.0 : 0;
    m_uiCpu = dw > 0 ? (ui - m_lastUi) / dw * 100.0 : 0;
    m_lastWall = wall; m_lastCpu = cpu; m_lastUi = ui;
    m_fps = dw > 0 ? m_frames / dw : 0;
    m_frameMs = m_intervals ? m_sumInterval / m_intervals : 0;
    m_worstMs = m_maxInterval;
    m_frames = 0; m_intervals = 0; m_sumInterval = 0; m_maxInterval = 0;
    m_ramMb = residentMb();
    emit updated();
    if (m_log) {
        const QString line = QStringLiteral("perf t=%1s scene=%2 fps=%3 frame=%4ms worst=%5ms cpu=%6% (machine %7%) ui=%10% ram=%8MB startup=%9ms")
            .arg(wall, 0, 'f', 0).arg(m_tag).arg(m_fps, 0, 'f', 1).arg(m_frameMs, 0, 'f', 1).arg(m_worstMs, 0, 'f', 1)
            .arg(m_cpu, 0, 'f', 1).arg(cpuTotal(), 0, 'f', 1).arg(m_ramMb, 0, 'f', 0).arg(m_startupMs, 0, 'f', 0).arg(m_uiCpu, 0, 'f', 1);
        std::fprintf(stderr, "%s\n", qPrintable(line));
        if (m_file.isOpen()) { QTextStream(&m_file) << line << '\n'; m_file.flush(); }
    }
}

double PerfMonitor::processCpuSeconds()
{
#ifdef Q_OS_WIN
    FILETIME c, e, k, u;
    if (!GetProcessTimes(GetCurrentProcess(), &c, &e, &k, &u)) return 0;
    auto s = [](const FILETIME &f) { return (double(f.dwHighDateTime) * 4294967296.0 + f.dwLowDateTime) / 1e7; };
    return s(k) + s(u);
#else
    rusage r{};
    getrusage(RUSAGE_SELF, &r);
    return r.ru_utime.tv_sec + r.ru_utime.tv_usec / 1e6 + r.ru_stime.tv_sec + r.ru_stime.tv_usec / 1e6;
#endif
}

double PerfMonitor::threadCpuSeconds()
{
#ifdef Q_OS_WIN
    FILETIME c, e, k, u;
    if (!GetThreadTimes(GetCurrentThread(), &c, &e, &k, &u)) return 0;
    auto s = [](const FILETIME &f) { return (double(f.dwHighDateTime) * 4294967296.0 + f.dwLowDateTime) / 1e7; };
    return s(k) + s(u);
#else
    timespec ts{};
    clock_gettime(CLOCK_THREAD_CPUTIME_ID, &ts);
    return ts.tv_sec + ts.tv_nsec / 1e9;
#endif
}

double PerfMonitor::residentMb()
{
#ifdef Q_OS_WIN
    PROCESS_MEMORY_COUNTERS_EX pmc{};
    if (K32GetProcessMemoryInfo(GetCurrentProcess(), reinterpret_cast<PROCESS_MEMORY_COUNTERS *>(&pmc), sizeof(pmc)))
        return pmc.WorkingSetSize / (1024.0 * 1024.0);
    return 0;
#else
    QFile f(QStringLiteral("/proc/self/statm"));
    if (!f.open(QIODevice::ReadOnly)) return 0;
    const QList<QByteArray> parts = f.readAll().split(' ');
    return parts.size() > 1 ? parts[1].toDouble() * sysconf(_SC_PAGESIZE) / (1024.0 * 1024.0) : 0;
#endif
}

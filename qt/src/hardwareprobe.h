#pragma once
#include <QObject>
#include <QProcess>
#include <QVariantMap>
#include <QtQml/qqmlregistration.h>

// Lê o PC de verdade. No Windows, um script PowerShell consulta o WMI/CIM (processador, placa de vídeo, memória,
// disco do sistema, monitor e modos suportados, adaptador de rede, Wi-Fi, processos, apps de inicialização,
// plano de energia, Modo de Jogo, servidores DNS) e devolve JSON. Depois mede o tempo de resposta do DNS.
// Fora do Windows há uma leitura reduzida (/proc), só para desenvolvimento.
class HardwareProbe : public QObject
{
    Q_OBJECT
    QML_ELEMENT
    Q_PROPERTY(bool running READ running NOTIFY runningChanged)
    Q_PROPERTY(QVariantMap result READ result NOTIFY finished)
public:
    explicit HardwareProbe(QObject *parent = nullptr);
    bool running() const { return m_running; }
    QVariantMap result() const { return m_result; }
    Q_INVOKABLE void run();
signals:
    void runningChanged();
    void finished(const QVariantMap &result);
    void failed(const QString &message);
private:
    void finish(QVariantMap data);
    void measureDns(QVariantMap data);
    QVariantMap readLinux() const;
    bool m_running = false;
    QVariantMap m_result;
    QProcess *m_proc = nullptr;
};

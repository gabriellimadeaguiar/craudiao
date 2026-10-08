#pragma once
#include <QHostAddress>
#include <QObject>
#include <QTimer>
#include <QtQml/qqmlregistration.h>

// Mede a latência até um host de verdade, em amostras contínuas: cada amostra abre uma conexão TCP e cronometra até
// o servidor responder (SYN › SYN-ACK, uma ida e volta). Não precisa de privilégios de administrador, ao contrário do
// ICMP. Uma conexão que não responde dentro do limite conta como pacote perdido.
class LatencyProbe : public QObject
{
    Q_OBJECT
    QML_ELEMENT
    Q_PROPERTY(QString host READ host WRITE setHost NOTIFY hostChanged)
    Q_PROPERTY(int port READ port WRITE setPort NOTIFY portChanged)
    Q_PROPERTY(int interval READ interval WRITE setInterval NOTIFY intervalChanged)
    Q_PROPERTY(int timeout READ timeout WRITE setTimeout NOTIFY timeoutChanged)
    Q_PROPERTY(bool running READ running NOTIFY runningChanged)
    Q_PROPERTY(QString address READ address NOTIFY addressChanged)
public:
    explicit LatencyProbe(QObject *parent = nullptr);
    QString host() const { return m_host; }
    int port() const { return m_port; }
    int interval() const { return m_interval; }
    int timeout() const { return m_timeout; }
    bool running() const { return m_running; }
    QString address() const { return m_addr.toString(); }
    void setHost(const QString &h);
    void setPort(int p) { if (p != m_port) { m_port = p; emit portChanged(); } }
    void setInterval(int ms) { if (ms != m_interval) { m_interval = ms; m_tick.setInterval(ms); emit intervalChanged(); } }
    void setTimeout(int ms) { if (ms != m_timeout) { m_timeout = ms; emit timeoutChanged(); } }
    Q_INVOKABLE void start();
    Q_INVOKABLE void stop();
signals:
    void hostChanged();
    void portChanged();
    void intervalChanged();
    void timeoutChanged();
    void runningChanged();
    void addressChanged();
    void sample(double ms, bool lost);
    void error(const QString &message);
private:
    void probe();
    QString m_host;
    int m_port = 443, m_interval = 250, m_timeout = 1200;
    bool m_running = false;
    QHostAddress m_addr;
    QTimer m_tick;
    int m_lookupId = -1;
};

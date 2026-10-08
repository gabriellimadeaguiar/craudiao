#pragma once
#include <QObject>
#include <QtQml/qqmlregistration.h>
#include <atomic>

// Caminho salto a salto até o servidor. No Windows usa a API ICMP do sistema (IcmpSendEcho, sem precisar de
// administrador): para cada TTL manda 3 sondas, anota quem respondeu, o tempo e quantas se perderam, e tenta o nome
// reverso do salto. Fora do Windows não há implementação (supported = false).
class TraceRoute : public QObject
{
    Q_OBJECT
    QML_ELEMENT
    Q_PROPERTY(bool supported READ supported CONSTANT)
    Q_PROPERTY(bool running READ running NOTIFY runningChanged)
public:
    explicit TraceRoute(QObject *parent = nullptr);
    ~TraceRoute() override;
    bool supported() const;
    bool running() const { return m_running; }
    Q_INVOKABLE void start(const QString &host, int maxHops = 20);
    Q_INVOKABLE void stop();
signals:
    void runningChanged();
    // address vazio = salto que não respondeu (* * *)
    void hop(int ttl, const QString &address, const QString &name, double ms, int lost, int sent, bool reached);
    void finished();
private:
    bool m_running = false;
    std::atomic<bool> m_cancel { false };
    std::atomic<int> m_generation { 0 };
};

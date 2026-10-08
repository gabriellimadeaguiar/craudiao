#include "latencyprobe.h"
#include <QElapsedTimer>
#include <QHostInfo>
#include <QTcpSocket>
#include <memory>

LatencyProbe::LatencyProbe(QObject *parent) : QObject(parent)
{
    m_tick.setInterval(m_interval);
    connect(&m_tick, &QTimer::timeout, this, &LatencyProbe::probe);
}

void LatencyProbe::setHost(const QString &h)
{
    if (h == m_host) return;
    m_host = h;
    m_addr.clear();
    emit hostChanged();
    emit addressChanged();
}

void LatencyProbe::start()
{
    if (m_running || m_host.isEmpty()) return;
    m_running = true; emit runningChanged();
    // resolve uma vez antes de medir: o tempo do DNS não entra nas amostras
    if (m_addr.isNull()) {
        m_lookupId = QHostInfo::lookupHost(m_host, this, [this](const QHostInfo &info) {
            m_lookupId = -1;
            if (!m_running) return;
            const auto list = info.addresses();
            QHostAddress pick;
            for (const auto &a : list) if (a.protocol() == QAbstractSocket::IPv4Protocol) { pick = a; break; }
            if (pick.isNull() && !list.isEmpty()) pick = list.first();
            if (pick.isNull()) { emit error(QStringLiteral("Could not resolve %1").arg(m_host)); stop(); return; }
            m_addr = pick; emit addressChanged();
            probe(); m_tick.start();
        });
    } else { probe(); m_tick.start(); }
}

void LatencyProbe::stop()
{
    if (m_lookupId >= 0) { QHostInfo::abortHostLookup(m_lookupId); m_lookupId = -1; }
    m_tick.stop();
    if (m_running) { m_running = false; emit runningChanged(); }
}

void LatencyProbe::probe()
{
    if (m_addr.isNull()) return;
    auto *sock = new QTcpSocket(this);
    auto t = std::make_shared<QElapsedTimer>();
    auto done = std::make_shared<bool>(false);
    auto finish = [this, sock, t, done](bool lost) {
        if (*done) return;
        *done = true;
        const double ms = t->nsecsElapsed() / 1e6;
        sock->abort();
        sock->deleteLater();
        if (m_running) emit sample(lost ? -1 : ms, lost);
    };
    connect(sock, &QTcpSocket::connected, this, [finish]() mutable { finish(false); });
    connect(sock, &QTcpSocket::errorOccurred, this, [finish](QAbstractSocket::SocketError) mutable { finish(true); });
    QTimer::singleShot(m_timeout, sock, [finish]() mutable { finish(true); });
    t->start();
    sock->connectToHost(m_addr, quint16(m_port));
}

#include <QtGlobal>
#ifdef Q_OS_WIN
#  ifndef NOMINMAX
#    define NOMINMAX
#  endif
#  include <winsock2.h>
#  include <ws2tcpip.h>
#  include <iphlpapi.h>
#  include <icmpapi.h>
#endif
#include "traceroute.h"
#include <QHostAddress>
#include <QHostInfo>
#include <QPointer>
#include <thread>

TraceRoute::TraceRoute(QObject *parent) : QObject(parent) {}
TraceRoute::~TraceRoute() { m_cancel = true; }

bool TraceRoute::supported() const
{
#ifdef Q_OS_WIN
    return true;
#else
    return false;
#endif
}

void TraceRoute::stop() { m_cancel = true; ++m_generation; if (m_running) { m_running = false; emit runningChanged(); } }

void TraceRoute::start(const QString &host, int maxHops)
{
    stop();
    m_cancel = false;
    const int gen = ++m_generation;
    m_running = true; emit runningChanged();
#ifndef Q_OS_WIN
    Q_UNUSED(host) Q_UNUSED(maxHops) Q_UNUSED(gen)
    QMetaObject::invokeMethod(this, [this] { m_running = false; emit runningChanged(); emit finished(); }, Qt::QueuedConnection);
#else
    QPointer<TraceRoute> self(this);
    QHostInfo::lookupHost(host, this, [self, gen, maxHops](const QHostInfo &info) {
        if (!self || self->m_generation != gen) return;
        QHostAddress target;
        for (const auto &a : info.addresses()) if (a.protocol() == QAbstractSocket::IPv4Protocol) { target = a; break; }
        if (target.isNull()) { self->m_running = false; emit self->runningChanged(); emit self->finished(); return; }
        const quint32 dest = htonl(target.toIPv4Address());
        std::thread([self, gen, maxHops, dest]() {
            HANDLE h = IcmpCreateFile();
            if (h == INVALID_HANDLE_VALUE) { QMetaObject::invokeMethod(self, [self] { if (self) { self->m_running = false; emit self->runningChanged(); emit self->finished(); } }); return; }
            char payload[32] = "ExitLagAnalyzer-trace";
            const DWORD replySize = sizeof(ICMP_ECHO_REPLY) + sizeof(payload) + 8 + 64;
            QByteArray reply(int(replySize), 0);
            for (int ttl = 1; ttl <= maxHops; ++ttl) {
                if (!self || self->m_cancel || self->m_generation != gen) break;
                IP_OPTION_INFORMATION opt {};
                opt.Ttl = UCHAR(ttl);
                QString addr; double best = -1; int lost = 0; bool reached = false;
                for (int k = 0; k < 3; ++k) {
                    const DWORD n = IcmpSendEcho(h, dest, payload, sizeof(payload), &opt, reply.data(), replySize, 1000);
                    if (n == 0) { ++lost; continue; }
                    auto *r = reinterpret_cast<PICMP_ECHO_REPLY>(reply.data());
                    if (r->Status == IP_SUCCESS || r->Status == IP_TTL_EXPIRED_TRANSIT) {
                        addr = QHostAddress(ntohl(r->Address)).toString();
                        if (best < 0 || r->RoundTripTime < best) best = r->RoundTripTime;
                        if (r->Status == IP_SUCCESS) reached = true;
                    } else ++lost;
                }
                QString name;
                if (!addr.isEmpty()) { const QHostInfo rev = QHostInfo::fromName(addr); if (rev.hostName() != addr) name = rev.hostName(); }
                QMetaObject::invokeMethod(self, [self, gen, ttl, addr, name, best, lost, reached] {
                    if (self && self->m_generation == gen) emit self->hop(ttl, addr, name, best, lost, 3, reached);
                });
                if (reached) break;
            }
            IcmpCloseHandle(h);
            QMetaObject::invokeMethod(self, [self, gen] {
                if (!self || self->m_generation != gen) return;
                self->m_running = false; emit self->runningChanged(); emit self->finished();
            });
        }).detach();
    });
#endif
}

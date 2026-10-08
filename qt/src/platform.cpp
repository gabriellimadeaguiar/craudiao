#include "platform.h"
#include <QCoreApplication>
#include <QDebug>
#include <QDesktopServices>
#include <QTimeZone>
#include <QUrl>

Platform::Platform(QObject *parent) : QObject(parent) {}

QString Platform::timeZoneId() const { return QString::fromUtf8(QTimeZone::systemTimeZoneId()); }

bool Platform::windows() const
{
#ifdef Q_OS_WIN
    return true;
#else
    return false;
#endif
}

QString Platform::qtVersion() const { return QString::fromLatin1(qVersion()); }

QString Platform::startScene() const
{
    for (const QString &a : QCoreApplication::arguments())
        if (a.startsWith(QLatin1String("--scene="))) return a.mid(8);
    return QString();
}

void Platform::openUrl(const QString &url) const { QDesktopServices::openUrl(QUrl(url)); }
void Platform::log(const QString &message) const { qInfo().noquote() << message; }

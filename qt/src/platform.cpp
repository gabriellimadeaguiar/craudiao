#include "platform.h"
#include <QCoreApplication>
#include <QDebug>
#include <QDesktopServices>
#include <QTimeZone>
#include <QUrl>
#ifdef Q_OS_WIN
#  include <windows.h>
#  include <dwmapi.h>
#endif

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

QString Platform::forcedPower() const
{
    for (const QString &a : QCoreApplication::arguments())
        if (a.startsWith(QLatin1String("--power="))) return a.mid(8);
    return QString();
}

bool Platform::roundCorners(QWindow *window) const
{
#ifdef Q_OS_WIN
    if (!window) return false;
    constexpr DWORD cornerPreference = 33;   // DWMWA_WINDOW_CORNER_PREFERENCE (SDK do Windows 11)
    constexpr int round = 2;                 // DWMWCP_ROUND
    const HWND hwnd = reinterpret_cast<HWND>(window->winId());
    return SUCCEEDED(DwmSetWindowAttribute(hwnd, cornerPreference, &round, sizeof(round)));
#else
    Q_UNUSED(window);
    return false;
#endif
}

void Platform::openUrl(const QString &url) const { QDesktopServices::openUrl(QUrl(url)); }
void Platform::log(const QString &message) const { qInfo().noquote() << message; }

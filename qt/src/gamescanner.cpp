#include "gamescanner.h"
#include <QDir>
#include <QDirIterator>
#include <QFile>
#include <QJsonDocument>
#include <QJsonObject>
#include <QPointer>
#include <QRegularExpression>
#include <QSettings>
#include <QStandardPaths>
#include <thread>

namespace {
struct Known { const char *id; const char *name; int steamAppId; const char *epicMatch; const char *riotFolder; const char *folders; };
// id = chave do catálogo no QML (Logic.js). folders: pastas padrão, separadas por ';', relativas a cada unidade
const Known kGames[] = {
    { "lol",      "League of Legends",          0,       nullptr,      "league_of_legends.live", "Riot Games/League of Legends" },
    { "cs2",      "Counter-Strike 2",           730,     nullptr,      nullptr, nullptr },
    { "fortnite", "Fortnite",                   0,       "Fortnite",   nullptr, "Program Files/Epic Games/Fortnite" },
    { "apex",     "Apex Legends",               1172470, "Apex",       nullptr, "Program Files/EA Games/Apex" },
    { "dota2",    "Dota 2",                     570,     nullptr,      nullptr, nullptr },
    { "r6",       "Rainbow Six Siege",          359550,  nullptr,      nullptr, "Program Files (x86)/Ubisoft/Ubisoft Game Launcher/games/Tom Clancy's Rainbow Six Siege" },
    { "ow2",      "Overwatch 2",                2357570, nullptr,      nullptr, "Program Files (x86)/Overwatch;Program Files/Overwatch" },
    { "rl",       "Rocket League",              252950,  "Rocket League", nullptr, "Program Files/Epic Games/rocketleague" },
    { "pubg",     "PUBG: Battlegrounds",        578080,  nullptr,      nullptr, nullptr },
    { "tarkov",   "Escape from Tarkov",         0,       nullptr,      nullptr, "Battlestate Games/EFT;Battlestate Games/Escape from Tarkov" },
    { "destiny2", "Destiny 2",                  1085660, nullptr,      nullptr, nullptr },
    { "elden",    "Elden Ring",                 1245620, nullptr,      nullptr, nullptr },
    { "dbd",      "Dead by Daylight",           381210,  "Dead by Daylight", nullptr, nullptr },
    { "warframe", "Warframe",                   230410,  "Warframe",   nullptr, nullptr },
    { "poe2",     "Path of Exile 2",            2694490, nullptr,      nullptr, "Program Files (x86)/Grinding Gear Games/Path of Exile 2" },
    { "ark",      "ARK: Survival Evolved",      346110,  "ARK",        nullptr, nullptr },
    { "wow",      "World of Warcraft",          0,       nullptr,      nullptr, "Program Files (x86)/World of Warcraft;Program Files/World of Warcraft" },
    { "naruto",   "Naruto Shippuden: Ultimate Ninja Storm 4", 349040, nullptr, nullptr, nullptr },
    { "tl",       "Throne and Liberty",         2429640, nullptr,      nullptr, nullptr },
};

QVariantMap entry(const Known &k, const QString &launcher, const QString &path)
{
    return { { "id", QString::fromLatin1(k.id) }, { "name", QString::fromUtf8(k.name) }, { "launcher", launcher }, { "path", QDir::toNativeSeparators(path) } };
}

QStringList drives()
{
    QStringList out;
#ifdef Q_OS_WIN
    for (const QFileInfo &d : QDir::drives()) out << d.absolutePath();
#else
    out << QDir::homePath() + "/";
#endif
    return out;
}
}

GameScanner::GameScanner(QObject *parent) : QObject(parent) {}

void GameScanner::scan()
{
    if (m_running) return;
    m_running = true; emit runningChanged();
    QPointer<GameScanner> self(this);
    std::thread([self]() {
        QVariantList all;
        QSet<QString> seen;
        auto report = [&](const QString &launcher, bool installed, const QStringList &folders, const QVariantList &found) {
            for (const auto &g : found) { const QString id = g.toMap().value("id").toString(); if (!seen.contains(id)) { seen.insert(id); all.append(g); } }
            QMetaObject::invokeMethod(self, [self, launcher, installed, folders, found] { if (self) emit self->launcherScanned(launcher, installed, folders, found); });
        };

        // Steam
        {
            QStringList libs; QVariantList found; bool installed = false;
            QString steam;
#ifdef Q_OS_WIN
            steam = QSettings("HKEY_CURRENT_USER\\Software\\Valve\\Steam", QSettings::NativeFormat).value("SteamPath").toString();
            if (steam.isEmpty()) steam = "C:/Program Files (x86)/Steam";
#else
            steam = QDir::homePath() + "/.steam/steam";
#endif
            QFile vdf(steam + "/steamapps/libraryfolders.vdf");
            if (vdf.open(QIODevice::ReadOnly)) {
                installed = true;
                const QString t = QString::fromUtf8(vdf.readAll());
                auto it = QRegularExpression("\"path\"\\s+\"([^\"]+)\"").globalMatch(t);
                while (it.hasNext()) libs << QDir::fromNativeSeparators(it.next().captured(1).replace("\\\\", "\\"));
            }
            if (libs.isEmpty() && QDir(steam).exists()) { installed = true; libs << steam; }
            for (const QString &lib : libs)
                for (const auto &k : kGames) {
                    if (!k.steamAppId) continue;
                    QFile acf(QStringLiteral("%1/steamapps/appmanifest_%2.acf").arg(lib).arg(k.steamAppId));
                    if (!acf.exists()) continue;
                    QString dir;
                    if (acf.open(QIODevice::ReadOnly)) dir = QRegularExpression("\"installdir\"\\s+\"([^\"]+)\"").match(QString::fromUtf8(acf.readAll())).captured(1);
                    found << entry(k, "Steam", lib + "/steamapps/common/" + dir);
                }
            report("Steam", installed, libs, found);
        }
        // Epic Games
        {
            QVariantList found; QStringList folders;
            const QString man = "C:/ProgramData/Epic/EpicGamesLauncher/Data/Manifests";
            const bool installed = QDir(man).exists();
            if (installed) {
                folders << man;
                QDirIterator it(man, { "*.item" }, QDir::Files);
                while (it.hasNext()) {
                    QFile f(it.next());
                    if (!f.open(QIODevice::ReadOnly)) continue;
                    const QJsonObject o = QJsonDocument::fromJson(f.readAll()).object();
                    const QString name = o.value("DisplayName").toString();
                    for (const auto &k : kGames)
                        if (k.epicMatch && name.startsWith(QString::fromUtf8(k.epicMatch), Qt::CaseInsensitive))
                            found << entry(k, "Epic Games", o.value("InstallLocation").toString());
                }
            }
            report("Epic Games", installed, folders, found);
        }
        // Riot
        {
            QVariantList found; QStringList folders;
            const QString meta = "C:/ProgramData/Riot Games/Metadata";
            const bool installed = QDir(meta).exists() || QDir("C:/Riot Games").exists();
            if (installed) folders << meta;
            for (const auto &k : kGames)
                if (k.riotFolder && QDir(meta + "/" + k.riotFolder).exists()) found << entry(k, "Riot Client", "C:/Riot Games/League of Legends");
            report("Riot Client", installed, folders, found);
        }
        // Battle.net e instalações avulsas (pastas padrão em cada unidade)
        {
            QVariantList found; QStringList folders;
            const bool bnet = QDir("C:/ProgramData/Battle.net").exists();
            for (const QString &drive : drives())
                for (const auto &k : kGames) {
                    if (!k.folders) continue;
                    for (const QString &rel : QString::fromUtf8(k.folders).split(';')) {
                        const QString p = drive + rel;
                        if (QDir(p).exists()) { found << entry(k, bnet && (QString(k.id) == "ow2" || QString(k.id) == "wow") ? "Battle.net" : "Other", p); break; }
                    }
                }
            folders << drives();
            report("Battle.net & other folders", bnet, folders, found);
        }

        QMetaObject::invokeMethod(self, [self, all] {
            if (!self) return;
            self->m_games = all;
            self->m_running = false;
            emit self->runningChanged();
            emit self->finished(all);
        });
    }).detach();
}

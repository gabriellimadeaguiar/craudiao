#pragma once
#include <QObject>
#include <QVariantList>
#include <QtQml/qqmlregistration.h>

// Procura jogos instalados de verdade, launcher por launcher:
//  - Steam: caminho no registro › libraryfolders.vdf › appmanifest_<appid>.acf de cada biblioteca
//  - Epic Games: manifestos .item em ProgramData
//  - Riot: pastas de metadados do Riot Client
//  - Battle.net e instalações avulsas: pastas padrão de cada jogo
// Só entram jogos do catálogo do app (os que a ExitLag otimiza e que têm capa). A varredura roda numa thread.
class GameScanner : public QObject
{
    Q_OBJECT
    QML_ELEMENT
    Q_PROPERTY(bool running READ running NOTIFY runningChanged)
    Q_PROPERTY(QVariantList games READ games NOTIFY finished)
public:
    explicit GameScanner(QObject *parent = nullptr);
    bool running() const { return m_running; }
    QVariantList games() const { return m_games; }
    Q_INVOKABLE void scan();
signals:
    void runningChanged();
    // um launcher terminado: nome, se está instalado, pastas olhadas e jogos achados nele
    void launcherScanned(const QString &launcher, bool installed, const QStringList &folders, const QVariantList &games);
    void finished(const QVariantList &games);
private:
    bool m_running = false;
    QVariantList m_games;
};

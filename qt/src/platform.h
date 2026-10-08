#pragma once
#include <QObject>
#include <QtQml/qqmlregistration.h>

// Utilidades do sistema para o QML: fuso horário (origem do jogador sem pedir permissão), sistema operacional
// e versão do Qt em uso.
class Platform : public QObject
{
    Q_OBJECT
    QML_ELEMENT
    QML_SINGLETON
    Q_PROPERTY(QString timeZoneId READ timeZoneId CONSTANT)
    Q_PROPERTY(bool windows READ windows CONSTANT)
    Q_PROPERTY(QString qtVersion READ qtVersion CONSTANT)
    Q_PROPERTY(QString startScene READ startScene CONSTANT)
public:
    explicit Platform(QObject *parent = nullptr);
    QString timeZoneId() const;
    bool windows() const;
    QString qtVersion() const;
    QString startScene() const;   // --scene=<nome> na linha de comando, para testar uma tela direto
    Q_INVOKABLE void openUrl(const QString &url) const;
    Q_INVOKABLE void log(const QString &message) const;
};

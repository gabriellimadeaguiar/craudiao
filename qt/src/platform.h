#pragma once
#include <QObject>
#include <QWindow>
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
    Q_PROPERTY(QString forcedPower READ forcedPower CONSTANT)   // --power=low|off: testes de economia de energia
public:
    explicit Platform(QObject *parent = nullptr);
    QString timeZoneId() const;
    bool windows() const;
    QString qtVersion() const;
    QString startScene() const;
    QString forcedPower() const;   // --scene=<nome> na linha de comando, para testar uma tela direto
    // cantos arredondados nativos do Windows 11 (DWM): custo zero de desenho. Devolve false onde não há (Windows 10,
    // Linux): a janela fica com cantos retos, como as do próprio sistema.
    Q_INVOKABLE bool roundCorners(QWindow *window) const;
    Q_INVOKABLE void openUrl(const QString &url) const;
    Q_INVOKABLE void log(const QString &message) const;
    Q_INVOKABLE bool flag(const QString &name) const { return qEnvironmentVariableIsSet(qPrintable(QStringLiteral("EXL_") + name)); }
};

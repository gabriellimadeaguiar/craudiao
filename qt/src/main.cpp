#include <QDir>
#include <QFontDatabase>
#include <QGuiApplication>
#include <QIcon>
#include <QQmlApplicationEngine>
#include <QQuickWindow>
#include <QSurfaceFormat>
#include <QImage>
#include <QTimer>

int main(int argc, char *argv[])
{
    // profundidade, stencil e MSAA para o Qt Quick (no Windows o Qt usa Direct3D 11 por padrão)
    QSurfaceFormat fmt = QSurfaceFormat::defaultFormat();
    fmt.setDepthBufferSize(24); fmt.setStencilBufferSize(8); fmt.setSamples(4);
    fmt.setAlphaBufferSize(8);   // janela transparente fora dos cantos arredondados
    QSurfaceFormat::setDefaultFormat(fmt);
    QGuiApplication app(argc, argv);
    QGuiApplication::setApplicationName(QStringLiteral("ExitLag Analyzer"));
    QGuiApplication::setWindowIcon(QIcon(QStringLiteral(":/app.png")));
    QGuiApplication::setOrganizationName(QStringLiteral("ExitLag"));

    // fontes da marca embutidas: Anek Latin (títulos), Ubuntu Sans (texto), Ubuntu Sans Mono (leituras)
    const QDir fonts(QStringLiteral(":/fonts"));
    for (const QString &f : fonts.entryList({ QStringLiteral("*.ttf") }))
        QFontDatabase::addApplicationFont(fonts.filePath(f));
    QFont base(QStringLiteral("Ubuntu Sans"));
    base.setPixelSize(14);
    QGuiApplication::setFont(base);

    QQmlApplicationEngine engine;
    QObject::connect(&engine, &QQmlApplicationEngine::objectCreationFailed, &app, [] { QCoreApplication::exit(-1); }, Qt::QueuedConnection);
    engine.addImportPath(QStringLiteral("qrc:/"));
    engine.load(QUrl(QStringLiteral("qrc:/ExitLag/Main.qml")));
    if (engine.rootObjects().isEmpty()) return -1;

    // --shot=arquivo.png [--shot-delay=ms]: salva uma captura da janela e fecha (testes sem tela)
    QString shot; int delay = 4000;
    for (const QString &a : QCoreApplication::arguments()) {
        if (a.startsWith(QLatin1String("--shot="))) shot = a.mid(7);
        if (a.startsWith(QLatin1String("--shot-delay="))) delay = a.mid(13).toInt();
    }
    if (!shot.isEmpty()) {
        auto *w = qobject_cast<QQuickWindow *>(engine.rootObjects().first());
        QTimer::singleShot(delay, &app, [w, shot] { w->grabWindow().save(shot); QCoreApplication::quit(); });
    }
    return app.exec();
}

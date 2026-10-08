#pragma once
#include <QElapsedTimer>
#include <QFile>
#include <QObject>
#include <QPointer>
#include <QTimer>
#include <QtQml/qqmlregistration.h>

#include <QQuickWindow>

/* Medidor de desempenho do próprio app: quadros por segundo, intervalo médio e pior intervalo entre quadros,
   CPU do processo e memória. Mede uma vez por segundo, com custo desprezível.
   - No app: aparece nos controles do protótipo (orelha no canto).
   - Linha de comando: --perf grava uma linha por segundo no console e em perf.log (pasta temporária do sistema,
     ou --perf=<arquivo>). --quit-after=<ms> fecha sozinho, para testes automáticos.
   Sem nada mudando na tela o Qt não desenha: fps 0 é o esperado em repouso. */
class PerfMonitor : public QObject
{
    Q_OBJECT
    QML_NAMED_ELEMENT(Perf)
    QML_SINGLETON
    Q_PROPERTY(double fps READ fps NOTIFY updated)
    Q_PROPERTY(double frameMs READ frameMs NOTIFY updated)
    Q_PROPERTY(double worstMs READ worstMs NOTIFY updated)
    Q_PROPERTY(double cpu READ cpu NOTIFY updated)            // % de um núcleo (100 = um núcleo inteiro)
    Q_PROPERTY(double cpuTotal READ cpuTotal NOTIFY updated)  // % da máquina toda, como no Gerenciador de Tarefas
    Q_PROPERTY(double uiCpu READ uiCpu NOTIFY updated)         // só a thread da interface (QML, JS, bindings)
    Q_PROPERTY(double ramMb READ ramMb NOTIFY updated)
    Q_PROPERTY(double startupMs READ startupMs NOTIFY updated)
    Q_PROPERTY(QString tag READ tag WRITE setTag NOTIFY updated)
public:
    explicit PerfMonitor(QObject *parent = nullptr);
    static void markProcessStart();                       // chamado no começo do main()

    Q_INVOKABLE void attach(QQuickWindow *window);
    double fps() const { return m_fps; }
    double frameMs() const { return m_frameMs; }
    double worstMs() const { return m_worstMs; }
    double cpu() const { return m_cpu; }
    double cpuTotal() const { return m_cpu / qMax(1, m_cores); }
    double ramMb() const { return m_ramMb; }
    double uiCpu() const { return m_uiCpu; }
    double startupMs() const { return m_startupMs; }
    QString tag() const { return m_tag; }
    void setTag(const QString &t) { m_tag = t; }

signals:
    void updated();

private:
    void sample();
    static double processCpuSeconds();
    static double threadCpuSeconds();       // thread que chama (a da interface)
    static double residentMb();

    QPointer<QQuickWindow> m_window;
    QTimer m_timer;
    QElapsedTimer m_wall;
    QElapsedTimer m_frameClock;
    int m_frames = 0;
    double m_sumInterval = 0, m_maxInterval = 0;
    double m_lastCpu = 0, m_lastWall = 0, m_lastUi = 0, m_uiCpu = 0;
    int m_intervals = 0;
    double m_fps = 0, m_frameMs = 0, m_worstMs = 0, m_cpu = 0, m_ramMb = 0, m_startupMs = 0;
    int m_cores = 1;
    QString m_tag;
    bool m_log = false;
    QFile m_file;
};

#pragma once
#include <QQuick3DGeometry>
#include <QVector3D>
#include <QtQml/qqmlregistration.h>

// Rota sobre o globo: uma corrente de saltos (arcos que saem e pousam tangentes à superfície) entre as paradas,
// suavizada e transformada num tubo. `progress` desenha a rota do início até aquele ponto (0–1).
// Mesma construção das rotas do protótipo web (arcHop + soften).
class RouteGeometry : public QQuick3DGeometry
{
    Q_OBJECT
    QML_ELEMENT
    Q_PROPERTY(QVariantList stops READ stops WRITE setStops NOTIFY stopsChanged)       // [[lat, lon], ...]
    Q_PROPERTY(float globeRadius READ globeRadius WRITE setGlobeRadius NOTIFY changed)
    Q_PROPERTY(float tubeRadius READ tubeRadius WRITE setTubeRadius NOTIFY changed)
    Q_PROPERTY(float lift READ lift WRITE setLift NOTIFY changed)
    Q_PROPERTY(float progress READ progress WRITE setProgress NOTIFY progressChanged)
public:
    explicit RouteGeometry(QQuick3DObject *parent = nullptr);
    static QVector3D toVec(float lat, float lon, float r);

    QVariantList stops() const { return m_stops; }
    float globeRadius() const { return m_R; }
    float tubeRadius() const { return m_tube; }
    float lift() const { return m_lift; }
    float progress() const { return m_progress; }
    void setStops(const QVariantList &s);
    void setGlobeRadius(float r);
    void setTubeRadius(float r);
    void setLift(float l);
    void setProgress(float p);

    Q_INVOKABLE QVector3D pointAt(float t) const;        // ponto na rota pelo comprimento (0–1), em coordenadas do globo
    Q_INVOKABLE QVector3D stopPoint(int i) const;        // ponto da i-ésima parada (já sobre a linha suavizada)
    Q_INVOKABLE float stopT(int i) const;                // posição (0–1) da i-ésima parada ao longo da rota
signals:
    void stopsChanged();
    void changed();
    void progressChanged();
private:
    void buildPath();
    void rebuildMesh();
    QVariantList m_stops;
    float m_R = 100.f, m_tube = 0.35f, m_lift = 0.5f, m_progress = 1.f;
    QList<QVector3D> m_pts;     // polilinha da rota
    QList<float> m_cum;         // comprimento acumulado (normalizado 0–1)
    QList<int> m_stopIdx;       // índice de cada parada na polilinha
};

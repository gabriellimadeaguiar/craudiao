#pragma once
#include <QQuick3DGeometry>
#include <QtQml/qqmlregistration.h>

/* Nós da rede ExitLag no globo: todos os pontos numa malha só (um quadradinho tangente à esfera por ponto).
   Cada vértice leva a fase da piscada (no atributo de cor) e a coordenada dentro do quadrado (UV): o shader
   desenha o ponto redondo e faz a piscada com um único uniform de tempo. Uma chamada de desenho, nenhum
   binding por quadro (antes eram 140 esferas, cada uma com a opacidade recalculada a cada quadro). */
class NodeGeometry : public QQuick3DGeometry
{
    Q_OBJECT
    QML_ELEMENT
    Q_PROPERTY(QVariantList points READ points WRITE setPoints NOTIFY pointsChanged)   // [[lat, lon], ...]
    Q_PROPERTY(float radius READ radius WRITE setRadius NOTIFY radiusChanged)
    Q_PROPERTY(float dotSize READ dotSize WRITE setDotSize NOTIFY dotSizeChanged)
public:
    explicit NodeGeometry(QQuick3DObject *parent = nullptr);
    QVariantList points() const { return m_points; }
    float radius() const { return m_radius; }
    float dotSize() const { return m_dotSize; }
    void setPoints(const QVariantList &p);
    void setRadius(float r);
    void setDotSize(float s);
signals:
    void pointsChanged();
    void radiusChanged();
    void dotSizeChanged();
private:
    void rebuild();
    QVariantList m_points;
    float m_radius = 100.f;
    float m_dotSize = 0.55f;
};

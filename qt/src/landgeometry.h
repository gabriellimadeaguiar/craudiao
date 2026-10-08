#pragma once
#include <QQuick3DGeometry>
#include <QtQml/qqmlregistration.h>

// Pontos de terra do globo: cada ponto (resources/data/land.bin, pares uint16 de lat/lon) vira um quadradinho tangente à
// esfera. Uma malha só, ~18 mil quads: barato de desenhar e com tamanho de ponto que não depende do backend gráfico.
class LandGeometry : public QQuick3DGeometry
{
    Q_OBJECT
    QML_ELEMENT
    Q_PROPERTY(float radius READ radius WRITE setRadius NOTIFY radiusChanged)
    Q_PROPERTY(float dotSize READ dotSize WRITE setDotSize NOTIFY dotSizeChanged)
public:
    explicit LandGeometry(QQuick3DObject *parent = nullptr);
    float radius() const { return m_radius; }
    float dotSize() const { return m_dotSize; }
    void setRadius(float r);
    void setDotSize(float s);
    // pontos de terra aleatórios (para espalhar nós da rede ExitLag), em graus [lat, lon]
    Q_INVOKABLE QVariantList randomLandPoints(int count, int seed) const;
signals:
    void radiusChanged();
    void dotSizeChanged();
private:
    void rebuild();
    QList<QPair<float, float>> m_points;
    float m_radius = 100.f;
    float m_dotSize = 0.32f;
};

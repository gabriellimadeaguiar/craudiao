#include "nodegeometry.h"
#include "routegeometry.h"
#include <QVector3D>

NodeGeometry::NodeGeometry(QQuick3DObject *parent) : QQuick3DGeometry(parent) {}

void NodeGeometry::setPoints(const QVariantList &p) { m_points = p; rebuild(); emit pointsChanged(); }
void NodeGeometry::setRadius(float r) { if (qFuzzyCompare(r, m_radius)) return; m_radius = r; rebuild(); emit radiusChanged(); }
void NodeGeometry::setDotSize(float s) { if (qFuzzyCompare(s, m_dotSize)) return; m_dotSize = s; rebuild(); emit dotSizeChanged(); }

void NodeGeometry::rebuild()
{
    clear();
    const int n = m_points.size();
    // por vértice: posição (3) + uv (2) + cor (4: r = fase da piscada)
    constexpr int floats = 9;
    QByteArray vbuf(n * 4 * floats * int(sizeof(float)), Qt::Uninitialized);
    QByteArray ibuf(n * 6 * int(sizeof(quint32)), Qt::Uninitialized);
    auto *v = reinterpret_cast<float *>(vbuf.data());
    auto *ix = reinterpret_cast<quint32 *>(ibuf.data());
    const float r = m_radius, s = m_dotSize;
    for (int i = 0; i < n; ++i) {
        const QVariantList ll = m_points.at(i).toList();
        const QVector3D p = RouteGeometry::toVec(ll.value(0).toFloat(), ll.value(1).toFloat(), 1.f);
        QVector3D t1 = QVector3D::crossProduct(QVector3D(0, 1, 0), p);
        if (t1.lengthSquared() < 1e-6f) t1 = QVector3D(1, 0, 0);
        t1.normalize();
        const QVector3D t2 = QVector3D::crossProduct(p, t1);
        const QVector3D c = p * r;
        const float phase = i * 1.7f;
        const float uv[4][2] = { { -1, -1 }, { 1, -1 }, { 1, 1 }, { -1, 1 } };
        for (int k = 0; k < 4; ++k) {
            const QVector3D q = c + t1 * (s * uv[k][0]) + t2 * (s * uv[k][1]);
            *v++ = q.x(); *v++ = q.y(); *v++ = q.z();
            *v++ = uv[k][0]; *v++ = uv[k][1];
            *v++ = phase; *v++ = 0; *v++ = 0; *v++ = 1;
        }
        const quint32 b = quint32(i * 4);
        *ix++ = b; *ix++ = b + 1; *ix++ = b + 2; *ix++ = b; *ix++ = b + 2; *ix++ = b + 3;
    }
    setVertexData(vbuf);
    setIndexData(ibuf);
    setStride(floats * sizeof(float));
    setPrimitiveType(PrimitiveType::Triangles);
    addAttribute(Attribute::PositionSemantic, 0, Attribute::F32Type);
    addAttribute(Attribute::TexCoord0Semantic, 3 * sizeof(float), Attribute::F32Type);
    addAttribute(Attribute::ColorSemantic, 5 * sizeof(float), Attribute::F32Type);
    addAttribute(Attribute::IndexSemantic, 0, Attribute::U32Type);
    setBounds(QVector3D(-r, -r, -r), QVector3D(r, r, r));
    update();
}

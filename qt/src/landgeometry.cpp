#include "landgeometry.h"
#include "routegeometry.h"
#include <QFile>
#include <QRandomGenerator>
#include <QVector3D>
#include <QtMath>

LandGeometry::LandGeometry(QQuick3DObject *parent) : QQuick3DGeometry(parent)
{
    QFile f(QStringLiteral(":/data/land.bin"));
    if (f.open(QIODevice::ReadOnly)) {
        const QByteArray raw = f.readAll();
        const auto *u = reinterpret_cast<const quint16 *>(raw.constData());
        const int n = raw.size() / 4;
        m_points.reserve(n);
        for (int i = 0; i < n; ++i)
            m_points.append({ u[i * 2] / 100.f - 90.f, u[i * 2 + 1] / 100.f - 180.f });
    }
    rebuild();
}

void LandGeometry::setRadius(float r) { if (qFuzzyCompare(r, m_radius)) return; m_radius = r; rebuild(); emit radiusChanged(); }
void LandGeometry::setDotSize(float s) { if (qFuzzyCompare(s, m_dotSize)) return; m_dotSize = s; rebuild(); emit dotSizeChanged(); }

QVariantList LandGeometry::randomLandPoints(int count, int seed) const
{
    QVariantList out;
    if (m_points.isEmpty()) return out;
    QRandomGenerator rng(seed);
    for (int i = 0; i < count; ++i) {
        const auto &p = m_points.at(rng.bounded(m_points.size()));
        out.append(QVariant(QVariantList{ p.first, p.second }));
    }
    return out;
}

void LandGeometry::rebuild()
{
    clear();
    const int n = m_points.size();
    // por vértice: posição (3 floats) + normal (3 floats)
    QByteArray vbuf(n * 4 * 6 * int(sizeof(float)), Qt::Uninitialized);
    QByteArray ibuf(n * 6 * int(sizeof(quint32)), Qt::Uninitialized);
    auto *v = reinterpret_cast<float *>(vbuf.data());
    auto *ix = reinterpret_cast<quint32 *>(ibuf.data());
    const float r = m_radius * 1.003f, s = m_dotSize;
    for (int i = 0; i < n; ++i) {
        const QVector3D p = RouteGeometry::toVec(m_points[i].first, m_points[i].second, 1.f);
        QVector3D t1 = QVector3D::crossProduct(QVector3D(0, 1, 0), p);
        if (t1.lengthSquared() < 1e-6f) t1 = QVector3D(1, 0, 0);
        t1.normalize();
        const QVector3D t2 = QVector3D::crossProduct(p, t1);
        const QVector3D c = p * r;
        const QVector3D corners[4] = { c - t1 * s - t2 * s, c + t1 * s - t2 * s, c + t1 * s + t2 * s, c - t1 * s + t2 * s };
        for (const auto &q : corners) { *v++ = q.x(); *v++ = q.y(); *v++ = q.z(); *v++ = p.x(); *v++ = p.y(); *v++ = p.z(); }
        const quint32 b = quint32(i * 4);
        *ix++ = b; *ix++ = b + 1; *ix++ = b + 2; *ix++ = b; *ix++ = b + 2; *ix++ = b + 3;
    }
    setVertexData(vbuf);
    setIndexData(ibuf);
    setStride(6 * sizeof(float));
    setPrimitiveType(PrimitiveType::Triangles);
    addAttribute(Attribute::PositionSemantic, 0, Attribute::F32Type);
    addAttribute(Attribute::NormalSemantic, 3 * sizeof(float), Attribute::F32Type);
    addAttribute(Attribute::IndexSemantic, 0, Attribute::U32Type);
    setBounds(QVector3D(-r, -r, -r), QVector3D(r, r, r));
    update();
}

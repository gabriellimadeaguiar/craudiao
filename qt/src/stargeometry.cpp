#include "stargeometry.h"
#include <QRandomGenerator>
#include <QVector3D>
#include <QtMath>

StarGeometry::StarGeometry(QQuick3DObject *parent) : QQuick3DGeometry(parent) { rebuild(); }

void StarGeometry::setCount(int c) { if (c == m_count) return; m_count = c; rebuild(); emit countChanged(); }

void StarGeometry::rebuild()
{
    clear();
    QRandomGenerator rng(7);
    // estrelas como triângulos minúsculos (pontos de 1 px somem em telas de alta densidade)
    QByteArray vbuf(m_count * 3 * 3 * int(sizeof(float)), Qt::Uninitialized);
    auto *v = reinterpret_cast<float *>(vbuf.data());
    for (int i = 0; i < m_count; ++i) {
        const float u = float(rng.generateDouble() * 2 - 1), t = float(rng.generateDouble() * 2 * M_PI);
        const float r = 2600.f + float(rng.generateDouble()) * 900.f, s = std::sqrt(1 - u * u);
        const QVector3D p(std::cos(t) * s * r, u * r, std::sin(t) * s * r);
        QVector3D a = QVector3D::crossProduct(p, QVector3D(0, 1, 0)).normalized();
        if (a.isNull()) a = QVector3D(1, 0, 0);
        const QVector3D b = QVector3D::crossProduct(p.normalized(), a);
        const float size = 2.2f + float(std::pow(rng.generateDouble(), 3.0)) * 5.f;
        const QVector3D c[3] = { p + a * size, p - a * size * 0.5f + b * size * 0.87f, p - a * size * 0.5f - b * size * 0.87f };
        for (const auto &q : c) { *v++ = q.x(); *v++ = q.y(); *v++ = q.z(); }
    }
    setVertexData(vbuf);
    setStride(3 * sizeof(float));
    setPrimitiveType(PrimitiveType::Triangles);
    addAttribute(Attribute::PositionSemantic, 0, Attribute::F32Type);
    setBounds(QVector3D(-3500, -3500, -3500), QVector3D(3500, 3500, 3500));
    update();
}

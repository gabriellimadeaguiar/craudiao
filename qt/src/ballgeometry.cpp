#include "ballgeometry.h"
#include <QVector3D>
#include <QtMath>

BallGeometry::BallGeometry(QQuick3DObject *parent) : QQuick3DGeometry(parent)
{
    constexpr int slices = 12, stacks = 8;
    constexpr float r = 50.f;
    QByteArray vbuf, ibuf;
    for (int i = 0; i <= stacks; ++i) {
        const float phi = float(M_PI) * i / stacks;
        for (int j = 0; j <= slices; ++j) {
            const float th = 2.f * float(M_PI) * j / slices;
            const QVector3D n(qSin(phi) * qCos(th), qCos(phi), qSin(phi) * qSin(th));
            const float v[6] = { n.x() * r, n.y() * r, n.z() * r, n.x(), n.y(), n.z() };
            vbuf.append(reinterpret_cast<const char *>(v), sizeof(v));
        }
    }
    for (int i = 0; i < stacks; ++i)
        for (int j = 0; j < slices; ++j) {
            const quint16 a = quint16(i * (slices + 1) + j), b = quint16(a + slices + 1);
            const quint16 tri[6] = { a, b, quint16(a + 1), quint16(a + 1), b, quint16(b + 1) };
            ibuf.append(reinterpret_cast<const char *>(tri), sizeof(tri));
        }
    setVertexData(vbuf);
    setIndexData(ibuf);
    setStride(6 * sizeof(float));
    setPrimitiveType(PrimitiveType::Triangles);
    addAttribute(Attribute::PositionSemantic, 0, Attribute::F32Type);
    addAttribute(Attribute::NormalSemantic, 3 * sizeof(float), Attribute::F32Type);
    addAttribute(Attribute::IndexSemantic, 0, Attribute::U16Type);
    setBounds(QVector3D(-r, -r, -r), QVector3D(r, r, r));
}

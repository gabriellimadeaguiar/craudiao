#include "routegeometry.h"
#include <QtMath>
#include <algorithm>

RouteGeometry::RouteGeometry(QQuick3DObject *parent) : QQuick3DGeometry(parent) {}

// mesma convenção em todo o app: lat 0, lon 0 de frente para +Z; norte em +Y
QVector3D RouteGeometry::toVec(float lat, float lon, float r)
{
    const float la = qDegreesToRadians(lat), lo = qDegreesToRadians(lon);
    return QVector3D(std::cos(la) * std::sin(lo), std::sin(la), std::cos(la) * std::cos(lo)) * r;
}

void RouteGeometry::setStops(const QVariantList &s) { m_stops = s; buildPath(); rebuildMesh(); emit stopsChanged(); }
void RouteGeometry::setGlobeRadius(float r) { if (qFuzzyCompare(r, m_R)) return; m_R = r; buildPath(); rebuildMesh(); emit changed(); }
void RouteGeometry::setTubeRadius(float r) { if (qFuzzyCompare(r, m_tube)) return; m_tube = r; rebuildMesh(); emit changed(); }
void RouteGeometry::setLift(float l) { if (qFuzzyCompare(l, m_lift)) return; m_lift = l; buildPath(); rebuildMesh(); emit changed(); }
void RouteGeometry::setProgress(float p)
{
    p = std::clamp(p, 0.f, 1.f);
    if (qFuzzyCompare(p + 1.f, m_progress + 1.f)) return;
    m_progress = p; rebuildMesh(); emit progressChanged();
}

static QVector3D slerpUnit(const QVector3D &a, const QVector3D &b, float u)
{
    const float w = std::max(std::acos(std::clamp(QVector3D::dotProduct(a, b), -1.f, 1.f)), 1e-4f);
    const float sw = std::sin(w);
    return (a * (std::sin((1 - u) * w) / sw) + b * (std::sin(u * w) / sw)).normalized();
}

void RouteGeometry::buildPath()
{
    m_pts.clear(); m_cum.clear(); m_stopIdx.clear();
    QList<QVector3D> stops;
    for (const QVariant &v : m_stops) {
        const QVariantList ll = v.toList();
        if (ll.size() >= 2) stops.append(toVec(ll[0].toFloat(), ll[1].toFloat(), 1.f));
    }
    if (stops.size() < 2) return;
    m_stopIdx.append(0);
    // cada salto sai e pousa tangente à superfície (perfil s²(3−2s)), então dois saltos seguidos se emendam sem quina
    for (int k = 0; k < stops.size() - 1; ++k) {
        const QVector3D a = stops[k], b = stops[k + 1];
        const float w = std::acos(std::clamp(QVector3D::dotProduct(a, b), -1.f, 1.f));
        const bool end = (k == 0 || k == stops.size() - 2);
        const float h = (end ? 0.2f : m_lift);
        const int n = 60;
        for (int i = (k ? 1 : 0); i <= n; ++i) {
            const float u = float(i) / n, s = std::sin(float(M_PI) * u), e = s * s * (3 - 2 * s);
            m_pts.append(slerpUnit(a, b, u) * (1.006f + (0.02f + w * 0.25f) * h * 1.1f * e));
        }
        m_stopIdx.append(m_pts.size() - 1);
    }
    // suaviza as mudanças de rumo nos nós (média móvel curta, pontas presas)
    const int n = m_pts.size();
    for (int it = 0; it < 3; ++it) {
        const QList<QVector3D> src = m_pts;
        for (int i = 1; i < n - 1; ++i) {
            const int k = std::min({ 5, i, n - 1 - i });
            QVector3D acc; float len = 0;
            for (int j = -k; j <= k; ++j) { acc += src[i + j]; len += src[i + j].length(); }
            m_pts[i] = acc.normalized() * (len / (2 * k + 1));
        }
    }
    for (auto &p : m_pts) p *= m_R;
    float L = 0; m_cum.append(0);
    for (int i = 1; i < n; ++i) { L += (m_pts[i] - m_pts[i - 1]).length(); m_cum.append(L); }
    if (L > 0) for (auto &c : m_cum) c /= L;
}

QVector3D RouteGeometry::pointAt(float t) const
{
    if (m_pts.size() < 2) return {};
    t = std::clamp(t, 0.f, 1.f);
    const auto it = std::lower_bound(m_cum.begin(), m_cum.end(), t);
    const int i = std::clamp(int(it - m_cum.begin()), 1, int(m_pts.size()) - 1);
    const float span = m_cum[i] - m_cum[i - 1];
    const float f = span > 0 ? (t - m_cum[i - 1]) / span : 0;
    return m_pts[i - 1] + (m_pts[i] - m_pts[i - 1]) * f;
}

QVector3D RouteGeometry::stopPoint(int i) const
{
    if (i < 0 || i >= m_stopIdx.size()) return {};
    return m_pts[m_stopIdx[i]];
}

float RouteGeometry::stopT(int i) const
{
    if (i < 0 || i >= m_stopIdx.size()) return 0;
    return m_cum[m_stopIdx[i]];
}

void RouteGeometry::rebuildMesh()
{
    clear();
    const int n = m_pts.size();
    if (n < 2 || m_progress <= 0.001f) { update(); return; }
    // corta a polilinha no progresso atual
    QList<QVector3D> pts;
    for (int i = 0; i < n; ++i) {
        if (m_cum[i] <= m_progress) pts.append(m_pts[i]);
        else { pts.append(pointAt(m_progress)); break; }
    }
    if (pts.size() < 2) { update(); return; }
    const int sides = 8, rings = pts.size();
    QByteArray vbuf(rings * sides * 6 * int(sizeof(float)), Qt::Uninitialized);
    QByteArray ibuf((rings - 1) * sides * 6 * int(sizeof(quint32)), Qt::Uninitialized);
    auto *v = reinterpret_cast<float *>(vbuf.data());
    auto *ix = reinterpret_cast<quint32 *>(ibuf.data());
    QVector3D prevN;
    for (int i = 0; i < rings; ++i) {
        const QVector3D tan = (pts[std::min(i + 1, rings - 1)] - pts[std::max(i - 1, 0)]).normalized();
        // normal de referência: a direção "para fora" do globo, projetada no plano do anel (estável, sem torção)
        QVector3D nrm = pts[i].normalized();
        nrm = (nrm - tan * QVector3D::dotProduct(nrm, tan)).normalized();
        if (nrm.isNull()) nrm = prevN;
        prevN = nrm;
        const QVector3D bin = QVector3D::crossProduct(tan, nrm);
        // pontas afinam: a rota nasce e chega fina
        const float u = float(i) / (rings - 1);
        const float taper = std::min(1.f, std::min(u, 1 - u) * 14.f + 0.35f);
        for (int s = 0; s < sides; ++s) {
            const float a = float(s) / sides * 2 * float(M_PI);
            const QVector3D d = nrm * std::cos(a) + bin * std::sin(a);
            const QVector3D p = pts[i] + d * m_tube * taper;
            *v++ = p.x(); *v++ = p.y(); *v++ = p.z(); *v++ = d.x(); *v++ = d.y(); *v++ = d.z();
        }
    }
    for (int i = 0; i < rings - 1; ++i)
        for (int s = 0; s < sides; ++s) {
            const quint32 a = quint32(i * sides + s), b = quint32(i * sides + (s + 1) % sides);
            const quint32 c = a + sides, d = b + sides;
            *ix++ = a; *ix++ = c; *ix++ = b; *ix++ = b; *ix++ = c; *ix++ = d;
        }
    setVertexData(vbuf);
    setIndexData(ibuf);
    setStride(6 * sizeof(float));
    setPrimitiveType(PrimitiveType::Triangles);
    addAttribute(Attribute::PositionSemantic, 0, Attribute::F32Type);
    addAttribute(Attribute::NormalSemantic, 3 * sizeof(float), Attribute::F32Type);
    addAttribute(Attribute::IndexSemantic, 0, Attribute::U32Type);
    const float R = m_R * 1.6f;
    setBounds(QVector3D(-R, -R, -R), QVector3D(R, R, R));
    update();
}

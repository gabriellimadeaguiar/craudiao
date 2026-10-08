#pragma once
#include <QQuick3DGeometry>
#include <QtQml/qqmlregistration.h>

// Céu estrelado leve: pontos espalhados numa casca esférica grande em volta da cena.
class StarGeometry : public QQuick3DGeometry
{
    Q_OBJECT
    QML_ELEMENT
    Q_PROPERTY(int count READ count WRITE setCount NOTIFY countChanged)
public:
    explicit StarGeometry(QQuick3DObject *parent = nullptr);
    int count() const { return m_count; }
    void setCount(int c);
signals:
    void countChanged();
private:
    void rebuild();
    int m_count = 1800;
};

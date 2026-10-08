#pragma once
#include <QQuick3DGeometry>
#include <QtQml/qqmlregistration.h>

/* Esfera de poucos polígonos (raio 50, como o "#Sphere" do Qt Quick 3D) para pontos pequenos: pacotes nas rotas e
   marcadores. O "#Sphere" padrão tem milhares de vértices; desenhado com poucos pixels, este fica igual e custa
   uma fração. Uma instância é compartilhada por todos os modelos. */
class BallGeometry : public QQuick3DGeometry
{
    Q_OBJECT
    QML_ELEMENT
public:
    explicit BallGeometry(QQuick3DObject *parent = nullptr);
};

import QtQuick
import QtQuick3D
import ExitLag

// Uma rota no globo: tubo fino + halo largo e fraco (degradê sem corte duro) + pacotes correndo do início ao fim.
// Desenha-se do começo ao fim quando `drawn` liga; apaga ao contrário.
Node {
    id: root
    property Item globeItem
    property var stops: []
    property color color: Theme.success
    property real tube: 0.3
    property real lift: 0.5
    property real speed: 0.25
    property bool packets: true
    property bool drawn: false
    property real gain: 1
    property real prog: drawn ? 1 : 0
    Behavior on prog { NumberAnimation { duration: 1800; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }
    Behavior on gain { NumberAnimation { duration: 600 } }

    Model {
        visible: root.prog > 0.002
        geometry: RouteGeometry { id: geo; stops: root.stops; globeRadius: 100; tubeRadius: root.tube; lift: root.lift; progress: root.prog }
        materials: DefaultMaterial { lighting: DefaultMaterial.NoLighting; diffuseColor: root.color; opacity: 0.95 * root.gain }
    }
    Model {
        visible: root.prog > 0.002
        geometry: RouteGeometry { stops: root.stops; globeRadius: 100; tubeRadius: root.tube * 3.6; lift: root.lift; progress: root.prog }
        materials: DefaultMaterial { lighting: DefaultMaterial.NoLighting; diffuseColor: root.color; opacity: 0.16 * root.gain; blendMode: DefaultMaterial.Screen }
    }
    Repeater3D {
        model: root.packets ? 5 : 0
        delegate: Model {
            required property int index
            visible: root.prog > 0.99
            source: "#Sphere"
            readonly property real t: ((root.globeItem ? root.globeItem.time : 0) * root.speed + index / 5) % 1
            position: geo.pointAt(t)
            scale: Qt.vector3d(root.tube * 0.022, root.tube * 0.022, root.tube * 0.022)
            materials: DefaultMaterial { lighting: DefaultMaterial.NoLighting; diffuseColor: Qt.lighter(root.color, 1.35); opacity: Math.sin(Math.PI * t) * root.gain }
        }
    }
}

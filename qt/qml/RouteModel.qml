import QtQuick
import QtQuick3D
import ExitLag

/* Uma rota no globo: tubo fino + halo largo e fraco + pacotes correndo do início ao fim.
   A malha é montada uma vez; o desenho progressivo (`drawn`) e os pacotes são do shader (route.frag), com um
   único uniform de tempo. Antes, cada pacote era uma esfera com três bindings recalculados a cada quadro. */
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
    // só lê o tempo do globo quando há pacotes: rotas sem pacotes não se recalculam a cada quadro
    readonly property real clock: packets && prog > 0.99 && globeItem ? globeItem.time : 0

    RouteGeometry { id: geo; stops: root.stops; globeRadius: 100; tubeRadius: root.tube; lift: root.lift }
    RouteGeometry { id: haloGeo; stops: root.stops; globeRadius: 100; tubeRadius: root.tube * 3.6; lift: root.lift }

    Model {
        visible: root.prog > 0.002 && root.gain > 0.002
        geometry: geo
        materials: CustomMaterial {
            shadingMode: CustomMaterial.Unshaded
            sourceBlend: CustomMaterial.One
            destinationBlend: CustomMaterial.OneMinusSrcAlpha
            property color baseColor: root.color
            property real alpha: 0.95
            property real gain: root.gain
            property real progress: root.prog
            property real uTime: root.clock
            property real speed: root.speed
            property real packets: root.packets ? 1 : 0
            property real pulseWidth: 0.035
            property real pulseAlpha: 0.05
            vertexShader: "shaders/route.vert"
            fragmentShader: "shaders/route.frag"
        }
    }
    // halo: degradê largo e fraco, somado à cena; os pacotes também acendem o halo (um brilho em volta)
    Model {
        visible: root.prog > 0.002 && root.gain > 0.002
        geometry: haloGeo
        materials: CustomMaterial {
            shadingMode: CustomMaterial.Unshaded
            sourceBlend: CustomMaterial.One
            destinationBlend: CustomMaterial.One
            property color baseColor: root.color
            property real alpha: 0.16
            property real gain: root.gain
            property real progress: root.prog
            property real uTime: root.clock
            property real speed: root.speed
            property real packets: root.packets ? 1 : 0
            property real pulseWidth: 0.02
            property real pulseAlpha: 0.35
            vertexShader: "shaders/route.vert"
            fragmentShader: "shaders/route.frag"
        }
    }
}

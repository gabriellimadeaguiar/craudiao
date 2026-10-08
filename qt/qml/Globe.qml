import QtQuick
import QtQuick3D
import ExitLag

/* Globo de rotas em Qt Quick 3D, compartilhado por todas as telas.
   - Pontos de terra (LandGeometry), superfície escura com fresnel e atmosfera difusa (CustomMaterial).
   - Rotas como tubos (RouteGeometry) com halo e pacotes correndo; cada rota pertence a um grupo
     (isp, xl, map, home) que aparece, some ou esmaece junto.
   - Marcadores e etiquetas 2D presas a pontos do globo (somem quando o ponto passa para trás).
   Convenção: lat 0 / lon 0 de frente para a câmera; centralizar (lat, lon) = girar o globo por -lon e inclinar por lat. */
Item {
    id: globe
    readonly property real radius: 100
    property real lat: 0
    property real lon: 0
    property real dist: 6.45            // distância da câmera, em raios
    property real shiftX: 0             // desloca o globo na tela (px), sem mexer no tamanho
    property bool spinning: true
    property real spinSpeed: 2.2        // graus por segundo no modo ocioso
    property real time: 0
    property var routes: []             // [{ id, group, stops: [[lat, lon]...], color, tube, lift, speed, packets }]
    property var tags: []               // [{ lat, lon, text, sub, kind: you|server|bad|node|cont, below }]
    property var groupsShown: ({})
    property var groupsGain: ({})
    property real nodesOpacity: 0.35    // rede ExitLag ao fundo
    property color landColor: "#8a93a0"

    Behavior on dist { NumberAnimation { duration: 1600; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }
    Behavior on shiftX { NumberAnimation { duration: 1400; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }
    Behavior on nodesOpacity { NumberAnimation { duration: 600 } }

    function vec(la, lo, r) {
        var a = la * Math.PI / 180, o = lo * Math.PI / 180;
        return Qt.vector3d(Math.cos(a) * Math.sin(o) * r, Math.sin(a) * r, Math.cos(a) * Math.cos(o) * r);
    }
    // centraliza um ponto com uma animação suave pelo caminho mais curto
    function lookAt(la, lo, d) {
        spinning = false;
        var dl = ((lo - lon) % 360 + 540) % 360 - 180;
        latAnim.to = Math.max(-55, Math.min(55, la)); lonAnim.to = lon + dl;
        moveAnim.restart();
        if (d !== undefined) dist = d;
    }
    function idle(d, la, lo) {
        clear();
        if (la !== undefined) lookAt(la, lo);
        dist = d || 6.45;
        spinTimer.restart();
    }
    function clear() { routes = []; tags = []; groupsShown = ({}); groupsGain = ({}); }
    function show(group, on) { var g = Object.assign({}, groupsShown); g[group] = on; groupsShown = g; }
    function gain(group, k) { var g = Object.assign({}, groupsGain); g[group] = k; groupsGain = g; }
    function addRoute(r) { routes = routes.concat([r]); }
    function addTag(t) { tags = tags.concat([t]); return tags.length - 1; }
    function setTag(i, patch) { var a = tags.slice(); a[i] = Object.assign({}, a[i], patch); tags = a; }
    // enquadra um conjunto de pontos: centro médio e distância para caber tudo
    function frame(points, minD, maxD) {
        var x = 0, y = 0, z = 0;
        points.forEach(function (p) { var v = vec(p[0], p[1], 1); x += v.x; y += v.y; z += v.z; });
        var l = Math.sqrt(x * x + y * y + z * z) || 1; x /= l; y /= l; z /= l;
        var cla = Math.asin(y) * 180 / Math.PI, clo = Math.atan2(x, z) * 180 / Math.PI;
        var spread = 0;
        points.forEach(function (p) { var v = vec(p[0], p[1], 1); spread = Math.max(spread, Math.acos(Math.max(-1, Math.min(1, v.x * x + v.y * y + v.z * z)))); });
        lookAt(cla, clo, Math.max(minD || 2.9, Math.min(maxD || 6.45, 1.4 + spread * 5.2)));
    }

    ParallelAnimation {
        id: moveAnim
        NumberAnimation { id: latAnim; target: globe; property: "lat"; duration: 1600; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard }
        NumberAnimation { id: lonAnim; target: globe; property: "lon"; duration: 1600; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard }
    }
    Timer { id: spinTimer; interval: 1700; onTriggered: globe.spinning = true }

    FrameAnimation {
        running: globe.visible
        onTriggered: {
            globe.time += frameTime;
            if (globe.spinning && !moveAnim.running) globe.lon += frameTime * globe.spinSpeed;
        }
    }

    View3D {
        id: view
        x: globe.shiftX
        width: parent.width; height: parent.height
        renderMode: View3D.Offscreen
        environment: SceneEnvironment {
            backgroundMode: SceneEnvironment.Transparent
            antialiasingMode: SceneEnvironment.MSAA
            antialiasingQuality: SceneEnvironment.High
        }
        camera: cam
        PerspectiveCamera { id: cam; z: globe.dist * globe.radius; fieldOfView: 30; clipNear: 5; clipFar: 9000 }

        // céu
        Model {
            geometry: StarGeometry { }
            materials: DefaultMaterial { lighting: DefaultMaterial.NoLighting; diffuseColor: "#b9c7dc"; opacity: 0.5 }
        }

        Node {
            id: tilt
            eulerRotation.x: globe.lat
            Node {
                id: spin
                eulerRotation.y: -globe.lon

                Model {
                    source: "#Sphere"
                    scale: Qt.vector3d(globe.radius / 50 * 0.995, globe.radius / 50 * 0.995, globe.radius / 50 * 0.995)
                    materials: CustomMaterial {
                        shadingMode: CustomMaterial.Unshaded
                        property color deepColor: "#07080b"
                        property color rimColor: "#6f8fb8"
                        vertexShader: "shaders/glow.vert"
                        fragmentShader: "shaders/glow.frag"
                    }
                }
                Model {
                    geometry: LandGeometry { id: land; radius: globe.radius; dotSize: globe.dist < 4.6 ? 0.22 : 0.34 }
                    materials: DefaultMaterial { lighting: DefaultMaterial.NoLighting; diffuseColor: globe.landColor; opacity: 0.85 }
                }
                // rede ExitLag ao fundo: pontos verdes discretos piscando
                Repeater3D {
                    model: land.randomLandPoints(140, 7)
                    delegate: Model {
                        required property var modelData
                        required property int index
                        source: "#Sphere"
                        position: globe.vec(modelData[0], modelData[1], globe.radius * 1.006)
                        scale: Qt.vector3d(0.01, 0.01, 0.01)
                        materials: DefaultMaterial {
                            lighting: DefaultMaterial.NoLighting; diffuseColor: Theme.success
                            opacity: globe.nodesOpacity * (0.45 + 0.55 * Math.abs(Math.sin(globe.time * 1.3 + index * 1.7)))
                        }
                    }
                }
                Repeater3D {
                    model: globe.routes
                    delegate: RouteModel {
                        required property var modelData
                        globeItem: globe
                        stops: modelData.stops
                        color: modelData.color || Theme.success
                        tube: modelData.tube || 0.3
                        lift: modelData.lift !== undefined ? modelData.lift : 0.5
                        speed: modelData.speed || 0.25
                        packets: modelData.packets !== false
                        drawn: globe.groupsShown[modelData.group] === true
                        gain: globe.groupsGain[modelData.group] !== undefined ? globe.groupsGain[modelData.group] : 1
                    }
                }
                Repeater3D {
                    id: markers
                    model: globe.tags
                    delegate: Node {
                        required property var modelData
                        position: globe.vec(modelData.lat, modelData.lon, globe.radius * 1.008)
                        readonly property color c: modelData.kind === "you" ? "#ebeced" : modelData.kind === "bad" ? Theme.primary : modelData.kind === "server" || modelData.kind === "node" ? Theme.success : "#ebeced"
                        readonly property real s: modelData.kind === "node" || modelData.kind === "cont" ? 0.011 : 0.018
                        Model {
                            source: "#Sphere"; scale: Qt.vector3d(parent.s, parent.s, parent.s)
                            materials: DefaultMaterial { lighting: DefaultMaterial.NoLighting; diffuseColor: parent.parent.c }
                        }
                        // anel que pulsa em volta do ponto
                        Model {
                            visible: modelData.kind !== "node" && modelData.kind !== "cont"
                            source: "#Sphere"
                            property real k: (globe.time * 0.6) % 1
                            scale: Qt.vector3d(parent.s * (1 + k * 3), parent.s * (1 + k * 3), parent.s * (1 + k * 3))
                            materials: DefaultMaterial { lighting: DefaultMaterial.NoLighting; diffuseColor: parent.parent.c; opacity: 0.35 * (1 - parent.k) }
                        }
                    }
                }
            }
        }

        // atmosfera: fica parada (não gira com o globo), desenhada pelas faces de trás
        Model {
            source: "#Sphere"
            scale: Qt.vector3d(globe.radius / 50 * 1.22, globe.radius / 50 * 1.22, globe.radius / 50 * 1.22)
            materials: CustomMaterial {
                shadingMode: CustomMaterial.Unshaded
                cullMode: Material.FrontFaceCulling
                sourceBlend: CustomMaterial.One
                destinationBlend: CustomMaterial.One
                property color rimColor: "#6f8fb8"
                property real intensity: 0.5
                vertexShader: "shaders/atmo.vert"
                fragmentShader: "shaders/atmo.frag"
            }
        }
    }

    // etiquetas 2D presas aos marcadores
    Repeater {
        model: globe.tags
        delegate: GlobeTag {
            required property var modelData
            required property int index
            repeater: markers
            tagIndex: index
            view3d: view
            offsetX: globe.shiftX
            text: modelData.text || ""
            sub: modelData.sub || ""
            kind: modelData.kind
            below: modelData.below === true
            hidden: modelData.hidden === true || !modelData.text
        }
    }
}

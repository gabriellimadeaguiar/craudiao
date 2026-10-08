import QtQuick
import QtQuick3D
import QtQuick.Shapes
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
    // destino de câmera (as telas mexem nestes) e o valor desenhado, que persegue o destino suavemente a cada quadro
    property real lat: 0
    property real lon: 0
    property real dist: 6.45            // distância da câmera, em raios
    property real shiftX: 0             // desloca o globo na tela (px), sem mexer no tamanho
    property real curLat: 0
    property real curLon: 0
    property real curDist: 7.4
    property real curShift: 0
    property bool spinning: true
    property real spinSpeed: 2.2        // graus por segundo no modo ocioso
    property real spinRamp: 0           // o giro ocioso começa devagar e acelera, sem tranco
    property bool interactive: true     // arrastar para girar, roda para aproximar
    property bool offline: false        // ExitLag desligada: o globo fica num laranja sutil
    property real time: 0
    // rotas e etiquetas em ListModel: acrescentar uma não recria as outras (com um array, cada addRoute refazia
    // todos os modelos 3D). Cada item guarda o objeto em JSON.
    ListModel { id: routesModel }   // { group, stops: [[lat, lon]...], color, tube, lift, speed, packets }
    ListModel { id: tagsModel }     // { lat, lon, text, sub, kind: you|server|bad|node|cont, below }
    property var groupsShown: ({})
    property var groupsGain: ({})
    property real nodesOpacity: offline ? 0.08 : 0.35
    readonly property color landColor: Qt.tint(baseLand, Qt.rgba(0.133, 0.922, 0.639, flash * 0.45))
    // flash: 0..1, pisca o globo de verde (fim do network map); mistura na borda, na terra e no halo
    property real flash: 0
    property color baseRim: offline ? Theme.globeRimOff : Theme.globeRim
    property color baseLand: offline ? Theme.globeLandOff : Theme.globeLand
    readonly property color rimColor: Qt.tint(baseRim, Qt.rgba(0.133, 0.922, 0.639, flash * 0.75))
    Behavior on nodesOpacity { NumberAnimation { duration: Theme.d500 } }
    Behavior on baseLand { ColorAnimation { duration: Theme.d900 } }
    Behavior on baseRim { ColorAnimation { duration: Theme.d900 } }

    // centro e raio do globo na tela (para a órbita de jogos, o cursor e o pulso)
    readonly property real screenRadius: height / 2 / Math.tan(15 * Math.PI / 180) / Math.sqrt(Math.max(curDist * curDist - 1, 0.01))
    readonly property point screenCenter: Qt.point(width / 2 + curShift, height / 2)

    function vec(la, lo, r) {
        var a = la * Math.PI / 180, o = lo * Math.PI / 180;
        return Qt.vector3d(Math.cos(a) * Math.sin(o) * r, Math.sin(a) * r, Math.cos(a) * Math.cos(o) * r);
    }
    // centraliza um ponto pelo caminho mais curto; o movimento em si é a suavização do quadro
    function lookAt(la, lo, d) {
        spinning = false; spinRamp = 0; velLat = 0; velLon = 0;
        var dl = ((lo - curLon) % 360 + 540) % 360 - 180;
        lat = Math.max(-60, Math.min(60, la)); lon = curLon + dl;
        if (d !== undefined) dist = d;
    }
    function idle(d, la, lo) {
        clear();
        if (la !== undefined) lookAt(la, lo);
        dist = d || 6.45;
        spinTimer.interval = 1800; spinTimer.restart();
    }
    function clear() { routesModel.clear(); tagsModel.clear(); groupsShown = ({}); groupsGain = ({}); }
    function show(group, on) { var g = Object.assign({}, groupsShown); g[group] = on; groupsShown = g; }
    function gain(group, k) { var g = Object.assign({}, groupsGain); g[group] = k; groupsGain = g; }
    function addRoute(r) {
        var o = Object.assign({}, r);
        if (o.color !== undefined) o.color = String(o.color);   // cor do QML vira "#rrggbb" para caber no JSON
        routesModel.append({ json: JSON.stringify(o) });
    }
    function addTag(t) { tagsModel.append({ json: JSON.stringify(t) }); return tagsModel.count - 1; }
    function setTag(i, patch) {
        if (i < 0 || i >= tagsModel.count) return;
        tagsModel.setProperty(i, "json", JSON.stringify(Object.assign(JSON.parse(tagsModel.get(i).json), patch)));
    }
    // anel verde que sai da borda do globo, uma vez (ligar a ExitLag)
    // flash verde: sobe em 0,35 s e apaga em 1,6 s, com o anel saindo da borda
    function celebrate() { flashAnim.restart(); pulse(Theme.success); }
    SequentialAnimation {
        id: flashAnim
        NumberAnimation { target: globe; property: "flash"; from: 0; to: 1; duration: 350; easing.type: Easing.InOutSine }
        NumberAnimation { target: globe; property: "flash"; to: 0; duration: 1600; easing.type: Easing.InQuad }
    }
    function pulse(color) { pulseRing.tint = color || Theme.success; pulseAnim.restart(); }
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

    Timer { id: spinTimer; interval: 1800; onTriggered: globe.spinning = true }

    // inércia do arrasto
    property real velLat: 0
    property real velLon: 0
    property bool dragging: false

    /* Ritmo das animações conforme o uso (economia de energia enquanto a pessoa joga):
       full: janela em foco, um passo por quadro da tela; low: visível sem foco, 15 passos por segundo;
       off: minimizada ou escondida, parado (o Qt também deixa de desenhar). */
    property string power: "full"
    FrameAnimation {
        running: globe.visible && globe.power === "full"
        onTriggered: globe.step(Math.min(frameTime, 0.05))
    }
    Timer {
        interval: 66; repeat: true
        running: globe.visible && globe.power === "low"
        onTriggered: globe.step(0.066)
    }
    function step(dt) {
            globe.time += dt;
            if (!globe.dragging) {
                // solta o globo com a velocidade do arrasto e deixa parar devagar
                if (Math.abs(globe.velLon) + Math.abs(globe.velLat) > 0.05) {
                    globe.lon += globe.velLon * dt; globe.lat = Math.max(-70, Math.min(70, globe.lat + globe.velLat * dt));
                    var dec = Math.exp(-dt * 2.6); globe.velLon *= dec; globe.velLat *= dec;
                }
                if (globe.spinning) {
                    globe.spinRamp = Math.min(1, globe.spinRamp + dt * 0.6);
                    globe.lon += dt * globe.spinSpeed * globe.spinRamp * globe.spinRamp;
                }
            }
            // perseguição exponencial: muda de destino no meio do caminho sem tranco
            var kr = 1 - Math.exp(-dt * (globe.dragging ? 16 : 2.4));
            var kd = 1 - Math.exp(-dt * 2.0);
            globe.curLat += (globe.lat - globe.curLat) * kr;
            globe.curLon += (globe.lon - globe.curLon) * kr;
            // perto do destino, encaixa: o valor para de mudar e quem depende dele (órbita, etiquetas) também para
            var dd = globe.dist - globe.curDist, ds = globe.shiftX - globe.curShift;
            if (Math.abs(dd) > 0.0005) globe.curDist += dd * kd; else if (dd !== 0) globe.curDist = globe.dist;
            if (Math.abs(ds) > 0.05) globe.curShift += ds * kd; else if (ds !== 0) globe.curShift = globe.shiftX;
    }

    // arrastar gira (com inércia), roda aproxima; o cursor vira mão aberta sobre o planeta
    DragHandler {
        id: drag
        enabled: globe.interactive
        target: null
        property point last: Qt.point(0, 0)
        property real lastT: 0
        onActiveChanged: {
            globe.dragging = active;
            if (active) { last = Qt.point(0, 0); lastT = Date.now(); globe.spinning = false; globe.spinRamp = 0; globe.velLat = 0; globe.velLon = 0; spinTimer.stop(); }
            else spinTimer.interval = 4000, spinTimer.restart();
        }
        onTranslationChanged: {
            var dx = translation.x - last.x, dy = translation.y - last.y, now = Date.now(), dtt = Math.max(1, now - lastT) / 1000;
            last = translation; lastT = now;
            var k = 0.22 * globe.curDist / 6.45;
            globe.lon -= dx * k; globe.lat = Math.max(-70, Math.min(70, globe.lat + dy * k));
            globe.velLon = globe.velLon * 0.6 + (-dx * k / dtt) * 0.4;
            globe.velLat = globe.velLat * 0.6 + (dy * k / dtt) * 0.4;
        }
    }
    WheelHandler {
        enabled: globe.interactive
        target: null
        onWheel: function (e) { globe.dist = Math.max(2.4, Math.min(9, globe.dist * (1 - e.angleDelta.y / 1600))); }
    }
    HoverHandler {
        enabled: globe.interactive
        readonly property bool overGlobe: {
            var dx = point.position.x - globe.screenCenter.x, dy = point.position.y - globe.screenCenter.y;
            return Math.sqrt(dx * dx + dy * dy) < globe.screenRadius;
        }
        cursorShape: drag.active ? Qt.ClosedHandCursor : overGlobe ? Qt.OpenHandCursor : Qt.ArrowCursor
    }

    // luz difusa ao fundo: um halo largo e suave atrás do planeta (some no laranja quando a ExitLag desliga)
    Item {
        id: backGlow
        visible: !Platform.flag("NOGLOW")
        readonly property real r: globe.screenRadius * 2.6
        x: globe.screenCenter.x - r; y: globe.screenCenter.y - r; width: r * 2; height: r * 2
        Shape {
            anchors.fill: parent
            ShapePath {
                strokeColor: "transparent"
                fillGradient: RadialGradient {
                    centerX: backGlow.r; centerY: backGlow.r; centerRadius: backGlow.r; focalX: backGlow.r; focalY: backGlow.r
                    GradientStop { position: 0.0; color: Qt.rgba(globe.rimColor.r, globe.rimColor.g, globe.rimColor.b, 0.30 + globe.flash * 0.2) }
                    GradientStop { position: 0.32; color: Qt.rgba(globe.rimColor.r, globe.rimColor.g, globe.rimColor.b, 0.16 + globe.flash * 0.12) }
                    GradientStop { position: 0.6; color: Qt.rgba(globe.rimColor.r, globe.rimColor.g, globe.rimColor.b, 0.05) }
                    GradientStop { position: 1.0; color: "transparent" }
                }
                PathAngleArc { centerX: backGlow.r; centerY: backGlow.r; radiusX: backGlow.r; radiusY: backGlow.r; startAngle: 0; sweepAngle: 360 }
            }
        }
    }

    View3D {
        id: view
        x: globe.curShift
        width: parent.width; height: parent.height
        // Inline: desenha o 3D no mesmo passo do 2D (com o MSAA da janela), sem textura intermediária.
        // Medido: ~2× mais quadros que Offscreen com MSAA próprio, mesmo resultado visual.
        renderMode: Platform.flag("OFFSCREEN") ? View3D.Offscreen : View3D.Inline
        environment: SceneEnvironment {
            backgroundMode: SceneEnvironment.Transparent
            antialiasingMode: Platform.flag("NOAA") ? SceneEnvironment.NoAA : SceneEnvironment.MSAA
            antialiasingQuality: SceneEnvironment.High
        }
        camera: cam
        BallGeometry { id: ballGeo }
        PerspectiveCamera { id: cam; z: globe.curDist * globe.radius; fieldOfView: 30; clipNear: 5; clipFar: 9000 }

        // céu
        Model {
            visible: !Platform.flag("NOSTARS")
            geometry: StarGeometry { }
            materials: DefaultMaterial { lighting: DefaultMaterial.NoLighting; diffuseColor: Theme.globeStars; opacity: 0.5 }
        }

        Node {
            id: tilt
            eulerRotation.x: globe.curLat
            Node {
                id: spin
                eulerRotation.y: -globe.curLon

                Model {
                    source: "#Sphere"
                    scale: Qt.vector3d(globe.radius / 50 * 0.995, globe.radius / 50 * 0.995, globe.radius / 50 * 0.995)
                    materials: CustomMaterial {
                        shadingMode: CustomMaterial.Unshaded
                        property color deepColor: Theme.globeDeep
                        property color rimColor: globe.rimColor
                        vertexShader: "shaders/glow.vert"
                        fragmentShader: "shaders/glow.frag"
                    }
                }
                Model {
                    visible: !Platform.flag("NOLAND")
                    geometry: LandGeometry { id: land; radius: globe.radius; dotSize: globe.dist < 4.6 ? 0.22 : 0.34 }
                    materials: DefaultMaterial { lighting: DefaultMaterial.NoLighting; diffuseColor: globe.landColor; opacity: 0.85 }
                }
                // rede ExitLag ao fundo: pontos verdes discretos piscando (uma malha só; a piscada é do shader)
                Model {
                    visible: !Platform.flag("NONODES")
                    geometry: NodeGeometry { points: land.randomLandPoints(140, 7); radius: globe.radius * 1.006 }
                    materials: CustomMaterial {
                        shadingMode: CustomMaterial.Unshaded
                        sourceBlend: CustomMaterial.One
                        destinationBlend: CustomMaterial.OneMinusSrcAlpha
                        property real uTime: globe.time
                        property real baseOpacity: globe.nodesOpacity
                        property color nodeColor: Theme.success
                        vertexShader: "shaders/nodes.vert"
                        fragmentShader: "shaders/nodes.frag"
                    }
                }
                Repeater3D {
                    model: routesModel
                    delegate: RouteModel {
                        required property string json
                        readonly property var modelData: JSON.parse(json)
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
                    model: tagsModel
                    delegate: Node {
                        required property string json
                        readonly property var modelData: JSON.parse(json)
                        position: globe.vec(modelData.lat, modelData.lon, globe.radius * 1.008)
                        readonly property color c: modelData.kind === "you" ? Theme.textMain : modelData.kind === "bad" ? Theme.primary : modelData.kind === "server" || modelData.kind === "node" ? Theme.success : Theme.textMain
                        readonly property real s: modelData.kind === "node" || modelData.kind === "cont" ? 0.011 : 0.018
                        Model {
                            geometry: ballGeo; scale: Qt.vector3d(parent.s, parent.s, parent.s)
                            materials: DefaultMaterial { lighting: DefaultMaterial.NoLighting; diffuseColor: parent.parent.c }
                        }
                        // anel que pulsa em volta do ponto
                        Model {
                            visible: modelData.kind !== "node" && modelData.kind !== "cont"
                            geometry: ballGeo
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
            visible: !Platform.flag("NOATMO")
            source: "#Sphere"
            scale: Qt.vector3d(globe.radius / 50 * 1.6, globe.radius / 50 * 1.6, globe.radius / 50 * 1.6)
            materials: CustomMaterial {
                shadingMode: CustomMaterial.Unshaded
                cullMode: Material.FrontFaceCulling
                sourceBlend: CustomMaterial.One
                destinationBlend: CustomMaterial.One
                property color rimColor: globe.rimColor
                property real intensity: 0.42 + globe.flash * 0.4
                property real outer: 1.6
                property real falloff: 4.5
                vertexShader: "shaders/atmo.vert"
                fragmentShader: "shaders/atmo.frag"
            }
        }
    }

    // etiquetas 2D presas aos marcadores
    Repeater {
        model: tagsModel
        delegate: GlobeTag {
            required property string json
            readonly property var modelData: JSON.parse(json)
            required property int index
            repeater: markers
            tagIndex: index
            view3d: view
            offsetX: globe.curShift
            text: modelData.text || ""
            sub: modelData.sub || ""
            kind: modelData.kind
            below: modelData.below === true
            hidden: modelData.hidden === true || !modelData.text
        }
    }

    Rectangle {
        id: pulseRing
        x: globe.screenCenter.x - width / 2; y: globe.screenCenter.y - height / 2
        width: globe.screenRadius * 2; height: width; radius: width / 2
        color: "transparent"; border.width: 2; border.color: pulseRing.tint
        property color tint: Theme.success
        opacity: 0
        ParallelAnimation {
            id: pulseAnim
            NumberAnimation { target: pulseRing; property: "scale"; from: 1; to: 1.5; duration: Theme.d900 * 1.4; easing.type: Easing.OutCubic }
            NumberAnimation { target: pulseRing; property: "opacity"; from: 0.9; to: 0; duration: Theme.d900 * 1.4; easing.type: Easing.OutCubic }
        }
    }
}

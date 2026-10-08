import QtQuick
import "Logic.js" as L

/* Jogos em órbita do globo, como no protótipo de origem (home V9).
   - Fechada: só o jogo selecionado aparece, 64 px abaixo da borda do planeta, com o nome embaixo.
   - Mouse sobre o planeta (elipse da órbita): os outros saem de dentro do globo em cascata, com mola, a partir
     dos vizinhos do selecionado; ao sair, voltam na ordem inversa. Aberta, a órbita gira devagar.
   - Elipse na tela (não 3D): metade de trás mais baixa, "atrás" do planeta, recortada pelo disco (shader).
   - Profundidade muda a escala; selecionado e item sob o mouse ficam opacos, os outros a 55%.
   - Clique: abre o jogo (painel). No selecionado com o painel aberto, fecha o painel.
   Leve: um Item por jogo, posições calculadas num único laço por quadro. */
Item {
    id: root
    property var globe
    property var ids: []
    property string selected: ""
    property var optimized: ({})
    property bool exitlagOn: true
    property bool panelOpen: false
    property bool locked: false          // tour: a órbita não reage ao mouse
    property bool open: false
    signal picked(string id)
    anchors.fill: parent

    readonly property int n: ids.length
    readonly property int selIndex: Math.max(0, ids.indexOf(selected))
    readonly property real step: 2 * Math.PI / Math.max(1, n)
    // tamanho do planeta inteiro (distância 6.45), fixo: a órbita não muda quando a câmera aproxima
    readonly property real gp: globe.height / 2 / Math.tan(15 * Math.PI / 180) / Math.sqrt(6.45 * 6.45 - 1)
    readonly property real cx: globe.screenCenter.x
    readonly property real cy: globe.screenCenter.y
    readonly property real ry: Math.min(gp * 1.32, height / 2 - 128)
    readonly property real rx: Math.min(Math.max(gp * 1.7, ry * 1.25), 420)
    readonly property real e0: Math.min(1, (gp + 64) / ry)
    readonly property real driftSpeed: 0.06          // rad/s com a órbita aberta
    property string hoveredId: ""

    // estado das molas
    property real clock: 0
    property real r9: 0
    property real r9v: 0
    property real a8: Math.PI / 2
    property var st: []                 // por jogo: { p, pv, start, h, hv }

    onIdsChanged: { var s = []; for (var i = 0; i < n; i++) s.push({ p: ids[i] === selected ? 1 : 0, pv: 0, start: 0, h: 0, hv: 0 }); st = s; }
    onOpenChanged: {
        // cascata: abrindo, dos vizinhos do selecionado para fora; fechando, de fora para dentro
        for (var i = 0; i < n; i++) {
            var d = Math.abs(i - selIndex); d = Math.min(d, n - d);
            st[i].start = clock + (open ? Math.max(0, d - 1) * 0.06 : (Math.floor(n / 2) - d) * 0.028);
        }
        if (open) globe.dist = 6.45;
    }

    function setOpen(o) { if (!locked && open !== o) open = o; }
    function insideEllipse(x, y, m) {
        var dx = (x - cx) / (rx + m), dy = (y - cy) / (ry + m);
        return dx * dx + dy * dy < 1;
    }

    HoverHandler {
        id: hov
        onPointChanged: root.setOpen(root.insideEllipse(point.position.x, point.position.y, root.open ? 70 : 10))
        onHoveredChanged: if (!hovered) root.setOpen(false)
    }

    // roda só em foco e enquanto algo se mexe: aberta (gira), molas em movimento ou o mouse num ícone
    property string power: "full"
    property bool settled: false
    readonly property bool needsTicks: root.visible && root.n > 0 && (root.open || !root.settled || root.hoveredId !== "")
    FrameAnimation {
        running: root.needsTicks && root.power === "full"
        onTriggered: root.tick(Math.min(frameTime, 0.05))
    }
    // sem foco: 15 passos por segundo, só até assentar
    Timer {
        interval: 66; repeat: true
        running: root.needsTicks && root.power === "low"
        onTriggered: root.tick(0.066)
    }
    onSelectedChanged: settled = false
    onCxChanged: settled = false
    onCyChanged: settled = false

    function wrap(a) { return ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; }

    function tick(dt) {
        clock += dt;
        // raio da órbita: mola com leve sobra
        var t = open ? 1 : 0;
        r9v += ((t - r9) * 170 - r9v * 21) * dt; r9 += r9v * dt;
        // ângulo: aberta, gira devagar (para sob o mouse num ícone); fechada, leva o selecionado para a frente
        if (open) { if (hoveredId === "") a8 += driftSpeed * dt; }
        else a8 += wrap(Math.PI / 2 - selIndex * step - a8) * (1 - Math.exp(-5 * dt));
        var e = e0 + (1 - e0) * r9;

        var moving = Math.abs(r9v) > 0.002 || Math.abs(r9 - (open ? 1 : 0)) > 0.002
                  || (!open && Math.abs(wrap(Math.PI / 2 - selIndex * step - a8)) > 0.0005);
        for (var i = 0; i < n; i++) {
            var it = rep.itemAt(i); if (!it) continue;
            var s = st[i], sel = i === selIndex, hovered = ids[i] === hoveredId;
            var tg = (open || sel) ? 1 : 0;
            if (clock >= s.start || sel) { s.pv += ((tg - s.p) * 95 - s.pv * 15) * dt; s.p = Math.max(0, s.p + s.pv * dt); }
            s.hv += (((hovered ? 1 : 0) - s.h) * 260 - s.hv * 24) * dt; s.h += s.hv * dt;

            if (Math.abs(s.pv) > 0.002 || Math.abs(s.hv) > 0.002 || clock < s.start) moving = true;
            var p = s.p;
            var a = a8 + i * step - (1 - Math.min(1, p)) * 0.55;
            var sn = Math.sin(a), yr = sn < 0 ? Math.min(ry, gp - 14) : ry;
            var x = cx + Math.cos(a) * rx * e * p, y = cy + sn * yr * e * p;
            var depth = (sn + 1) / 2;
            var sc = (0.82 + 0.18 * depth) * (sel ? (1.18 + 0.3 * r9) * (1 + 0.15 * s.h) : (1 + 0.42 * s.h));
            // atrás do planeta e sob o mouse: sobe até sair de trás do disco
            var dxg = x - cx;
            if (sn < 0 && Math.abs(dxg) < gp) {
                var discTop = cy - Math.sqrt(gp * gp - dxg * dxg), bottom = y + 32 * sc;
                y -= Math.max(0, bottom - discTop + 12) * s.h;
            }
            it.x = x - 32; it.y = y - 32;
            it.scale = Math.max(0.01, sc);
            it.z = hovered ? 40 : sel ? 30 : 10 + Math.round(depth * 10);
            it.presence = p;
            // recorte pelo disco: entrando ou na metade de trás, encostando no planeta
            var dist = Math.sqrt(dxg * dxg + (y - cy) * (y - cy));
            it.masked = !sel && (p < 0.995 || sn < 0) && dist < gp + 32 * sc;
            it.maskCenter = Qt.point((cx - x) / sc + 32, (cy - y) / sc + 32);
            it.maskRadius = (gp - 2) / sc;
        }
        settled = !moving;
        // nome sob o selecionado (ou sob o item com o mouse)
        var li = hoveredId !== "" ? ids.indexOf(hoveredId) : selIndex, lt = rep.itemAt(li);
        if (lt) { label.x = lt.x + 32 - label.width / 2; label.y = lt.y + 32 + 32 * lt.scale + 8; label.text = L.CATALOG[ids[li]] ? L.CATALOG[ids[li]].name : ""; }
    }

    Repeater {
        id: rep
        model: root.ids
        delegate: Item {
            id: g
            required property var modelData
            required property int index
            readonly property bool sel: index === root.selIndex
            property real presence: sel ? 1 : 0
            property bool masked: false
            property point maskCenter: Qt.point(0, 0)
            property real maskRadius: 0
            width: 64; height: 64
            visible: presence > 0.02
            opacity: (sel || root.hoveredId === modelData ? 1 : 0.55) * Math.min(1, presence * 1.5)
            Behavior on opacity { NumberAnimation { duration: Theme.d300 } }

            layer.enabled: masked
            layer.smooth: true
            layer.textureSize: Qt.size(128, 128)
            layer.effect: ShaderEffect {
                property vector2d size: Qt.vector2d(64, 64)
                property vector2d center: Qt.vector2d(g.maskCenter.x, g.maskCenter.y)
                property real radius: g.maskRadius
                fragmentShader: "qrc:/shaders/discmask.frag.qsb"
            }

            Image {
                anchors.fill: parent
                source: L.iconFor(g.modelData)
                sourceSize.width: 128; sourceSize.height: 128
                smooth: true; mipmap: true
            }
            // otimizado: ponto verde piscando
            Rectangle {
                visible: !!root.optimized[g.modelData]
                x: parent.width - width - 5; y: 5
                width: 8; height: 8; radius: 4
                color: root.exitlagOn ? Theme.success : Theme.stroke
                border.width: 2; border.color: "#b3050608"
                SequentialAnimation on opacity {
                    running: parent.visible && root.exitlagOn && root.power === "full"; loops: Animation.Infinite
                    NumberAnimation { to: 0.25; duration: 800; easing.type: Easing.InOutSine }
                    NumberAnimation { to: 1; duration: 800; easing.type: Easing.InOutSine }
                }
            }
            HoverHandler {
                enabled: g.presence > 0.5
                cursorShape: Qt.PointingHandCursor
                onHoveredChanged: {
                    if (hovered) root.hoveredId = g.modelData;
                    else if (root.hoveredId === g.modelData) root.hoveredId = "";
                }
            }
            TapHandler { enabled: g.presence > 0.5; onTapped: root.picked(g.modelData) }
            Accessible.role: Accessible.Button
            Accessible.name: L.CATALOG[modelData] ? L.CATALOG[modelData].name : modelData
        }
    }

    // nome do jogo: some com o painel aberto, a menos que o mouse esteja num ícone
    Txt {
        id: label
        role: "body"; font.pixelSize: 16; lineHeight: 24; lineHeightMode: Text.FixedHeight
        font.weight: Font.Medium; color: Theme.textMain; style: Text.Raised; styleColor: "#99000000"
        opacity: root.panelOpen && root.hoveredId === "" ? 0 : 1
        Behavior on opacity { NumberAnimation { duration: Theme.d300 } }
        z: 50
    }
}

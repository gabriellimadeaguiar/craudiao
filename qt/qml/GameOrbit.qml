import QtQuick
import "Logic.js" as L

/* Jogos em órbita do globo (ícones de app). Fechada, só o jogo em destaque aparece, à frente do planeta; os outros
   ficam escondidos atrás dele. Com o mouse sobre o globo, todos saem de trás em cascata, com mola, e giram num anel
   inclinado em volta; ao sair, voltam juntos e rápido. Profundidade: atrás do planeta ficam menores e apagados.
   Leve: um Item 2D por jogo, posicionado a partir do centro e do raio do globo na tela. */
Item {
    id: root
    property var globe
    property var ids: []
    property string selected: ""
    property var optimized: ({})
    property bool exitlagOn: true
    signal picked(string id)
    anchors.fill: parent

    readonly property real cx: globe.screenCenter.x
    readonly property real cy: globe.screenCenter.y
    readonly property real r: globe.screenRadius
    // aberta enquanto o mouse está sobre o planeta ou sobre a órbita (com uma folga para atravessar até um ícone)
    property bool open: false
    property real spin: 0

    HoverHandler {
        id: hov
        onPointChanged: {
            var dx = point.position.x - root.cx, dy = (point.position.y - root.cy) / 0.5;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (hovered && d < root.r * 1.6) { root.open = true; closeTimer.stop(); }
            else closeTimer.restart();
        }
        onHoveredChanged: if (!hovered) closeTimer.restart()
    }
    Timer { id: closeTimer; interval: 500; onTriggered: root.open = false }
    FrameAnimation { running: root.visible && root.open; onTriggered: root.spin += frameTime * 0.12 }

    Repeater {
        model: root.ids
        delegate: Item {
            id: g
            required property var modelData
            required property int index
            readonly property bool sel: modelData === root.selected
            // saída de trás do globo: cada ícone com a sua mola e um atraso em cascata
            property real out: 0
            readonly property bool wantOut: root.open || sel
            onWantOutChanged: { outAnim.stop(); outAnim.to = wantOut ? 1 : 0; outAnim.duration = wantOut ? 700 + index * 40 : 260; outAnim.start(); }
            NumberAnimation { id: outAnim; target: g; property: "out"; easing.type: Easing.OutBack; easing.overshoot: 1.4 }

            // posição: destaque parado à frente e à esquerda; os demais no anel
            readonly property real a: sel && !root.open ? Math.PI * 0.72 : root.spin * Math.PI * 2 + index / Math.max(1, root.ids.length) * Math.PI * 2
            readonly property real depth: Math.sin(a)                  // 1 = na frente do planeta, -1 = atrás
            readonly property real rr: root.r * (0.35 + 1.0 * out)
            x: root.cx + Math.cos(a) * rr * 1.18 - width / 2
            y: root.cy + depth * rr * 0.42 - height / 2 + (1 - out) * 10
            z: depth > 0 ? 10 + depth : -1 + depth
            width: 56; height: 56
            scale: (0.72 + 0.28 * (depth + 1) / 2) * (hovIcon.hovered ? 1.12 : 1)
            Behavior on scale { NumberAnimation { duration: Theme.d200 } }
            // atrás do planeta e dentro do disco: some; atrás mas fora do disco: apagado
            readonly property bool hiddenByGlobe: depth < 0 && Math.abs(Math.cos(a) * rr * 1.18) < root.r * 0.95
            opacity: out * (hiddenByGlobe ? 0 : depth < 0 ? 0.45 : (root.open && !sel && root.selected ? 0.85 : 1))

            Image {
                anchors.fill: parent
                source: L.iconFor(g.modelData)
                sourceSize.width: 128; sourceSize.height: 128
                smooth: true; mipmap: true
            }
            // destaque: anel claro em volta do jogo selecionado
            Rectangle { anchors.fill: parent; anchors.margins: -4; radius: 17; color: "transparent"; border.width: 2; border.color: Theme.textMain; visible: g.sel }
            // otimizado: bolinha verde piscando
            Rectangle {
                visible: root.optimized[g.modelData] === true
                anchors.right: parent.right; anchors.top: parent.top; anchors.margins: -3
                width: 12; height: 12; radius: 6; color: root.exitlagOn ? Theme.success : Theme.stroke; border.width: 2; border.color: Theme.surface
                SequentialAnimation on opacity { running: parent.visible && root.exitlagOn; loops: Animation.Infinite; NumberAnimation { to: 0.4; duration: 700 } NumberAnimation { to: 1; duration: 700 } }
            }
            // nome do jogo no hover
            Rectangle {
                visible: hovIcon.hovered && g.out > 0.9
                anchors.horizontalCenter: parent.horizontalCenter; anchors.top: parent.bottom; anchors.topMargin: 8
                width: tipT.implicitWidth + 16; height: 24; radius: 4; color: Theme.input
                Txt { id: tipT; anchors.centerIn: parent; role: "small"; color: Theme.textMain; font.weight: Font.Medium; text: L.CATALOG[g.modelData] ? L.CATALOG[g.modelData].name : "" }
            }
            HoverHandler { id: hovIcon; cursorShape: Qt.PointingHandCursor }
            TapHandler { onTapped: root.picked(g.modelData) }
        }
    }
}

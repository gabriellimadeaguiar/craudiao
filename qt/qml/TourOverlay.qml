import QtQuick

/* Onboarding da home: escurece tudo menos o item da vez e mostra um balão ao lado dele.
   Passo com bare: true (o primeiro, sobre o globo) mostra só o balão, sem escurecer nem recortar.
   O balão vai à direita do alvo, senão à esquerda, embaixo ou em cima: o primeiro lado onde cabe inteiro. */
Item {
    id: root
    property var steps: []
    property int i: -1
    readonly property bool on: i >= 0 && i < steps.length
    visible: opacity > 0
    opacity: on ? 1 : 0
    Behavior on opacity { NumberAnimation { duration: 300 } }
    z: 40

    signal finished()
    function start() { i = 0; }
    function next() { if (i + 1 >= steps.length) skip(); else i = i + 1; }
    function back() { if (i > 0) i = i - 1; }
    function skip() { i = -1; finished(); }
    // cada passo pode preparar a tela (abrir o painel, a órbita...) antes de apontar
    onIChanged: { if (on && typeof steps[i].enter === "function") steps[i].enter(); placeTimer.restart(); }
    Timer { id: placeTimer; interval: 350; onTriggered: root.place() }   // depois da animação do painel

    readonly property var t: on ? steps[i].target : null
    readonly property bool bare: on && steps[i].bare === true
    property rect hole: Qt.rect(0, 0, 0, 0)
    onTChanged: place()
    function place() {
        if (!t) return;
        var p = t.mapToItem(root, 0, 0);
        hole = Qt.rect(p.x - 8, p.y - 8, t.width + 16, t.height + 16);
    }
    Behavior on hole { PropertyAnimation { duration: 450; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }

    // recorte: quatro faixas escuras em volta do buraco
    readonly property color dim: Theme.scrim
    Item {
        anchors.fill: parent
        opacity: root.bare ? 0 : 1
        Behavior on opacity { NumberAnimation { duration: Theme.d300 } }
    Rectangle { color: root.dim; x: 0; y: 0; width: parent.width; height: Math.max(0, root.hole.y) }
    Rectangle { color: root.dim; x: 0; y: root.hole.y + root.hole.height; width: parent.width; height: Math.max(0, parent.height - y) }
    Rectangle { color: root.dim; x: 0; y: root.hole.y; width: Math.max(0, root.hole.x); height: root.hole.height }
    Rectangle { color: root.dim; x: root.hole.x + root.hole.width; y: root.hole.y; width: Math.max(0, parent.width - x); height: root.hole.height }
    Rectangle { x: root.hole.x; y: root.hole.y; width: root.hole.width; height: root.hole.height; radius: 12; color: "transparent"; border.width: 1; border.color: Theme.stroke }
    }
    MouseArea { anchors.fill: parent; onClicked: {} }   // bloqueia cliques fora do balão

    Rectangle {
        id: balloon
        width: 320; height: bc.implicitHeight + 40; radius: 12; color: Theme.input
        readonly property real gap: 16
        readonly property real m: 24
        readonly property var h: root.hole
        readonly property string side: h.x + h.width + gap + width <= root.width - m ? "right"
                                     : h.x - gap - width >= m ? "left"
                                     : h.y + h.height + gap + height <= root.height - m ? "below" : "above"
        readonly property real cx: Math.max(m, Math.min(root.width - width - m, h.x + h.width / 2 - width / 2))
        readonly property real cy: Math.max(m + 64, Math.min(root.height - height - m, h.y + h.height / 2 - height / 2))
        readonly property bool corner: root.on && root.steps[root.i].corner === true
        x: corner ? 16 : side === "right" ? h.x + h.width + gap : side === "left" ? h.x - width - gap : cx
        y: corner ? 72 : side === "below" ? h.y + h.height + gap : side === "above" ? Math.max(m, h.y - height - gap) : cy
        Behavior on x { NumberAnimation { duration: 450; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }
        Behavior on y { NumberAnimation { duration: 450; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }
        Column {
            id: bc; x: 20; y: 20; width: parent.width - 40; spacing: 8
            Txt { role: "small"; text: (root.i + 1) + " of " + root.steps.length }
            Txt { role: "h3"; text: root.on ? root.steps[root.i].title : "" }
            Txt { role: "body"; color: Theme.textVariant; width: parent.width; text: root.on ? root.steps[root.i].text : "" }
            Item { width: parent.width; height: 40
                Btn { kind: "outlined"; text: "Skip"; visible: root.i < root.steps.length - 1; onClicked: root.skip() }
                Btn { anchors.right: parent.right; text: root.i < root.steps.length - 1 ? "Next" : "Got it"; onClicked: root.next() } }
        }
    }
}

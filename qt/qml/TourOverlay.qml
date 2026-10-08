import QtQuick

// Onboarding da home: escurece tudo menos o item da vez e mostra um balão com 4 passos
Item {
    id: root
    property var steps: []
    property int i: -1
    readonly property bool on: i >= 0 && i < steps.length
    visible: opacity > 0
    opacity: on ? 1 : 0
    Behavior on opacity { NumberAnimation { duration: 300 } }
    z: 40

    function start() { i = 0; }
    function next() { i = i + 1 >= steps.length ? -1 : i + 1; }
    function skip() { i = -1; }

    readonly property var t: on ? steps[i].target : null
    property rect hole: Qt.rect(0, 0, 0, 0)
    onTChanged: place()
    function place() {
        if (!t) return;
        var p = t.mapToItem(root, 0, 0);
        hole = Qt.rect(p.x - 12, p.y - 12, t.width + 24, t.height + 24);
    }
    Behavior on hole { PropertyAnimation { duration: 450; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }

    // recorte: quatro faixas escuras em volta do buraco
    readonly property color dim: "#cc0b0c0f"
    Rectangle { color: root.dim; x: 0; y: 0; width: parent.width; height: Math.max(0, root.hole.y) }
    Rectangle { color: root.dim; x: 0; y: root.hole.y + root.hole.height; width: parent.width; height: Math.max(0, parent.height - y) }
    Rectangle { color: root.dim; x: 0; y: root.hole.y; width: Math.max(0, root.hole.x); height: root.hole.height }
    Rectangle { color: root.dim; x: root.hole.x + root.hole.width; y: root.hole.y; width: Math.max(0, parent.width - x); height: root.hole.height }
    Rectangle { x: root.hole.x; y: root.hole.y; width: root.hole.width; height: root.hole.height; radius: 12; color: "transparent"; border.width: 1; border.color: Theme.stroke }
    MouseArea { anchors.fill: parent; onClicked: {} }   // bloqueia cliques fora do balão

    Rectangle {
        id: balloon
        width: 320; height: bc.implicitHeight + 40; radius: 12; color: Theme.input
        // à esquerda do alvo quando ele está à direita da tela; senão, em cima
        x: root.hole.x > 700 ? root.hole.x - width - 16 : Math.max(24, Math.min(root.width - width - 24, root.hole.x + root.hole.width / 2 - width / 2))
        y: root.hole.x > 700 ? Math.max(24, Math.min(root.height - height - 24, root.hole.y)) : root.hole.y - height - 16
        Behavior on x { NumberAnimation { duration: 450; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }
        Behavior on y { NumberAnimation { duration: 450; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }
        Column {
            id: bc; x: 20; y: 20; width: parent.width - 40; spacing: 8
            Txt { role: "small"; text: (root.i + 1) + " of " + root.steps.length }
            Txt { role: "h3"; text: root.on ? root.steps[root.i].title : "" }
            Txt { role: "body"; color: Theme.textVariant; width: parent.width; text: root.on ? root.steps[root.i].text : "" }
            Item { width: parent.width; height: 40
                Btn { kind: "outlined"; text: "Skip"; visible: root.i < root.steps.length - 1; onClicked: root.skip() }
                Btn { anchors.right: parent.right; text: root.i < root.steps.length - 1 ? "Next" : "Done"; onClicked: root.next() } }
        }
    }
}

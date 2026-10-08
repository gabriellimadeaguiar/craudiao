import QtQuick

// comp / modal · drawer: 680 px à direita, altura toda, cantos 24. Entra em 300 ms (decelerate), sai em 200 ms
// (accelerate) com o véu escurecendo atrás. O conteúdo vem por Component e só é criado quando abre (Loader).
Item {
    id: root
    property bool open: false
    property string title: ""
    property Component content: null
    signal closed()
    anchors.fill: parent
    visible: open || panel.x < width
    z: 80

    Rectangle {
        anchors.fill: parent
        color: Theme.scrim
        opacity: root.open ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: root.open ? Theme.d300 : Theme.d200 } }
        MouseArea { anchors.fill: parent; enabled: root.open; onClicked: root.close() }
    }
    Rectangle {
        id: panel
        width: 680; height: parent.height
        x: root.open ? parent.width - width : parent.width
        Behavior on x { NumberAnimation { duration: root.open ? Theme.d300 : Theme.d200; easing.type: Easing.BezierSpline; easing.bezierCurve: root.open ? Theme.easeDecelerate : Theme.easeAccelerate } }
        color: Theme.container
        radius: 24
        // só os cantos da esquerda arredondados: um retângulo cobre os da direita
        Rectangle { anchors.right: parent.right; width: 24; height: parent.height; color: parent.color }
        MouseArea { anchors.fill: parent }   // não deixa o clique atravessar para o véu

        Item {
            id: head
            x: 24; y: 24; width: parent.width - 48; height: 40
            Txt { role: "h3"; text: root.title; anchors.verticalCenter: parent.verticalCenter }
            IconBtn { anchors.right: parent.right; icon: "close"; tip: "Close"; onClicked: root.close() }
        }
        Loader {
            x: 24; y: head.y + head.height + 24
            width: parent.width - 48; height: parent.height - y - 24
            active: root.open || panel.x < root.width
            sourceComponent: root.content
        }
    }
    function close() { open = false; closed(); }
    Keys.onEscapePressed: close()
}

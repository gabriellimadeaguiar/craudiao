import QtQuick
import QtQuick3D

// Etiqueta presa a um ponto do globo: segue o ponto a cada quadro e some quando ele vai para trás do planeta
Rectangle {
    id: root
    property var node: null
    property var repeater: null     // Repeater3D dos marcadores: o marcador pode nascer depois da etiqueta
    property int tagIndex: -1
    Timer { interval: 40; repeat: true; running: !root.node && root.repeater !== null
        onTriggered: root.node = root.repeater.objectAt(root.tagIndex) }
    property var view3d: null
    property real offsetX: 0
    property string text: ""
    property string sub: ""
    property string kind: "you"
    property bool below: false
    property bool hidden: false
    readonly property vector3d sp: node ? node.scenePosition : Qt.vector3d(0, 0, -1)
    readonly property vector3d p: view3d && node ? view3d.mapFrom3DScene(sp) : Qt.vector3d(0, 0, 0)
    readonly property bool front: sp.z > 12

    x: p.x + offsetX - width / 2
    y: below ? p.y + 12 : p.y - height - 12
    width: row.implicitWidth + 16; height: 24; radius: 4
    color: Theme.glassStrong
    border.width: kind === "bad" ? 1 : 0
    border.color: Qt.rgba(Theme.primary.r, Theme.primary.g, Theme.primary.b, 0.4)
    opacity: front && !hidden ? 1 : 0
    Behavior on opacity { NumberAnimation { duration: 200 } }
    Row {
        id: row; anchors.centerIn: parent; spacing: 6
        Text { text: root.text; color: Theme.textMain; font.family: Theme.font; font.pixelSize: 12; font.weight: Font.Medium; font.letterSpacing: 0.4 }
        Text { text: root.sub; visible: root.sub !== ""; color: root.kind === "bad" ? Theme.criticalText : Theme.textVariant; font.family: Theme.font; font.pixelSize: 12; font.weight: root.kind === "bad" ? Font.Medium : Font.Normal; font.letterSpacing: 0.4 }
    }
}

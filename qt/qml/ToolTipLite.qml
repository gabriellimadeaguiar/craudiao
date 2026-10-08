import QtQuick

// comp / tooltip: aparece 6 px acima do item pai depois de meio segundo de hover; texto 12/16 peso 500, até 240 px.
Item {
    id: root
    property string text: ""
    property bool below: false           // em cima por padrão; embaixo para itens no topo da janela
    anchors.fill: parent
    readonly property bool shown: hov.hovered && delay.done && text !== ""
    onShownChanged: parent.z = shown ? 100 : 0
    HoverHandler { id: hov; onHoveredChanged: { delay.done = false; if (hovered) delay.restart(); else delay.stop(); } }
    Timer { id: delay; interval: 500; property bool done: false; onTriggered: done = true }
    Rectangle {
        id: box
        width: Math.min(240, t.implicitWidth) + 16; height: t.implicitHeight + 16; radius: 4
        color: Theme.input; border.width: 1; border.color: Theme.divider
        x: Math.round((root.width - width) / 2)
        y: root.below ? root.height + 6 : -height - 6
        opacity: root.shown ? 1 : 0; visible: opacity > 0
        Behavior on opacity { NumberAnimation { duration: 120 } }
        Text {
            id: t; x: 8; y: 8; width: Math.min(240, implicitWidth)
            text: root.text; wrapMode: Text.WordWrap
            color: Theme.textMain; font.family: Theme.font; font.pixelSize: 12; font.weight: Font.Medium; font.letterSpacing: 0.5; lineHeight: 16; lineHeightMode: Text.FixedHeight
        }
    }
}

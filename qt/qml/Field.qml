import QtQuick

// Campo de texto (comp / input): 40 px, container #20242D, hover e foco clareiam o container
Column {
    id: root
    property string label: ""
    property string icon: ""
    property string placeholder: ""
    property bool password: false
    property alias text: input.text
    property alias input: input
    property bool bad: false
    property Item trailing: null
    spacing: 6

    Item {
        width: parent.width; height: 16
        Text { text: root.label; color: Theme.textVariant; font.family: Theme.font; font.pixelSize: 12; font.letterSpacing: 0.4 }
        Item { id: trailSlot; anchors.right: parent.right; height: 16; width: childrenRect.width }
    }
    Rectangle {
        width: parent.width; height: 40; radius: 4
        color: hov.hovered || input.activeFocus ? Theme.inputHover : Theme.input
        border.width: root.bad ? 1 : 0; border.color: Theme.primary
        Behavior on color { ColorAnimation { duration: 100 } }
        HoverHandler { id: hov; cursorShape: Qt.IBeamCursor }
        Row {
            anchors.fill: parent; anchors.leftMargin: 12; anchors.rightMargin: 12; spacing: 8
            Icon { name: root.icon; size: 18; color: Theme.textVariant; anchors.verticalCenter: parent.verticalCenter; visible: root.icon !== "" }
            Item {
                width: parent.width - (root.icon !== "" ? 26 : 0); height: parent.height
                TextInput {
                    id: input
                    anchors.fill: parent
                    verticalAlignment: TextInput.AlignVCenter
                    color: Theme.textMain; selectionColor: Theme.stroke
                    font.family: Theme.font; font.pixelSize: 14; font.letterSpacing: 0.25
                    echoMode: root.password ? TextInput.Password : TextInput.Normal
                    clip: true
                    activeFocusOnTab: true
                }
                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    text: root.placeholder; color: Theme.textVariant
                    font.family: Theme.font; font.pixelSize: 14; font.letterSpacing: 0.25
                    visible: input.text.length === 0
                }
            }
        }
    }
    Component.onCompleted: if (trailing) trailing.parent = trailSlot
}

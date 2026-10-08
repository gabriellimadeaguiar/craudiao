import QtQuick

// comp / button: 40 px de altura, 16 px de margem, cantos 4, texto 14/20 peso 500. Tipos filled (vermelho) e outlined.
Rectangle {
    id: root
    property string text: ""
    property string icon: ""
    property string kind: "filled"          // filled | outlined
    property bool block: false
    property bool enabledLook: true
    signal clicked()

    implicitWidth: row.implicitWidth + 32
    implicitHeight: 40
    radius: 4
    color: kind === "filled" ? (!enabledLook ? Theme.input : ma.pressed ? Theme.primaryPressed : ma.containsMouse ? Theme.primaryHover : Theme.primary)
                             : (ma.pressed ? Theme.statePressed : ma.containsMouse ? Theme.stateHover : "transparent")
    border.width: kind === "outlined" ? 1 : 0
    border.color: Theme.stroke
    scale: ma.pressed ? 0.98 : 1
    Behavior on color { ColorAnimation { duration: 150 } }
    Behavior on scale { NumberAnimation { duration: 120 } }
    activeFocusOnTab: true

    Row {
        id: row
        anchors.centerIn: parent
        spacing: 8
        Icon { name: root.icon; visible: root.icon !== ""; size: 18; anchors.verticalCenter: parent.verticalCenter; color: label.color }
        Text {
            id: label
            text: root.text
            color: root.kind === "filled" && !root.enabledLook ? Theme.stroke : Theme.textMain
            font.family: Theme.font; font.pixelSize: 14; font.weight: Font.Medium; font.letterSpacing: 0.1
            anchors.verticalCenter: parent.verticalCenter
        }
    }
    Rectangle { anchors.fill: parent; anchors.margins: -3; radius: 6; color: "transparent"; border.width: 2; border.color: Theme.series1; visible: root.activeFocus }
    MouseArea { id: ma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.clicked() }
    Keys.onReturnPressed: root.clicked()
    Keys.onSpacePressed: root.clicked()
}

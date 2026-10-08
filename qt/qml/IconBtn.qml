import QtQuick

// comp / icon-button: 40×40, só ícone, com camada de hover e pressionado
Rectangle {
    id: root
    property string icon: ""
    property color iconColor: Theme.textVariant
    property string tip: ""
    signal clicked()
    width: 40; height: 40; radius: 4
    color: ma.pressed ? Theme.statePressed : ma.containsMouse ? Theme.stateHover : "transparent"
    Behavior on color { ColorAnimation { duration: 150 } }
    activeFocusOnTab: true
    Accessible.name: tip
    Icon { anchors.centerIn: parent; name: root.icon; color: ma.containsMouse ? Theme.textMain : root.iconColor }
    Rectangle { anchors.fill: parent; anchors.margins: -3; radius: 6; color: "transparent"; border.width: 2; border.color: Theme.series1; visible: root.activeFocus }
    MouseArea { id: ma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.clicked() }
    Keys.onReturnPressed: root.clicked()
    property bool tipBelow: false
    ToolTipLite { text: root.tip; below: root.tipBelow }
}

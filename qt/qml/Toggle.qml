import QtQuick

// comp / toggle-switch: 36×20. Desligado: container input, pino claro. Ligado: container success, pino verde.
// Hover só muda a cor do container. Teclado: espaço ou Enter alterna.
Rectangle {
    id: root
    property bool checked: false
    property string label: ""
    signal toggled(bool checked)
    implicitWidth: 36; implicitHeight: 20
    radius: height / 2
    color: checked ? (ma.containsMouse ? Theme.successContainerHover : Theme.successContainer) : (ma.containsMouse ? Theme.inputHover : Theme.input)
    Behavior on color { ColorAnimation { duration: Theme.d100 } }
    activeFocusOnTab: true
    Accessible.role: Accessible.CheckBox
    Accessible.name: label
    Accessible.checked: checked

    Rectangle {
        width: 16; height: 16; radius: 8
        y: 2; x: root.checked ? root.width - width - 2 : 2
        color: root.checked ? Theme.success : Theme.textMain
        Behavior on x { NumberAnimation { duration: Theme.d200; easing.type: Easing.BezierSpline; easing.bezierCurve: [0.2, 0.7, 0.2, 1, 1, 1] } }
        Behavior on color { ColorAnimation { duration: Theme.d200 } }
    }
    Rectangle { anchors.fill: parent; anchors.margins: -3; radius: height / 2; color: "transparent"; border.width: 2; border.color: Theme.series1; visible: root.activeFocus }
    MouseArea { id: ma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.flip() }
    Keys.onSpacePressed: flip()
    Keys.onReturnPressed: flip()
    function flip() { toggled(!checked); }   // quem usa decide o estado (checked segue ligado ao modelo)
}

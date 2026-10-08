import QtQuick
import ExitLag

// comp / sidebar: menu retrátil da home (abre pelo botão de menu). 240 px, container, cantos 24, sombra de painel.
// Item selecionado: ícone vermelho num quadrado primary-soft e o marcador vermelho na borda esquerda.
Item {
    id: root
    property bool open: false
    property string current: "Home"
    property bool exitlagOn: true
    signal navigate(string page)
    anchors.fill: parent
    visible: open || panel.x > -panel.width
    z: 70

    readonly property var items: [
        ["Home", "overview"], ["Network Analyzer", "net"], ["PC Boost", "boost"], ["Traffic Shaper", "route"],
        ["Multi Internet", "multi"], ["Community Servers", "list"], ["General Settings", "power"]
    ]

    Rectangle {
        anchors.fill: parent; color: Theme.scrim
        opacity: root.open ? 0.6 : 0
        Behavior on opacity { NumberAnimation { duration: Theme.d300 } }
        MouseArea { anchors.fill: parent; enabled: root.open; onClicked: root.open = false }
    }
    Rectangle {
        id: panel
        x: root.open ? 12 : -width - 24; y: 12
        width: 240; height: parent.height - 24; radius: 24
        color: Theme.container
        Behavior on x { NumberAnimation { duration: Theme.d300; easing.type: Easing.BezierSpline; easing.bezierCurve: root.open ? Theme.easeDecelerate : Theme.easeAccelerate } }
        MouseArea { anchors.fill: parent }

        Logo { anchors.horizontalCenter: parent.horizontalCenter; y: 26 }
        Column {
            x: 16; y: 78; width: parent.width - 32; spacing: 8
            Repeater {
                model: root.items
                delegate: Rectangle {
                    id: item
                    required property var modelData
                    required property int index
                    readonly property bool sel: root.current === modelData[0]
                    width: parent.width; height: 40; radius: 8
                    color: !sel && ima.containsMouse ? Theme.containerHigh : "transparent"
                    Behavior on color { ColorAnimation { duration: 150 } }
                    // marcador do item atual, colado à borda do painel
                    Rectangle { visible: item.sel; x: -16; anchors.verticalCenter: parent.verticalCenter; width: 4; height: 24; radius: 2; color: Theme.primary }
                    Row {
                        x: 2; anchors.verticalCenter: parent.verticalCenter; spacing: 8
                        Rectangle { width: 32; height: 32; radius: 4; color: item.sel ? Theme.primarySoft : "transparent"
                            Icon { anchors.centerIn: parent; name: item.modelData[1]; color: item.sel ? Theme.primary : Theme.textMain } }
                        Txt { role: "body"; font.weight: Font.Medium; text: item.modelData[0]; anchors.verticalCenter: parent.verticalCenter }
                    }
                    // opacidade em cascata ao abrir
                    opacity: root.open ? 1 : 0
                    Behavior on opacity { SequentialAnimation { PauseAnimation { duration: root.open ? 60 + item.index * 30 : 0 } NumberAnimation { duration: Theme.d200 } } }
                    MouseArea { id: ima; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                        onClicked: { root.navigate(item.modelData[0]); root.open = false; } }
                }
            }
        }
        Column {
            anchors.bottom: parent.bottom; anchors.bottomMargin: 24; x: 16; width: parent.width - 32; spacing: 12
            Row { spacing: 8
                Rectangle { width: 8; height: 8; radius: 4; anchors.verticalCenter: parent.verticalCenter; color: root.exitlagOn ? Theme.success : Theme.stroke }
                Txt { role: "small"; text: root.exitlagOn ? "ExitLag is on" : "ExitLag is off" } }
            Txt { role: "small"; text: "app | 1.0 · Qt " + Platform.qtVersion }
        }
    }
}

import QtQuick
import ExitLag

/* comp / sidebar: menu retrátil da home. Abre por cima do botão de menu: o X de fechar fica no lugar do
   hambúrguer e a marca e o toggle continuam onde estavam na top bar. Por baixo, um painel interno com as páginas;
   no pé, o botão de ajuda e a versão. Item atual: ícone vermelho num quadrado primary-soft e o marcador vermelho
   na borda esquerda. */
Item {
    id: root
    property bool open: false
    property string current: "Home"
    property bool exitlagOn: true
    signal navigate(string page)
    signal toggled(bool on)
    signal help()
    anchors.fill: parent
    visible: open || panel.opacity > 0
    z: 70

    readonly property var items: [
        ["Home", "home"], ["Community Servers", "community"], ["Network Analyzer", "router"], ["PC Boost", "boost"],
        ["Multi Internet", "net"], ["Traffic Shaper", "traffic"], ["General Settings", "settings"]
    ]

    Keys.onEscapePressed: open = false

    Rectangle {
        anchors.fill: parent; color: Theme.scrim
        opacity: root.open ? 0.6 : 0
        Behavior on opacity { NumberAnimation { duration: Theme.d300 } }
        MouseArea { anchors.fill: parent; enabled: root.open; onClicked: root.open = false }
    }

    // painel: nasce no canto do botão de menu e desce até o pé da janela
    Rectangle {
        id: panel
        x: 12; y: 12
        width: 256
        height: root.open ? parent.height - 24 : 64
        radius: 24
        color: Theme.container
        border.width: 1; border.color: Theme.divider
        opacity: root.open ? 1 : 0
        clip: true
        Behavior on height { NumberAnimation { duration: Theme.d300; easing.type: Easing.BezierSpline; easing.bezierCurve: root.open ? Theme.easeDecelerate : Theme.easeAccelerate } }
        Behavior on opacity { NumberAnimation { duration: root.open ? Theme.d100 : Theme.d200 } }
        MouseArea { anchors.fill: parent }

        // cabeçalho: mesmo lugar e tamanho da top bar (X, marca, toggle)
        Row {
            x: 8; y: 12; height: 40; spacing: 16
            IconBtn { icon: "close"; tip: "Close menu"; iconColor: Theme.textMain; onClicked: root.open = false
                Rectangle { anchors.fill: parent; radius: 4; color: "transparent"; border.width: 1; border.color: Theme.stroke } }
            Logo { anchors.verticalCenter: parent.verticalCenter }
            Toggle { anchors.verticalCenter: parent.verticalCenter; label: "ExitLag"; checked: root.exitlagOn; onToggled: function (on) { root.toggled(on); } }
        }

        // painel interno
        Rectangle {
            x: 12; y: 64; width: parent.width - 24; height: parent.height - 64 - 12
            radius: 16; color: Theme.surface

            Column {
                x: 12; y: 16; width: parent.width - 24; spacing: 4
                Repeater {
                    model: root.items
                    delegate: Rectangle {
                        id: item
                        required property var modelData
                        required property int index
                        readonly property bool sel: root.current === modelData[0]
                        width: parent.width; height: 44; radius: 8
                        color: !sel && ima.containsMouse ? Theme.containerHigh : "transparent"
                        Behavior on color { ColorAnimation { duration: Theme.d100 } }
                        // marcador do item atual, colado à borda do painel externo
                        Rectangle { visible: item.sel; x: -24; anchors.verticalCenter: parent.verticalCenter; width: 4; height: 24; radius: 2; color: Theme.primary }
                        Row {
                            x: 4; anchors.verticalCenter: parent.verticalCenter; spacing: 12
                            Rectangle { width: 32; height: 32; radius: 4; color: item.sel ? Theme.primarySoft : "transparent"
                                Icon { anchors.centerIn: parent; name: item.modelData[1]; size: 20; color: item.sel ? Theme.primary : Theme.textMain } }
                            Txt { role: "body"; font.weight: Font.Medium; text: item.modelData[0]; anchors.verticalCenter: parent.verticalCenter }
                        }
                        // entrada em cascata ao abrir
                        opacity: root.open ? 1 : 0
                        transform: Translate { x: root.open ? 0 : -8; Behavior on x { NumberAnimation { duration: Theme.d300; easing.type: Easing.OutCubic } } }
                        Behavior on opacity { SequentialAnimation { PauseAnimation { duration: root.open ? 80 + item.index * 30 : 0 } NumberAnimation { duration: Theme.d200 } } }
                        MouseArea { id: ima; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                            onClicked: { root.navigate(item.modelData[0]); root.open = false; } }
                        Accessible.role: Accessible.MenuItem; Accessible.name: modelData[0]
                    }
                }
            }

            // pé: ajuda e versão
            Item {
                anchors.bottom: parent.bottom; anchors.bottomMargin: 12; x: 12; width: parent.width - 24; height: 40
                IconBtn { icon: "help"; tip: "Help Center"; iconColor: Theme.textMain; onClicked: { root.open = false; root.help(); }
                    Rectangle { anchors.fill: parent; radius: 4; color: "transparent"; border.width: 1; border.color: Theme.stroke } }
                Txt { anchors.centerIn: parent; role: "small"; text: root.current.toLowerCase() + " | 1.0" }
            }
        }
    }
}

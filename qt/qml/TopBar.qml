import QtQuick
import "Logic.js" as L

/* Barra do topo da home, sem fundo (o globo aparece atrás): menu, marca e o toggle da ExitLag à esquerda;
   busca, ajuda, perfil e notificações à direita, depois minimizar e fechar. A área vazia arrasta a janela. */
Item {
    id: root
    property var app
    property bool exitlagOn: true
    property int unread: 0
    property var searchIds: []
    signal menu()
    signal toggled(bool on)
    signal openDrawer(string which)
    signal pickGame(string id)
    height: 64

    // arrastar a janela pela área vazia
    MouseArea {
        anchors.fill: parent
        onPressed: if (root.app.win && root.app.win.startSystemMove) root.app.win.startSystemMove()
        onDoubleClicked: root.app.toggleMaximize()
    }

    Row {
        x: 20; anchors.verticalCenter: parent.verticalCenter; spacing: 16
        IconBtn { tipBelow: true; icon: "menu"; tip: "Menu"; iconColor: Theme.textMain; onClicked: root.menu() }
        Logo { anchors.verticalCenter: parent.verticalCenter }
        Toggle { anchors.verticalCenter: parent.verticalCenter; label: "ExitLag"; checked: root.exitlagOn; onToggled: function (on) { root.toggled(on); } }
    }

    Row {
        anchors.right: parent.right; anchors.rightMargin: 24; anchors.verticalCenter: parent.verticalCenter; spacing: 8
        // busca: só a lupa; o campo abre no hover ou no clique e segue aberto com foco, texto ou lista
        Item {
            id: search
            width: open ? 240 : 40; height: 40
            readonly property bool open: hov.hovered || field.activeFocus || field.text.length > 0
            Behavior on width { NumberAnimation { duration: Theme.d300; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }
            HoverHandler { id: hov }
            Rectangle {
                anchors.fill: parent; radius: 4
                color: search.open ? (field.activeFocus ? Theme.input : Theme.inputHover) : "transparent"
                border.width: list.visible ? 1 : 0; border.color: Theme.stroke
                Behavior on color { ColorAnimation { duration: Theme.d100 } }
                Icon { x: 8; anchors.verticalCenter: parent.verticalCenter; name: "search"; color: search.open ? Theme.textVariant : Theme.textMain }
                TextInput {
                    id: field
                    x: 40; width: parent.width - 48; anchors.verticalCenter: parent.verticalCenter
                    visible: search.width > 120
                    color: Theme.textMain; font.family: Theme.font; font.pixelSize: 14; clip: true; selectionColor: Theme.stroke
                    Text { text: "Search games"; color: Theme.textVariant; font: field.font; visible: !field.text.length }
                    Keys.onEscapePressed: { text = ""; focus = false; }
                    Keys.onReturnPressed: if (results.length) { root.pickGame(results[0]); text = ""; focus = false; }
                    readonly property var results: text.length ? Object.keys(L.CATALOG).filter(function (k) { return L.CATALOG[k].name.toLowerCase().indexOf(field.text.toLowerCase()) >= 0; }) : root.searchIds
                }
                MouseArea { anchors.fill: parent; enabled: !field.activeFocus; cursorShape: Qt.IBeamCursor; onClicked: field.forceActiveFocus() }
            }
            // input-search · lista (até 6 itens visíveis) ou "sem resultados"
            Rectangle {
                id: list
                visible: field.activeFocus
                y: 48; width: 240; height: Math.min(6, Math.max(1, field.results.length)) * 48; radius: 4
                color: Theme.input
                clip: true
                ListView {
                    anchors.fill: parent
                    model: field.results
                    boundsBehavior: Flickable.StopAtBounds
                    delegate: Rectangle {
                        required property var modelData
                        width: 240; height: 48; color: sma.containsMouse ? Theme.inputHover : "transparent"
                        Row { x: 12; anchors.verticalCenter: parent.verticalCenter; spacing: 8
                            Image { width: 24; height: 24; source: L.iconFor(modelData); sourceSize.width: 128; mipmap: true }
                            Txt { role: "body"; font.weight: Font.Medium; width: 180; elide: Text.ElideRight; wrapMode: Text.NoWrap; text: L.CATALOG[modelData].name; anchors.verticalCenter: parent.verticalCenter } }
                        MouseArea { id: sma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                            onClicked: { root.pickGame(modelData); field.text = ""; field.focus = false; } }
                    }
                }
                Column {
                    anchors.centerIn: parent; visible: field.results.length === 0; spacing: 2
                    Txt { anchors.horizontalCenter: parent.horizontalCenter; role: "small"; color: Theme.textMain; text: "No games found" }
                }
            }
        }
        IconBtn { tipBelow: true; icon: "help"; tip: "Help Center"; iconColor: Theme.textMain; onClicked: root.openDrawer("help") }
        IconBtn { tipBelow: true; icon: "user"; tip: "Profile"; iconColor: Theme.textMain; onClicked: root.openDrawer("profile") }
        IconBtn {
            tipBelow: true; icon: "bell"; tip: "Notifications"; iconColor: Theme.textMain; onClicked: root.openDrawer("notifications")
            Rectangle {
                anchors.right: parent.right; anchors.top: parent.top
                height: 16; width: Math.max(16, bt.implicitWidth + 8); radius: 8; color: Theme.primary
                scale: root.unread > 0 ? 1 : 0; opacity: scale
                Behavior on scale { NumberAnimation { duration: Theme.d200; easing.type: Easing.OutBack } }
                Txt { id: bt; anchors.centerIn: parent; role: "small"; font.pixelSize: 11; font.weight: Font.Medium; color: Theme.textMain; text: root.unread > 9 ? "9+" : root.unread }
            }
        }
        Rectangle { width: 1; height: 16; color: Theme.divider; anchors.verticalCenter: parent.verticalCenter }
        IconBtn { tipBelow: true; icon: "min"; tip: "Minimize"; onClicked: root.app.win.showMinimized() }
        IconBtn { tipBelow: true; icon: "close"; tip: "Close"; onClicked: Qt.quit() }
    }
}

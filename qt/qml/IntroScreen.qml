import QtQuick
import "Logic.js" as L

// Início do check-up: o que será analisado, o jogo e o servidor usados no teste de rede
Item {
    id: root
    property var app
    property var globe
    property bool active: false
    property bool picker: false
    visible: opacity > 0
    opacity: active ? 1 : 0
    Behavior on opacity { SequentialAnimation { PauseAnimation { duration: root.active ? 380 : 0 } NumberAnimation { duration: root.active ? 600 : 320; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } }

    readonly property var gameIds: app.detected.length ? app.detected.map(function (g) { return g.id; }) : L.POPULAR
    readonly property var game: L.CATALOG[app.gameId]
    onActiveChanged: if (active) { picker = false; globe.idle(6.45); globe.shiftX = 300; ensureGame(); }
    function ensureGame() {
        if (gameIds.indexOf(app.gameId) < 0) app.gameId = gameIds[0];
        if (!app.region || L.CATALOG[app.gameId].regions.indexOf(app.region) < 0) app.region = L.nearestRegion(app.gameId, app.origin);
    }

    Column {
        x: 96; anchors.verticalCenter: parent.verticalCenter; width: 600; spacing: 24
        Txt { role: "eyebrow"; text: "Free check-up · about a minute · no account" }
        Txt { role: "hero"; width: parent.width; text: "Find out what's slowing your games down." }
        Column {
            width: parent.width; spacing: 12
            Repeater {
                model: [["pc", "Your PC", "Processor, graphics card, memory, storage, display and what runs in the background"], ["net", "Your connection", "Your route to the game server, measured live, and what ExitLag would change"]]
                delegate: Row {
                    required property var modelData
                    spacing: 12
                    Rectangle { width: 40; height: 40; radius: 10; color: Theme.glass; border.width: 1; border.color: Theme.divider; Icon { anchors.centerIn: parent; name: modelData[0]; size: 18 } }
                    Column { spacing: 2; Txt { role: "body"; text: modelData[1]; font.weight: Font.Medium } Txt { role: "small"; text: modelData[2] } }
                }
            }
        }
        Row {
            spacing: 16
            Btn { text: "Start analysis"; onClicked: { root.picker = false; root.app.go("analysis"); } }
            Rectangle {
                id: pick
                width: pr.implicitWidth + 24; height: 40; radius: 4
                color: pma.containsMouse ? "#cc191d24" : Theme.glass; border.width: 1; border.color: pma.containsMouse ? Theme.stroke : Theme.divider
                Row {
                    id: pr; anchors.verticalCenter: parent.verticalCenter; x: 8; spacing: 8
                    Image { width: 24; height: 24; source: root.game ? root.game.img : ""; fillMode: Image.PreserveAspectCrop; anchors.verticalCenter: parent.verticalCenter; sourceSize.width: 48 }
                    Txt { role: "small"; text: "Testing with"; anchors.verticalCenter: parent.verticalCenter }
                    Txt { role: "body"; font.weight: Font.Medium; text: (root.game ? root.game.name : "") + " · " + (root.app.region ? L.REGIONS[root.app.region].name : ""); anchors.verticalCenter: parent.verticalCenter }
                    Icon { name: "chev"; size: 16; color: Theme.textVariant; rotation: root.picker ? 270 : 90; anchors.verticalCenter: parent.verticalCenter; Behavior on rotation { NumberAnimation { duration: 200 } } }
                }
                MouseArea { id: pma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.picker = !root.picker }
            }
        }
    }

    // seletor de jogo e servidor
    Rectangle {
        id: pop
        x: 696; y: parent.height - 150 - height
        width: 560; height: popCol.implicitHeight + 48; radius: 16
        color: "#f5111317"; border.width: 1; border.color: Theme.divider
        opacity: root.picker ? 1 : 0; visible: opacity > 0
        scale: root.picker ? 1 : 0.95; transformOrigin: Item.Left
        Behavior on opacity { NumberAnimation { duration: 200 } }
        Behavior on scale { NumberAnimation { duration: 300; easing.type: Easing.OutBack } }
        Column {
            id: popCol; x: 24; y: 24; width: parent.width - 48; spacing: 16
            Row { spacing: 6; Txt { role: "body"; text: "Game"; font.weight: Font.Bold } Txt { role: "small"; text: root.app.detected.length ? "· found on this PC" : "· no games found on this PC, showing popular ones"; anchors.verticalCenter: parent.verticalCenter } }
            Flow {
                width: parent.width; spacing: 8
                Repeater {
                    model: root.gameIds
                    delegate: Rectangle {
                        required property var modelData
                        width: 57; height: 76; radius: 6; color: Theme.input
                        opacity: root.app.gameId === modelData || gma.containsMouse ? 1 : 0.6
                        border.width: root.app.gameId === modelData ? 2 : 0; border.color: Theme.textMain
                        Image { anchors.fill: parent; anchors.margins: parent.border.width; source: L.CATALOG[modelData].img; fillMode: Image.PreserveAspectCrop; sourceSize.width: 120 }
                        MouseArea { id: gma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                            onClicked: { root.app.gameId = modelData; root.app.region = L.nearestRegion(modelData, root.app.origin); } }
                    }
                }
            }
            Txt { role: "body"; text: "Server"; font.weight: Font.Bold }
            Flow {
                width: parent.width; spacing: 8
                Repeater {
                    model: root.game ? root.game.regions : []
                    delegate: Rectangle {
                        required property var modelData
                        readonly property bool on: root.app.region === modelData
                        width: ct.implicitWidth + 24; height: 32; radius: 16
                        color: on || sma.containsMouse ? Theme.containerHigh : Theme.input; border.width: 1; border.color: on ? Theme.textMain : Theme.stroke
                        Txt { id: ct; anchors.centerIn: parent; role: "small"; color: Theme.textMain; font.weight: Font.Medium
                            text: L.REGIONS[modelData].name + (modelData === L.nearestRegion(root.app.gameId, root.app.origin) ? " · closest" : "") }
                        MouseArea { id: sma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.app.region = modelData }
                    }
                }
            }
        }
    }

    Row {
        x: 96; anchors.bottom: parent.bottom; anchors.bottomMargin: 32; spacing: 24
        Row { spacing: 6; Icon { name: "shield"; size: 16; color: Theme.textVariant } Txt { role: "small"; text: "Results stay on this PC" } }
        Row { spacing: 6; Icon { name: "pin"; size: 16; color: Theme.textVariant } Txt { role: "small"; text: "Testing from" } Txt { role: "small"; color: Theme.textMain; font.weight: Font.Medium; text: root.app.origin[2] } }
        Row { spacing: 6; Txt { role: "small"; text: "Already have an account?" }
            Txt { role: "small"; color: Theme.textMain; text: "Log in"; font.underline: true
                MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: root.app.go("entry") } } }
    }
}

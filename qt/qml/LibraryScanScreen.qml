import QtQuick
import ExitLag
import "Logic.js" as L

/* Varredura de jogos (pós-login): o GameScanner procura de verdade nos launchers do PC (Steam, Epic, Riot,
   Battle.net e pastas padrão). Cada launcher aparece numa linha; as capas dos jogos achados entram em cascata. */
Item {
    id: root
    property var app
    property var globe
    property bool active: false
    visible: opacity > 0
    opacity: active ? 1 : 0
    Behavior on opacity { SequentialAnimation { PauseAnimation { duration: root.active ? 380 : 0 } NumberAnimation { duration: root.active ? 600 : 320; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } }

    property var launchers: []      // [{ name, installed, folders, games }]
    property var shown: []          // linhas reveladas
    property var games: []
    property bool scanning: false
    property bool finished: false

    onActiveChanged: if (active) begin()

    GameScanner {
        id: scanner
        onLauncherScanned: function (launcher, installed, folders, found) { root.launchers = root.launchers.concat([{ name: launcher, installed: installed, folders: folders, games: found }]); }
        onFinished: function (list) { root.app.detected = list; root.scanning = false; }
    }
    function begin() {
        launchers = []; shown = []; games = []; finished = false; scanning = true;
        globe.idle(6.45, app.origin[0], app.origin[1]); globe.shiftX = -320;
        scanner.scan();
        pace.start();
    }
    // mostra um launcher por vez, no ritmo da animação (a leitura real costuma ser instantânea)
    Timer {
        id: pace; interval: 1100; repeat: true
        onTriggered: {
            if (root.shown.length < root.launchers.length) {
                var l = root.launchers[root.shown.length];
                root.shown = root.shown.concat([l]);
                root.games = root.games.concat(l.games.filter(function (g) { return !root.games.some(function (x) { return x.id === g.id; }); }));
            } else if (!root.scanning) { stop(); root.finished = true; out.start(); }
        }
    }
    Timer { id: out; interval: 2600; onTriggered: root.app.go("home") }

    Column {
        x: 720; anchors.verticalCenter: parent.verticalCenter; width: 600; spacing: 24
        Txt { role: "eyebrow"; text: root.finished ? "Library ready" : "Finding your games" }
        Txt { role: "h1"; width: parent.width; text: root.finished ? (root.games.length ? root.games.length + (root.games.length > 1 ? " games" : " game") + " ready to optimize." : "No supported games found yet.") : "Looking through your launchers." }
        Column {
            width: parent.width; spacing: 8
            Repeater {
                model: root.shown
                delegate: Rectangle {
                    required property var modelData
                    width: 600; height: 56; radius: 10; color: Theme.glass; border.width: 1; border.color: Theme.divider
                    opacity: 0; x: 24
                    Component.onCompleted: { opacity = 1; x = 0; }
                    Behavior on opacity { NumberAnimation { duration: 400 } }
                    Behavior on x { NumberAnimation { duration: 500; easing.type: Easing.OutCubic } }
                    Row { x: 16; anchors.verticalCenter: parent.verticalCenter; spacing: 12
                        Icon { name: modelData.installed ? "check" : "close"; size: 18; color: modelData.installed ? Theme.success : Theme.textVariant; anchors.verticalCenter: parent.verticalCenter }
                        Column { anchors.verticalCenter: parent.verticalCenter
                            Txt { role: "body"; font.weight: Font.Medium; text: modelData.name }
                            Txt { role: "small"; width: 420; elide: Text.ElideMiddle; wrapMode: Text.NoWrap
                                text: modelData.installed ? (modelData.folders.length ? modelData.folders.join("  ·  ") : "Installed") : "Not installed" } } }
                    Txt { anchors.right: parent.right; anchors.rightMargin: 16; anchors.verticalCenter: parent.verticalCenter; role: "small"; color: modelData.games.length ? Theme.textMain : Theme.textVariant
                        text: modelData.games.length ? modelData.games.length + " found" : "–" }
                }
            }
        }
        Flow {
            width: parent.width; spacing: 12
            Repeater {
                model: root.games
                delegate: Rectangle {
                    required property var modelData
                    required property int index
                    width: 66; height: 88; radius: 6; color: Theme.input; clip: true
                    scale: 0.6; opacity: 0
                    Component.onCompleted: appear.start()
                    ParallelAnimation { id: appear
                        NumberAnimation { target: parent; property: "scale"; to: 1; duration: 600; easing.type: Easing.OutBack }
                        NumberAnimation { target: parent; property: "opacity"; to: 1; duration: 400 } }
                    Image { anchors.fill: parent; source: L.CATALOG[modelData.id] ? L.CATALOG[modelData.id].img : ""; fillMode: Image.PreserveAspectCrop; sourceSize.width: 140 }
                }
            }
        }
        Txt { role: "small"; width: parent.width; visible: root.finished && !root.games.length
            text: "We look in Steam, Epic Games, Riot and Battle.net, plus the default install folders. You can still optimize any game from the home." }
    }
}

import QtQuick
import ExitLag
import "Logic.js" as L

/* Home: o globo com a rota até o servidor do jogo escolhido, os jogos achados no PC embaixo e, à direita, o painel
   do jogo (servidor, Optimize) e o Route Monitoring com o ping medido ao vivo. Na primeira entrada, o onboarding.
   "Optimize" desenha as rotas ExitLag e mostra a estimativa; o roteamento de verdade é feito pelo serviço ExitLag. */
Item {
    id: root
    property var app
    property var globe
    property bool active: false
    visible: opacity > 0
    opacity: active ? 1 : 0
    Behavior on opacity { SequentialAnimation { PauseAnimation { duration: root.active ? 380 : 0 } NumberAnimation { duration: root.active ? 600 : 320; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } }

    readonly property var ids: app.detected.length ? app.detected.map(function (g) { return g.id; }) : L.POPULAR
    property int sel: 0
    readonly property string gid: ids[Math.min(sel, ids.length - 1)]
    readonly property var game: L.CATALOG[gid]
    property string region: ""
    readonly property var reg: L.REGIONS[region || "br"]
    readonly property real distance: L.km(app.origin, [reg.lat, reg.lon])
    property var optimized: ({})
    readonly property bool isOpt: optimized[gid] === true
    property var samples: []
    readonly property var st: samples.length ? L.stats(samples.slice(-40)) : null
    readonly property var est: st ? L.xlEstimate(st, distance, app.hw ? app.hw.wifi : false) : null
    property bool tourSeen: false

    onActiveChanged: {
        if (active) { select(Math.max(0, ids.indexOf(app.gameId))); if (!tourSeen) tourStart.start(); }
        else lp.stop();
    }
    Timer { id: tourStart; interval: 1400; onTriggered: { tour.start(); root.tourSeen = true; } }

    LatencyProbe {
        id: lp; port: 443; interval: 1000; timeout: 1500
        onSample: function (ms, lost) { root.samples = root.samples.concat([{ v: ms, lost: lost }]).slice(-120); }
    }

    function select(i) {
        sel = i;
        region = L.nearestRegion(gid, app.origin);
        rebuild();
    }
    function setRegion(r) { region = r; rebuild(); }
    function rebuild() {
        samples = [];
        lp.stop(); lp.host = reg.host; lp.start();
        globe.clear();
        var o = app.origin, s = L.drawPoint(o, [reg.lat, reg.lon]);
        globe.addRoute({ group: "isp", stops: [[o[0], o[1]], s], color: Theme.isp, tube: 0.3, lift: 0.4, speed: 0.18 });
        var span = Math.max(4, Math.min(18, distance / 700));
        var mid = function (f, off) { return [o[0] + (s[0] - o[0]) * f + off, o[1] + (s[1] - o[1]) * f - off * 0.6]; };
        [-0.5, 0.15, 0.7].forEach(function (k, i) {
            globe.addRoute({ group: "xl", stops: [[o[0], o[1]], mid(0.42, k * span), mid(0.86, k * span * 0.35), s], color: Theme.success, tube: i ? 0.22 : 0.28, lift: 0.5 + i * 0.12, speed: 0.26 + i * 0.03 });
        });
        globe.addTag({ lat: o[0], lon: o[1], text: o[2], sub: "You", kind: "you", below: true });
        globe.addTag({ lat: s[0], lon: s[1], text: reg.city, sub: game.name, kind: "server" });
        globe.frame([[o[0], o[1]], s], 3.6, 5.6);
        globe.shiftX = -40;
        applyOpt();
    }
    function applyOpt() {
        globe.show("isp", true);
        globe.gain("isp", isOpt ? 0.25 : 1);
        globe.show("xl", isOpt);
    }
    function toggleOpt() {
        var o = Object.assign({}, optimized); o[gid] = !isOpt; optimized = o;
        applyOpt();
        app.toast(isOpt ? game.name + " optimized" : "Optimization stopped",
                  isOpt ? "Routes through ExitLag are shown on the globe. Numbers marked estimated come from your measured route." : "");
    }

    /* ---------- painel do jogo ---------- */
    Rectangle {
        id: panel
        x: 1440 - 96 - 360; y: 112; width: 360; height: panelCol.implicitHeight + 48; radius: 16
        color: Theme.glass; border.width: 1; border.color: Theme.divider
        Column {
            id: panelCol; x: 24; y: 24; width: parent.width - 48; spacing: 16
            Row { spacing: 12
                Image { width: 36; height: 48; source: root.game.img; fillMode: Image.PreserveAspectCrop; sourceSize.width: 72 }
                Column { anchors.verticalCenter: parent.verticalCenter; width: 260
                    Txt { role: "h2"; font.pixelSize: 22; lineHeight: 28; width: parent.width; elide: Text.ElideRight; wrapMode: Text.NoWrap; text: root.game.name }
                    Row { spacing: 6
                        Rectangle { width: 8; height: 8; radius: 4; anchors.verticalCenter: parent.verticalCenter; color: root.isOpt ? Theme.success : Theme.stroke
                            SequentialAnimation on opacity { running: root.isOpt; loops: Animation.Infinite; NumberAnimation { to: 0.4; duration: 600 } NumberAnimation { to: 1; duration: 600 } } }
                        Txt { role: "small"; text: root.isOpt ? "Optimized" : "Not optimized" } } } }
            Column { id: serverBox; width: parent.width; spacing: 8
                Txt { role: "small"; text: "Server" }
                Flow { width: parent.width; spacing: 8
                    Repeater { model: root.game.regions
                        delegate: Rectangle { required property var modelData
                            readonly property bool on: root.region === modelData
                            width: rt.implicitWidth + 24; height: 32; radius: 16
                            color: on || rma.containsMouse ? Theme.containerHigh : Theme.input; border.width: 1; border.color: on ? Theme.textMain : Theme.stroke
                            Txt { id: rt; anchors.centerIn: parent; role: "small"; color: Theme.textMain; font.weight: Font.Medium; text: L.REGIONS[modelData].name }
                            MouseArea { id: rma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.setRegion(modelData) } } } } }
            Btn { id: optBtn; width: parent.width; kind: root.isOpt ? "outlined" : "filled"; text: root.isOpt ? "Stop" : "Optimize"; onClicked: root.toggleOpt() }
        }
    }

    /* ---------- Route Monitoring (ping real) ---------- */
    Rectangle {
        id: monitor
        x: panel.x; y: panel.y + panel.height + 16; width: 360; height: monCol.implicitHeight + 48; radius: 16
        color: Theme.glass; border.width: 1; border.color: Theme.divider
        Column {
            id: monCol; x: 24; y: 24; width: parent.width - 48; spacing: 12
            Item { width: parent.width; height: 24
                Row { spacing: 8; Icon { name: "route"; size: 18; anchors.verticalCenter: parent.verticalCenter } Txt { role: "h3"; text: "Route Monitoring" } }
                Row { anchors.right: parent.right; spacing: 6; anchors.verticalCenter: parent.verticalCenter
                    Rectangle { width: 8; height: 8; radius: 4; color: Theme.primary; anchors.verticalCenter: parent.verticalCenter
                        SequentialAnimation on opacity { loops: Animation.Infinite; running: root.active; NumberAnimation { to: 0.4; duration: 600 } NumberAnimation { to: 1; duration: 600 } } }
                    Txt { role: "small"; text: "Live" } } }
            Txt { role: "small"; text: root.app.origin[2] + " → " + root.reg.city + " · " + L.fmt(root.distance) + " km" }
            Grid {
                columns: 3; columnSpacing: 12; rowSpacing: 8; width: parent.width
                Repeater {
                    model: [
                        ["Ping", root.st ? Math.round(root.isOpt && root.est ? root.est.avg : root.st.avg) : "–", "ms"],
                        ["Jitter", root.st ? (root.isOpt && root.est ? root.est.jit : root.st.jit).toFixed(1) : "–", "ms"],
                        ["Loss", root.st ? (root.isOpt ? 0 : root.st.loss).toFixed(1) : "–", "%"]
                    ]
                    delegate: Rectangle { required property var modelData
                        width: (parent.width - 24) / 3; height: 64; radius: 8; color: Theme.containerHigh
                        Column { x: 12; y: 10; spacing: 2
                            Txt { role: "small"; text: modelData[0] }
                            Row { spacing: 2; Txt { role: "h2"; font.pixelSize: 22; lineHeight: 26; text: modelData[1] } Txt { role: "small"; text: modelData[2]; anchors.bottom: parent.bottom; anchors.bottomMargin: 3 } } } } }
            }
            Spark { width: parent.width; height: 48; a: root.samples; b: []; capacity: 60; colorA: root.isOpt ? Theme.success : Theme.isp }
            Txt { role: "small"; width: parent.width
                text: root.isOpt ? "Measured now on your route; ExitLag values are estimated from it." : "Measured now on your route, once per second." }
        }
    }

    /* ---------- resumo à esquerda ---------- */
    Column {
        x: 96; y: 112; spacing: 12; width: 300
        Txt { role: "eyebrow"; text: "Your setup" }
        Rectangle {
            width: 300; height: 64; radius: 12; color: Theme.glass; border.width: 1; border.color: Theme.divider
            Row { x: 12; anchors.verticalCenter: parent.verticalCenter; spacing: 12
                Rectangle { width: 40; height: 40; radius: 20; color: "transparent"; border.width: 2; border.color: Theme.textMain
                    Txt { anchors.centerIn: parent; role: "h3"; font.family: Theme.fontDisplay; text: root.app.hw ? root.app.hw.tier.score : "?" } }
                Column { anchors.verticalCenter: parent.verticalCenter
                    Txt { role: "body"; font.weight: Font.Medium; text: root.app.hw ? root.app.hw.tier.name + " PC" : "PC not analyzed" }
                    Txt { role: "small"; text: root.app.hw ? root.app.hw.findings.length + " things to improve" : "Run the free check-up from the log in screen" } } }
        }
    }

    /* ---------- jogos ---------- */
    Item {
        id: gamesRow
        anchors.horizontalCenter: parent.horizontalCenter; anchors.bottom: parent.bottom; anchors.bottomMargin: 32
        width: Math.min(root.ids.length, 9) * 96 - 12; height: 150
        Txt { anchors.horizontalCenter: parent.horizontalCenter; y: -24; role: "small"; text: root.app.detected.length ? "Games found on this PC" : "Popular games · none found on this PC" }
        Row {
            spacing: 12; anchors.bottom: parent.bottom
            Repeater {
                model: root.ids.slice(0, 9)
                delegate: Item {
                    required property var modelData
                    required property int index
                    readonly property bool on: root.sel === index
                    width: 84; height: 140
                    Rectangle {
                        id: cover
                        width: 84; height: 112; radius: 8; color: Theme.input; clip: true
                        y: on ? 0 : cma.containsMouse ? 10 : 18
                        Behavior on y { NumberAnimation { duration: 300; easing.type: Easing.OutCubic } }
                        opacity: on || cma.containsMouse ? 1 : 0.6
                        Behavior on opacity { NumberAnimation { duration: 200 } }
                        Image { anchors.fill: parent; source: L.CATALOG[modelData].img; fillMode: Image.PreserveAspectCrop; sourceSize.width: 168 }
                        Rectangle { anchors.right: parent.right; anchors.top: parent.top; anchors.margins: 6; width: 10; height: 10; radius: 5; color: Theme.success; border.width: 2; border.color: Theme.surface
                            visible: root.optimized[modelData] === true
                            SequentialAnimation on opacity { loops: Animation.Infinite; running: parent.visible; NumberAnimation { to: 0.4; duration: 700 } NumberAnimation { to: 1; duration: 700 } } }
                        MouseArea { id: cma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.select(index) }
                    }
                    Rectangle { anchors.horizontalCenter: parent.horizontalCenter; y: 122; width: on ? 24 : 0; height: 3; radius: 2; color: Theme.primary; Behavior on width { NumberAnimation { duration: 300 } } }
                }
            }
        }
    }

    TourOverlay {
        id: tour
        anchors.fill: parent
        steps: [
            { target: gamesRow, title: "Your games", text: "Every supported game we found on this PC. Pick one to see its route to the server." },
            { target: serverBox, title: "Pick the server", text: "The region you play on. We suggest the closest one, measured from where you are." },
            { target: optBtn, title: "Optimize", text: "Routes this game through ExitLag. The globe shows the routes it uses." },
            { target: monitor, title: "Route Monitoring", text: "Ping, jitter and packet loss to the server, measured live while the app is open." }
        ]
    }
}

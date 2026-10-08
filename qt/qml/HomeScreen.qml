import QtQuick
import ExitLag
import "Logic.js" as L

/* Home pós-login.
   - Topo: menu retrátil, marca, toggle da ExitLag; busca, ajuda, perfil e notificações (gavetas à direita).
   - Globo interativo com a rota até o servidor do jogo e os jogos em órbita (GameOrbit).
   - Painel do jogo (servidor, Optimize) e Route Monitoring com ping medido ao vivo.
   - "Your setup": abre o resultado da análise do PC, com a opção de refazer; sem análise, leva para a análise.
   - ExitLag desligada: o globo fica laranja sutil, as rotas ExitLag somem e Optimize vira um aviso. Sem internet,
     um aviso no topo e a medição tenta de novo sozinha.
   O roteamento de verdade é do serviço ExitLag: aqui "Optimize" desenha as rotas e mostra a estimativa. */
Item {
    id: root
    property var app
    property var globe
    property bool active: false
    visible: opacity > 0
    opacity: active ? 1 : 0
    Behavior on opacity { SequentialAnimation { PauseAnimation { duration: root.active ? 380 : 0 } NumberAnimation { duration: root.active ? 600 : 320; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } }

    readonly property var ids: app.detected.length ? app.detected.map(function (g) { return g.id; }) : L.POPULAR
    property string gid: ids[0]
    readonly property var game: L.CATALOG[gid]
    property string region: ""
    readonly property var reg: L.REGIONS[region || "br"]
    readonly property real distance: L.km(app.origin, [reg.lat, reg.lon])
    property var optimized: ({})
    readonly property bool isOpt: optimized[gid] === true && app.exitlagOn
    property var samples: []
    readonly property var st: samples.length ? L.stats(samples.slice(-40)) : null
    readonly property var est: st ? L.xlEstimate(st, distance, app.hw ? app.hw.wifi : false) : null
    property int lostRun: 0
    property bool tourSeen: false
    property string page: "Home"
    property string drawer: ""

    onActiveChanged: {
        if (active) {
            page = "Home";
            select(ids.indexOf(app.gameId) >= 0 ? app.gameId : ids[0]);
            if (devOpen !== "") { tourSeen = true; devTimer.start(); }
            if (!tourSeen) tourStart.start();
        } else lp.stop();
    }
    property string devOpen: ""
    Timer { id: devTimer; interval: 1200; onTriggered: {
            if (root.devOpen === "menu") side.open = true;
            else if (root.devOpen === "off") root.setExitLag(false);
            else if (root.devOpen.indexOf("page:") === 0) root.page = root.devOpen.slice(5);
            else { if (root.devOpen === "notifications") root.app.notify("Network map ready", "Best region: South America (Sao Paulo), 12 ms."); root.drawer = root.devOpen; } } }
    Timer { id: tourStart; interval: 1600; onTriggered: { tour.start(); root.tourSeen = true; } }

    LatencyProbe {
        id: lp; port: 443; interval: 1000; timeout: 1500
        onSample: function (ms, lost) {
            root.samples = root.samples.concat([{ v: ms, lost: lost }]).slice(-120);
            // cinco perdas seguidas: sem internet (ou o servidor fora do ar); a medição continua tentando
            root.lostRun = lost ? root.lostRun + 1 : 0;
            root.app.netDown = root.lostRun >= 5;
        }
        onError: function (m) { root.app.netDown = true; retry.start(); }
    }
    Timer { id: retry; interval: 5000; onTriggered: if (root.active) { lp.stop(); lp.start(); } }

    function select(id) {
        gid = id;
        app.gameId = id;
        region = L.nearestRegion(gid, app.origin);
        rebuild();
    }
    function setRegion(r) { region = r; rebuild(); }
    function rebuild() {
        samples = []; lostRun = 0;
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
        globe.frame([[o[0], o[1]], s], 6.2, 7.4);
        globe.shiftX = -170;
        applyOpt();
    }
    function applyOpt() {
        globe.show("isp", true);
        globe.gain("isp", isOpt ? 0.25 : 1);
        globe.show("xl", isOpt);
    }
    onIsOptChanged: applyOpt()
    function toggleOpt() {
        var o = Object.assign({}, optimized); o[gid] = !(optimized[gid] === true); optimized = o;
        if (isOpt) { globe.pulse(Theme.success); app.notify(game.name + " optimized", "Routes through " + reg.city + " are live on the globe."); }
        app.toast(isOpt ? game.name + " optimized" : "Optimization stopped", isOpt ? "ExitLag values on Route Monitoring are estimated from your measured route." : "");
    }
    function setExitLag(on) {
        app.exitlagOn = on;
        globe.offline = !on;
        if (on) globe.pulse(Theme.success);
        app.toast(on ? "ExitLag is on" : "ExitLag is off", on ? "Your optimized games are back on ExitLag routes." : "Games now go straight through your provider. Turn ExitLag on to optimize them again.");
    }
    function openPc() {
        if (app.hw) drawer = "pc";
        else app.rerun();
    }

    /* ---------- área da home ---------- */
    Item {
        id: homeArea
        anchors.fill: parent
        opacity: root.page === "Home" ? 1 : 0; visible: opacity > 0
        Behavior on opacity { NumberAnimation { duration: Theme.d300 } }

        GameOrbit {
            id: orbit
            globe: root.globe
            ids: root.ids
            selected: root.gid
            optimized: root.optimized
            exitlagOn: root.app.exitlagOn
            onPicked: function (id) { root.select(id); }
        }

        // Your setup: resultado do PC (ou o caminho para a análise)
        Rectangle {
            id: setup
            x: 32; y: 96; width: 300; height: 64; radius: 12
            color: sma.containsMouse ? Theme.containerHigh : Theme.glass
            border.width: 1; border.color: sma.containsMouse ? Theme.stroke : Theme.divider
            Behavior on color { ColorAnimation { duration: 150 } }
            Row { x: 12; anchors.verticalCenter: parent.verticalCenter; spacing: 12
                Item { width: 40; height: 40
                    Ring { anchors.fill: parent; thickness: 2; value: root.app.hw ? root.app.hw.tier.score / 100 : 0; track: Theme.divider }
                    Txt { anchors.centerIn: parent; role: "h3"; font.family: Theme.fontDisplay; text: root.app.hw ? root.app.hw.tier.score : "?" } }
                Column { anchors.verticalCenter: parent.verticalCenter; width: 200
                    Txt { role: "body"; font.weight: Font.Medium; text: root.app.hw ? root.app.hw.tier.name + " PC" : "Analyze your PC" }
                    Txt { role: "small"; text: root.app.hw ? root.app.hw.findings.length + " things to improve · see result" : "About a minute · free" } } }
            Icon { anchors.right: parent.right; anchors.rightMargin: 12; anchors.verticalCenter: parent.verticalCenter; name: "chev"; size: 16; color: Theme.textVariant }
            MouseArea { id: sma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.openPc() }
            Accessible.role: Accessible.Button; Accessible.name: "Your setup"
        }

        // painel do jogo
        Rectangle {
            id: panel
            x: 1440 - 32 - 360; y: 96; width: 360; height: panelCol.implicitHeight + 48; radius: 16
            color: Theme.glass; border.width: 1; border.color: Theme.divider
            Behavior on height { NumberAnimation { duration: Theme.d300; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }
            Column {
                id: panelCol; x: 24; y: 24; width: parent.width - 48; spacing: 16
                Row { spacing: 12
                    Image { width: 48; height: 48; source: L.iconFor(root.gid); sourceSize.width: 128; mipmap: true }
                    Column { anchors.verticalCenter: parent.verticalCenter; width: 240
                        Txt { role: "h2"; font.pixelSize: 22; lineHeight: 28; width: parent.width; elide: Text.ElideRight; wrapMode: Text.NoWrap; text: root.game.name }
                        Row { spacing: 6
                            Rectangle { width: 8; height: 8; radius: 4; anchors.verticalCenter: parent.verticalCenter; color: root.isOpt ? Theme.success : Theme.stroke
                                SequentialAnimation on opacity { running: root.isOpt; loops: Animation.Infinite; NumberAnimation { to: 0.4; duration: 600 } NumberAnimation { to: 1; duration: 600 } } }
                            Txt { role: "small"; text: !root.app.exitlagOn ? "ExitLag is off" : root.isOpt ? "Optimized" : "Not optimized" } } } }
                Column { id: serverBox; width: parent.width; spacing: 8
                    Txt { role: "small"; text: "Server" }
                    Flow { width: parent.width; spacing: 8
                        Repeater { model: root.game.regions
                            delegate: Rectangle { required property var modelData
                                readonly property bool on: root.region === modelData
                                width: rt.implicitWidth + 24; height: 32; radius: 16
                                color: on || rma.containsMouse ? Theme.containerHigh : Theme.input; border.width: 1; border.color: on ? Theme.textMain : Theme.stroke
                                Behavior on border.color { ColorAnimation { duration: 150 } }
                                Txt { id: rt; anchors.centerIn: parent; role: "small"; color: Theme.textMain; font.weight: Font.Medium; text: L.REGIONS[modelData].name }
                                MouseArea { id: rma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.setRegion(modelData) } } } } }
                // ExitLag desligada: aviso no lugar do Optimize
                Item {
                    id: optBox
                    width: parent.width; height: root.app.exitlagOn ? 40 : offBox.height
                    Btn { id: optBtn; visible: root.app.exitlagOn; width: parent.width; kind: root.isOpt ? "outlined" : "filled"; text: root.isOpt ? "Stop" : "Optimize"; onClicked: root.toggleOpt() }
                    Rectangle {
                        id: offBox; visible: !root.app.exitlagOn
                        width: parent.width; height: oc.implicitHeight + 32; radius: 4; color: Theme.warningSoftBg
                        Column { id: oc; x: 16; y: 16; width: parent.width - 32; spacing: 8
                            Row { spacing: 8; Icon { name: "alert"; size: 20; color: Theme.warningText } Txt { role: "body"; font.weight: Font.Medium; color: Theme.warningText; text: "ExitLag is off" } }
                            Txt { role: "small"; color: Theme.warningText; width: parent.width; text: "Games go straight through your provider. Turn ExitLag on to optimize them." }
                            Btn { kind: "outlined"; text: "Turn on"; onClicked: root.setExitLag(true) } }
                    }
                }
            }
        }

        // Route Monitoring (ping real)
        Rectangle {
            id: monitor
            x: panel.x; y: panel.y + panel.height + 16; width: 360; height: monCol.implicitHeight + 48; radius: 16
            color: Theme.glass; border.width: 1; border.color: Theme.divider
            Column {
                id: monCol; x: 24; y: 24; width: parent.width - 48; spacing: 12
                Item { width: parent.width; height: 24
                    Row { spacing: 8; Icon { name: "route"; size: 18; anchors.verticalCenter: parent.verticalCenter } Txt { role: "h3"; text: "Route Monitoring" } }
                    Row { anchors.right: parent.right; spacing: 6; anchors.verticalCenter: parent.verticalCenter
                        Rectangle { width: 8; height: 8; radius: 4; color: root.app.netDown ? Theme.stroke : Theme.primary; anchors.verticalCenter: parent.verticalCenter
                            SequentialAnimation on opacity { loops: Animation.Infinite; running: root.active && !root.app.netDown; NumberAnimation { to: 0.4; duration: 600 } NumberAnimation { to: 1; duration: 600 } } }
                        Txt { role: "small"; text: root.app.netDown ? "Reconnecting" : "Live" } } }
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
    }

    /* ---------- páginas do menu ---------- */
    Rectangle {
        id: pagePanel
        visible: opacity > 0
        opacity: root.page !== "Home" ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: Theme.d300 } }
        x: 32; y: 88; width: parent.width - 64; height: parent.height - 120; radius: 24
        color: Theme.glassPanel; border.width: 1; border.color: Theme.divider
        MouseArea { anchors.fill: parent }
        Item {
            x: 40; y: 32; width: parent.width - 80; height: parent.height - 64
            Row { id: pageHead; spacing: 16; width: parent.width
                IconBtn { icon: "back"; tip: "Back to Home"; iconColor: Theme.textMain; onClicked: root.page = "Home" }
                Txt { role: "h1"; text: root.page; anchors.verticalCenter: parent.verticalCenter } }
            Item {
                y: pageHead.height + 24; width: parent.width; height: parent.height - y
                PcResultView { anchors.fill: parent; visible: root.page === "PC Boost"; hw: root.app.hw; onRunAgain: root.app.rerun() }
                Column {
                    visible: root.page === "Network Analyzer"; width: 640; spacing: 16
                    Txt { role: "body"; color: Theme.textVariant; width: parent.width; text: "Latency from " + root.app.origin[2] + " to one point on each continent, measured when you logged in." }
                    Repeater {
                        model: root.app.mapResults
                        delegate: Item { required property var modelData
                            width: 640; height: 44
                            Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: Theme.divider }
                            Txt { role: "body"; anchors.verticalCenter: parent.verticalCenter; text: modelData.name + "  ·  " + modelData.city }
                            Txt { role: "body"; font.weight: Font.Medium; anchors.right: parent.right; anchors.verticalCenter: parent.verticalCenter; text: modelData.ms ? Math.round(modelData.ms) + " ms" : "No answer" } }
                    }
                    Txt { visible: !root.app.mapResults.length; role: "body"; color: Theme.textVariant; text: "No network map yet." }
                    Btn { text: "Map my network again"; onClicked: root.app.go("netmap") }
                }
                Column {
                    visible: ["PC Boost", "Network Analyzer"].indexOf(root.page) < 0; spacing: 16; width: 560
                    Txt { role: "body"; color: Theme.textVariant; width: parent.width; text: "This page isn't part of this build yet. Its controls come from the ExitLag app." }
                    Btn { kind: "outlined"; text: "Back to Home"; onClicked: root.page = "Home" }
                }
            }
        }
    }

    // sem internet
    Rectangle {
        visible: opacity > 0
        opacity: root.app.netDown ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: Theme.d300 } }
        anchors.horizontalCenter: parent.horizontalCenter; y: 80
        width: offRow.implicitWidth + 32; height: 40; radius: 4; color: Theme.warningSoftBg
        Row { id: offRow; anchors.centerIn: parent; spacing: 8
            Icon { name: "offline"; size: 18; color: Theme.warningText; anchors.verticalCenter: parent.verticalCenter }
            Txt { role: "body"; color: Theme.warningText; text: "No internet connection. We'll reconnect automatically."; anchors.verticalCenter: parent.verticalCenter } }
    }

    TopBar {
        id: top
        y: 12; width: parent.width
        app: root.app
        exitlagOn: root.app.exitlagOn
        unread: root.app.notifications.filter(function (n) { return n.unread; }).length
        searchIds: root.ids
        onMenu: side.open = true
        onToggled: function (on) { root.setExitLag(on); }
        onOpenDrawer: function (w) { root.drawer = w; if (w === "notifications") root.app.markRead(); }
        onPickGame: function (id) { root.page = "Home"; root.select(id); }
    }

    SideMenu {
        id: side
        current: root.page
        exitlagOn: root.app.exitlagOn
        onNavigate: function (p) { root.page = p; }
    }

    TourOverlay {
        id: tour
        anchors.fill: parent
        steps: [
            { target: tourGames, title: "Your games", text: "Every supported game we found on this PC orbits the globe. Hover the globe to see them all; pick one to see its route." },
            { target: serverBox, title: "Pick the server", text: "The region you play on. We suggest the closest one, measured from where you are." },
            { target: optBox, title: "Optimize", text: "Routes this game through ExitLag. The globe shows the routes it uses." },
            { target: monitor, title: "Route Monitoring", text: "Ping, jitter and packet loss to the server, measured live while the app is open." },
            { target: setup, title: "Your setup", text: "Your PC's result lives here. Open it to see what to improve or run the analysis again." }
        ]
    }
    // alvo do passo 1: o globo com a órbita
    Item { id: tourGames; x: root.globe.screenCenter.x - root.globe.screenRadius * 1.3; y: root.globe.screenCenter.y - root.globe.screenRadius * 0.7; width: root.globe.screenRadius * 2.6; height: root.globe.screenRadius * 1.4 }

    /* ---------- gavetas ---------- */
    Drawer {
        open: root.drawer !== ""
        title: ({ notifications: "Notifications", profile: "Profile", help: "Help Center", pc: "Your setup" })[root.drawer] || ""
        onClosed: root.drawer = ""
        content: root.drawer === "notifications" ? notifComp : root.drawer === "profile" ? profileComp : root.drawer === "help" ? helpComp : pcComp
    }
    Component {
        id: pcComp
        PcResultView { hw: root.app.hw; onRunAgain: { root.drawer = ""; root.app.rerun(); } }
    }
    Component {
        id: notifComp
        ListView {
            spacing: 8; clip: true
            model: root.app.notifications
            delegate: Rectangle {
                required property var modelData
                width: ListView.view.width; height: nc.implicitHeight + 32; radius: 8; color: Theme.containerHigh
                Rectangle { visible: modelData.unread; x: 16; y: 22; width: 8; height: 8; radius: 4; color: Theme.primary }
                Column { id: nc; x: 36; y: 16; width: parent.width - 52; spacing: 4
                    Item { width: parent.width; height: 20
                        Txt { role: "body"; font.weight: Font.Medium; text: modelData.title }
                        Txt { anchors.right: parent.right; role: "small"; text: modelData.when } }
                    Txt { role: "small"; width: parent.width; text: modelData.desc } }
            }
            Txt { anchors.centerIn: parent; visible: parent.count === 0; role: "body"; color: Theme.textVariant; text: "You're all caught up." }
        }
    }
    Component {
        id: profileComp
        Column {
            spacing: 24
            Row { spacing: 16
                Rectangle { width: 64; height: 64; radius: 32; color: Theme.input
                    Txt { anchors.centerIn: parent; role: "h2"; text: (root.app.email || "You").charAt(0).toUpperCase() } }
                Column { anchors.verticalCenter: parent.verticalCenter; spacing: 4
                    Txt { role: "h3"; text: root.app.email || "Guest" }
                    Badge { sev: "success"; text: root.app.offer === "trial" ? "Free trial · 3 days left" : (L.PLANS.filter(function (p) { return p.id === root.app.offer; })[0] || { n: "ExitLag" }).n + " plan" } } }
            Repeater {
                model: [["settings", "Account settings", "Email, password and devices"], ["boost", "Subscription", "Plan, payment and invoices"], ["pc", "Run the free check-up", "Analyze your PC and connection again"], ["logout", "Log out", "Back to the log in screen"]]
                delegate: Rectangle {
                    required property var modelData
                    required property int index
                    width: 632; height: 64; radius: 8; color: pr.containsMouse ? Theme.containerHigh : "transparent"
                    Row { x: 12; anchors.verticalCenter: parent.verticalCenter; spacing: 16
                        Rectangle { width: 40; height: 40; radius: 8; color: Theme.input; Icon { anchors.centerIn: parent; name: modelData[0]; size: 20 } }
                        Column { anchors.verticalCenter: parent.verticalCenter; Txt { role: "body"; font.weight: Font.Medium; text: modelData[1] } Txt { role: "small"; text: modelData[2] } } }
                    MouseArea { id: pr; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (index === 2) { root.drawer = ""; root.app.rerun(); }
                            else if (index === 3) { root.drawer = ""; root.app.logout(); }
                            else root.app.toast(modelData[1], "Managed in your ExitLag account. Not connected in this build.");
                        } }
                }
            }
        }
    }
    Component {
        id: helpComp
        Column {
            spacing: 16
            Txt { role: "body"; color: Theme.textVariant; width: 632; text: "Answers to what people ask most. Our team replies in the app, in English, Portuguese and Spanish." }
            Repeater {
                model: ["Why is my ping still high with ExitLag on?", "How do I pick the best server?", "What does packet loss mean in a match?", "Does ExitLag work over Wi-Fi?", "How do I cancel the free trial?"]
                delegate: Rectangle {
                    required property var modelData
                    width: 632; height: 52; radius: 8; color: hr.containsMouse ? Theme.containerHigh : "transparent"
                    Txt { x: 12; anchors.verticalCenter: parent.verticalCenter; role: "body"; text: modelData }
                    Icon { anchors.right: parent.right; anchors.rightMargin: 12; anchors.verticalCenter: parent.verticalCenter; name: "chev"; size: 16; color: Theme.textVariant }
                    MouseArea { id: hr; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.app.toast(modelData, "Opens the Help Center article. Not connected in this build.") }
                }
            }
            Btn { text: "Contact support"; kind: "outlined"; onClicked: root.app.toast("Contact support", "Opens a chat with the ExitLag team. Not connected in this build.") }
        }
    }
}

import QtQuick
import ExitLag
import "Logic.js" as L

/* Análise numa sequência só:
   1 · PC: o HardwareProbe lê o Windows; cada peça sai do anel central e voa para a sua posição em volta.
   2 · Conexão: o globo entra, a rota até a região do jogo é medida ao vivo (LatencyProbe, TCP) e o caminho salto a
       salto é traçado (TraceRoute, ICMP, só no Windows). Depois, a estimativa com ExitLag (não medida).
   No fim, "Analysis complete" e os resultados. */
Item {
    id: root
    property var app
    property var globe
    property bool active: false
    visible: opacity > 0
    opacity: active ? 1 : 0
    Behavior on opacity { SequentialAnimation { PauseAnimation { duration: root.active ? 380 : 0 } NumberAnimation { duration: root.active ? 600 : 320; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } }

    property string phase: "idle"           // idle | hw | hwdone | net | xl | done
    readonly property bool netOn: phase === "net" || phase === "xl" || phase === "done"
    property var hw: null
    property int revealed: 0
    property string readingLabel: "Getting ready"
    property var sI: []
    property var sX: []
    property var hops: []
    property var mI: null
    property var mX: null
    property real hwProgress: 0
    property real netProgress: 0
    property string tickL: ""
    property string tickV: ""
    readonly property var region: L.REGIONS[app.region || "br"]
    readonly property real distance: L.km(app.origin, [region.lat, region.lon])
    property int run: 0

    onActiveChanged: if (active) start(); else stopAll()

    HardwareProbe { id: probe; onFinished: function (data) { root.app.hwRaw = data; root.hw = L.analyzeHardware(data); } }
    LatencyProbe {
        id: lp; port: 443; interval: 150; timeout: 1200
        onSample: function (ms, lost) { root.sI = root.sI.concat([{ v: ms, lost: lost }]); }
        onError: function (m) { root.tick("Can't reach the server", m); }
    }
    TraceRoute {
        id: tr
        onHop: function (ttl, address, name, ms, lost, sent, reached) { root.hops = root.hops.concat([{ ttl: ttl, address: address, name: name, ms: ms, lost: lost, sent: sent }]); }
    }

    function tick(l, v) { tickL = l; tickV = v || ""; tickerAnim.restart(); }
    function stopAll() { run++; lp.stop(); tr.stop(); seq.stop(); }
    function start() {
        stopAll();
        if (!app.region || L.CATALOG[app.gameId].regions.indexOf(app.region) < 0) app.region = L.nearestRegion(app.gameId, app.origin);
        var id = run;
        phase = "hw"; hw = null; revealed = 0; sI = []; sX = []; hops = []; mI = null; mX = null; hwProgress = 0; netProgress = 0;
        finale.shown = false;
        globe.idle(6.45); globe.shiftX = 0;
        probe.run();
        tick("Reading your PC", "");
        seq.start();
    }

    // máquina de estados por timer: espera a leitura real, revela peça a peça, mede a rede, estima e termina
    property int step: 0
    property real stepT: 0
    Timer {
        id: seq
        interval: 100; repeat: true
        property int k: 0
        onTriggered: {
            root.stepT += 0.1 * root.app.speed;
            var R = root;
            if (R.phase === "hw") {
                if (!R.hw) {
                    var labels = ["processor", "graphics card", "memory", "storage", "display", "network adapter", "background apps", "power plan", "DNS"];
                    var i = Math.floor(R.stepT / 0.7) % labels.length;
                    R.readingLabel = "Reading " + labels[i];
                    if (Math.round(R.stepT * 10) % 7 === 0) R.tick("Reading " + labels[i], "");
                    R.hwProgress = Math.min(0.35, R.stepT / 20);
                } else if (R.revealed < R.hw.parts.length) {
                    if (R.stepT >= 0.55) {
                        R.stepT = 0;
                        var p = R.hw.parts[R.revealed];
                        R.readingLabel = p.lbl;
                        R.tick("Reading " + p.lbl.toLowerCase(), p.val);
                        R.revealed++;
                        R.hwProgress = 0.35 + 0.65 * R.revealed / R.hw.parts.length;
                    }
                } else { R.phase = "hwdone"; R.stepT = 0; R.tick("Your PC", R.hw.tier.name + " · " + R.hw.tier.score + " / 100"); }
            } else if (R.phase === "hwdone") {
                if (R.stepT > 2.4) { R.startNet(); }
            } else if (R.phase === "net") {
                R.netProgress = Math.min(0.7, R.stepT / 14 * 0.7);
                if (R.stepT > 4 && !R.lossTagged) R.markLoss();
                if (R.stepT > 14) R.startXl();
            } else if (R.phase === "xl") {
                R.netProgress = 0.7 + Math.min(0.3, R.stepT / 7 * 0.3);
                if (Math.round(R.stepT * 10) % 2 === 0) {
                    var e = R.mX, n = e.avg + (Math.random() - 0.5) * e.jit * 2;
                    R.sX = R.sX.concat([{ v: n, lost: false }]);
                }
                if (R.stepT > 7) { R.phase = "done"; R.stepT = 0; finale.shown = true; R.tick("Putting your results together", ""); }
            } else if (R.phase === "done") {
                if (R.stepT > 1.8) { seq.stop(); R.finish(); }
            }
        }
    }

    // orelha do protótipo: adianta a fase atual
    function skip() {
        if (phase === "hw") { if (!hw) return true; revealed = hw.parts.length - 1; stepT = 1; }
        else if (phase === "hwdone") startNet();
        else if (phase === "net") { if (sI.length) startXl(); else stepT = 14; }
        else if (phase === "xl") stepT = 7.1;
        else if (phase === "done") stepT = 2;
        else return false;
        return true;
    }

    property bool lossTagged: false
    function startNet() {
        phase = "net"; stepT = 0; lossTagged = false;
        globe.clear();
        var o = app.origin, s = L.drawPoint(o, [region.lat, region.lon]);
        globe.addRoute({ group: "isp", stops: [[o[0], o[1]], s], color: Theme.isp, tube: 0.32, lift: 0.4, speed: 0.18 });
        globe.addTag({ lat: o[0], lon: o[1], text: o[2], sub: "You", kind: "you", below: true });
        globe.addTag({ lat: s[0], lon: s[1], text: region.city, sub: "Game server region", kind: "server" });
        globe.frame([[o[0], o[1]], s], 3.6, 6.45);
        globe.shiftX = 220;
        globe.show("isp", true);
        lp.host = region.host; lp.start();
        if (tr.supported) tr.start(region.host, 24);
        tick("Measuring your route to", region.city + " · live");
    }
    function markLoss() {
        lossTagged = true;
        var st = L.stats(sI);
        if (st.loss > 0.4) tick("Packet loss found", st.loss.toFixed(1) + "% so far");
    }
    function startXl() {
        lp.stop();
        mI = L.stats(sI);
        mX = L.xlEstimate(mI, distance, hw ? hw.wifi : false);
        phase = "xl"; stepT = 0;
        globe.gain("isp", 0.3);
        // rotas ExitLag (ilustração do multipath): três caminhos com pontos intermediários deslocados da linha direta
        var o = app.origin, s = L.drawPoint(o, [region.lat, region.lon]);
        var mid = function (f, off) { return [o[0] + (s[0] - o[0]) * f + off, o[1] + (s[1] - o[1]) * f - off * 0.6]; };
        var span = Math.max(4, Math.min(18, distance / 700));
        [-0.5, 0.15, 0.7].forEach(function (k, i) {
            globe.addRoute({ group: "xl", stops: [[o[0], o[1]], mid(0.42, k * span), mid(0.86, k * span * 0.35), s], color: Theme.success, tube: i ? 0.24 : 0.3, lift: 0.5 + i * 0.12, speed: 0.26 + i * 0.03 });
        });
        globe.show("xl", true);
        tick("Same route through ExitLag", "estimated · 3 routes carrying every packet");
    }
    function finish() {
        tr.stop();
        var findings = L.analyzeNetwork(mI, distance, hops, hw ? hw.wifi : false, region.city);
        app.hw = hw;
        app.net = { I: mI, X: mX, sI: sI, sX: sX, hops: hops, region: app.region, gameId: app.gameId, distance: distance, findings: findings, address: lp.address };
        app.go("results");
    }

    /* ---------- topo: duas etapas ---------- */
    Row {
        anchors.horizontalCenter: parent.horizontalCenter; y: 28; spacing: 16
        Repeater {
            model: [["1", "Your PC"], ["2", "Your connection"]]
            delegate: Row {
                required property var modelData
                required property int index
                readonly property bool on: index === 0 ? true : root.netOn
                readonly property bool fin: index === 0 ? root.phase !== "hw" : root.phase === "done"
                spacing: 8
                Rectangle { width: 20; height: 20; radius: 10; color: fin ? Theme.textMain : "transparent"; border.width: fin ? 0 : 1; border.color: Theme.stroke
                    Txt { anchors.centerIn: parent; role: "small"; text: modelData[0]; color: fin ? Theme.surface : Theme.textVariant; font.pixelSize: 11 } }
                Txt { role: "small"; text: modelData[1]; color: on ? Theme.textMain : Theme.textVariant; font.weight: Font.Medium; anchors.verticalCenter: parent.verticalCenter }
                Rectangle { width: 120; height: 3; radius: 2; color: Theme.divider; anchors.verticalCenter: parent.verticalCenter
                    Rectangle { height: parent.height; radius: 2; color: Theme.textMain; width: parent.width * (index === 0 ? root.hwProgress : root.netProgress); Behavior on width { NumberAnimation { duration: 300 } } } }
            }
        }
    }

    /* ---------- 1 · PC ---------- */
    Item {
        id: hwStage
        anchors.fill: parent
        opacity: root.netOn ? 0 : 1; scale: root.netOn ? 0.85 : 1
        visible: opacity > 0
        Behavior on opacity { NumberAnimation { duration: 700 } }
        Behavior on scale { NumberAnimation { duration: 900; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }

        function nodePos(i, n) {
            var side = i % 2 ? 1 : -1, k = Math.floor(i / 2), rows = Math.ceil(n / 2);
            var y = 150 + k * ((810 - 150 - 170) / Math.max(1, rows - 1)), dy = (y + 34 - 405) / 250;
            var x = side < 0 ? 170 + 110 * (1 - dy * dy) : 1440 - 170 - 220 - 110 * (1 - dy * dy);
            return { x: x, y: y, side: side };
        }

        Canvas {
            id: wires
            anchors.fill: parent
            property int count: root.revealed
            onCountChanged: requestPaint()
            onPaint: {
                var c = getContext("2d"); c.reset();
                if (!root.hw) return;
                for (var i = 0; i < count; i++) {
                    var p = hwStage.nodePos(i, root.hw.parts.length), st = root.hw.parts[i].st;
                    var ex = p.side < 0 ? p.x + 220 : p.x, ey = p.y + 34, ang = Math.atan2(ey - 405, ex - 720);
                    var sx = 720 + Math.cos(ang) * 160, sy = 405 + Math.sin(ang) * 160;
                    c.strokeStyle = st === "critical" ? "#99f52929" : "#99555c68"; c.lineWidth = 1;
                    c.beginPath(); c.moveTo(sx, sy); c.bezierCurveTo((sx + ex) / 2, sy, (sx + ex) / 2, ey, ex, ey); c.stroke();
                }
            }
        }

        // anel central com varredura
        Item {
            id: core
            width: 300; height: 300; anchors.centerIn: parent
            readonly property bool done: root.phase !== "hw"
            Rectangle {
                anchors.centerIn: parent; width: 420; height: 420; radius: 210; color: "transparent"
                SequentialAnimation on scale { loops: Animation.Infinite; NumberAnimation { to: 1.06; duration: 1200; easing.type: Easing.InOutSine } NumberAnimation { to: 1; duration: 1200; easing.type: Easing.InOutSine } }
                Canvas { id: glowCv; anchors.fill: parent; onPaint: { var c = getContext("2d"); c.reset(); var g = c.createRadialGradient(210, 210, 0, 210, 210, 210);
                    g.addColorStop(0, core.done ? "#14ebeced" : "#1ff52929"); g.addColorStop(0.7, "#00000000"); c.fillStyle = g; c.fillRect(0, 0, 420, 420); }
                    Connections { target: core; function onDoneChanged() { glowCv.requestPaint(); } } }
            }
            Canvas { // marcações em volta
                anchors.fill: parent; anchors.margins: -14
                onPaint: { var c = getContext("2d"), cx = width / 2, r = width / 2; c.strokeStyle = "#99555c68"; c.lineWidth = 1;
                    for (var a = 0; a < 360; a += 6) { var t = a * Math.PI / 180; c.beginPath(); c.moveTo(cx + Math.cos(t) * (r - 6), cx + Math.sin(t) * (r - 6)); c.lineTo(cx + Math.cos(t) * r, cx + Math.sin(t) * r); c.stroke(); } }
            }
            Rectangle { anchors.fill: parent; radius: 150; color: "transparent"; border.width: 1; border.color: Theme.divider }
            Rectangle { anchors.fill: parent; anchors.margins: 30; radius: 120; color: "transparent"; border.width: 1; border.color: "#99313741" }
            Canvas {
                id: sweep
                anchors.fill: parent
                visible: !core.done
                RotationAnimation on rotation { from: 0; to: 360; duration: 2200; loops: Animation.Infinite; running: !core.done && root.active }
                onPaint: { var c = getContext("2d"), cx = 150; var g = c.createConicalGradient(cx, cx, 0);
                    g.addColorStop(0, "#f52929"); g.addColorStop(0.03, "#40f52929"); g.addColorStop(0.22, "#00f52929"); g.addColorStop(1, "#00f52929");
                    c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.arc(cx, cx, 149, 0, Math.PI * 2); c.stroke(); }
            }
            Ring { anchors.fill: parent; value: root.hw ? root.revealed / root.hw.parts.length : 0; showTrack: false }
            Column {
                anchors.centerIn: parent; spacing: 8; width: 220
                visible: !core.done
                Icon { anchors.horizontalCenter: parent.horizontalCenter; size: 44; strokeWidth: 1.2
                    name: root.hw && root.revealed > 0 ? root.hw.parts[root.revealed - 1].icon : "pc" }
                Txt { anchors.horizontalCenter: parent.horizontalCenter; role: "small"; text: root.hw ? "Read" : "Reading" }
                Txt { anchors.horizontalCenter: parent.horizontalCenter; role: "body"; font.weight: Font.Medium; text: root.readingLabel; horizontalAlignment: Text.AlignHCenter }
            }
            Column {
                anchors.centerIn: parent; spacing: 4
                visible: core.done
                Txt { id: scoreTxt; anchors.horizontalCenter: parent.horizontalCenter; role: "num"; font.pixelSize: 72; lineHeight: 64
                    property real v: core.done && root.hw ? root.hw.tier.score : 0
                    Behavior on v { NumberAnimation { duration: 1100; easing.type: Easing.OutCubic } }
                    text: Math.round(v) }
                Txt { anchors.horizontalCenter: parent.horizontalCenter; role: "h2"; font.pixelSize: 22; text: root.hw ? root.hw.tier.name : "" }
                Txt { anchors.horizontalCenter: parent.horizontalCenter; role: "small"; text: root.hw ? root.hw.findings.length + " things to improve" : "" }
            }
        }

        Repeater {
            model: root.hw ? root.hw.parts : []
            delegate: Rectangle {
                required property var modelData
                required property int index
                readonly property var pos: hwStage.nodePos(index, root.hw.parts.length)
                readonly property bool shown: index < root.revealed
                x: pos.x; y: pos.y; width: 220; height: nodeCol.implicitHeight + 24; radius: 10
                color: Theme.glass; border.width: 1; border.color: modelData.st === "critical" ? "#66f52929" : Theme.divider
                opacity: shown ? 1 : 0; scale: shown ? 1 : 0.85
                Behavior on opacity { NumberAnimation { duration: 500 } }
                Behavior on scale { NumberAnimation { duration: 700; easing.type: Easing.OutBack } }
                Column {
                    id: nodeCol; x: 16; y: 12; width: parent.width - 32; spacing: 2
                    Row { spacing: 6
                        Rectangle { width: 6; height: 6; radius: 3; color: Theme.sevColor(modelData.st); anchors.verticalCenter: parent.verticalCenter }
                        Txt { role: "eyebrow"; font.pixelSize: 11; text: modelData.lbl; font.letterSpacing: 0.8 } }
                    Txt { role: "body"; font.weight: Font.Medium; text: modelData.val; width: parent.width; elide: Text.ElideRight; wrapMode: Text.NoWrap }
                    Txt { role: "small"; text: (modelData.st === "success" || modelData.st === "neutral" ? "" : modelData.stl + " · ") + modelData.sub; width: parent.width; elide: Text.ElideRight; wrapMode: Text.NoWrap }
                }
            }
        }
    }

    /* ---------- 2 · Conexão ---------- */
    Item {
        anchors.fill: parent
        opacity: root.netOn ? 1 : 0; visible: opacity > 0
        Behavior on opacity { NumberAnimation { duration: 700 } }

        Rectangle {
            x: 96; y: 92; height: 52; width: mini.implicitWidth + 24; radius: 26; color: Theme.glass; border.width: 1; border.color: Theme.divider
            Row { id: mini; x: 8; anchors.verticalCenter: parent.verticalCenter; spacing: 12
                Rectangle { width: 36; height: 36; radius: 18; color: "transparent"; border.width: 2; border.color: Theme.textMain
                    Txt { anchors.centerIn: parent; role: "h3"; font.family: Theme.fontDisplay; text: root.hw ? root.hw.tier.score : "" } }
                Column { anchors.verticalCenter: parent.verticalCenter; Txt { role: "small"; text: "Your PC" } Txt { role: "body"; font.weight: Font.Medium; text: root.hw ? root.hw.tier.name : "" } } }
        }
        Column {
            anchors.right: parent.right; anchors.rightMargin: 96; y: 92; spacing: 2
            Txt { anchors.right: parent.right; role: "small"; text: L.CATALOG[root.app.gameId].name + " · " + root.region.name + " server" }
            Txt { anchors.right: parent.right; role: "h2"; font.pixelSize: 22; text: root.app.origin[2] + " → " + root.region.city }
            Txt { anchors.right: parent.right; role: "small"; text: L.fmt(root.distance) + " km" + (lp.address ? " · " + lp.address : "") }
        }
        // saltos reais (Windows)
        Column {
            anchors.right: parent.right; anchors.rightMargin: 96; y: 190; width: 300; spacing: 0
            visible: tr.supported && root.hops.length > 0
            Txt { role: "eyebrow"; text: "Your route, hop by hop"; bottomPadding: 8 }
            Repeater {
                model: root.hops.slice(-10)
                delegate: Row {
                    required property var modelData
                    width: 300; height: 22; spacing: 8
                    Txt { role: "small"; width: 18; text: modelData.ttl }
                    Txt { role: "small"; width: 190; color: modelData.lost >= 3 ? Theme.textVariant : modelData.lost > 0 ? Theme.criticalText : Theme.textMain; elide: Text.ElideRight; wrapMode: Text.NoWrap
                        text: modelData.address ? (modelData.name || modelData.address) : "* * *  no answer" }
                    Txt { role: "small"; width: 40; horizontalAlignment: Text.AlignRight; text: modelData.ms >= 0 && modelData.address ? Math.round(modelData.ms) + " ms" : "" }
                    Txt { role: "small"; width: 30; horizontalAlignment: Text.AlignRight; color: modelData.lost > 0 && modelData.lost < 3 ? Theme.criticalText : Theme.textVariant; text: modelData.address && modelData.lost ? Math.round(modelData.lost / modelData.sent * 100) + "%" : "" }
                }
            }
        }

        Column {
            x: 96; anchors.verticalCenter: parent.verticalCenter; anchors.verticalCenterOffset: -20; spacing: 32; width: 440
            Column {
                id: mIsp; spacing: 4
                readonly property var st: root.sI.length ? L.stats(root.sI) : null
                opacity: root.phase === "xl" || root.phase === "done" ? 0.5 : 1
                scale: root.phase === "xl" || root.phase === "done" ? 0.82 : 1; transformOrigin: Item.TopLeft
                Behavior on opacity { NumberAnimation { duration: 600 } }
                Behavior on scale { NumberAnimation { duration: 600; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }
                Row { spacing: 8; Rectangle { width: 8; height: 8; radius: 4; color: Theme.isp; anchors.verticalCenter: parent.verticalCenter } Txt { role: "eyebrow"; text: "Your connection today · measured" } }
                Row { spacing: 8
                    Txt { role: "num"; font.pixelSize: 112; lineHeight: 100; font.letterSpacing: -2; text: mIsp.st ? Math.round(mIsp.st.avg) : "–" }
                    Txt { role: "bodyLg"; font.pixelSize: 18; font.weight: Font.Medium; text: "ms"; anchors.baseline: parent.children[0].baseline } }
                Row { spacing: 24
                    Txt { role: "small"; textFormat: Text.StyledText; text: "Jitter <font color='#ebeced'>" + (mIsp.st ? mIsp.st.jit.toFixed(1) + " ms" : "–") + "</font>" }
                    Txt { role: "small"; textFormat: Text.StyledText; text: "Loss <font color='" + (mIsp.st && mIsp.st.loss > 0.4 ? "#ff6b6b" : "#ebeced") + "'>" + (mIsp.st ? mIsp.st.loss.toFixed(1) + "%" : "–") + "</font>" }
                    Txt { role: "small"; textFormat: Text.StyledText; text: "Spikes <font color='#ebeced'>" + (mIsp.st ? mIsp.st.spikes : "–") + "</font>" } }
            }
            Column {
                id: mXl; spacing: 4
                opacity: root.phase === "xl" || root.phase === "done" ? 1 : 0
                Behavior on opacity { NumberAnimation { duration: 600 } }
                Row { spacing: 8; Rectangle { width: 8; height: 8; radius: 4; color: Theme.success; anchors.verticalCenter: parent.verticalCenter } Txt { role: "eyebrow"; text: "Through ExitLag · estimated" } }
                Row { spacing: 8
                    Txt { role: "num"; font.pixelSize: 112; lineHeight: 100; font.letterSpacing: -2
                        property real v: root.mX ? root.mX.avg : 0
                        Behavior on v { NumberAnimation { duration: 1400; easing.type: Easing.OutCubic } }
                        text: root.mX ? Math.round(v) : "–" }
                    Txt { role: "bodyLg"; font.pixelSize: 18; font.weight: Font.Medium; text: "ms"; anchors.baseline: parent.children[0].baseline } }
                Row { spacing: 24
                    Txt { role: "small"; textFormat: Text.StyledText; text: "Jitter <font color='#ebeced'>" + (root.mX ? root.mX.jit.toFixed(1) + " ms" : "–") + "</font>" }
                    Txt { role: "small"; textFormat: Text.StyledText; text: "Loss <font color='#ebeced'>0.0%</font>" }
                    Txt { role: "small"; textFormat: Text.StyledText; text: "Spikes <font color='#ebeced'>0</font>" } }
            }
        }
        Item {
            x: 96; width: parent.width - 192; height: 72; anchors.bottom: parent.bottom; anchors.bottomMargin: 104
            Spark { id: spark; anchors.fill: parent; a: root.sI; b: root.sX; capacity: 140 }
            Txt { anchors.right: parent.right; y: -20; role: "small"; text: spark.topMs + " ms" }
        }
    }

    /* ---------- faixa de narração ---------- */
    Row {
        id: ticker
        anchors.horizontalCenter: parent.horizontalCenter; anchors.bottom: parent.bottom; anchors.bottomMargin: 48; spacing: 12
        Txt { role: "small"; text: root.tickL; anchors.verticalCenter: parent.verticalCenter }
        Txt { role: "mono"; text: root.tickV; anchors.verticalCenter: parent.verticalCenter }
        Rectangle { width: 8; height: 16; color: Theme.primary; anchors.verticalCenter: parent.verticalCenter
            SequentialAnimation on opacity { loops: Animation.Infinite; PropertyAction { value: 1 } PauseAnimation { duration: 450 } PropertyAction { value: 0 } PauseAnimation { duration: 450 } } }
        ParallelAnimation { id: tickerAnim
            NumberAnimation { target: ticker; property: "opacity"; from: 0; to: 1; duration: 380 }
            NumberAnimation { target: ticker; property: "anchors.bottomMargin"; from: 40; to: 48; duration: 380; easing.type: Easing.OutCubic } }
    }

    Txt {
        id: finale
        property bool shown: false
        anchors.centerIn: parent; role: "num"; font.pixelSize: 72; lineHeight: 72; font.letterSpacing: -1
        text: "Analysis complete"
        opacity: 0
        onShownChanged: if (shown) finaleAnim.restart(); else opacity = 0
        SequentialAnimation { id: finaleAnim
            ParallelAnimation { NumberAnimation { target: finale; property: "opacity"; from: 0; to: 1; duration: 500 } NumberAnimation { target: finale; property: "scale"; from: 0.9; to: 1; duration: 600; easing.type: Easing.OutCubic } }
            PauseAnimation { duration: 700 }
            ParallelAnimation { NumberAnimation { target: finale; property: "opacity"; to: 0; duration: 500 } NumberAnimation { target: finale; property: "scale"; to: 1.08; duration: 500 } } }
    }
}

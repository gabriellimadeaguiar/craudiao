import QtQuick
import "Logic.js" as L

/* Detalhes do jogo, como no protótipo de origem (home V9): abre ao clicar num jogo da órbita, fecha no X, no Esc
   ou clicando de novo no jogo selecionado.
   - Servidor: lista com bandeira, cidade e ping (medido agora; "~" quando ainda é a estimativa pela distância),
     mais "Automatic", que fica com a região de menor ping.
   - Optimize: "Testing routes" por 2,6 s, depois "Stop" com o tempo ligado.
   - Route Monitoring: ping, jitter, perda e rotas ativas; linha do tempo; cada rota em separado (a mais rápida em
     verde, a instável em vermelho) e o registro com horário dos momentos importantes.
   O ping da sua rota direta é medido de verdade (sem otimizar, ele aparece aqui). As rotas ExitLag são simuladas
   a partir dele (o roteamento real é do serviço ExitLag); o rodapé diz isso. */
Rectangle {
    id: root
    property var app
    property string gid: ""
    property string region: ""
    property bool auto: true
    property var pings                       // RegionPings
    property real since: 0                   // otimizado desde (ms); 0 = não otimizado
    property bool exitlagOn: true
    property var direct: null                // estatística medida da rota direta { avg, jit, loss }
    property real xlBase: 40                 // ms estimado da melhor rota ExitLag
    property bool open: false
    signal close()
    signal pickRegion(string id)             // "auto" ou o id da região
    signal optimize(bool on)
    signal laneFocus(int lane)               // -1: nenhuma
    signal fastestMoved(int lane)
    signal turnOn()

    readonly property var game: L.CATALOG[gid] || { name: "", regions: [] }
    readonly property var reg: L.REGIONS[region] || L.REGIONS.br
    readonly property int lanes: gid ? L.lanesFor(gid) : 3
    readonly property bool isOn: since > 0 && exitlagOn
    property bool testing: false
    readonly property string stateName: !exitlagOn ? "offxl" : testing ? "testing" : isOn ? "on" : "off"

    width: 400
    height: col.implicitHeight
    radius: 8
    color: Theme.glassPanel
    border.width: 1; border.color: Theme.divider
    opacity: open ? 1 : 0
    visible: opacity > 0
    transform: Translate { x: root.open ? 0 : 24; Behavior on x { NumberAnimation { duration: Theme.d300; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } }
    Behavior on opacity { NumberAnimation { duration: Theme.d300 } }
    Behavior on height { NumberAnimation { duration: Theme.d300; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }
    MouseArea { anchors.fill: parent }      // não deixa o clique passar para o globo
    Keys.onEscapePressed: root.close()

    /* ---------- simulação das rotas ExitLag (10 Hz) ---------- */
    property var samples: []                 // [{ v, lost }] valor da rota que chega primeiro (publicado a 4 Hz)
    property var raw: []                     // amostras a 10 Hz, internas (sem bindings)
    property var ema: []                     // ms suavizado por rota
    property var laneLost: []
    property int fastest: 0
    property real t: 0
    property var fail: ({ lane: -1, t0: 0 })
    property real nextFail: 0
    property var log: []                     // [{ when, html }] mais novo primeiro
    property int focusLane: -1
    readonly property real failK: {
        if (fail.lane < 0) return 0;
        var d = t - fail.t0;
        return d < 0.3 ? d / 0.3 : d < 3 ? 1 : d < 3.5 ? 1 - (d - 3) / 0.5 : 0;
    }

    function say(html) {
        var a = log.slice(); a.unshift({ when: Qt.formatTime(new Date(), "hh:mm:ss"), html: html });
        log = a.slice(0, 4);
    }
    function resetSim(rebuilt) {
        samples = []; raw = []; stats = null; ema = []; laneLost = []; fastest = 0; t = 0;
        fail = ({ lane: -1, t0: 0 });
        nextFail = (rebuilt ? 5 : 6) + Math.random() * 4;
    }
    // trocou de jogo ou de servidor
    function rebuilt() {
        testing = false; testTimer.stop();
        resetSim(true);
        if (isOn) say("Picked the <b>" + lanes + " fastest</b> of 8 possible routes. Your game goes out through all " + lanes + " at once; the first packet to arrive wins.");
        else say("Not optimized. Optimize to route this game through ExitLag and measure it live.");
    }
    onExitlagOnChanged: if (!exitlagOn) say("Not optimized. Optimize to route this game through ExitLag and measure it live.")

    function openList() { list.open = true; if (pings) pings.measure(); }
    function startOptimize() {
        testing = true;
        say("Mapping 8 possible routes to the game server…");
        testTimer.restart();
    }
    function stopOptimize() {
        testing = false; testTimer.stop();
        root.optimize(false);
        say("Not optimized. Optimize to route this game through ExitLag and measure it live.");
    }
    Timer {
        id: testTimer; interval: 2600 / (root.app ? root.app.speed : 1)
        onTriggered: {
            root.testing = false; root.resetSim(false);
            root.optimize(true);
            root.say("Picked the <b>" + root.lanes + " fastest</b> of 8 possible routes. Your game goes out through all " + root.lanes + " at once; the first packet to arrive wins.");
        }
    }

    Timer {
        // simulação a 10 Hz em foco, 2 Hz sem foco, parada com a janela minimizada
        interval: root.app && root.app.power === "low" ? 500 : 100; repeat: true
        running: root.isOn && root.visible && !(root.app && root.app.power === "off")
        property int k: 0
        onTriggered: {
            var R = root, dt = interval / 1000 * (R.app ? R.app.speed : 1);
            R.t += dt;
            // falha de uma rota: começa, segura 3 s e volta; a próxima vem 8 a 14 s depois
            if (R.fail.lane < 0 && R.t >= R.nextFail) {
                var lane = Math.floor(Math.random() * R.lanes);
                R.fail = ({ lane: lane, t0: R.t });
                R.say("<b>Route " + (lane + 1) + " wobbled.</b> Packets kept flowing through the other " + (R.lanes - 1) + ", with no loss.");
            } else if (R.fail.lane >= 0 && R.t - R.fail.t0 >= 3.5) {
                R.say("Route " + (R.fail.lane + 1) + " is stable again and back in the group.");
                R.fail = ({ lane: -1, t0: 0 });
                R.nextFail = R.t + 8 + Math.random() * 6;
            }
            var base = R.xlBase, best = Infinity, vals = [], lost = [];
            for (var i = 0; i < R.lanes; i++) {
                var fk = R.fail.lane === i ? R.failK : 0;
                var v = base * (1 + 0.035 * i) + (Math.random() - 0.5) * 2.2 + fk * base * (0.6 + Math.random() * 0.9);
                var ls = Math.random() < 0.003 + 0.35 * fk;
                vals.push(v); lost.push(ls);
                if (!ls && v < best) best = v;
            }
            R.raw.push({ v: isFinite(best) ? best : 0, lost: !isFinite(best) });
            if (R.raw.length > 140) R.raw.shift();
            // tela (números, linha do tempo) a ~4 Hz: menos bindings e menos redesenho
            if (++k % 2 === 0 || interval > 100) {
                R.samples = R.raw.slice();
                R.stats = R.computeStats(R.raw);
                var e = R.ema.slice();
                for (var j = 0; j < R.lanes; j++) e[j] = e[j] === undefined ? vals[j] : 0.7 * e[j] + 0.3 * vals[j];
                R.ema = e; R.laneLost = lost;
                // a mais rápida só troca com folga de 2 ms (ou se cair)
                var f = R.fastest, cand = f;
                for (var q = 0; q < R.lanes; q++) if (e[q] < e[cand] - 2) cand = q;
                if (R.fail.lane === f && R.failK > 0.5) { cand = (f + 1) % R.lanes; for (q = 0; q < R.lanes; q++) if (q !== f && e[q] < e[cand]) cand = q; }
                if (cand !== f) { R.fastest = cand; R.fastestMoved(cand); }
            }
        }
    }
    property var stats: null
    function computeStats(s) {
        var ok = s.filter(function (x) { return !x.lost; });
        if (!ok.length) return null;
        var last = ok.slice(-6), ping = last.reduce(function (a, b) { return a + b.v; }, 0) / last.length;
        var w = ok.slice(-40), jit = 0;
        for (var i = 1; i < w.length; i++) jit += Math.abs(w[i].v - w[i - 1].v);
        jit = w.length > 1 ? jit / (w.length - 1) : 0;
        var loss = s.filter(function (x) { return x.lost; }).length / s.length * 100;
        return { ping: ping, jit: jit, loss: loss };
    }
    // relógio do "Stop"
    property real now: Date.now()
    Timer { interval: root.app && root.app.power === "low" ? 1000 : 250; repeat: true; running: root.isOn && root.visible && !(root.app && root.app.power === "off"); onTriggered: root.now = Date.now() }
    function elapsed() {
        var s = Math.max(0, Math.floor((now - since) / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60;
        var p = function (x) { return (x < 10 ? "0" : "") + x; };
        return (h > 0 ? h + ":" + p(m) : p(m)) + ":" + p(ss);
    }

    Column {
        id: col
        width: parent.width

        /* ---------- jogo, servidor, Optimize ---------- */
        Column {
            x: 24; width: parent.width - 48; topPadding: 24; bottomPadding: 16; spacing: 16
            Item {
                width: parent.width; height: Math.max(title.implicitHeight, 40)
                Txt { id: title; role: "h2"; font.pixelSize: 24; lineHeight: 32; width: parent.width - 56; maximumLineCount: 2; elide: Text.ElideRight; text: root.game.name }
                IconBtn { anchors.right: parent.right; icon: "close"; tip: "Close"; iconColor: Theme.textMain; onClicked: root.close() }
            }
            Row {
                width: parent.width; spacing: 12
                // seletor de servidor
                Rectangle {
                    id: pill
                    width: parent.width - cta.width - 12; height: 40; radius: 20
                    color: pma.containsMouse ? Theme.inputHover : Theme.input
                    border.width: 1; border.color: list.open ? Theme.textMain : Theme.stroke
                    Behavior on color { ColorAnimation { duration: Theme.d100 } }
                    Row {
                        id: pillRow
                        x: 16; anchors.verticalCenter: parent.verticalCenter; spacing: 8
                        Txt { id: srvLbl; role: "body"; color: Theme.textVariant; text: "Server"; anchors.verticalCenter: parent.verticalCenter }
                        Image { visible: !root.auto; width: 20; height: 14; source: L.flagFor(root.region); sourceSize.width: 40; anchors.verticalCenter: parent.verticalCenter }
                        Txt { role: "body"; font.weight: Font.Medium; width: Math.min(implicitWidth, pill.width - 16 - srvLbl.width - 8 - (root.auto ? 0 : 28) - 36); elide: Text.ElideRight; wrapMode: Text.NoWrap; anchors.verticalCenter: parent.verticalCenter
                              text: (root.auto ? "Auto · " : "") + root.reg.name }
                    }
                    Icon { anchors.right: parent.right; anchors.rightMargin: 12; anchors.verticalCenter: parent.verticalCenter; name: "down"; size: 16
                           rotation: list.open ? 180 : 0; Behavior on rotation { NumberAnimation { duration: Theme.d200; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } }
                    MouseArea { id: pma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                        onClicked: { list.open = !list.open; if (list.open && root.pings) root.pings.measure(); } }
                    Accessible.role: Accessible.ComboBox; Accessible.name: "Server " + root.reg.name
                }
                // Optimize / Testing / Stop
                Btn {
                    id: cta
                    visible: root.exitlagOn
                    width: Math.max(136, implicitWidth)
                    kind: root.isOn ? "outlined" : "filled"
                    enabledLook: !root.testing
                    text: root.testing ? "Testing routes" : root.isOn ? "Stop  " + root.elapsed() : "Optimize"
                    onClicked: if (!root.testing) { if (root.isOn) root.stopOptimize(); else root.startOptimize(); }
                }
            }
            // ExitLag desligada: aviso no lugar do Optimize
            Rectangle {
                visible: !root.exitlagOn
                width: parent.width; height: offc.implicitHeight + 24; radius: 4; color: Theme.warningSoftBg
                Row { id: offc; x: 12; y: 12; spacing: 12; width: parent.width - 24
                    Rectangle { width: 8; height: 8; radius: 4; color: Theme.warningText; anchors.verticalCenter: parent.verticalCenter }
                    Column { width: parent.width - 20 - tob.width - 12; anchors.verticalCenter: parent.verticalCenter
                        Txt { role: "body"; font.weight: Font.Medium; color: Theme.warningText; text: "ExitLag is off" }
                        Txt { role: "small"; color: Theme.warningText; width: parent.width; text: "Turn it on to optimize this game." } }
                    Btn { id: tob; kind: "outlined"; text: "Turn on"; anchors.verticalCenter: parent.verticalCenter; onClicked: root.turnOn() }
                }
            }
        }

        Rectangle { width: parent.width; height: 1; color: Theme.divider }

        /* ---------- Route Monitoring ---------- */
        Column {
            x: 24; width: parent.width - 48; topPadding: 16; bottomPadding: 24; spacing: 16
            Item {
                width: parent.width; height: 24
                Row { spacing: 8
                    Icon { name: "route"; size: 18; anchors.verticalCenter: parent.verticalCenter }
                    Txt { role: "h3"; text: "Route Monitoring"; anchors.verticalCenter: parent.verticalCenter } }
                Badge {
                    anchors.right: parent.right; anchors.verticalCenter: parent.verticalCenter
                    sev: root.stateName === "on" ? "success" : root.stateName === "offxl" ? "warning" : "neutral"
                    text: root.stateName === "on" ? "Optimized" : root.stateName === "testing" ? "Testing routes" : root.stateName === "offxl" ? "ExitLag off" : "Not optimized"
                }
            }

            // otimizado: números das rotas ExitLag
            Grid {
                visible: root.isOn
                columns: 2; columnSpacing: 16; rowSpacing: 16; width: parent.width
                Repeater {
                    model: [
                        ["Ping", root.stats ? Math.round(root.stats.ping) : "–", "ms", "Route " + (root.fastest + 1) + ", fastest now"],
                        ["Jitter", root.stats ? root.stats.jit.toFixed(1) : "–", "ms", ""],
                        ["Packet loss", root.stats ? root.stats.loss.toFixed(1) : "–", "%", ""],
                        ["Active routes", root.failK > 0.5 ? root.lanes - 1 : root.lanes, "/" + root.lanes, "in parallel"]
                    ]
                    delegate: Column {
                        required property var modelData
                        width: (parent.width - 16) / 2; spacing: 2
                        Txt { role: "small"; text: modelData[0] }
                        Row { spacing: 2
                            Txt { role: "h2"; font.pixelSize: 22; lineHeight: 28; text: modelData[1] }
                            Txt { role: "small"; text: modelData[2]; anchors.bottom: parent.bottom; anchors.bottomMargin: 4 } }
                        Txt { role: "small"; visible: modelData[3] !== ""; text: modelData[3] }
                    }
                }
            }
            Spark {
                visible: root.isOn
                width: parent.width; height: 33; a: root.samples; b: []; capacity: 140; colorA: Theme.success
            }
            // cada rota em separado
            Grid {
                visible: root.isOn || root.testing
                columns: 2; columnSpacing: 8; rowSpacing: 8; width: parent.width
                Repeater {
                    model: root.lanes
                    delegate: Rectangle {
                        id: chip
                        required property int index
                        readonly property bool bad: root.isOn && root.fail.lane === index && root.failK > 0.5
                        readonly property bool fast: root.isOn && !bad && root.fastest === index
                        width: (parent.width - 8) / 2; height: 24; radius: 4
                        color: fast ? Theme.successContainer : bad ? Theme.primarySoft : Theme.containerHigh
                        border.width: root.focusLane === index ? 1 : 0; border.color: Theme.stroke
                        Behavior on color { ColorAnimation { duration: Theme.d200 } }
                        Rectangle {
                            x: 8; anchors.verticalCenter: parent.verticalCenter; width: 6; height: 6; radius: 3
                            color: !root.isOn ? Theme.stroke : chip.bad ? Theme.criticalText : Theme.success
                            SequentialAnimation on opacity { running: chip.bad && root.app && root.app.power === "full"; loops: Animation.Infinite; NumberAnimation { to: 0.2; duration: 500 } NumberAnimation { to: 1; duration: 500 } }
                        }
                        Txt { x: 20; anchors.verticalCenter: parent.verticalCenter; role: "small"; font.weight: Font.Medium
                              color: chip.fast ? Theme.success : chip.bad ? Theme.criticalText : root.isOn ? Theme.textMain : Theme.textVariant; text: "Route " + (chip.index + 1) }
                        Txt { anchors.right: parent.right; anchors.rightMargin: 8; anchors.verticalCenter: parent.verticalCenter; role: "small"
                              font.weight: chip.fast ? Font.Bold : Font.Medium
                              color: chip.fast ? Theme.success : chip.bad ? Theme.criticalText : root.isOn ? Theme.textMain : Theme.textVariant
                              text: root.testing ? "…" : !root.isOn ? "Standby" : chip.bad ? "Unstable" : root.ema[chip.index] !== undefined ? Math.round(root.ema[chip.index]) + " ms" : "–" }
                        HoverHandler {
                            onHoveredChanged: { root.focusLane = hovered ? chip.index : (root.focusLane === chip.index ? -1 : root.focusLane); root.laneFocus(root.focusLane); }
                        }
                        ToolTipLite { text: !root.isOn ? "Optimize to send your game through this route." : chip.bad ? "Route " + (chip.index + 1) + " is unstable. The other routes carry your game until it recovers." : chip.fast ? "Route " + (chip.index + 1) + " is the fastest now: its packets arrive first." : "Route " + (chip.index + 1) + " sends the same packets in parallel, as a backup." }
                    }
                }
            }
            // sem otimizar: a rota direta, medida agora
            Txt {
                visible: !root.isOn && !root.testing
                role: "small"; width: parent.width; textFormat: Text.StyledText
                text: root.direct ? "Direct route now, measured: <b>" + Math.round(root.direct.avg) + " ms</b> · " + root.direct.jit.toFixed(1) + " ms jitter · " + root.direct.loss.toFixed(1) + "% loss"
                                  : "Measuring your direct route…"
            }
            // momentos importantes, com horário
            Column {
                width: parent.width; spacing: 6
                Repeater {
                    model: root.log
                    delegate: Row {
                        required property var modelData
                        required property int index
                        width: parent.width; spacing: 12
                        opacity: index === 0 ? 1 : 0.6
                        Txt { role: "small"; font.family: Theme.fontMono; text: modelData.when }
                        Txt { role: "small"; width: parent.width - 76; textFormat: Text.StyledText; text: modelData.html.replace(/<b>/g, "<b><font color='" + Theme.textMain + "'>").replace(/<\/b>/g, "</font></b>") }
                    }
                }
            }
            Txt { visible: root.isOn; role: "small"; width: parent.width; font.pixelSize: 11; text: "ExitLag routes are simulated from your measured route in this build." }
        }
    }

    /* ---------- lista de servidores ---------- */
    Rectangle {
        id: list
        property bool open: false
        visible: open
        x: 24; y: 24 + Math.max(title.implicitHeight, 40) + 16 + 48
        width: 352; height: Math.min(288, lc.implicitHeight); radius: 4
        color: Theme.input; border.width: 1; border.color: Theme.divider
        z: 20
        clip: true
        Flickable {
            anchors.fill: parent; contentHeight: lc.implicitHeight; boundsBehavior: Flickable.StopAtBounds
            Column {
                id: lc; width: parent.width
                ServerRow {
                    width: list.width; sel: root.auto
                    icon: "auto"; name: "Automatic"; city: "Best route · " + (L.REGIONS[root.pings && root.pings.bestId ? root.pings.bestId : root.region] || root.reg).name
                    ms: root.pings ? root.pings.ms(root.pings.bestId || root.region) : 0; measured: root.pings ? root.pings.isMeasured(root.pings.bestId || root.region) : false
                    onPicked: { list.open = false; root.pickRegion("auto"); }
                }
                Rectangle { width: list.width; height: 1; color: Theme.divider }
                Repeater {
                    model: root.game.regions
                    delegate: ServerRow {
                        required property var modelData
                        width: list.width; sel: !root.auto && root.region === modelData
                        flag: L.flagFor(modelData); name: L.REGIONS[modelData].name; city: L.REGIONS[modelData].city
                        ms: root.pings ? root.pings.ms(modelData) : 0; measured: root.pings ? root.pings.isMeasured(modelData) : false
                        onPicked: { list.open = false; root.pickRegion(modelData); }
                    }
                }
            }
        }
    }

    component ServerRow: Rectangle {
        id: sr
        property bool sel: false
        property string icon: ""
        property string flag: ""
        property string name: ""
        property string city: ""
        property real ms: 0
        property bool measured: false
        signal picked()
        height: 44
        color: sel || srm.containsMouse ? Theme.inputHover : "transparent"
        Row {
            x: 12; anchors.verticalCenter: parent.verticalCenter; spacing: 8
            Item { width: 20; height: 16; anchors.verticalCenter: parent.verticalCenter
                Image { visible: sr.flag !== ""; anchors.centerIn: parent; width: 20; height: 14; source: sr.flag; sourceSize.width: 40 }
                Icon { visible: sr.icon !== ""; anchors.centerIn: parent; name: sr.icon; size: 16 } }
            Txt { role: "body"; font.weight: Font.Medium; text: sr.name; anchors.verticalCenter: parent.verticalCenter }
        }
        Txt { anchors.right: msT.left; anchors.rightMargin: 12; anchors.verticalCenter: parent.verticalCenter; role: "small"; text: sr.city; width: 150; horizontalAlignment: Text.AlignRight; elide: Text.ElideLeft; wrapMode: Text.NoWrap }
        Txt { id: msT; anchors.right: parent.right; anchors.rightMargin: 12; anchors.verticalCenter: parent.verticalCenter; width: 56; horizontalAlignment: Text.AlignRight
              role: "small"; color: Theme.textMain; text: (sr.measured ? "" : "~") + Math.round(sr.ms) + " ms" }
        MouseArea { id: srm; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: sr.picked() }
        Accessible.role: Accessible.ListItem; Accessible.name: sr.name + ", " + Math.round(sr.ms) + " milliseconds"
    }
}

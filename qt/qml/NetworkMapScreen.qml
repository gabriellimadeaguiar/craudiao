import QtQuick
import ExitLag
import "Logic.js" as L

/* Network map (pós-login).
   1. Várias linhas saem do ponto de origem, em cascata, para data centers de todos os continentes (27 destinos).
   2. Cada destino é medido de verdade, em paralelo (conexão TCP, como no resto do app); a linha fica cinza até
      a resposta chegar e o valor aparece na lista do continente.
   3. No fim, o melhor destino de cada continente vira uma rota verde; as outras linhas apagam.
   4. O globo pisca verde (luz, terra e anel) e o app segue para a home.
   As esperas seguem a velocidade do protótipo (app.speed) e a orelha pode pular a etapa. */
Item {
    id: root
    property var app
    property var globe
    property bool active: false
    visible: opacity > 0
    opacity: active ? 1 : 0
    Behavior on opacity { SequentialAnimation { PauseAnimation { duration: root.active ? 380 : 0 } NumberAnimation { duration: root.active ? 600 : 320; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } }

    // fases: locate → fire → measure → choose → done
    property string phase: "idle"
    property real t: 0
    property var order: []               // índices de MAP_POINTS, do mais perto ao mais longe
    property int fired: 0
    property var measured: ({})          // { índice: { avg, loss, ok } }
    property int measuredCount: 0
    property var bests: []               // [{ cont, city, ms, loss, ok, idx }]
    property bool probing: false
    readonly property int total: L.MAP_POINTS.length
    readonly property real progress: phase === "done" ? 1 : phase === "choose" ? 0.95
                                   : Math.min(0.9, 0.05 + 0.25 * fired / total + 0.6 * measuredCount / total)
    readonly property var contOrder: ["South America", "North America", "Europe", "Africa", "Middle East", "Asia", "Oceania"]

    onActiveChanged: if (active) begin(); else { timer.stop(); probing = false; }

    function begin() {
        phase = "locate"; t = 0; fired = 0; measured = ({}); measuredCount = 0; bests = []; probing = false;
        var o = app.origin;
        order = L.MAP_POINTS.map(function (p, i) { return i; })
                 .sort(function (a, b) { return L.km(o, [L.MAP_POINTS[a].lat, L.MAP_POINTS[a].lon]) - L.km(o, [L.MAP_POINTS[b].lat, L.MAP_POINTS[b].lon]); });
        globe.idle(7.6, o[0], o[1]);
        globe.spinning = false;
        globe.shiftX = 0;
        globe.addTag({ lat: o[0], lon: o[1], text: o[2], sub: "You", kind: "you", below: true });
        timer.start();
    }

    Timer {
        id: timer; interval: 100; repeat: true
        onTriggered: root.tick(0.1 * root.app.speed)
    }
    function tick(dt) {
        t += dt;
        var o = app.origin;
        if (phase === "locate" && t >= 0.8) { phase = "fire"; t = 0; probing = true; }
        else if (phase === "fire") {
            // dispara uma linha a cada 0,16 s, das mais perto para as mais longe
            while (fired < total && t >= fired * 0.16) {
                var i = order[fired], p = L.MAP_POINTS[i];
                var s = L.drawPoint(o, [p.lat, p.lon]);
                var side = fired % 2 ? 1 : -1;
                var mid = [(o[0] + s[0]) / 2 + side * 3, o[1] + (((s[1] - o[1]) % 360 + 540) % 360 - 180) / 2 - side * 2];
                globe.addRoute({ group: "nm" + i, stops: [[o[0], o[1]], mid, s], color: Theme.textMain, tube: 0.16, lift: 0.35, speed: 0.3, packets: false });
                globe.show("nm" + i, true);
                globe.gain("nm" + i, 0.5);
                fired++;
            }
            if (fired >= total) { phase = "measure"; t = 0; }
        } else if (phase === "measure") {
            // espera as respostas (até ~6 s depois da última linha)
            if (measuredCount >= total || t >= 6) choose();
        } else if (phase === "choose" && t >= 1.6) {
            phase = "done"; t = 0;
            globe.celebrate();
        } else if (phase === "done" && t >= 2.4) {
            timer.stop();
            app.go("home");
        }
    }

    function record(i, avg, loss, ok) {
        if (measured[i] !== undefined || phase === "choose" || phase === "done") return;
        var m = Object.assign({}, measured); m[i] = { avg: avg, loss: loss, ok: ok }; measured = m;
        measuredCount++;
        // linha respondida: um pouco mais clara; sem resposta: some
        globe.gain("nm" + i, ok ? 0.75 : 0.12);
    }

    function choose() {
        probing = false;
        phase = "choose"; t = 0;
        var o = app.origin, best = {};
        for (var k in measured) {
            var m = measured[k], p = L.MAP_POINTS[k];
            if (!m.ok) continue;
            if (!best[p.cont] || m.avg < best[p.cont].ms) best[p.cont] = { cont: p.cont, city: p.city, ms: m.avg, loss: m.loss, ok: true, idx: Number(k) };
        }
        var list = contOrder.map(function (c) {
            return best[c] || { cont: c, city: (L.MAP_POINTS.filter(function (p) { return p.cont === c; })[0] || {}).city, ms: 0, loss: 100, ok: false, idx: -1 };
        });
        bests = list;
        // todas as linhas cinza apagam; as melhores de cada continente viram rotas verdes
        L.MAP_POINTS.forEach(function (p, i) { globe.gain("nm" + i, 0.1); });
        list.forEach(function (b) {
            if (b.idx < 0) return;
            var p = L.MAP_POINTS[b.idx], s = L.drawPoint(o, [p.lat, p.lon]);
            globe.addRoute({ group: "best", stops: [[o[0], o[1]], s], color: Theme.success, tube: 0.24, lift: 0.45, speed: 0.24 });
            globe.addTag({ lat: s[0], lon: s[1], text: b.cont, sub: Math.round(b.ms) + " ms", kind: "cont" });
        });
        globe.show("best", true);
        // resultados para a home (Network Analyzer) e os avisos
        app.mapResults = list.map(function (b) { return { name: b.cont, city: b.city, ms: b.ok ? b.ms : 0, loss: b.loss, ok: b.ok }; });
        var ok = list.filter(function (b) { return b.ok; }).sort(function (a, b) { return a.ms - b.ms; });
        if (ok.length) app.notify("Network map ready", "Best region: " + ok[0].cont + " (" + ok[0].city + "), " + Math.round(ok[0].ms) + " ms.");
        if (app.detected.length) app.notify(app.detected.length + (app.detected.length > 1 ? " games found" : " game found"), "They are on your home, in orbit around the globe.");
    }

    // orelha do protótipo: adianta a fase atual
    function skip() {
        if (phase === "locate" || phase === "fire") { phase = "fire"; t = 99; tick(0); choose(); }
        else if (phase === "measure") choose();
        else if (phase === "choose") t = 1.6;
        else if (phase === "done") t = 2.4;
        else return false;
        return true;
    }

    // medição: um LatencyProbe por destino, todos ao mesmo tempo, até quatro amostras cada
    Instantiator {
        model: root.probing ? L.MAP_POINTS : []
        delegate: LatencyProbe {
            required property var modelData
            required property int index
            property var got: []
            property int tries: 0
            host: modelData.host; port: 443; interval: 300; timeout: 1500
            Component.onCompleted: start()
            onSample: function (ms, lost) {
                tries++;
                if (!lost) got = got.concat([ms]);
                if (got.length >= 4 || tries >= 6) {
                    stop();
                    var s = got.slice().sort(function (a, b) { return a - b; });
                    root.record(index, s.length ? s[Math.floor(s.length / 2)] : 0, (tries - got.length) / tries * 100, s.length > 0);
                }
            }
            onError: function () { stop(); root.record(index, 0, 100, false); }
        }
    }

    // status no topo
    Rectangle {
        anchors.horizontalCenter: parent.horizontalCenter; y: 28
        width: 360; height: 52; radius: 8; color: Theme.glass; border.width: 1; border.color: Theme.divider
        Row { x: 16; anchors.verticalCenter: parent.verticalCenter; spacing: 12
            Item { width: 18; height: 18; anchors.verticalCenter: parent.verticalCenter
                Rectangle { anchors.fill: parent; radius: 9; color: "transparent"; border.width: 2; border.color: Theme.divider; visible: root.phase !== "done" }
                Canvas { anchors.fill: parent; visible: root.phase !== "done"
                    RotationAnimation on rotation { from: 0; to: 360; duration: 900; loops: Animation.Infinite; running: root.active }
                    onPaint: { var c = getContext("2d"); c.strokeStyle = String(Theme.primary); c.lineWidth = 2; c.beginPath(); c.arc(9, 9, 8, 0, Math.PI / 2); c.stroke(); } }
                Icon { anchors.centerIn: parent; name: "check"; size: 18; color: Theme.success; visible: root.phase === "done" } }
            Column { anchors.verticalCenter: parent.verticalCenter
                Txt { role: "body"; font.weight: Font.Medium
                      text: root.phase === "locate" ? "Locating you" : root.phase === "fire" ? "Reaching every continent"
                          : root.phase === "measure" ? "Measuring " + root.measuredCount + " of " + root.total + " routes"
                          : root.phase === "choose" ? "Choosing the best routes" : "Network map ready" }
                Txt { role: "small"
                      text: root.phase === "locate" ? root.app.origin[2] : root.phase === "fire" || root.phase === "measure" ? root.total + " data centers · 7 regions of the world"
                          : root.bests.filter(function (b) { return b.ok; }).length ? "Best: " + root.bests.filter(function (b) { return b.ok; }).sort(function (a, b) { return a.ms - b.ms; })[0].cont : "No answer from the map" } }
        }
        Txt { anchors.right: parent.right; anchors.rightMargin: 16; anchors.verticalCenter: parent.verticalCenter; role: "small"; text: Math.round(root.progress * 100) + "%" }
        Rectangle { anchors.bottom: parent.bottom; x: 1; height: 2; width: (parent.width - 2) * root.progress; color: Theme.textMain; Behavior on width { NumberAnimation { duration: 300 } } }
    }

    // melhor de cada continente: aparece conforme as respostas chegam; fica verde no fim
    Column {
        x: 96; anchors.bottom: parent.bottom; anchors.bottomMargin: 56; spacing: 8; width: 320
        Txt { role: "eyebrow"; text: "Measured from " + root.app.origin[2] }
        Repeater {
            model: root.contOrder
            delegate: Row {
                id: cr
                required property var modelData
                // melhor valor até agora neste continente
                readonly property var cur: {
                    var b = null;
                    for (var k in root.measured) {
                        var m = root.measured[k], p = L.MAP_POINTS[k];
                        if (p.cont === modelData && m.ok && (!b || m.avg < b.avg)) b = { avg: m.avg, city: p.city };
                    }
                    return b;
                }
                readonly property bool chosen: root.phase === "choose" || root.phase === "done"
                spacing: 12; width: 320
                opacity: cur || chosen ? 1 : 0.35
                Behavior on opacity { NumberAnimation { duration: Theme.d300 } }
                Rectangle { width: 6; height: 6; radius: 3; anchors.verticalCenter: parent.verticalCenter
                            color: cr.chosen && cr.cur ? Theme.success : cr.cur ? Theme.textMain : Theme.stroke
                            Behavior on color { ColorAnimation { duration: Theme.d300 } } }
                Txt { role: "body"; width: 130; text: cr.modelData }
                Txt { role: "small"; width: 90; elide: Text.ElideRight; wrapMode: Text.NoWrap; text: cr.cur ? cr.cur.city : "" }
                Txt { role: "body"; font.weight: Font.Medium; width: 60; horizontalAlignment: Text.AlignRight
                      color: cr.chosen && cr.cur ? Theme.success : Theme.textMain
                      text: cr.cur ? Math.round(cr.cur.avg) + " ms" : cr.chosen ? "–" : "…" }
            }
        }
    }
}

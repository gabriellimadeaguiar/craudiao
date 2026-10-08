import QtQuick
import ExitLag
import "Logic.js" as L

/* Network map (pós-login): mede de verdade a latência até um ponto em cada continente, um por vez. A rota até o
   continente se desenha no globo e o valor aparece na etiqueta. No fim, o melhor caminho e a varredura de jogos. */
Item {
    id: root
    property var app
    property var globe
    property bool active: false
    visible: opacity > 0
    opacity: active ? 1 : 0
    Behavior on opacity { SequentialAnimation { PauseAnimation { duration: root.active ? 380 : 0 } NumberAnimation { duration: root.active ? 600 : 320; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } }

    property int idx: -1
    property var samples: []
    property var results: []        // [{ name, city, ms, loss }]
    property real t: 0
    readonly property real perContinent: 3.2
    readonly property real progress: Math.min(1, (Math.max(0, idx) + Math.min(1, t / perContinent)) / L.CONTINENTS.length)

    onActiveChanged: if (active) begin(); else { lp.stop(); timer.stop(); }

    LatencyProbe {
        id: lp; port: 443; interval: 180; timeout: 1500
        onSample: function (ms, lost) { root.samples = root.samples.concat([{ v: ms, lost: lost }]); }
    }

    function begin() {
        idx = -1; results = []; samples = []; t = 0;
        globe.idle(6.45, app.origin[0], app.origin[1]);
        globe.shiftX = 0;
        globe.addTag({ lat: app.origin[0], lon: app.origin[1], text: app.origin[2], sub: "You", kind: "you", below: true });
        timer.start();
    }
    function next() {
        if (idx >= 0) {
            lp.stop();
            var st = L.stats(samples), c = L.CONTINENTS[idx];
            results = results.concat([{ name: c.name, city: c.city, ms: st.avg, loss: st.loss, ok: st.n > st.loss / 100 * st.n }]);
            globe.setTag(idx + 1, { sub: st.avg ? Math.round(st.avg) + " ms" : "no answer" });
        }
        idx++;
        if (idx >= L.CONTINENTS.length) { finish(); return; }
        var c2 = L.CONTINENTS[idx];
        samples = []; t = 0;
        globe.addRoute({ group: "map" + idx, stops: [[app.origin[0], app.origin[1]], [c2.lat, c2.lon]], color: Theme.success, tube: 0.26, lift: 0.45, speed: 0.22 });
        globe.addTag({ lat: c2.lat, lon: c2.lon, text: c2.name, sub: "measuring", kind: "cont" });
        globe.show("map" + idx, true);
        globe.lookAt((app.origin[0] + c2.lat) / 2, app.origin[1] + (((c2.lon - app.origin[1]) % 360 + 540) % 360 - 180) / 2, 6.45);
        lp.host = c2.host; lp.start();
    }
    function finish() {
        timer.stop();
        app.mapResults = results;
        var ok = results.filter(function (r) { return r.ok; }).sort(function (a, b) { return a.ms - b.ms; });
        if (ok.length) app.notify("Network map ready", "Best region: " + ok[0].name + " (" + ok[0].city + "), " + Math.round(ok[0].ms) + " ms.");
        globe.lookAt(app.origin[0], app.origin[1], 6.45);
        done.start();
    }
    Timer {
        id: timer; interval: 100; repeat: true
        onTriggered: { root.t += 0.1; if (root.idx < 0 || root.t >= root.perContinent) root.next(); }
    }
    Timer { id: done; interval: 2600; onTriggered: root.app.go("libscan") }

    // status no topo
    Rectangle {
        anchors.horizontalCenter: parent.horizontalCenter; y: 28
        width: 340; height: 52; radius: 8; color: Theme.glass; border.width: 1; border.color: Theme.divider
        Row { x: 16; anchors.verticalCenter: parent.verticalCenter; spacing: 12
            Item { width: 18; height: 18; anchors.verticalCenter: parent.verticalCenter
                Rectangle { anchors.fill: parent; radius: 9; color: "transparent"; border.width: 2; border.color: Theme.divider; visible: root.progress < 1 }
                Canvas { anchors.fill: parent; visible: root.progress < 1
                    RotationAnimation on rotation { from: 0; to: 360; duration: 900; loops: Animation.Infinite; running: root.active }
                    onPaint: { var c = getContext("2d"); c.strokeStyle = "#f52929"; c.lineWidth = 2; c.beginPath(); c.arc(9, 9, 8, 0, Math.PI / 2); c.stroke(); } }
                Icon { anchors.centerIn: parent; name: "check"; size: 18; color: Theme.success; visible: root.progress >= 1 } }
            Column { anchors.verticalCenter: parent.verticalCenter
                Txt { role: "body"; font.weight: Font.Medium; text: root.progress >= 1 ? "Network map ready" : root.idx < 0 ? "Locating you" : "Measuring " + L.CONTINENTS[root.idx].name }
                Txt { role: "small"; text: root.progress >= 1 ? "Next: finding your games" : root.idx < 0 ? root.app.origin[2] : L.CONTINENTS[root.idx].city + (root.samples.length ? " · " + Math.round(L.stats(root.samples).avg) + " ms" : "") } }
        }
        Txt { anchors.right: parent.right; anchors.rightMargin: 16; anchors.verticalCenter: parent.verticalCenter; role: "small"; text: Math.round(root.progress * 100) + "%" }
        Rectangle { anchors.bottom: parent.bottom; x: 1; height: 2; width: (parent.width - 2) * root.progress; color: Theme.textMain; Behavior on width { NumberAnimation { duration: 200 } } }
    }

    // resultados por continente
    Column {
        x: 96; anchors.bottom: parent.bottom; anchors.bottomMargin: 56; spacing: 8; width: 300
        Txt { role: "eyebrow"; text: "Measured from " + root.app.origin[2] }
        Repeater {
            model: root.results
            delegate: Row {
                required property var modelData
                spacing: 12; width: 300
                opacity: 0; Component.onCompleted: opacity = 1
                Behavior on opacity { NumberAnimation { duration: 400 } }
                Rectangle { width: 6; height: 6; radius: 3; color: modelData.ms ? Theme.success : Theme.primary; anchors.verticalCenter: parent.verticalCenter }
                Txt { role: "body"; width: 170; text: modelData.name }
                Txt { role: "body"; font.weight: Font.Medium; width: 60; horizontalAlignment: Text.AlignRight; text: modelData.ms ? Math.round(modelData.ms) + " ms" : "–" }
                Txt { role: "small"; width: 40; horizontalAlignment: Text.AlignRight; color: modelData.loss > 0.4 ? Theme.criticalText : Theme.textVariant; text: modelData.loss > 0 ? modelData.loss.toFixed(0) + "%" : "" }
            }
        }
    }
}

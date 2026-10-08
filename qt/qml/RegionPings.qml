import QtQuick
import ExitLag
import "Logic.js" as L

/* Ping de verdade até cada região de jogo (mesma medição TCP do resto do app): cinco amostras por região, em
   paralelo, e fica a mediana. Usado no seletor de servidor (lista e opção "Automatic").
   Antes de medir, ou se a região não responder, vale a estimativa pela distância (marcada como estimada). */
QtObject {
    id: root
    property var origin: [0, 0, ""]
    property var regions: []
    property var measured: ({})           // { regionId: ms }
    property bool running: false
    readonly property int samples: 5

    // região "Automatic": decidida pela estimativa ao começar e trocada uma vez só, quando a medição termina
    // (antes trocava a cada resposta que chegava, e cada troca redesenhava as rotas no globo)
    property string bestId: ""
    property int pending: 0
    function measure() { measured = ({}); pending = regions.length; bestId = best(); running = false; running = true; settle.restart(); }
    function done(id) { if (--pending <= 0) { settle.stop(); bestId = best(); } }
    property Timer settle: Timer { interval: 4000; onTriggered: root.bestId = root.best() }   // quem não respondeu fica de fora
    onRegionsChanged: bestId = best()

    // ms de uma região: medido quando há, senão a estimativa pela distância
    function ms(id) {
        if (measured[id] !== undefined) return measured[id];
        var r = L.REGIONS[id];
        return L.baselineMs(L.km(origin, [r.lat, r.lon])) * 1.25 + 6;
    }
    function isMeasured(id) { return measured[id] !== undefined; }
    // menor ping entre as regiões do jogo
    function best() {
        var b = regions[0];
        regions.forEach(function (id) { if (ms(id) < ms(b)) b = id; });
        return b;
    }

    property Instantiator probes: Instantiator {
        model: root.running ? root.regions : []
        delegate: LatencyProbe {
            required property var modelData
            property var got: []
            host: L.REGIONS[modelData].host
            port: 443; interval: 400; timeout: 1500
            Component.onCompleted: start()
            onSample: function (v, lost) {
                if (!lost) got = got.concat([v]);
                if (got.length >= root.samples || (lost && got.length === 0 && ++misses > 3)) {
                    stop();
                    if (got.length) {
                        var s = got.slice().sort(function (a, b) { return a - b; });
                        var m = Object.assign({}, root.measured); m[modelData] = s[Math.floor(s.length / 2)]; root.measured = m;
                    }
                    root.done(modelData);
                }
            }
            property int misses: 0
        }
    }
}

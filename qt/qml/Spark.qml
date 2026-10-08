import QtQuick

// Linha do tempo do ping: amostras da conexão atual (laranja) seguidas das da ExitLag (verde), na mesma escala.
Canvas {
    id: root
    property var a: []          // [{v, lost}]
    property var b: []
    property int capacity: 160
    property real topMs: 60
    property color colorA: Theme.isp
    property color colorB: Theme.success
    renderStrategy: Canvas.Cooperative
    onAChanged: requestPaint()
    onBChanged: requestPaint()
    onWidthChanged: requestPaint()

    onPaint: {
        var ctx = getContext("2d");
        ctx.reset();
        ctx.lineWidth = 1.5; ctx.lineJoin = "round";
        var all = a.concat(b).filter(function (s) { return !s.lost; }).map(function (s) { return s.v; });
        topMs = Math.max(60, Math.ceil(Math.max.apply(null, all.concat([1])) * 1.15 / 20) * 20);
        var n = Math.max(capacity, a.length + b.length), w = width, h = height;
        function x(i) { return i / (n - 1) * w; }
        function y(v) { return h - v / topMs * (h - 4); }
        function draw(arr, off, col) {
            ctx.strokeStyle = col; ctx.beginPath();
            var pen = false;
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].lost) { pen = false; continue; }
                if (pen) ctx.lineTo(x(i + off), y(arr[i].v)); else ctx.moveTo(x(i + off), y(arr[i].v));
                pen = true;
            }
            ctx.stroke();
            // perdas: marquinhas vermelhas no chão
            ctx.fillStyle = Theme.primary;
            for (var j = 0; j < arr.length; j++) if (arr[j].lost) ctx.fillRect(x(j + off) - 1, h - 6, 2, 6);
        }
        ctx.strokeStyle = Theme.divider; ctx.beginPath(); ctx.moveTo(0, h - 0.5); ctx.lineTo(w, h - 0.5); ctx.stroke();
        draw(a, 0, colorA);
        draw(b, a.length, colorB);
    }
}

import QtQuick
import "Logic.js" as L

/* Resultados e oferta, numa página com rolagem própria. Cada bloco sobe e aparece ao entrar na tela; os números
   contam e as barras enchem. A seta no topo volta para a entrada; a barra flutuante leva até a oferta. */
Item {
    id: root
    property var app
    property var globe
    property bool active: false
    visible: opacity > 0
    opacity: active ? 1 : 0
    Behavior on opacity { SequentialAnimation { PauseAnimation { duration: root.active ? 380 : 0 } NumberAnimation { duration: root.active ? 600 : 320; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } }

    readonly property var hw: app.hw
    readonly property var net: app.net
    readonly property var all: hw && net ? net.findings.concat(hw.findings).sort(function (a, b) { return L.SEV_RANK[a.sev] - L.SEV_RANK[b.sev]; }) : []
    readonly property int fixable: L.fixable(all)
    readonly property var counts: L.fixCounts(all)
    readonly property var region: net ? L.REGIONS[net.region] : L.REGIONS.br
    property string pick: "trial"

    onActiveChanged: if (active) { flick.contentY = 0; globe.idle(6.45); globe.shiftX = 0; }

    Flickable {
        id: flick
        anchors.fill: parent
        contentWidth: width; contentHeight: page.height + 220
        boundsBehavior: Flickable.StopAtBounds
        clip: true
        NumberAnimation on contentY { id: scrollAnim; running: false; duration: 900; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard }
        function reveal(item) { return root.active && item.y + 60 < flick.contentY + flick.height; }

        Column {
            id: page
            width: 1120; x: (parent.width - width) / 2; y: 104; spacing: 96

            // abertura
            Column {
                width: parent.width; spacing: 16
                IconBtn { icon: "back"; tip: root.app.loggedIn ? "Back to home" : "Back to log in"; iconColor: Theme.textMain; x: -10; onClicked: root.app.go(root.app.loggedIn ? "home" : "entry") }
                Txt { role: "eyebrow"; text: root.net ? "Your results · " + L.CATALOG[root.net.gameId].name + " · " + root.app.origin[2] + " → " + root.region.city : "" }
                Txt { role: "hero"; font.pixelSize: 72; lineHeight: 72; width: 900; text: root.hw && root.net ? L.headline(root.hw, root.net.findings) : "" }
                Txt { role: "bodyLg"; width: 880; text: "We found " + root.all.length + " problems. ExitLag fixes " + root.fixable + " of them" + (root.all.length ? ", starting with " + root.all[0].t.charAt(0).toLowerCase() + root.all[0].t.slice(1) + "." : ".") }
            }

            // três números
            Row {
                id: stats; spacing: 24
                property bool seen: flick.reveal(stats)
                Repeater {
                    model: root.hw && root.net ? [
                        { k: "Your PC", n: root.hw.tier.score, n2: -1, unit: "/ 100", sub: root.hw.tier.name + ". " + root.hw.tier.verdict, bar: root.hw.tier.score },
                        { k: "Ping to " + root.region.city, n: Math.round(root.net.I.avg), n2: Math.round(root.net.X.avg), unit: "ms", sub: "Measured on your route today, then estimated through ExitLag. Stability " + root.net.I.score + " → " + root.net.X.score + " out of 100.", bar: root.net.X.score },
                        { k: "Problems found", n: root.all.length, n2: -1, unit: "", sub: (function (c) { return c + (c === 1 ? " bottleneck" : " bottlenecks"); })(root.all.filter(function (f) { return f.sev === "critical"; }).length) + ". ExitLag fixes " + root.fixable + "; the others have a free fix or need new hardware.", bar: Math.round(root.fixable / Math.max(1, root.all.length) * 100) }
                    ] : []
                    delegate: Rectangle {
                        required property var modelData
                        required property int index
                        width: (1120 - 48) / 3; height: 256; radius: 16; color: Theme.container
                        opacity: stats.seen ? 1 : 0
                        transform: Translate { y: stats.seen ? 0 : 24; Behavior on y { NumberAnimation { duration: 800; easing.type: Easing.OutCubic } } }
                        Behavior on opacity { SequentialAnimation { PauseAnimation { duration: index * 90 } NumberAnimation { duration: 700 } } }
                        Column {
                            x: 32; y: 32; width: parent.width - 64; spacing: 12
                            Txt { role: "eyebrow"; text: modelData.k }
                            Row { spacing: 8
                                Txt { role: "num"; property real v: stats.seen ? modelData.n : 0; Behavior on v { NumberAnimation { duration: 1200; easing.type: Easing.OutCubic } } text: Math.round(v) }
                                Txt { role: "h2"; color: Theme.textVariant; text: "→"; visible: modelData.n2 >= 0; anchors.bottom: parent.bottom; anchors.bottomMargin: 8 }
                                Txt { role: "num"; visible: modelData.n2 >= 0; property real v: stats.seen ? modelData.n2 : 0; Behavior on v { NumberAnimation { duration: 1200; easing.type: Easing.OutCubic } } text: Math.round(v) }
                                Txt { role: "bodyLg"; font.weight: Font.Medium; text: modelData.unit; anchors.bottom: parent.bottom; anchors.bottomMargin: 8 } }
                            Txt { role: "body"; color: Theme.textVariant; width: parent.width; text: modelData.sub; maximumLineCount: 3; elide: Text.ElideRight }
                        }
                        Rectangle { x: 32; anchors.bottom: parent.bottom; anchors.bottomMargin: 32; width: parent.width - 64; height: 6; radius: 3; color: Theme.input
                            Rectangle { height: parent.height; radius: 3; width: stats.seen ? parent.width * modelData.bar / 100 : 0
                                gradient: Gradient { orientation: Gradient.Horizontal; GradientStop { position: 0; color: Theme.stroke } GradientStop { position: 1; color: Theme.textMain } }
                                Behavior on width { SequentialAnimation { PauseAnimation { duration: 500 } NumberAnimation { duration: 1200; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } } } }
                    }
                }
            }

            // antes e depois
            Column {
                id: ba; width: parent.width; spacing: 24
                property bool seen: flick.reveal(ba)
                opacity: seen ? 1 : 0; Behavior on opacity { NumberAnimation { duration: 700 } }
                Item { width: parent.width; height: 44
                    Txt { role: "h1"; text: "Same route, before and after." }
                    Txt { anchors.right: parent.right; anchors.bottom: parent.bottom; role: "small"; text: "Your connection: measured today · ExitLag: estimated · " + (root.net ? L.fmt(root.net.distance) : "") + " km" } }
                Rectangle {
                    width: parent.width; height: baCol.implicitHeight + 64; radius: 16; color: Theme.container
                    Column {
                        id: baCol; x: 32; y: 32; width: parent.width - 64; spacing: 16
                        Row { spacing: 16; leftPadding: 204
                            Row { spacing: 6; Rectangle { width: 8; height: 8; radius: 4; color: Theme.isp; anchors.verticalCenter: parent.verticalCenter } Txt { role: "small"; text: "Your connection (measured)" } }
                            Row { spacing: 6; Rectangle { width: 8; height: 8; radius: 4; color: Theme.success; anchors.verticalCenter: parent.verticalCenter } Txt { role: "small"; text: "Through ExitLag (estimated)" } } }
                        Repeater {
                            model: root.net ? [
                                ["Average ping", root.net.I.avg, root.net.X.avg, " ms", 0],
                                ["Jitter", root.net.I.jit, root.net.X.jit, " ms", 1],
                                ["Packet loss", root.net.I.loss, root.net.X.loss, "%", 1],
                                ["Lag spikes", root.net.I.spikes, root.net.X.spikes, "", 0]
                            ] : []
                            delegate: Row {
                                required property var modelData
                                width: parent.width; spacing: 24; height: 44
                                readonly property real mx: Math.max(modelData[1], modelData[2], 0.0001)
                                Txt { width: 180; role: "body"; font.weight: Font.Medium; text: modelData[0]; anchors.verticalCenter: parent.verticalCenter }
                                Column { width: parent.width - 180 - 120 - 48; spacing: 6; anchors.verticalCenter: parent.verticalCenter
                                    Repeater { model: 2
                                        delegate: Row { required property int index; spacing: 12; width: parent.width
                                            readonly property real val: index === 0 ? modelData[1] : modelData[2]
                                            Rectangle { height: 10; radius: 5; anchors.verticalCenter: parent.verticalCenter
                                                width: ba.seen ? Math.max(4, (parent.width - 80) * val / mx) : 0
                                                Behavior on width { SequentialAnimation { PauseAnimation { duration: index * 250 } NumberAnimation { duration: 1100; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } }
                                                gradient: Gradient { orientation: Gradient.Horizontal; GradientStop { position: 0; color: index ? "#3322eba3" : "#33eb8322" } GradientStop { position: 1; color: index ? Theme.success : Theme.isp } } }
                                            Txt { role: "small"; color: Theme.textMain; text: val.toFixed(modelData[4]) + modelData[3]; anchors.verticalCenter: parent.verticalCenter } } } }
                                Txt { width: 120; horizontalAlignment: Text.AlignRight; role: "h2"; font.pixelSize: 20; anchors.verticalCenter: parent.verticalCenter
                                    text: modelData[1] <= 0 ? "–" : modelData[2] <= 0.05 && modelData[0] !== "Average ping" ? (modelData[0] === "Lag spikes" ? "None" : "Gone") : "−" + Math.round((1 - modelData[2] / modelData[1]) * 100) + "%" }
                            }
                        }
                    }
                }
            }

            // problemas
            Column {
                id: probs; width: parent.width; spacing: 24
                property bool seen: flick.reveal(probs)
                opacity: seen ? 1 : 0; Behavior on opacity { NumberAnimation { duration: 700 } }
                Item { width: parent.width; height: 44
                    Txt { role: "h1"; text: "What's holding you back." }
                    Txt { anchors.right: parent.right; anchors.bottom: parent.bottom; role: "small"; text: "Most impact first" } }
                Row {
                    width: parent.width; spacing: 24
                    Repeater {
                        model: root.net && root.hw ? [["net", "Your connection", root.net.findings], ["pc", "Your PC", root.hw.findings]] : []
                        delegate: Column {
                            required property var modelData
                            width: (parent.width - 24) / 2; spacing: 12
                            Row { spacing: 8; Icon { name: modelData[0]; size: 18 } Txt { role: "h3"; font.weight: Font.Medium; text: modelData[1] } Txt { role: "small"; text: modelData[2].length + " found"; anchors.verticalCenter: parent.verticalCenter } }
                            Repeater {
                                model: modelData[2].slice().sort(function (a, b) { return L.SEV_RANK[a.sev] - L.SEV_RANK[b.sev]; })
                                delegate: Rectangle {
                                    required property var modelData
                                    width: parent.width; height: pc.implicitHeight + 32; radius: 12; color: hov.hovered ? Theme.containerHigh : Theme.container
                                    HoverHandler { id: hov }
                                    Rectangle { x: 16; y: 16; width: 4; height: parent.height - 32; radius: 2
                                        gradient: Gradient { GradientStop { position: 0; color: Theme.sevColor(modelData.sev) } GradientStop { position: 1; color: "#22" + String(Theme.sevColor(modelData.sev)).slice(1) } } }
                                    Column {
                                        id: pc; x: 36; y: 16; width: parent.width - 60; spacing: 8
                                        Row { width: parent.width; spacing: 8
                                            Txt { role: "body"; font.weight: Font.Medium; text: modelData.t; width: parent.width - sev.width - 8 }
                                            Badge { id: sev; sev: modelData.sev; text: L.SEV_LABEL[modelData.sev] } }
                                        Txt { role: "small"; width: parent.width; text: modelData.d }
                                        Flow { width: parent.width; spacing: 8
                                            Repeater { model: modelData.fix || []
                                                delegate: Rectangle { required property var modelData
                                                    readonly property bool tool: typeof modelData === "string"
                                                    height: 26; width: fr.implicitWidth + 18; radius: 4; color: Theme.containerHigh; border.width: 1; border.color: Theme.divider
                                                    Row { id: fr; anchors.centerIn: parent; spacing: 6
                                                        Icon { visible: tool; name: tool ? L.TOOLS[modelData].icon : ""; size: 16 }
                                                        Txt { role: "small"; color: tool ? Theme.textMain : Theme.textVariant; font.weight: Font.Medium; text: tool ? L.TOOLS[modelData].name : modelData.free } } } } }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // upgrade sugerido
            Column {
                id: ups; width: parent.width; spacing: 24
                visible: root.hw && root.hw.upgrades.length > 0
                property bool seen: flick.reveal(ups)
                opacity: seen ? 1 : 0; Behavior on opacity { NumberAnimation { duration: 700 } }
                Item { width: parent.width; height: 44
                    Txt { role: "h1"; text: "An upgrade worth making." }
                    Badge { anchors.right: parent.right; anchors.bottom: parent.bottom; text: "Partner offer · example price" } }
                Repeater {
                    model: root.hw ? root.hw.upgrades : []
                    delegate: Rectangle {
                        required property var modelData
                        width: 1120; height: 144; radius: 16; color: Theme.container
                        Rectangle { x: 24; y: 24; width: 120; height: 96; radius: 10
                            gradient: Gradient { GradientStop { position: 0; color: "#2a2f39" } GradientStop { position: 1; color: Theme.container } }
                            Icon { anchors.centerIn: parent; name: modelData.icon; size: 52; strokeWidth: 1.1 } }
                        Column { x: 168; anchors.verticalCenter: parent.verticalCenter; width: 640; spacing: 4
                            Txt { role: "small"; text: modelData.part }
                            Txt { role: "h3"; font.pixelSize: 18; text: modelData.name }
                            Txt { role: "body"; color: Theme.textVariant; width: parent.width; text: modelData.why + " " + modelData.gain + "." } }
                        Column { anchors.right: parent.right; anchors.rightMargin: 24; anchors.verticalCenter: parent.verticalCenter; spacing: 8
                            Txt { anchors.right: parent.right; role: "h1"; font.pixelSize: 32; text: "$" + modelData.price }
                            Txt { anchors.right: parent.right; role: "small"; font.strikeout: true; text: "$" + modelData.was }
                            Btn { kind: "outlined"; text: "See offer"; onClicked: root.app.toast("Opens the partner store", modelData.name + ", at the best price found today. Store link not connected in this build.") } }
                    }
                }
            }

            // oferta
            Rectangle {
                id: offer; visible: !root.app.loggedIn; width: parent.width; height: offerRow.implicitHeight + 112; radius: 24
                property bool seen: flick.reveal(offer)
                opacity: seen ? 1 : 0; Behavior on opacity { NumberAnimation { duration: 700 } }
                gradient: Gradient { orientation: Gradient.Horizontal; GradientStop { position: 0; color: "#1d2129" } GradientStop { position: 0.6; color: Theme.container } }
                border.width: 1; border.color: Theme.divider
                Row {
                    id: offerRow; x: 56; y: 56; spacing: 56
                    Column {
                        width: 1120 - 112 - 56 - 400; spacing: 24
                        Txt { role: "eyebrow"; text: "ExitLag" }
                        Txt { role: "display"; width: parent.width; text: "Fix " + root.fixable + " of the " + root.all.length + " problems we found." }
                        Txt { role: "bodyLg"; width: parent.width; text: root.net ? "Start with your route to " + root.region.city + ": " + Math.round(root.net.I.avg) + " ms today, about " + Math.round(root.net.X.avg) + " ms through ExitLag (estimated). Every tool is in every plan." : "" }
                        Grid {
                            columns: 2; columnSpacing: 24; rowSpacing: 12; width: parent.width
                            Repeater {
                                model: L.TOOL_ORDER.slice().sort(function (a, b) { return (root.counts[b] || 0) - (root.counts[a] || 0); })
                                delegate: Row {
                                    required property var modelData
                                    width: (parent.width - 24) / 2; spacing: 12; opacity: root.counts[modelData] ? 1 : 0.5
                                    Rectangle { width: 36; height: 36; radius: 8; color: Theme.input; Icon { anchors.centerIn: parent; name: L.TOOLS[modelData].icon; size: 18 } }
                                    Column { width: parent.width - 48; spacing: 2
                                        Row { spacing: 8; Txt { role: "body"; font.weight: Font.Medium; text: L.TOOLS[modelData].name }
                                            Badge { visible: !!root.counts[modelData]; text: (root.counts[modelData] || 0) + (root.counts[modelData] > 1 ? " fixes" : " fix") } }
                                        Txt { role: "small"; width: parent.width; text: L.TOOLS[modelData].pitch } }
                                }
                            }
                        }
                    }
                    Column {
                        width: 400; spacing: 8
                        Rectangle {
                            width: parent.width; height: 84; radius: 10; color: tma.containsMouse ? Theme.input : Theme.containerHigh
                            border.width: root.pick === "trial" ? 2 : 1; border.color: root.pick === "trial" ? Theme.textMain : Theme.divider
                            Column { x: 16; y: 16; width: parent.width - 32; spacing: 4
                                Item { width: parent.width; height: 24; Txt { role: "h3"; text: "3-day free trial" } Badge { anchors.right: parent.right; sev: "success"; text: "Start here" } }
                                Txt { role: "small"; text: "Every tool, no charge for 3 days. Pick a plan when it ends." } }
                            MouseArea { id: tma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.pick = "trial" }
                        }
                        Repeater {
                            model: L.PLANS
                            delegate: Rectangle {
                                required property var modelData
                                width: 400; height: 64; radius: 10; color: pma.containsMouse ? Theme.input : Theme.containerHigh
                                border.width: root.pick === modelData.id ? 2 : 1; border.color: root.pick === modelData.id ? Theme.textMain : Theme.divider
                                Column { x: 16; anchors.verticalCenter: parent.verticalCenter; Txt { role: "body"; font.weight: Font.Medium; text: modelData.n } Txt { role: "small"; text: modelData.sub } }
                                Badge { visible: !!modelData.best; sev: "success"; text: "Best value"; anchors.verticalCenter: parent.verticalCenter; anchors.right: pr.left; anchors.rightMargin: 12 }
                                Row { id: pr; anchors.right: parent.right; anchors.rightMargin: 16; anchors.verticalCenter: parent.verticalCenter; spacing: 2
                                    Txt { role: "h2"; font.pixelSize: 22; text: "$" + modelData.p } Txt { role: "small"; text: "/mo"; anchors.bottom: parent.bottom; anchors.bottomMargin: 4 } }
                                MouseArea { id: pma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.pick = modelData.id }
                            }
                        }
                        Item { width: 1; height: 8 }
                        Btn {
                            width: parent.width
                            text: root.pick === "trial" ? "Start free trial" : "Subscribe · $" + L.PLANS.filter(function (p) { return p.id === root.pick; })[0].p + "/mo"
                            onClicked: { root.app.offer = root.pick; root.app.loginMode = "signup"; root.app.go("signup"); }
                        }
                        Txt { role: "small"; width: parent.width; text: "Example prices. You'll create your account next." }
                    }
                }
            }
        }
    }

    // barra flutuante: some quando a oferta entra na tela
    Rectangle {
        id: dock
        readonly property bool hide: !root.app.loggedIn && offer.y + 40 < flick.contentY + flick.height - 120 + page.y - 104
        width: 760; height: 56; radius: 14
        anchors.horizontalCenter: parent.horizontalCenter
        y: parent.height - height - 24 + (hide ? 40 : 0)
        opacity: hide ? 0 : 1
        Behavior on opacity { NumberAnimation { duration: 400 } }
        Behavior on y { NumberAnimation { duration: 500; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }
        color: Theme.dockBg; border.width: 1; border.color: Theme.divider
        Txt { x: 24; anchors.verticalCenter: parent.verticalCenter; role: "body"; textFormat: Text.StyledText
            text: (root.app.loggedIn ? "ExitLag is fixing <b>" : "ExitLag fixes <b>") + root.fixable + " of the " + root.all.length + "</b> problems we found." }
        Btn { anchors.right: parent.right; anchors.rightMargin: 8; anchors.verticalCenter: parent.verticalCenter; text: root.app.loggedIn ? "Back to home" : "See how to fix them"
            onClicked: { if (root.app.loggedIn) { root.app.go("home"); return; } scrollAnim.to = Math.min(flick.contentHeight - flick.height, page.y + offer.y - (flick.height - offer.height) / 2); scrollAnim.restart(); } }
    }
}

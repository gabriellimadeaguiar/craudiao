import QtQuick
import "Logic.js" as L

// Resultado da análise do PC (gaveta "Your setup" e página PC Boost): tipo de máquina, peças lidas e o que melhorar.
// Sem análise ainda: explica e leva para a análise.
Flickable {
    id: root
    property var hw: null
    signal runAgain()
    contentHeight: col.implicitHeight
    clip: true
    boundsBehavior: Flickable.StopAtBounds

    Column {
        id: col; width: root.width; spacing: 24

        // sem análise
        Column {
            visible: !root.hw; width: parent.width; spacing: 16
            Rectangle { width: 64; height: 64; radius: 32; color: Theme.containerHigh; Icon { anchors.centerIn: parent; name: "pc" } }
            Txt { role: "h2"; width: parent.width; text: "Your PC hasn't been analyzed yet" }
            Txt { role: "body"; color: Theme.textVariant; width: parent.width; text: "In about a minute we read your processor, graphics card, memory, storage and display, and test your connection to the game server." }
            Btn { text: "Analyze my PC"; onClicked: root.runAgain() }
        }

        // com análise
        Row {
            visible: !!root.hw; spacing: 24; width: parent.width
            Item {
                width: 112; height: 112
                Ring { anchors.fill: parent; thickness: 4; value: root.hw ? root.hw.tier.score / 100 : 0 }
                Txt { anchors.centerIn: parent; role: "num"; font.pixelSize: 40; lineHeight: 40; text: root.hw ? root.hw.tier.score : "" }
            }
            Column {
                width: parent.width - 136; spacing: 8; anchors.verticalCenter: parent.verticalCenter
                Txt { role: "eyebrow"; text: "Machine type" }
                Txt { role: "h1"; text: root.hw ? root.hw.tier.name : "" }
                Txt { role: "body"; color: Theme.textVariant; width: parent.width; text: root.hw ? root.hw.tier.verdict : "" }
            }
        }
        Row {
            visible: !!root.hw; spacing: 16
            Btn { text: "Run analysis again"; icon: "redo"; onClicked: root.runAgain() }
            Txt { role: "small"; anchors.verticalCenter: parent.verticalCenter; text: root.hw ? root.hw.findings.length + " things to improve · read from this PC" : "" }
        }

        Column {
            visible: !!root.hw && root.hw.findings.length > 0; width: parent.width; spacing: 8
            Txt { role: "h3"; text: "What to improve" }
            Repeater {
                model: root.hw ? root.hw.findings.slice().sort(function (a, b) { return L.SEV_RANK[a.sev] - L.SEV_RANK[b.sev]; }) : []
                delegate: Rectangle {
                    required property var modelData
                    width: col.width; height: fc.implicitHeight + 24; radius: 8; color: Theme.containerHigh
                    Rectangle { x: 12; y: 12; width: 4; height: parent.height - 24; radius: 2; color: Theme.sevColor(modelData.sev) }
                    Column { id: fc; x: 28; y: 12; width: parent.width - 40; spacing: 4
                        Row { width: parent.width; spacing: 8
                            Txt { role: "body"; font.weight: Font.Medium; width: parent.width - sb.width - 8; text: modelData.t }
                            Badge { id: sb; sev: modelData.sev; text: L.SEV_LABEL[modelData.sev] } }
                        Txt { role: "small"; width: parent.width; text: modelData.d } }
                }
            }
        }

        Column {
            visible: !!root.hw; width: parent.width; spacing: 0
            Txt { role: "h3"; text: "Your PC"; bottomPadding: 8 }
            Repeater {
                model: root.hw ? root.hw.parts : []
                delegate: Item {
                    required property var modelData
                    required property int index
                    width: col.width; height: 60
                    Rectangle { visible: index > 0; width: parent.width; height: 1; color: Theme.divider }
                    Rectangle { x: 0; anchors.verticalCenter: parent.verticalCenter; width: 40; height: 40; radius: 8; color: Theme.input
                        Icon { anchors.centerIn: parent; name: modelData.icon; size: 20 } }
                    Column { x: 56; anchors.verticalCenter: parent.verticalCenter; width: parent.width - 56 - 140
                        Txt { role: "small"; text: modelData.lbl }
                        Txt { role: "body"; font.weight: Font.Medium; width: parent.width; elide: Text.ElideRight; wrapMode: Text.NoWrap; text: modelData.val } }
                    Badge { anchors.right: parent.right; anchors.verticalCenter: parent.verticalCenter; sev: modelData.st; text: modelData.stl }
                }
            }
        }
    }
}

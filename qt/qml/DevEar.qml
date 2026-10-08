import QtQuick

/* Controles do protótipo: uma "orelha de livro" discreta no canto inferior esquerdo. Ao clicar, abre um painel
   pequeno para acelerar as esperas (1×, 4×, 10×), pular a etapa atual ou ir direto para qualquer tela. */
Item {
    id: root
    property var app
    anchors.fill: parent
    property bool open: false

    readonly property var scenes: [["entry", "Log in"], ["intro", "Check-up"], ["analysis", "Analysis"], ["results", "Results"],
                                   ["signup", "Sign up"], ["netmap", "Network map"], ["libscan", "Game scan"], ["home", "Home"]]

    // fora do painel: fecha
    MouseArea { anchors.fill: parent; enabled: root.open; onClicked: root.open = false }

    // a orelha: canto dobrado, cresce um pouco no hover
    Item {
        id: ear
        x: 0; y: parent.height - size
        readonly property real size: earHov.hovered || root.open ? 44 : 32
        width: size; height: size
        Behavior on width { NumberAnimation { duration: Theme.d200; easing.type: Easing.OutCubic } }
        Behavior on height { NumberAnimation { duration: Theme.d200; easing.type: Easing.OutCubic } }
        Canvas {
            id: fold
            anchors.fill: parent
            onWidthChanged: requestPaint()
            onPaint: {
                var c = getContext("2d"), w = width;
                c.reset();
                // dobra: triângulo claro com a sombra da página por baixo
                c.fillStyle = "rgba(0,0,0,0.35)";
                c.beginPath(); c.moveTo(0, 0); c.lineTo(w, w); c.lineTo(0, w); c.closePath(); c.fill();
                c.fillStyle = String(Theme.containerHigh);
                c.beginPath(); c.moveTo(0, 0); c.lineTo(w, w); c.lineTo(w * 0.08, w); c.closePath(); c.fill();
                c.strokeStyle = String(Theme.stroke); c.lineWidth = 1;
                c.beginPath(); c.moveTo(0.5, 0.5); c.lineTo(w - 0.5, w - 0.5); c.stroke();
            }
        }
        HoverHandler { id: earHov; cursorShape: Qt.PointingHandCursor }
        TapHandler { onTapped: root.open = !root.open }
        Accessible.role: Accessible.Button; Accessible.name: "Prototype controls"
    }

    Rectangle {
        id: panel
        x: 16; y: parent.height - height - 48
        width: 264; height: pc.implicitHeight + 32; radius: 12
        color: Theme.input; border.width: 1; border.color: Theme.divider
        opacity: root.open ? 1 : 0; visible: opacity > 0
        scale: root.open ? 1 : 0.96; transformOrigin: Item.BottomLeft
        Behavior on opacity { NumberAnimation { duration: Theme.d200 } }
        Behavior on scale { NumberAnimation { duration: Theme.d200; easing.type: Easing.OutCubic } }
        MouseArea { anchors.fill: parent }

        Column {
            id: pc; x: 16; y: 16; width: parent.width - 32; spacing: 12
            Txt { role: "eyebrow"; text: "Prototype controls" }

            // velocidade das esperas
            Row {
                spacing: 4
                Repeater {
                    model: [1, 4, 10]
                    delegate: Rectangle {
                        required property var modelData
                        readonly property bool on: root.app.speed === modelData
                        width: 56; height: 32; radius: 4
                        color: on ? Theme.containerHigh : sm.containsMouse ? Theme.inputHover : "transparent"
                        border.width: 1; border.color: on ? Theme.textMain : Theme.stroke
                        Txt { anchors.centerIn: parent; role: "small"; color: Theme.textMain; font.weight: Font.Medium; text: modelData + "×" }
                        MouseArea { id: sm; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.app.speed = modelData }
                    }
                }
                Txt { role: "small"; text: "speed"; anchors.verticalCenter: parent.verticalCenter; leftPadding: 4 }
            }

            Btn { width: parent.width; kind: "outlined"; text: "Skip this step"; icon: "chev"; onClicked: root.app.skip() }

            Rectangle { width: parent.width; height: 1; color: Theme.divider }
            Txt { role: "small"; text: "Go to" }
            Flow {
                width: parent.width; spacing: 4
                Repeater {
                    model: root.scenes
                    delegate: Rectangle {
                        required property var modelData
                        readonly property bool on: root.app.scene === modelData[0]
                        width: gt.implicitWidth + 16; height: 28; radius: 14
                        color: on ? Theme.containerHigh : gm.containsMouse ? Theme.inputHover : "transparent"
                        border.width: 1; border.color: on ? Theme.textMain : Theme.stroke
                        Txt { id: gt; anchors.centerIn: parent; role: "small"; color: Theme.textMain; text: modelData[1] }
                        MouseArea {
                            id: gm; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                // telas pós-login precisam de uma conta
                                if (["netmap", "libscan", "home"].indexOf(modelData[0]) >= 0) root.app.loggedIn = true;
                                root.app.go(modelData[0]);
                            }
                        }
                    }
                }
            }
        }
    }
}

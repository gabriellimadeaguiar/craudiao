import QtQuick
import "Logic.js" as L

// Entrada: login de quem já assina à esquerda; à direita, a chamada para o check-up gratuito, sobre o globo
Item {
    id: root
    property var app
    property var globe
    property bool active: false
    property bool done: false
    visible: opacity > 0
    opacity: active ? 1 : 0
    Behavior on opacity { SequentialAnimation { PauseAnimation { duration: root.active ? 380 : 0 } NumberAnimation { duration: root.active ? 600 : 320; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } }

    onActiveChanged: if (active) { done = false; globe.idle(5.6); globe.shiftX = 120; }

    Rectangle {
        anchors.fill: parent
        gradient: Gradient { orientation: Gradient.Horizontal
            GradientStop { position: 0; color: Theme.surface } GradientStop { position: 0.34; color: "#e60b0c0f" } GradientStop { position: 0.58; color: "#000b0c0f" } }
    }

    // login
    Column {
        id: loginCol
        x: 96; anchors.verticalCenter: parent.verticalCenter
        width: 400; spacing: 32
        visible: !root.done
        Column {
            width: parent.width; spacing: 8
            Txt { role: "display"; text: "Welcome back."; width: parent.width }
            Txt { role: "bodyLg"; text: "Log in to pick up your routes, games and settings."; width: parent.width }
        }
        Column {
            width: parent.width; spacing: 16
            Field { id: email; width: parent.width; label: "Email"; icon: "mail"; placeholder: "you@example.com" }
            Field {
                id: pass; width: parent.width; label: "Password"; icon: "lock"; placeholder: "Your password"; password: true
                trailing: Txt { role: "small"; text: "Forgot password?"
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: root.app.toast("Reset your password", "We send a reset link to your email. Not connected in this build.") } }
            }
            Row {
                spacing: 8
                Rectangle {
                    id: keep; property bool on: true
                    width: 18; height: 18; radius: 4
                    color: on ? Theme.textMain : "transparent"; border.width: on ? 0 : 1.5; border.color: Theme.stroke
                    Icon { anchors.centerIn: parent; name: "check"; size: 14; strokeWidth: 2.2; color: Theme.surface; visible: keep.on }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: keep.on = !keep.on }
                }
                Txt { role: "small"; text: "Keep me logged in on this PC"; anchors.verticalCenter: parent.verticalCenter }
            }
            Btn { width: parent.width; text: "Log in"; onClicked: root.login() }
            Row {
                width: parent.width; spacing: 12
                Rectangle { width: (parent.width - 24 - orTxt.width) / 2; height: 1; color: Theme.divider; anchors.verticalCenter: parent.verticalCenter }
                Txt { id: orTxt; role: "small"; text: "or" }
                Rectangle { width: (parent.width - 24 - orTxt.width) / 2; height: 1; color: Theme.divider; anchors.verticalCenter: parent.verticalCenter }
            }
            Btn { width: parent.width; kind: "outlined"; text: "Continue with Google"; onClicked: root.login() }
        }
    }
    Column {
        x: 96; anchors.verticalCenter: parent.verticalCenter; width: 400; spacing: 16
        visible: root.done
        Rectangle { width: 64; height: 64; radius: 32; color: Theme.successContainer; Icon { anchors.centerIn: parent; name: "check"; color: Theme.success } }
        Txt { role: "h1"; text: "Welcome back" }
        Txt { role: "body"; color: Theme.textVariant; width: parent.width; text: "Opening ExitLag: first we map your network, then find your games." }
    }

    // chamada para o check-up (secundária)
    Rectangle {
        id: cta
        anchors.right: parent.right; anchors.rightMargin: 96; anchors.verticalCenter: parent.verticalCenter
        width: 440; height: ctaCol.implicitHeight + 80; radius: 24
        gradient: Gradient { GradientStop { position: 0; color: "#e0191d24" } GradientStop { position: 1; color: "#d9111317" } }
        border.width: 1; border.color: Theme.divider
        // luz vermelha que corre devagar pela borda
        Canvas {
            id: orbit
            anchors.fill: parent
            property real a: 0
            NumberAnimation on a { from: 0; to: Math.PI * 2; duration: 6000; loops: Animation.Infinite; running: root.active }
            onAChanged: requestPaint()
            onPaint: {
                var c = getContext("2d"); c.reset();
                var w = width, h = height, r = 24, cx = w / 2, cy = h / 2;
                var g = c.createConicalGradient(cx, cy, -a);
                g.addColorStop(0, "#00f52929"); g.addColorStop(0.1, "#b3f52929"); g.addColorStop(0.3, "#00f52929"); g.addColorStop(1, "#00f52929");
                c.strokeStyle = g; c.lineWidth = 1.2;
                c.beginPath(); c.roundedRect(0.6, 0.6, w - 1.2, h - 1.2, r, r); c.stroke();
            }
        }
        Column {
            id: ctaCol
            x: 40; y: 40; width: parent.width - 80; spacing: 24
            Row {
                spacing: 8
                Rectangle {
                    width: 8; height: 8; radius: 4; color: Theme.primary; anchors.verticalCenter: parent.verticalCenter
                    SequentialAnimation on opacity { loops: Animation.Infinite; running: root.active; NumberAnimation { to: 0.35; duration: 900 } NumberAnimation { to: 1; duration: 900 } }
                }
                Txt { role: "eyebrow"; text: "New to ExitLag?" }
            }
            Txt { role: "h1"; width: parent.width; text: "See what's slowing your games before you sign up." }
            Column {
                width: parent.width; spacing: 16
                Repeater {
                    model: [["pc", "Your PC", "What kind of machine you have and what's costing you frames"], ["net", "Your connection", "Your route to the game server, measured live"], ["report", "A clear result", "What to fix first, and what ExitLag fixes for you"]]
                    delegate: Row {
                        required property var modelData
                        required property int index
                        width: parent.width; spacing: 12
                        opacity: 0
                        Component.onCompleted: appear.start()
                        NumberAnimation on opacity { id: appear; running: false; to: 1; duration: 700; easing.type: Easing.OutCubic }
                        Rectangle { width: 36; height: 36; radius: 8; color: Theme.input; Icon { anchors.centerIn: parent; name: modelData[0]; size: 18 } }
                        Column { width: parent.width - 48; spacing: 2
                            Txt { role: "body"; text: modelData[1]; font.weight: Font.Medium }
                            Txt { role: "small"; text: modelData[2]; width: parent.width } }
                    }
                }
            }
            Btn { width: parent.width; kind: "outlined"; text: "Start free check-up"; onClicked: root.app.go("intro") }
            Row {
                anchors.horizontalCenter: parent.horizontalCenter; spacing: 6
                Icon { name: "clock"; size: 16; color: Theme.textVariant; anchors.verticalCenter: parent.verticalCenter }
                Txt { role: "small"; text: "About a minute · free · no account needed" }
            }
        }
    }

    function login() {
        // sem conexão com o sistema de contas da ExitLag nesta versão: qualquer entrada passa
        done = true;
        app.email = email.text.length ? email.text : "player@exitlag.com";
        app.loggedIn = true;
        app.notify("Welcome back", "Logged in as " + app.email + ".");
        leave.start();
    }
    Timer { id: leave; interval: 1400 / root.app.speed; onTriggered: root.app.go("netmap") }
}

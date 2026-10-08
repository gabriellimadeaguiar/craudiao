import QtQuick
import "Logic.js" as L

// Criar conta (ou entrar) depois de escolher o plano; em seguida o app segue para o fluxo pós-login
Item {
    id: root
    property var app
    property var globe
    property bool active: false
    property bool done: false
    visible: opacity > 0
    opacity: active ? 1 : 0
    Behavior on opacity { SequentialAnimation { PauseAnimation { duration: root.active ? 380 : 0 } NumberAnimation { duration: root.active ? 600 : 320; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } } }
    readonly property var plan: L.PLANS.filter(function (p) { return p.id === root.app.offer; })[0]
    readonly property bool signup: app.loginMode !== "login"
    onActiveChanged: if (active) { done = false; globe.idle(5.2); globe.shiftX = 0; }

    Rectangle {
        anchors.centerIn: parent
        width: 440; height: col.implicitHeight + 80; radius: 20
        color: "#eb111317"; border.width: 1; border.color: Theme.divider
        Column {
            id: col; x: 40; y: 40; width: parent.width - 80; spacing: 24
            visible: !root.done
            Column { width: parent.width; spacing: 8
                Badge { sev: "success"; text: root.plan ? root.plan.n + " plan · $" + root.plan.p + "/mo" : "3-day free trial" }
                Txt { role: "h1"; font.pixelSize: 34; lineHeight: 38; text: root.signup ? "Create your account" : "Log in to ExitLag" }
                Txt { role: "body"; color: Theme.textVariant; width: parent.width; text: root.signup ? "Your results come with you, so ExitLag can start fixing them right away." : "Your results from this check-up come with you." } }
            Field { width: parent.width; label: "Email"; icon: "mail"; placeholder: "you@example.com" }
            Field { width: parent.width; label: "Password"; icon: "lock"; placeholder: root.signup ? "At least 8 characters" : "Your password"; password: true }
            Btn { width: parent.width; text: root.signup ? (root.plan ? "Create account and subscribe" : "Create account and start trial") : "Log in"; onClicked: root.finish() }
            Row { width: parent.width; spacing: 12
                Rectangle { width: (parent.width - 24 - o.width) / 2; height: 1; color: Theme.divider; anchors.verticalCenter: parent.verticalCenter }
                Txt { id: o; role: "small"; text: "or" }
                Rectangle { width: (parent.width - 24 - o.width) / 2; height: 1; color: Theme.divider; anchors.verticalCenter: parent.verticalCenter } }
            Btn { width: parent.width; kind: "outlined"; text: "Continue with Google"; onClicked: root.finish() }
            Row { anchors.horizontalCenter: parent.horizontalCenter; spacing: 4
                Txt { role: "small"; text: root.signup ? "Already have an account?" : "New to ExitLag?" }
                Txt { role: "small"; color: Theme.textMain; font.underline: true; text: root.signup ? "Log in" : "Create an account"
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: root.app.loginMode = root.signup ? "login" : "signup" } } }
        }
        Column {
            x: 40; y: 40; width: parent.width - 80; spacing: 16
            visible: root.done
            Rectangle { anchors.horizontalCenter: parent.horizontalCenter; width: 72; height: 72; radius: 36; color: Theme.successContainer
                Icon { anchors.centerIn: parent; name: "check"; color: Theme.success } }
            Txt { anchors.horizontalCenter: parent.horizontalCenter; role: "h1"; text: "You're in" }
            Txt { width: parent.width; horizontalAlignment: Text.AlignHCenter; role: "body"; color: Theme.textVariant
                text: (root.plan ? root.plan.n + " plan active. " : "Your 3-day free trial is on. ") + "Opening ExitLag: first we map your network, then find your games." }
        }
    }
    function finish() { done = true; app.loggedIn = true; leave.start(); }
    Timer { id: leave; interval: 1600; onTriggered: root.app.go("netmap") }
}

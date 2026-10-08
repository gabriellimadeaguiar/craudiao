import QtQuick

// snackbar: entra de baixo, some sozinha
Rectangle {
    id: root
    width: 380; height: col.implicitHeight + 24; radius: 10
    color: Theme.input
    property bool shown: false
    y: shown ? parent.height - height - 24 : parent.height + 24
    anchors.horizontalCenter: parent.horizontalCenter
    Behavior on y { NumberAnimation { duration: 300; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeDecelerate } }
    function show(title, desc) { t1.text = title; t2.text = desc || ""; shown = true; timer.restart(); }
    Timer { id: timer; interval: 3800; onTriggered: root.shown = false }
    Column {
        id: col; x: 12; y: 12; width: parent.width - 24; spacing: 4
        Text { id: t1; color: Theme.textMain; font.family: Theme.font; font.pixelSize: 14; font.weight: Font.Medium; width: parent.width; wrapMode: Text.WordWrap }
        Text { id: t2; color: Theme.textVariant; font.family: Theme.font; font.pixelSize: 12; width: parent.width; wrapMode: Text.WordWrap; visible: text !== "" }
    }
}

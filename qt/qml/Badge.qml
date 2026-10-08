import QtQuick

// badge: success / warning / critical / neutral (texto 12, peso 500)
Rectangle {
    id: root
    property string text: ""
    property string sev: "neutral"
    implicitWidth: t.implicitWidth + 16
    implicitHeight: 24
    radius: 4
    color: sev === "neutral" ? Theme.containerHigh : Theme.sevBg(sev)
    Text {
        id: t
        anchors.centerIn: parent
        text: root.text
        color: root.sev === "neutral" ? Theme.textMain : Theme.sevText(root.sev)
        font.family: Theme.font; font.pixelSize: 12; font.weight: Font.Medium; font.letterSpacing: 0.5
    }
}

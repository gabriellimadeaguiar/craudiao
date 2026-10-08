import QtQuick
import QtQuick.Shapes

// Anel de progresso com contorno em degradê (cinza › claro)
Item {
    id: root
    property real value: 0          // 0–1
    property real thickness: 3
    property color track: Theme.divider
    property bool showTrack: true
    Behavior on value { NumberAnimation { duration: 900; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeStandard } }

    Shape {
        anchors.fill: parent
        antialiasing: true
        ShapePath {
            strokeColor: root.showTrack ? root.track : "transparent"
            strokeWidth: root.thickness; fillColor: "transparent"
            PathAngleArc { centerX: root.width / 2; centerY: root.height / 2; radiusX: root.width / 2 - root.thickness; radiusY: radiusX; startAngle: 0; sweepAngle: 360 }
        }
        ShapePath {
            strokeWidth: root.thickness; fillColor: "transparent"; capStyle: ShapePath.RoundCap
            strokeColor: Theme.textMain
            PathAngleArc { centerX: root.width / 2; centerY: root.height / 2; radiusX: root.width / 2 - root.thickness; radiusY: radiusX; startAngle: -90; sweepAngle: 360 * Math.max(0.001, root.value) }
        }
    }
}

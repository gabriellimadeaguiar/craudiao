import QtQuick
import QtQuick.Shapes
import "Icons.js" as Icons

// Ícone de traço do Design System, desenhado como vetor (grade 24×24, traço 1.6)
Item {
    id: root
    property string name: ""
    property color color: Theme.textMain
    property real size: 24
    property real strokeWidth: 1.6
    width: size; height: size

    Shape {
        width: 24; height: 24
        scale: root.size / 24
        transformOrigin: Item.TopLeft
        antialiasing: true
        ShapePath {
            strokeColor: root.color
            strokeWidth: root.strokeWidth
            fillColor: "transparent"
            capStyle: ShapePath.RoundCap
            joinStyle: ShapePath.RoundJoin
            PathSvg { path: Icons.d[root.name] || "" }
        }
    }
}

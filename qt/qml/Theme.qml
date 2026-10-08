pragma Singleton
import QtQuick

// Tokens do Token System (modo Desktop), os mesmos do protótipo web.
QtObject {
    readonly property color surface: "#0b0c0f"
    readonly property color container: "#111317"
    readonly property color containerHigh: "#191d24"
    readonly property color input: "#20242d"
    readonly property color inputHover: "#3b4252"
    readonly property color textMain: "#ebeced"
    readonly property color textVariant: "#878d97"
    readonly property color divider: "#313741"
    readonly property color stroke: "#555c68"
    readonly property color primary: "#f52929"
    readonly property color primaryHover: "#ff3d3d"
    readonly property color primaryPressed: "#d91f1f"
    readonly property color primarySoft: "#1af52929"
    readonly property color criticalText: "#ff6b6b"
    readonly property color success: "#22eba3"
    readonly property color successContainer: "#122825"
    readonly property color warning: "#eed80e"
    readonly property color warningContainer: "#272716"
    readonly property color isp: "#eb8322"
    readonly property color series1: "#92e2f2"
    readonly property color stage: "#050608"
    readonly property color glass: "#b3111317"
    readonly property color stateHover: "#14ebeced"
    readonly property color statePressed: "#1febeced"

    readonly property string fontDisplay: "Anek Latin"
    readonly property string font: "Ubuntu Sans"
    readonly property string fontMono: "Ubuntu Sans Mono"

    // sys/spacing
    readonly property int xs: 4
    readonly property int sm: 8
    readonly property int md: 12
    readonly property int lg: 16
    readonly property int xl: 24
    readonly property int xxl: 32

    // ref/motion
    readonly property int d100: 100
    readonly property int d200: 200
    readonly property int d300: 300
    readonly property int d500: 500
    readonly property int d900: 900
    readonly property var easeStandard: [0.2, 0, 0, 1, 1, 1]
    readonly property var easeDecelerate: [0, 0, 0, 1, 1, 1]
    readonly property var easeAccelerate: [0.3, 0, 1, 1, 1, 1]
    readonly property var easeSpring: [0.2, 1.25, 0.35, 1, 1, 1]

    function sevColor(s) { return s === "critical" ? primary : s === "warning" ? warning : s === "success" ? success : stroke; }
    function sevBg(s) { return s === "critical" ? primarySoft : s === "warning" ? warningContainer : s === "success" ? successContainer : containerHigh; }
    function sevText(s) { return s === "critical" ? criticalText : s === "warning" ? warning : s === "success" ? success : textVariant; }
}

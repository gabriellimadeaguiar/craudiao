import QtQuick

// Texto com a escala tipográfica do Design System: Anek Latin nos títulos, Ubuntu Sans no texto.
Text {
    property string role: "body"   // hero | display | h1 | h2 | h3 | bodyLg | body | small | eyebrow | mono | num
    color: role === "bodyLg" || role === "small" || role === "eyebrow" ? Theme.textVariant : Theme.textMain
    font.family: role === "hero" || role === "display" || role === "h1" || role === "h2" || role === "num" ? Theme.fontDisplay : role === "mono" ? Theme.fontMono : Theme.font
    font.pixelSize: ({ hero: 68, display: 52, h1: 40, h2: 28, num: 64, h3: 16, bodyLg: 16, body: 14, small: 12, eyebrow: 12, mono: 13 })[role]
    font.weight: role === "hero" || role === "display" || role === "h1" || role === "h2" || role === "num" || role === "h3" ? Font.Bold : role === "eyebrow" ? Font.Medium : Font.Normal
    font.letterSpacing: role === "eyebrow" ? 1.2 : role === "hero" || role === "display" ? -1 : role === "h1" ? -0.5 : role === "small" ? 0.4 : role === "h3" ? 0.15 : 0.25
    font.capitalization: role === "eyebrow" ? Font.AllUppercase : Font.MixedCase
    lineHeightMode: Text.FixedHeight
    lineHeight: ({ hero: 68, display: 54, h1: 44, h2: 32, num: 60, h3: 24, bodyLg: 24, body: 20, small: 16, eyebrow: 16, mono: 18 })[role]
    wrapMode: Text.WordWrap
}

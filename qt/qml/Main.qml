import QtQuick
import QtQuick.Window
import ExitLag
import "Logic.js" as L

/* Janela do app: sem moldura do sistema, tela inteira do design (1440×810) escalada para caber na janela.
   Fluxo: entrada (login + chamada para o check-up) › check-up › análise › resultados e plano › criar conta
          › network map › varredura de jogos › home com onboarding. */
Window {
    id: win
    width: 1440; height: 810
    minimumWidth: 1024; minimumHeight: 576
    visible: true
    color: Theme.stage
    flags: Qt.Window | Qt.FramelessWindowHint
    title: "ExitLag"

    // estado compartilhado do fluxo
    QtObject {
        id: app
        property string scene: "entry"
        property var origin: L.originFor(Platform.timeZoneId)
        property var hwRaw: null
        property var hw: null                // L.analyzeHardware(hwRaw)
        property var net: null               // { I, X, samplesI, samplesX, hops, region, game, distance, findings }
        property var detected: []            // jogos achados no PC
        property string gameId: "lol"
        property string region: ""
        property string offer: "trial"
        property string loginMode: "signup"
        property bool loggedIn: false
        function go(s) { scene = s; }
        function toast(t, d) { toaster.show(t, d); }
    }

    Item {
        id: stage
        width: 1440; height: 810
        anchors.centerIn: parent
        scale: Math.min(win.width / 1440, win.height / 810)
        clip: true

        Rectangle { anchors.fill: parent; gradient: Gradient { GradientStop { position: 0; color: "#10131a" } GradientStop { position: 0.6; color: Theme.surface } } }

        Globe { id: globe; anchors.fill: parent; opacity: app.scene === "results" || (app.scene === "analysis" && !analysis.netOn) ? 0 : app.scene === "signup" ? 0.45 : 1
            Behavior on opacity { NumberAnimation { duration: 900 } } }

        EntryScreen { id: entry; anchors.fill: parent; app: app; globe: globe; active: app.scene === "entry" }
        IntroScreen { id: intro; anchors.fill: parent; app: app; globe: globe; active: app.scene === "intro" }
        AnalysisScreen { id: analysis; anchors.fill: parent; app: app; globe: globe; active: app.scene === "analysis" }
        ResultsScreen { id: results; anchors.fill: parent; app: app; globe: globe; active: app.scene === "results" }
        SignupScreen { id: signup; anchors.fill: parent; app: app; globe: globe; active: app.scene === "signup" }
        NetworkMapScreen { id: netmap; anchors.fill: parent; app: app; globe: globe; active: app.scene === "netmap" }
        LibraryScanScreen { id: libscan; anchors.fill: parent; app: app; globe: globe; active: app.scene === "libscan" }
        HomeScreen { id: home; anchors.fill: parent; app: app; globe: globe; active: app.scene === "home" }

        // cantos da janela: marca e botões de janela; o topo arrasta a janela
        Item {
            id: chrome
            anchors.left: parent.left; anchors.right: parent.right; height: 72
            z: 50
            MouseArea {
                anchors.fill: parent
                property point p
                onPressed: function (m) { if (win.startSystemMove) win.startSystemMove(); }
                onDoubleClicked: win.visibility === Window.Maximized ? win.showNormal() : win.showMaximized()
            }
            Logo { x: 32; y: 26 }
            Row {
                anchors.right: parent.right; anchors.rightMargin: 24; y: 16; spacing: 8
                IconBtn { icon: "min"; tip: "Minimize"; onClicked: win.showMinimized() }
                IconBtn { icon: "close"; tip: "Close"; onClicked: Qt.quit() }
            }
        }

        Toast { id: toaster; z: 100 }
    }

    // jogos instalados: procurados logo ao abrir, para o check-up já sugerir um jogo do PC
    GameScanner { id: scanner; onFinished: function (list) { if (list.length) { app.detected = list; app.gameId = list[0].id; } } }

    Component.onCompleted: {
        scanner.scan();
        if (Platform.startScene !== "") app.scene = Platform.startScene;
        Platform.log("ExitLag Analyzer · Qt " + Platform.qtVersion + " · origin " + app.origin[2]);
    }
}

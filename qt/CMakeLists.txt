cmake_minimum_required(VERSION 3.21)
project(ExitLagAnalyzer VERSION 0.1.0 LANGUAGES CXX)

# ExitLag Analyzer: check-up sem login (hardware e rede medidos de verdade), resultados, plano e o fluxo pós-login
# (network map, varredura de jogos, onboarding e home), em Qt Quick com o globo em Qt Quick 3D.
# Compila com Qt 6.4+ (testado em 6.4 no Linux) e é empacotado para Windows com Qt 6.8 pelo GitHub Actions.

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 6.4 REQUIRED COMPONENTS Core Gui Network Qml Quick Quick3D)
qt_standard_project_setup()

qt_add_executable(ExitLagAnalyzer WIN32 MACOSX_BUNDLE
    src/main.cpp
    src/landgeometry.cpp src/landgeometry.h
    src/stargeometry.cpp src/stargeometry.h
    src/routegeometry.cpp src/routegeometry.h
    src/hardwareprobe.cpp src/hardwareprobe.h
    src/latencyprobe.cpp src/latencyprobe.h
    src/traceroute.cpp src/traceroute.h
    src/gamescanner.cpp src/gamescanner.h
    src/platform.cpp src/platform.h
)

if(WIN32)
    target_link_libraries(ExitLagAnalyzer PRIVATE iphlpapi ws2_32)
endif()

set_source_files_properties(qml/Theme.qml PROPERTIES QT_QML_SINGLETON_TYPE TRUE)
# os arquivos QML ficam na raiz do módulo (qrc:/ExitLag/Main.qml), junto do qmldir: o singleton Theme e os
# componentes se acham por nome sem import extra
file(GLOB QML_SOURCES RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} qml/*.qml qml/*.js)
foreach(f ${QML_SOURCES})
    get_filename_component(n ${f} NAME)
    set_source_files_properties(${f} PROPERTIES QT_RESOURCE_ALIAS ${n})
endforeach()
foreach(f atmo.vert atmo.frag glow.vert glow.frag)
    set_source_files_properties(qml/shaders/${f} PROPERTIES QT_RESOURCE_ALIAS shaders/${f})
endforeach()

qt_add_qml_module(ExitLagAnalyzer
    URI ExitLag
    VERSION 1.0
    RESOURCE_PREFIX /
    QML_FILES
        qml/Main.qml
        qml/Theme.qml
        qml/Logic.js
        qml/Icons.js
        qml/Logo.qml
        qml/Icon.qml
        qml/Btn.qml
        qml/IconBtn.qml
        qml/Field.qml
        qml/Badge.qml
        qml/Globe.qml
        qml/GlobeTag.qml
        qml/RouteModel.qml
        qml/Ring.qml
        qml/Spark.qml
        qml/EntryScreen.qml
        qml/IntroScreen.qml
        qml/AnalysisScreen.qml
        qml/ResultsScreen.qml
        qml/SignupScreen.qml
        qml/NetworkMapScreen.qml
        qml/LibraryScanScreen.qml
        qml/HomeScreen.qml
        qml/TourOverlay.qml
        qml/Toast.qml
        qml/Txt.qml
    RESOURCES
        qml/shaders/atmo.vert
        qml/shaders/atmo.frag
        qml/shaders/glow.vert
        qml/shaders/glow.frag
)

file(GLOB GAME_IMAGES RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} resources/games/*)
file(GLOB FONT_FILES RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} resources/fonts/*.ttf)
qt_add_resources(ExitLagAnalyzer "assets"
    PREFIX "/"
    BASE resources
    FILES resources/data/land.bin ${GAME_IMAGES} ${FONT_FILES}
)

target_include_directories(ExitLagAnalyzer PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)
target_link_libraries(ExitLagAnalyzer PRIVATE
    Qt6::Core Qt6::Gui Qt6::Network Qt6::Qml Qt6::Quick Qt6::Quick3D
)

include(GNUInstallDirs)
install(TARGETS ExitLagAnalyzer
    BUNDLE DESTINATION .
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)

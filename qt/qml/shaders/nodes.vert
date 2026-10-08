// Nós da rede: passa a coordenada no quadrado e a fase da piscada (guardada na cor do vértice)
VARYING vec2 vUV;
VARYING float vPhase;
void MAIN()
{
    vUV = UV0;
    vPhase = COLOR.r;
    POSITION = MODELVIEWPROJECTION_MATRIX * vec4(VERTEX, 1.0);
}

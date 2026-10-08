// Ponto redondo com borda suave; piscada pelo tempo (um uniform só para todos os nós)
VARYING vec2 vUV;
VARYING float vPhase;
void MAIN()
{
    float d = length(vUV);
    float a = (1.0 - smoothstep(0.55, 1.0, d)) * baseOpacity * (0.45 + 0.55 * abs(sin(uTime * 1.3 + vPhase)));
    FRAGCOLOR = vec4(nodeColor.rgb * a, a);
}

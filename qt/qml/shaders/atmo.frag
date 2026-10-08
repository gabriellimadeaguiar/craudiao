// Brilho difuso que nasce na borda do globo e some para fora, sem corte duro (mesmo efeito da landing e da home web).
VARYING vec3 vN;
VARYING vec3 vV;
void MAIN()
{
    float d = abs(dot(normalize(vN), normalize(vV)));
    float a = pow(d, 2.6) * intensity;
    FRAGCOLOR = vec4(rimColor.rgb * a, a);
}

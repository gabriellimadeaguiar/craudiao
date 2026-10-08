// Brilho difuso em volta do globo, sem corte duro (como o halo do protótipo web).
// Desenhado pelas faces de trás de uma esfera maior (raio `outer`, em raios do globo): a partir de |N·V| sai a
// distância do raio ao centro, em raios do globo; fora do planeta o brilho cai em exp(-falloff·(d-1)).
VARYING vec3 vN;
VARYING vec3 vV;
void MAIN()
{
    float c = abs(dot(normalize(vN), normalize(vV)));
    float d = sqrt(max(0.0, 1.0 - c * c)) * outer;
    float a = (d > 1.0 ? exp(-(d - 1.0) * falloff) : pow(d, 10.0)) * intensity;
    FRAGCOLOR = vec4(rimColor.rgb * a, a);
}

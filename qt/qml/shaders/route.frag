// Rota desenhada até `progress`, com pacotes correndo do início ao fim (cinco pulsos claros ao longo do tubo).
// Tudo no shader: nenhum objeto nem binding por pacote.
VARYING float vU;
void MAIN()
{
    if (vU > progress) discard;
    float pulse = 0.0;
    if (packets > 0.5) {
        for (int k = 0; k < 5; ++k) {
            float t = fract(uTime * speed + float(k) / 5.0);
            float d = abs(vU - t);
            pulse += (1.0 - smoothstep(0.0, pulseWidth, d)) * sin(3.14159265 * t);
        }
        pulse = min(pulse, 1.0);
    }
    vec3 c = mix(baseColor.rgb, vec3(1.0), pulse * 0.45);
    float a = clamp(alpha + pulse * pulseAlpha, 0.0, 1.0) * gain;
    FRAGCOLOR = vec4(c * a, a);
}

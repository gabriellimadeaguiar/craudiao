VARYING vec3 vN;
VARYING vec3 vV;
void MAIN()
{
    float f = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0);
    vec3 c = mix(deepColor.rgb, rimColor.rgb, pow(f, 5.0) * 0.22);
    FRAGCOLOR = vec4(c, 1.0);
}

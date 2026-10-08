// Superfície do globo: escura, com uma borda levemente azulada (fresnel).
VARYING vec3 vN;
VARYING vec3 vV;
void MAIN()
{
    vec4 wp = MODEL_MATRIX * vec4(VERTEX, 1.0);
    vN = normalize(NORMAL_MATRIX * NORMAL);
    vV = normalize(CAMERA_POSITION - wp.xyz);
    POSITION = MODELVIEWPROJECTION_MATRIX * vec4(VERTEX, 1.0);
}

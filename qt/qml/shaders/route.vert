// Rota: passa o comprimento acumulado (u, 0–1) para o fragmento
VARYING float vU;
void MAIN()
{
    vU = UV0.x;
    POSITION = MODELVIEWPROJECTION_MATRIX * vec4(VERTEX, 1.0);
}

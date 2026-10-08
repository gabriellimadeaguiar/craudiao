// Ícone da órbita atrás do planeta: some dentro do disco do globo (centro e raio em pixels do próprio ícone).
#version 440
layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;
layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 size;
    vec2 center;
    float radius;
};
layout(binding = 1) uniform sampler2D source;
void main()
{
    float d = length(qt_TexCoord0 * size - center);
    float a = clamp(d - radius + 0.5, 0.0, 1.0);
    fragColor = texture(source, qt_TexCoord0) * a * qt_Opacity;
}

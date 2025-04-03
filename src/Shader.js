const skinVS = `#version 300 es
    in vec4 a_POSITION;
    in vec3 a_NORMAL;
    in vec2 a_TEXCOORD_0;

    uniform mat4 u_projection;
    uniform mat4 u_view;
    uniform mat4 u_world;

    out vec3 v_normal;

    // test (to be removed)
    out vec2 v_texCoord;

    void main() {
        v_texCoord = a_TEXCOORD_0;
        mat4 world = u_world;
        gl_Position =  u_projection * u_view * world * a_POSITION;
        v_normal = mat3(world) * a_NORMAL;
    }
`;
const fs = `#version 300 es
    precision highp float;

    in vec3 v_normal;
    in vec2 v_texCoord;

    uniform vec3 u_lightDirection;
    uniform vec3 u_ambientColor;
    uniform vec4 u_baseColorFactor;
    uniform float u_metallicFactor;
    uniform float u_roughnessFactor;
    uniform vec3 u_emissiveFactor;
    uniform sampler2D u_baseColorTexture;
    uniform sampler2D u_omrTexture;
    uniform sampler2D u_emissiveTexture;
    uniform sampler2D u_normalTexture;

    out vec4 outColor;

    void main () {
        vec3 normalTex = texture(u_normalTexture, v_texCoord).xyz;
        vec3 normal = normalize(v_normal * normalTex);
        float light = dot(u_lightDirection, normal) * .5 + .5;
        vec4 textureColor = texture(u_baseColorTexture, v_texCoord);
        vec4 baseColor = textureColor * u_baseColorFactor;
        vec3 mrTex = texture(u_omrTexture, v_texCoord).rgb;
        float roughness = mrTex.g * u_roughnessFactor; 
        float metallic = mrTex.b * u_metallicFactor;
        float occlusion = mrTex.r;

        vec3 lightDir = normalize(-u_lightDirection);
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = baseColor.rgb * diff * (1.0 - metallic);
        vec3 ambient = baseColor.rgb * u_ambientColor * occlusion;
        vec3 emissive = texture(u_emissiveTexture, v_texCoord).rgb * u_emissiveFactor;
        outColor = vec4(ambient + diffuse + emissive, 1.0);
    }
`;

const meshVS = `#version 300 es
    in vec4 a_POSITION;
    in vec3 a_NORMAL;
    in vec2 a_TEXCOORD_0;

    uniform mat4 u_projection;
    uniform mat4 u_view;
    uniform mat4 u_world;

    out vec3 v_normal;

    void main() {
        gl_Position = u_projection * u_view * u_world * a_POSITION;
        v_normal = mat3(u_world) * a_NORMAL;
    }
`;

export {
    skinVS, 
    meshVS,
    fs
}
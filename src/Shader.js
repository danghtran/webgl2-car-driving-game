const skinVS = `#version 300 es
    in vec4 a_POSITION;
    in vec3 a_NORMAL;
    in vec2 a_TEXCOORD_0;
    in vec4 a_WORLD_0;
    in vec4 a_WORLD_1;
    in vec4 a_WORLD_2;
    in vec4 a_WORLD_3;

    uniform mat4 u_projection;
    uniform mat4 u_view;
    // uniform mat4 u_world;
    uniform int numLight;

    out vec3 v_normal;
    out vec2 v_texCoord;

    void main() {
        v_texCoord = a_TEXCOORD_0;
        mat4 world = mat4(
            a_WORLD_0, a_WORLD_1, a_WORLD_2, a_WORLD_3
        );
        mat4 mvp = u_projection * u_view * world;
        gl_Position =  mvp * a_POSITION;
        v_normal = mat3(world) * a_NORMAL;
    }
`;
const fs = `#version 300 es
    precision highp float;

    struct Light {
        vec3 ambient;
        vec3 diffuse;
        vec3 specular;
        vec4 color;
        vec4 position;
        vec3 direction;
        float cutOff;
        float outerCutOff;
        //float constant;
        //float linear;
        //float quad;
    };

    uniform highp int u_numLight;
    uniform Light u_lights[5];

    in vec3 v_normal;
    in vec2 v_texCoord;

    uniform vec4 u_baseColorFactor;
    uniform float u_metallicFactor;
    uniform float u_roughnessFactor;
    uniform vec3 u_emissiveFactor;
    uniform vec4 u_fogColor;
    uniform float u_fogNear;
    uniform float u_fogFar;
    uniform sampler2D u_baseColorTexture;
    uniform sampler2D u_omrTexture;
    uniform sampler2D u_emissiveTexture;
    uniform sampler2D u_normalTexture;

    out vec4 outColor;

    void main () {
        vec3 normalTex = texture(u_normalTexture, v_texCoord).xyz;
        normalTex = normalTex * 2.0 - 1.0;
        vec3 normal = normalize(v_normal * normalTex);

        vec4 textureColor = texture(u_baseColorTexture, v_texCoord);
        vec4 baseColor = textureColor * u_baseColorFactor;
        vec3 mrTex = texture(u_omrTexture, v_texCoord).rgb;
        float roughness = mrTex.g * u_roughnessFactor; 
        float metallic = mrTex.b * u_metallicFactor;
        float occlusion = mrTex.r;
        vec3 emissive = texture(u_emissiveTexture, v_texCoord).rgb * u_emissiveFactor;

        vec4 light = vec4(0.0);
        for (int i = 0; i < u_numLight; i++) {
            vec3 Lnorm = normalize((u_lights[i].position - gl_FragCoord).xyz);
            vec3 H = normalize(Lnorm + gl_FragCoord.xyz);
            vec4 ambient = vec4(u_lights[i].ambient, 1.0) * occlusion;
            float Kd = max(dot(Lnorm, normal), 0.0);
            vec4 diffuse = vec4(u_lights[i].diffuse, 0.0) * Kd * (1.0 - metallic);
            float Ks = pow(max(dot(normal, H), 0.0), 1.0);
            vec4 specular = Ks * vec4(u_lights[i].specular, 1.0) * (1.0 - roughness);
            if(dot(Lnorm, normal) < 0.0) specular = vec4(0.0, 0.0, 0.0, 1.0);
            // Spotlight intensity calculation
            float intensity = 1.0;
            if (u_lights[i].cutOff != 0.0) {
                float theta = dot(Lnorm, normalize(-u_lights[i].direction)); 
                intensity = smoothstep(u_lights[i].outerCutOff, u_lights[i].cutOff, theta);
            }
            
            light += (ambient + (diffuse +specular)* intensity) * u_lights[i].color;
        }
        
        vec4 finalColor = baseColor * light;
        float fogAmount = smoothstep(u_fogNear, u_fogFar, gl_FragCoord.z);
        outColor = mix(finalColor, u_fogColor, fogAmount) + vec4(emissive, 1.0);  
    }
`;

const skyboxVs = `#version 300 es
    in vec4 a_POSITION;
    in vec3 a_NORMAL;
    in vec2 a_TEXCOORD_0;

    out vec2 v_texCoord;
    out vec3 v_normal;

    uniform mat4 u_view;
    uniform mat4 u_projection;

    void main() {
        mat4 viewRotationOnly = mat4(mat3(u_view));
        vec4 pos = viewRotationOnly * a_POSITION;
        gl_Position = u_projection * pos;
        v_texCoord = a_TEXCOORD_0;
        v_normal = a_NORMAL;
    }
`;

const skyboxFs = `#version 300 es
    precision mediump float;

    in vec2 v_texCoord;
    in vec3 v_normal;
    out vec4 outColor;

    uniform vec4 u_fogColor;
    uniform float u_fogNear;
    uniform float u_fogFar;
    uniform sampler2D u_emissiveTexture;

    void main() {
        vec4 finalColor = texture(u_emissiveTexture, v_texCoord);
        float fogAmount = smoothstep(u_fogNear, u_fogFar, gl_FragCoord.z);
        outColor = mix(finalColor, u_fogColor, fogAmount);  
    }
`;

const bbVs = `#version 300 es
    in vec4 a_POSITION;

    uniform mat4 u_view;
    uniform mat4 u_projection;

    void main() {
        gl_Position = u_projection * u_view * a_POSITION;
    }
`;

const bbFs = `#version 300 es
    precision mediump float;

    out vec4 outColor;

    void main() {
        outColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
`;

export {
    skinVS, 
    skyboxFs,
    skyboxVs,
    fs,
    bbVs,
    bbFs
}
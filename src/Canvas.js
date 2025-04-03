import { useRef, useEffect } from 'react';
import { skinVS, fs } from './Shader';
import { loadGLTF } from './gltfLoader';
import { createProgram, createShader } from './WebglHelper';
import { quaternionRotation, translation } from './Modeling';
import { normalize } from './Matrix';

export function Canvas(props) {
    const canvasRef = useRef(null);
    const glRef = useRef(null);
    const proRef = useRef(null);

    const loadScene = async () => {
        const gl = glRef.current;
        const program = proRef.current;
        var {nodes, cams} = await loadGLTF(gl,program, "/ToyCar.gltf");
        console.log(nodes)
        console.log(cams)
        var mt = await loadGLTF(gl, program, "/scene.gltf");
        console.log(mt)
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.DEPTH_TEST);
        // gl.enable(gl.CULL_FACE);
        gl.clearColor(.1, .1, .1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        var cam = cams[0]
        cam.rotate(quaternionRotation([1,0,0], 45))
        cam.translate(translation([-0.02, -0.07, -0.02]))
        nodes['ToyCar'].render(gl, program, cam.projectionMatrix, cam.getViewMatrix(), normalize([-1, 3, 5]));
        nodes['Glass'].render(gl, program, cam.projectionMatrix, cam.getViewMatrix(), normalize([-1, 3, 5]));
        // for (const [name, mtnode] of Object.entries(mt.nodes)) {
        //     mtnode.render(gl, program, cam.projectionMatrix, cam.getViewMatrix(), normalize([-1, 3, 5]));
        // }
    }



    useEffect(() => {
        const canvas = canvasRef.current;
        if (glRef.current) {
            return;
        }
        glRef.current = canvas.getContext("webgl2");
        const gl = glRef.current;
        if (!gl) {
            console.log("Waiting for WebGL");
        } else {
            console.log("WebGL Loaded");
            const canvas = canvasRef.current;
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.0, 0.0, 0.0, 1.0);

            // Create the vertex shader
            const vertexShader = createShader(gl, gl.VERTEX_SHADER, skinVS);
            const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fs);
            const programOptions = {
                attribLocations: {
                  a_POSITION: 0,
                  a_NORMAL: 1,
                  a_WEIGHTS_0: 2,
                  a_JOINTS_0: 3,
                  a_TEXCOORD_0: 4,
                },
              };
            proRef.current = createProgram(gl, vertexShader, fragmentShader, programOptions);
            loadScene();
        }
    }, []);

    return <div>
        <canvas ref={canvasRef} width={props.width} height={props.height} />
    </div>;
}
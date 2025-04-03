import { useRef, useEffect, useState, useCallback } from 'react';
import { skinVS, fs } from './Shader';
import { loadGLTF } from './gltfLoader';
import { createProgram, createShader } from './WebglHelper';
import { perspective, quaternionRotation, toQuaternion, translation } from './Modeling';
import { normalize } from './Matrix';
import { CNode } from './Object';
import { Slider } from '@mui/material';

export function Canvas(props) {
    const canvasRef = useRef(null);
    const glRef = useRef(null);
    const proRef = useRef(null);
    const [scene, setScence] = useState(null);
    const [mvmt, setMvmt] = useState(null);
    // test camera

    const render = useCallback(() => {
        console.log(mvmt)
        if (scene !== null) {
            
            const gl = glRef.current;
            const program = proRef.current;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.enable(gl.DEPTH_TEST);
            // gl.enable(gl.CULL_FACE);
            gl.clearColor(.1, .1, .1, 1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.useProgram(program);

            const cam = scene['Camera'];
            cam.applyMvmt(mvmt['Camera']);
            console.log(cam.getViewMatrix());
            scene['ToyCar'].applyMvmt(mvmt['ToyCar']);
            scene['ToyCar'].render(gl, program, cam.projectionMatrix, cam.getViewMatrix(), normalize([-1, 3, 5]));
            // scene['Glass'].render(gl, program, cam.projectionMatrix, cam.getViewMatrix(), normalize([-1, 3, 5]));
        }
    }, [scene, mvmt]);

    const loadScene = async () => {
        const gl = glRef.current;
        const program = proRef.current;
        var {nodes, cams} = await loadGLTF(gl,program, "/ToyCar.gltf");
        console.log(nodes)
        console.log(cams)
        var mt = await loadGLTF(gl, program, "/scene.gltf");
        console.log(mt)
        
        var cam = new CNode();
        cam.pos = [0, 1, 10];
        cam.dir = [0, 0, 0];
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        cam.projectionMatrix = perspective(0.9, 0.001, 2, aspect);
        nodes['Camera'] = cam;
        setScence(nodes);
        setMvmt({})
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
                  a_TEXCOORD_0: 2,
                },
              };
            proRef.current = createProgram(gl, vertexShader, fragmentShader, programOptions);
            loadScene();
        }
    }, []);

    useEffect(() => {
        if (mvmt !== null) {
            render();
            setMvmt(null);
        }
    }, [mvmt, render]);

    const handleKeydownEvent = useCallback((e) => {
        switch (e.key) {
            case 'a':
                setMvmt({
                    'Camera': {
                        translate: [-0.001, 0, 0]
                    }
                })
                break;
            case 'd':
                setMvmt({
                    'Camera': {
                        translate: [0.001, 0, 0]
                    }
                })
                break;
            case 'w':
                setMvmt({
                    'Camera': {
                        translate: [0, 0.001, 0]
                    }
                })
                break;
            case 's':
                setMvmt({
                    'Camera': {
                        translate: [0, -0.001, 0]
                    }
                })
                break;
            case 'q':
                setMvmt({
                    'Camera': {
                        translate: [0, 0, 0.001]
                    }
                })
                break;
            case 'e':
                setMvmt({
                    'Camera': {
                        translate: [0, 0, -0.001]
                    }
                })
                break;
            case 'r':
                setMvmt({
                    'ToyCar': {
                        rotate: toQuaternion([0,1,0], 5)
                    }
                })
            default:
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeydownEvent);

        return () => {
            window.removeEventListener('keydown', handleKeydownEvent);
        }
    }, [handleKeydownEvent]);

    return <div>
        <canvas ref={canvasRef} width={props.width} height={props.height} />
    </div>;
}
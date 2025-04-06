import { useRef, useEffect, useState, useCallback } from 'react';
import { skinVS, fs, skyboxVs, skyboxFs, bbVs, bbFs } from './Shader';
import { loadGLTF } from './gltfLoader';
import { createProgram, createShader } from './WebglHelper';
import { nonUniformScale, ortho, perspective, quaternionRotation, toQuaternion, translation } from './Modeling';
import { mat4mult, normalize } from './Matrix';
import { Car, CNode, PNode, RNode, SkyNode } from './Object';
import { Button, Slider, Switch } from '@mui/material';
import { areIntersect } from './Physic';

export function Canvas(props) {
    const canvasRef = useRef(null);
    const glRef = useRef(null);
    const proRef = useRef(null);
    const [scene, setScence] = useState(null);
    const [mvmt, setMvmt] = useState(null);
    const [game, setGame] = useState(null);
    const [showBox, setShowBox] = useState(false);

    const applyTransform = useCallback(() => {
        if (scene !== null) {
            for (const [name, node] of Object.entries(scene)) {
                if (node instanceof RNode) {
                    node.applyMvmt(mvmt[name]);
                }
            }
            //
            var carBBs = scene['ToyCar'].getWorldBoundingBox();
            var otherBBs = Object.entries(scene)
                            .filter(([k, v]) => v instanceof PNode)
                            .filter(([k, v]) => k !== 'ToyCar')
                            .flatMap(([k, v]) => v.getWorldBoundingBox());
            for (const bb of otherBBs) {
                for (const carbb of carBBs) {
                    if (areIntersect(carbb.min, carbb.max, bb.min, bb.max)) {
                        console.log('Collided')
                    }
                }
            }
        }
    }, [scene, mvmt]);

    const render = useCallback(() => {
        if (scene !== null) {
            const gl = glRef.current;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clearColor(.1, .1, .1, 1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            const cam = scene['Camera'];
            cam.applyMvmt(mvmt['Camera']);
            const viewMatrix = cam.getViewMatrix();

            var program = proRef.current.skybox;
            gl.depthMask(false);          
            gl.disable(gl.CULL_FACE); 
            var skyView = mat4mult(viewMatrix, quaternionRotation([1, 0, 0], -90))
            scene['Skybox'].render(gl, program, cam.projectionMatrix, skyView);

            program = proRef.current.scene;
            gl.depthMask(true);
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.CULL_FACE);
            
            gl.useProgram(program);
            for (const [name, node] of Object.entries(scene)) {
                if (node instanceof RNode) {
                    node.render(gl, program, cam.projectionMatrix, viewMatrix, normalize([-1, 3, 5]));
                }
            }
            if (showBox) {
                program = proRef.current.boundingBox;
                for (const [name, node] of Object.entries(scene)) {
                    if (node instanceof PNode) {
                        node.renderBoundingBox(gl, program, cam.projectionMatrix, viewMatrix);
                    }
                }
            }
        }
    }, [scene, mvmt]);

    useEffect(() => {
        var id;
        if (game !== null && game.play) {
            id = setInterval(() => {
                requestAnimationFrame(() => {
                    
                    setMvmt({
                        'Camera': CNode.getAutoMvmt(),
                        'ToyCar': Car.getAutoMvmt()
                    });
                })
            }, 100);
        
        }
        
        return () => {
            clearInterval(id);
        }
    }, [game, scene]);

    const loadScene = async () => {
        const gl = glRef.current;
        var program = proRef.current.scene;
        
        var cam = new CNode();
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        cam.projectionMatrix = perspective(2.09, 0.001, 200, aspect);
        cam.rotate(quaternionRotation([1, 0, 0], 90))
        cam.rotate(quaternionRotation([0, 0, 1], -75))
        cam.translate(translation([0, 1.5, 4.8]))
        const allnodes = {
            'Camera': cam
        }
        var toycar = await loadGLTF(gl,program, "toycar.gltf", "/toycar2/");
        for (const name in toycar.nodes) toycar.nodes[name] = new Car(toycar.nodes[name]);
        toycar.nodes['ToyCar'].translate(translation([-4.1, 0.5, -0.2]))
        toycar.nodes['ToyCar'].rotate(quaternionRotation([0, 1, 0], 90))
        toycar.nodes['ToyCar'].rotate(quaternionRotation([0, 0, 1], -90))

        var t = await loadGLTF(gl, program, "Low_Poly_Forest.gltf", "/scene/");

        program = proRef.current.skybox;
        var sk = await loadGLTF(gl, program, "skybox.gltf", "/skybox/");
        for (const name in sk.nodes) sk.nodes[name] = new SkyNode(sk.nodes[name]);

        setScence(Object.assign({}, allnodes, t.nodes, toycar.nodes, sk.nodes))

        setGame({
            play: true
        })
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
            const skyboxShader = createShader(gl, gl.VERTEX_SHADER, skyboxVs);
            const skyboxFShader = createShader(gl, gl.FRAGMENT_SHADER, skyboxFs);
            const boundingBoxShader = createShader(gl, gl.VERTEX_SHADER, bbVs);
            const boundingBoxFShader = createShader(gl, gl.FRAGMENT_SHADER, bbFs);
            proRef.current = {
                scene: createProgram(gl, vertexShader, fragmentShader),
                skybox: createProgram(gl, skyboxShader, skyboxFShader),
                boundingBox: createProgram(gl, boundingBoxShader, boundingBoxFShader)
            }
            loadScene();
        }
    }, []);

    useEffect(() => {
        if (mvmt !== null) {
            applyTransform();
            render();
            setMvmt(null);
        }
    }, [mvmt, render]);

    const handleKeydownEvent = useCallback((e) => {
        var camMvmt = CNode.getNextMvmt(e.key);
        if (camMvmt !== undefined) {
            setMvmt({
                'Camera': camMvmt
            })
        }
        var carMvmt = Car.getNextMvmt(e.key);
        if (carMvmt !== undefined) {
            setMvmt({
                'ToyCar': carMvmt
            })
        }
        switch (e.key) {
           
            default:
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeydownEvent);

        return () => {
            window.removeEventListener('keydown', handleKeydownEvent);
        }
    }, [handleKeydownEvent]);

    const onPauseGame = () => {
        setGame({
            ...game,
            play: !game.play
        })
    }

    const onShowBox = (e, newValue) => {
        setShowBox(newValue);
    }

    return <div>
        <canvas ref={canvasRef} width={props.width} height={props.height} />
        <div>
            <Button variant="outlined" onClick={onPauseGame}>Stop</Button>
            <Switch value={showBox} onChange={onShowBox}></Switch>
        </div>
        
    </div>;
}
import { useRef, useEffect, useState, useCallback } from 'react';
import { skinVS, fs, skyboxVs, skyboxFs, bbVs, bbFs } from './Shader';
import { loadGLTF } from './gltfLoader';
import { createProgram, createShader } from './WebglHelper';
import { nonUniformScale, ortho, perspective, quaternionRotation, toQuaternion, translation } from './Modeling';
import { mat4mult, normalize, randomFloat } from './Matrix';
import { Car, CNode, PNode, RNode, SkyNode } from './Object';
import { Button, Slider, Switch } from '@mui/material';
import { areIntersect } from './Physic';
import { Prefab } from './Prefab';
import {GameMenu, StartUp} from './Menu';
import FuelBar from './FuelBar';

export function Canvas(props) {
    const canvasRef = useRef(null);
    const glRef = useRef(null);
    const proRef = useRef(null);
    const [scene, setScence] = useState(null);
    const [env, setEnv] = useState(null);
    const [mvmt, setMvmt] = useState(null);
    const [game, setGame] = useState(null);
    const [showBox, setShowBox] = useState(false);
    const [fogIntensity, setFogIntensity] = useState(1);
    const [fabStore, setFabStore] = useState({});

    const applyTransform = useCallback(() => {
        if (scene !== null) {
            for (const [name, node] of Object.entries(scene)) {
                if (node instanceof RNode) {
                    node.applyMvmt(mvmt[name]);
                }
            }
            //
            var carBBs = scene['ToyCar'].getWorldBoundingBox();
            var collidableNodes = Object.entries(scene)
                            .filter(([k, v]) => v instanceof PNode)
                            .filter(([k, v]) => k !== 'ToyCar')
            for (const [name, node] of collidableNodes) {
                for (const bb of node.getWorldBoundingBox()) {
                    for (const carbb of carBBs) {
                        if (areIntersect(carbb.min, carbb.max, bb.min, bb.max)) {
                            if(name.includes("tank")){
                                delete scene[name];
                                if(game.fuel + 5 < 100){
                                     game.fuel += 5;
                                }
                            } else {
                                window.location.reload();
                            }
                        }
                    }
                }
            }
        }
    }, [scene, mvmt]);

    const render = useCallback(() => {
        if (scene !== null) {
            const gl = glRef.current;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clearColor(...env.fog.color);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            const cam = scene['Camera'];
            cam.applyMvmt(mvmt['Camera']);
            const viewMatrix = cam.getViewMatrix();

            var program = proRef.current.skybox;
            gl.depthMask(false);          
            gl.disable(gl.CULL_FACE); 
            var skyView = mat4mult(viewMatrix, quaternionRotation([1, 0, 0], -90))
            scene['Skybox'].render(gl, program, cam.projectionMatrix, skyView, env);

            program = proRef.current.scene;
            gl.depthMask(true);
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.CULL_FACE);
            
            // const carLights = scene['ToyCar'].getLights();
            // env.lights[1] = carLights[0];
            gl.useProgram(program);
            for (const [name, node] of Object.entries(scene)) {
                if (node instanceof RNode) {
                    node.render(gl, program, cam.projectionMatrix, viewMatrix, env);
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
    }, [scene, mvmt, env]);

    useEffect(() => {
        var id, genId, fuelId, dayId;
        if (game !== null && game.play) {
            id = setInterval(() => {
                requestAnimationFrame(() => {
                    
                    setMvmt({
                        'Camera': CNode.getAutoMvmt(),
                        'ToyCar': scene['ToyCar'].getAutoMvmt()
                    });
                })
            }, 100);
            genId = setInterval(() => {
                const proto = fabStore['tank'].getPrefabInstance();
                const fuel = new PNode(proto.proto);
                fuel.translate(translation([randomFloat(-3, 3), randomFloat(-3.5, -4.5), randomFloat(0.8, 1.5)]))
                if (fuel) {
                    scene[proto.name] = fuel;
                }
            }, 5000);
            fuelId = setInterval(() => {
                game.fuel -= 1;
                if (game.fuel < 1) {
                    window.location.reload();
                }
            }, 1000);
            dayId = setInterval(() => {
                game.time++;
                if (game.time > 24) game.time = 0;
                if (game.time < 3) {
                    onFogIntensity(0);
                } else if (game.time <6) {
                    onFogIntensity(0.5);
                } else if (game.time > 21) {
                    onFogIntensity(-0.2);
                } else if (game.time > 18) {
                    onFogIntensity(-0.5);
                }
            }, 2000);
        }
        
        return () => {
            clearInterval(id);
            clearInterval(genId);
            clearInterval(fuelId);
            clearInterval(dayId);
        }
    }, [game, scene, fabStore, fogIntensity]);

    const loadEnv = () => {
        setEnv({
            fog: {
                color: [0.4, 0.4, 0.4, 1],
                near: 1,
                far: 1.5
            },
            lights: [
                {
                    position: [0, 0, 0, 1],
                    direction: [0, 0, -1],
                    color: [1, 1, 1, 1],
                    cutOff: 0,
                    outerCutOff: 0,
                    ambient: [0.5, 0.5, 0.5],
                    specular: [1, 1, 1],
                    diffuse: [1, 1, 1]
                }
            ]
        })
    }

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

        var fuel = await loadGLTF(gl, program, "fuel.gltf", "/fuel/");
        fuel.nodes['tank'].scale(nonUniformScale([0.5, 0.5, 0.5]))
        fabStore['tank'] = new Prefab('tank', fuel.nodes['tank'])

        var t = await loadGLTF(gl, program, "Low_Poly_Forest.gltf", "/scene/");

        program = proRef.current.skybox;
        var sk = await loadGLTF(gl, program, "skybox.gltf", "/skybox/");
        for (const name in sk.nodes) sk.nodes[name] = new SkyNode(sk.nodes[name]);

        setScence(Object.assign({}, allnodes, t.nodes, toycar.nodes, sk.nodes))

        setGame({
            play: false,
            fuel: 100,
            time: 8
        })

        setMvmt({})
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
            loadEnv();
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

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      
        // Tell WebGL the new viewport size
        const gl = glRef.current;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }, [])
      

    useEffect(()=> {
        window.addEventListener("resize", resizeCanvas);   
    }, [resizeCanvas])

    const onPauseGame = () => {
        setGame({
            ...game,
            play: !game.play
        })
    }

    const onShowBox = (newValue) => {
        setShowBox(newValue);
    }

    const onFogIntensity = (newValue) => {
        setFogIntensity(newValue);
        setEnv({
            ...env,
            fog: {
                ...env.fog,
                near: newValue
            }
        })
    }

    const onStartGame = ()=> {
        setGame({
            ...game,
            play: true
        })
    }

    return <div>
        <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />
        <div>
            <GameMenu onPause={onPauseGame} onFogChange={onFogIntensity} onToggleBox={onShowBox} fogValue={fogIntensity} gameTime={game?game.time:0}/>
            <FuelBar fuel={game? game.fuel:0}/>
            <StartUp onStart={onStartGame}/>
        </div>
        
    </div>;
}
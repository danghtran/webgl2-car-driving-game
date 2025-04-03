import { im, inverse, mat4mult, multmat4l } from "./Matrix";
import { fromQuaternion, nonUniformScale, perspective, translation } from "./Modeling";
import { createDefaultTexture } from "./WebglHelper";

class RNode {
  constructor() {
    this.worldMatrix = im();
    this.primitives = [];
  }
  addPrimitive(vao, numElements, material) {
    this.primitives.push({
      vao: vao,
      numElements: numElements,
      material: material
    })
  }
  updatePos(trans, rot, scale) {
    this.worldMatrix = multmat4l([trans, rot, scale])
  }
  render(gl, program, projection, view, light) {
    gl.useProgram(program);
    for (const primitive of this.primitives) {
      gl.bindVertexArray(primitive.vao);
      var uProj = gl.getUniformLocation(program, "u_projection");
      gl.uniformMatrix4fv(uProj, false, projection);
      var uView = gl.getUniformLocation(program, "u_view");
      gl.uniformMatrix4fv(uView, false, view);
      var uWorld = gl.getUniformLocation(program, "u_world");
      gl.uniformMatrix4fv(uWorld, false, this.worldMatrix);
      var uLight = gl.getUniformLocation(program, "u_lightDirection");
      gl.uniform3fv(uLight, light);
      const ambientColor = [0.2, 0.2, 0.2]; // Soft white ambient light
      const uAmbientColor = gl.getUniformLocation(program, "u_ambientColor");
      gl.uniform3fv(uAmbientColor, ambientColor);
      const uBaseColorFactor = gl.getUniformLocation(program, "u_baseColorFactor");
      gl.uniform4fv(uBaseColorFactor, primitive.material.pbr.baseColorFactor);
      const uMetallicFactor = gl.getUniformLocation(program, "u_metallicFactor");
      gl.uniform1f(uMetallicFactor, primitive.material.pbr.metallicFactor);
      const uRoughnessFactor = gl.getUniformLocation(program, "u_roughnessFactor");
      gl.uniform1f(uRoughnessFactor, primitive.material.pbr.roughnessFactor);
      const uEmissiveFactor = gl.getUniformLocation(program, "u_emissiveFactor");
      gl.uniform3fv(uEmissiveFactor, primitive.material.emissiveFactor);
      var uBaseColorTexture = gl.getUniformLocation(program, "u_baseColorTexture");
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, primitive.material.pbr["baseColorTexture"]);
      gl.uniform1i(uBaseColorTexture, 0);
      var uOMRTexture = gl.getUniformLocation(program, "u_omrTexture");
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, primitive.material.pbr["metallicRoughnessTexture"]);
      gl.uniform1i(uOMRTexture, 1);
      var uEmissiveTexture = gl.getUniformLocation(program, "u_emissiveTexture");
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, primitive.material["emissiveTexture"]);
      gl.uniform1i(uEmissiveTexture, 2);
      var uNormalTexture = gl.getUniformLocation(program, "u_normalTexture");
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, primitive.material["normalTexture"]);
      gl.uniform1i(uNormalTexture, 3);
      gl.drawElements(gl.TRIANGLES, primitive.numElements, gl.UNSIGNED_SHORT, 0);
    }
  }
}

class CNode {
  constructor() {
    this.projectionMatrix = im();
    this.transMat = im();
    this.rotMat = im();
    this.scaleMat = im();
  }
  rotate(rot) {
    this.rotMat = mat4mult(rot, this.rotMat);
  }
  scale(scale) {
    this.scaleMat = mat4mult(scale, this.scaleMat);
  }
  translate(trans) {
    this.transMat = mat4mult(trans, this.transMat);
  }
  addView(gl, camera) {
    if (camera.type === 'perspective') {
      const pers = camera.perspective;
      const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
      this.projectionMatrix = perspective(pers.yfov, pers.znear, pers.zfar, aspect);
    }
  }
  getViewMatrix() {
    return inverse(multmat4l([this.transMat, this.rotMat, this.scaleMat]));
  }
}

const loadFile = async (url, type) => {
    const response = await fetch(url);
    if (!response.ok) {
    throw new Error(`could not load: ${url}`);
    }
    return await response[type]();
}

const loadJSON = async (url) => {
    return loadFile(url, 'json');
}

const loadBinary = async (url) => {
    return loadFile(url, 'arrayBuffer');
}

const accessorTypeToNumComponentsMap = {
    'SCALAR': 1,
    'VEC2': 2,
    'VEC3': 3,
    'VEC4': 4,
    'MAT2': 4,
    'MAT3': 9,
    'MAT4': 16,
  };

const accessorTypeToNumComponents = (type) => {
    return accessorTypeToNumComponentsMap[type];
}

const glTypeToTypedArrayMap = {
    '5120': Int8Array,    // gl.BYTE
    '5121': Uint8Array,   // gl.UNSIGNED_BYTE
    '5122': Int16Array,   // gl.SHORT
    '5123': Uint16Array,  // gl.UNSIGNED_SHORT
    '5124': Int32Array,   // gl.INT
    '5125': Uint32Array,  // gl.UNSIGNED_INT
    '5126': Float32Array, // gl.FLOAT
};

  // Given a GL type return the TypedArray needed
const glTypeToTypedArray = (type) => {
    return glTypeToTypedArrayMap[type];
}

const getAccessorAndWebGLBuffer = (gl, gltf, accessorIndex) => {
    const accessor = gltf.accessors[accessorIndex];
    const bufferView = gltf.bufferViews[accessor.bufferView];
    const buffer = gl.createBuffer();
  
    const target = bufferView.target || gl.ARRAY_BUFFER;
    const arrayBuffer = gltf.buffers[bufferView.buffer];
    const TypedArray = glTypeToTypedArray(accessor.componentType);
    const numComponents = accessorTypeToNumComponents(accessor.type);

    const data = new TypedArray(arrayBuffer, 
      bufferView.byteOffset + (accessor.byteOffset || 0), 
      accessor.count * numComponents
    );
  
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    
    return {
      type: accessor.componentType,
      numComponents: numComponents,
      numElements: data.length
    };
}

const createCNode = (gl, gltf, node) => {
  var camera = gltf.cameras[node.camera];
  var cnode = new CNode();
  cnode.addView(gl, camera);
  var trans = im();
  if (node.translation) {
    trans = translation(node.translation);
  }
  var rotation = im();

  if (node.rotation) {
    rotation = fromQuaternion(node.rotation);
  }
  var scale = im();
  if (node.scale) {
    scale = nonUniformScale(node.scale);
  }
  cnode.rotate(rotation);
  cnode.translate(trans);
  cnode.scale(scale);
  return cnode;
}

const initiateRNodeWithVaoAndMaterial = async (gl, program, gltf, node) => {
  var mesh = gltf.meshes[node.mesh];
  var rnode = new RNode();
  for (const primitive of mesh.primitives) {
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    for (const [attribName, index] of Object.entries(primitive.attributes)) {
      const {type, numComponents, numElements} = getAccessorAndWebGLBuffer(gl, gltf, index);
      var vName = `a_${attribName}`;
      var loc = gl.getAttribLocation(program, vName);
      if (type === 5123) {
        gl.vertexAttribIPointer(loc, numComponents, type, false, 0, 0);
      } else {
        gl.vertexAttribPointer(loc, numComponents, type, false, 0, 0);
      }
      gl.enableVertexAttribArray(loc);
    }

    const {type, numComponents, numElements} = getAccessorAndWebGLBuffer(gl, gltf, primitive.indices);

    var material = await handleMaterial(gl, gltf, primitive.material);
    rnode.addPrimitive(vao, numElements, material);
    gl.bindVertexArray(null);
  } 
  return rnode;
}

const createRNode = async (gl, program, gltf, node) => {
  var rnode = await initiateRNodeWithVaoAndMaterial(gl, program, gltf, node);
  var trans = im();
  if (node.translation) {
    trans = translation(node.translation);
  }
  var rotation = im();

  if (node.rotation) {
    rotation = fromQuaternion(node.rotation);
  }
  var scale = im();
  if (node.scale) {
    scale = nonUniformScale(node.scale);
    // scale = nonUniformScale([0.0002, 0.0002, 0.0002]);
  }
  rnode.updatePos(trans, rotation, scale);
  return rnode;
}

const createRNodeChild = async (gl, program, gltf, parent, node) => {
  var rnode = await initiateRNodeWithVaoAndMaterial(gl, program, gltf, node);
  rnode.worldMatrix = parent.matrix;
  return rnode;
}

const getFactorOrDefault = (factor, def) => {
  if (factor !== undefined) {
    return factor;
  }
  return def;
}

const getTextureOrDefault = async (gl, gltf, textureObj) => {
  if (textureObj) {
    return await handleTexture(gl, gltf, textureObj.index);
  }
  return createDefaultTexture(gl);
}

const handleMaterial = async (gl, gltf, materialIdx) => {
  var material = gltf.materials[materialIdx];
  var res = {};
  // base color texture
  if (material.pbrMetallicRoughness) {
    var pbrMetallicRoughness = material.pbrMetallicRoughness;
    var pbr = {};
    pbr['baseColorTexture'] = await getTextureOrDefault(gl, gltf, pbrMetallicRoughness.baseColorTexture);
    pbr['metallicRoughnessTexture'] = await getTextureOrDefault(gl, gltf, pbrMetallicRoughness.metallicRoughnessTexture);
    pbr['baseColorFactor'] = getFactorOrDefault(pbrMetallicRoughness.baseColorFactor, [1,1,1,1]);
    pbr['metallicFactor'] = getFactorOrDefault(pbrMetallicRoughness.metallicFactor, 1);
    pbr['roughnessFactor'] = getFactorOrDefault(pbrMetallicRoughness.roughnessFactor, 1);
    res.pbr = pbr;
  }
  res['normalTexture'] = await getTextureOrDefault(gl, gltf, material.normalTexture);
  res['emissiveTexture'] = await getTextureOrDefault(gl, gltf, material.emissiveTexture);
  res['emissiveFactor'] = getFactorOrDefault(material.emissiveFactor, [0, 0, 0]);
  return res;
}

const setTextureParam = (gl, paramEnum, paramVal) => {
  if (paramVal !== undefined) {
    gl.texParameteri(gl.TEXTURE_2D, paramEnum, paramVal);
  }
}

const handleTexture = async (gl, gltf, textureId) => {
  var textureSrc = gltf.textures[textureId];
  var imageSrc = gltf.images[textureSrc.source];
  var sampler = gltf.samplers[textureSrc.sampler];
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  setTextureParam(gl, gl.TEXTURE_MIN_FILTER, sampler.minFilter);
  setTextureParam(gl, gl.TEXTURE_MAG_FILTER, sampler.magFilter);
  setTextureParam(gl, gl.TEXTURE_WRAP_S, sampler.wrapS);
  setTextureParam(gl, gl.TEXTURE_WRAP_T, sampler.wrapT);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

  const image = await new Promise((res,rej)=> {
    var img = new Image();
    img.src = imageSrc.uri;
    img.onload = () => res(img);
  })
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  return texture;
}

const processNodes = async (gl, program, gltf, res, nodes, parent) => {
  for (const nodeIdx of nodes) {
    var node = gltf.nodes[nodeIdx];
    if (node.mesh !== undefined && node.name !== 'Fabric') {
      if (parent !== undefined) {
        res.rnodes[node.name] = await createRNodeChild(gl, program, gltf, parent, node);
      } else {
        res.rnodes[node.name] = await createRNode(gl, program, gltf, node);
      }
    } else if (node.camera !== undefined) {
      res.cams.push(createCNode(gl, gltf, node))
    } else if (node.children) {
      if (parent !== undefined) {
        node.matrix = parent.matrix;
      }
      await processNodes(gl, program, gltf, res, node.children, node);
    }
  }
}

const loadGLTF = async (gl, program, url) => {
    const gltf = await loadJSON(url);
    
    // load all the referenced files relative to the gltf file
    // const baseURL = new URL(url, location.href);
    gltf.buffers = await Promise.all(gltf.buffers.map((buffer) => {
      return loadBinary(buffer.uri);
    }));

    console.log(gltf)
    var res = {
      rnodes: {},
      cams: []
    }
    // // setup meshes
    var scene = gltf.scenes[gltf.scene];
    await processNodes(gl, program, gltf, res, scene.nodes);

    return {
      nodes: res.rnodes,
      cams: res.cams
    };
}

export {
    loadGLTF
}
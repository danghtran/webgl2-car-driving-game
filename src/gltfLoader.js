import { im } from "./Matrix";
import { fromQuaternion, nonUniformScale, translation } from "./Modeling";
import { createDefaultTexture } from "./WebglHelper";
import { CNode, RNode } from "./Object";

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
  if (node.translation) {
    cnode.translate(translation(node.translation));
  }
  if (node.rotation) {
    cnode.rotate(fromQuaternion(node.rotation));
  }
  if (node.scale) {
    cnode.scale(nonUniformScale(node.scale));
  }
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
  if (node.translation) {
    rnode.translate(translation(node.translation));
  }
  if (node.rotation) {
    rnode.rotate(fromQuaternion(node.rotation));
  }
  if (node.scale) {
    rnode.scale(nonUniformScale(node.scale));
    // scale = nonUniformScale([0.0002, 0.0002, 0.0002]);
  }
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
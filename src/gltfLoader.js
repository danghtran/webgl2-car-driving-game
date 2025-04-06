import { im, mat4mult } from "./Matrix";
import { fromQuaternion, nonUniformScale, translation } from "./Modeling";
import { createDefaultTexture } from "./WebglHelper";
import { CNode, PNode, RNode } from "./Object";
import { calculateBoundingBox } from "./Physic";

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

const getAccessorAndWebGLBuffer = (gl, gltf, accessorIndex, includeBB) => {
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
    // console.log(accessorIndex)
    // console.log(data);
    var boundingBox;
    if (includeBB) {
      boundingBox = calculateBoundingBox(data);
    }
  
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    
    return {
      type: accessor.componentType,
      numComponents: numComponents,
      numElements: data.length,
      boundingBox: boundingBox
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
  var rnode =  mesh.physic? new PNode() : new RNode();
  for (const primitive of mesh.primitives) {
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var boundingBox;
    for (const [attribName, index] of Object.entries(primitive.attributes)) {
      const includeBB = mesh.physic && attribName === 'POSITION';
      const attribData = getAccessorAndWebGLBuffer(gl, gltf, index, includeBB);
      if (!boundingBox) {
        boundingBox = attribData.boundingBox;
        if (node.name === 'ToyCar') console.log(boundingBox)
      }
      var vName = `a_${attribName}`;
      var loc = gl.getAttribLocation(program, vName);
      // console.log(vName);
      // console.log(loc);
      if (attribData.type === 5123) {
        gl.vertexAttribIPointer(loc, attribData.numComponents, attribData.type, false, 0, 0);
      } else {
        gl.vertexAttribPointer(loc, attribData.numComponents, attribData.type, false, 0, 0);
      }
      gl.enableVertexAttribArray(loc);
    }

    const idxData = getAccessorAndWebGLBuffer(gl, gltf, primitive.indices);

    var material = await handleMaterial(gl, gltf, primitive.material);
    rnode.addPrimitive({
      vao: vao, 
      numElements: idxData.numElements, 
      material: material, 
      indexType: idxData.type, 
      boundingBox: boundingBox
    });
    gl.bindVertexArray(null);
  } 
  return rnode;
}

const createRNode = async (gl, program, gltf, node) => {
  var rnode = await initiateRNodeWithVaoAndMaterial(gl, program, gltf, node);
  if (node.rotMat) {
    rnode.rotate(node.rotMat);
  }
  if (node.scaleMat) {
    rnode.scale(node.scaleMat);
  }
  if (node.transMat) {
    rnode.translate(node.transMat);
  }
  if (node.translation) {
    rnode.translate(translation(node.translation));
  }
  if (node.rotation) {
    rnode.rotate(fromQuaternion(node.rotation));
  }
  if (node.scale) {
    rnode.scale(nonUniformScale(node.scale));
  }
  if (node.matrix) {
    rnode.parentMat = node.matrix;
  }
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
  const texture = gl.createTexture();

  const image = await new Promise((res,rej)=> {
    var img = new Image();
    img.src = gltf.prefix + imageSrc.uri;
    img.onload = () => res(img);
  })
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  if (textureSrc.sampler !== undefined) {
    var sampler = gltf.samplers[textureSrc.sampler];
    setTextureParam(gl, gl.TEXTURE_MIN_FILTER, sampler.minFilter);
    setTextureParam(gl, gl.TEXTURE_MAG_FILTER, sampler.magFilter);
    setTextureParam(gl, gl.TEXTURE_WRAP_S, sampler.wrapS);
    setTextureParam(gl, gl.TEXTURE_WRAP_T, sampler.wrapT);
  }
  
  gl.generateMipmap(gl.TEXTURE_2D);
  return texture;
}

const processNodes = async (gl, program, gltf, res, nodes, parent) => {
  for (const nodeIdx of nodes) {
    var node = gltf.nodes[nodeIdx];
    if (parent) {
      // inherit transformation
      if (parent.matrix) {
        node.matrix = mat4mult(parent.matrix, (node.matrix || im()));
      }
      if (parent.rotMat) {
        node.rotMat = parent.rotMat;
      }
      if (parent.rotation) {
        node.rotMat = mat4mult((node.rotMat || im()), fromQuaternion(parent.rotation));
      }
      if (parent.scaleMat) {
        node.scaleMat = parent.scaleMat;
      }
      if (parent.scale) {
        node.scaleMat = mat4mult((node.scaleMat || im()), nonUniformScale(parent.scale));
      }
      if (parent.transMat) {
        node.transMat = parent.transMat;
      }
      if (parent.translation) {
        node.transMat = mat4mult((node.transMat || im()), translation(parent.translation));
      }
    }
    if (node.mesh !== undefined && node.name !== 'Fabric' && node.name !== 'Glass') {
      res.rnodes[node.name] = await createRNode(gl, program, gltf, node);
    } else if (node.camera !== undefined) {
      res.cams.push(createCNode(gl, gltf, node))
    } else if (node.children) {
      await processNodes(gl, program, gltf, res, node.children, node);
    }
  }
}

const loadGLTF = async (gl, program, url, prefix) => {
    const gltf = await loadJSON(prefix + url);
    gltf.prefix = prefix;
    // load all the referenced files relative to the gltf file
    // const baseURL = new URL(url, location.href);
    gltf.buffers = await Promise.all(gltf.buffers.map((buffer) => {
      return loadBinary(prefix + buffer.uri);
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
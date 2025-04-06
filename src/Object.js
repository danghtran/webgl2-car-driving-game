import { im, inverse, mat4mult, mat4multp, multmat4l } from "./Matrix";
import { fromQuaternion, nonUniformScale, perspective, quaternionRotation, toQuaternion, translation } from "./Modeling";
import { getBoundingBoxVertices } from "./Physic";

class INode {
    constructor(other) {
        if (other) {
            this.transMat = other.transMat;
            this.rotMat = other.rotMat;
            this.scaleMat = other.scaleMat;
        } else {
            this.transMat = im();
            this.rotMat = im();
            this.scaleMat = im();
        }
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
    applyMvmt(mvmt) {
        if (mvmt === undefined) return;
        if (mvmt.translate) {
            this.translate(translation(mvmt.translate));
        }
        if (mvmt.rotate) {
            this.rotate(fromQuaternion(mvmt.rotate));
        }
        if (mvmt.scale) {
            this.scale(nonUniformScale(mvmt.scale));
        }
    }
}

export class RNode extends INode {
    constructor(other) {
        if (other) {
            super(other);
            this.primitives = other.primitives;
            this.parentMat = other.parentMat;
        } else {
            super();
            this.primitives = [];
            this.parentMat = im();
        }
    }

    addPrimitive(primitive) {
        this.primitives.push(primitive);
    }

    getWorldMatrix() {
        return multmat4l([this.parentMat, this.transMat, this.rotMat, this.scaleMat]);
    }

    render(gl, program, projection, view, env) {
      gl.useProgram(program);
      for (const primitive of this.primitives) {
        gl.bindVertexArray(primitive.vao);
        var uProj = gl.getUniformLocation(program, "u_projection");
        gl.uniformMatrix4fv(uProj, false, projection);
        var uView = gl.getUniformLocation(program, "u_view");
        gl.uniformMatrix4fv(uView, false, view);
        var uWorld = gl.getUniformLocation(program, "u_world");
        gl.uniformMatrix4fv(uWorld, false, this.getWorldMatrix());
        var uLight = gl.getUniformLocation(program, "u_lightDirection");
        gl.uniform3fv(uLight, env.light);
        const ambientColor = [0.5, 0.5, 0.5];
        const uAmbientColor = gl.getUniformLocation(program, "u_ambientColor");
        gl.uniform3fv(uAmbientColor, ambientColor);
        const uFogColor = gl.getUniformLocation(program, "u_fogColor");
        gl.uniform4fv(uFogColor, env.fog.color);
        const uFogNear = gl.getUniformLocation(program, "u_fogNear");
        gl.uniform1f(uFogNear, env.fog.near);
        const uFogFar = gl.getUniformLocation(program, "u_fogFar");
        gl.uniform1f(uFogFar, env.fog.far);
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
        gl.drawElements(gl.TRIANGLES, primitive.numElements, primitive.indexType, 0);
        gl.bindVertexArray(null);
      }
    }
}

// Nodes with physical collision
export class PNode extends RNode {
    constructor(rnode) {
        super(rnode);
    }

    getWorldBoundingBoxVertices(bbVertices, worldModel) {
        var newbb = [];
        for (let i = 0; i < bbVertices.length; i += 3) {
            var worldCorner = mat4multp(worldModel, [bbVertices[i], bbVertices[i+1], bbVertices[i+2], 1]);
            newbb[i] = worldCorner[0];
            newbb[i+1] = worldCorner[1];
            newbb[i+2] = worldCorner[2];
        }
        return newbb;
    }

    getWorldBoundingBox() {
        var bbs = [];
        const worldModel = this.getWorldMatrix();
        for (const primitive of this.primitives) {
            const bb = primitive.boundingBox;
            bbs.push({
                min: mat4multp(worldModel, [bb.min[0], bb.min[1], bb.min[2], 1]),
                max: mat4multp(worldModel, [bb.max[0], bb.max[1], bb.max[2], 1])
            });
        }
        return bbs;
    }

    renderBoundingBox(gl, program, projection, view) {
        gl.useProgram(program);
        const worldMatrix = this.getWorldMatrix();
        for (const primitive of this.primitives) {
            const buffer = gl.createBuffer();
            const bbVert = getBoundingBoxVertices(primitive.boundingBox.min, primitive.boundingBox.max);
            const vertices = this.getWorldBoundingBoxVertices(bbVert, worldMatrix);
            const verticesArr = new Float32Array(vertices);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, verticesArr, gl.STATIC_DRAW);
            var loc = gl.getAttribLocation(program, "a_POSITION");
            gl.vertexAttribPointer(loc, 3, 5126, false, 0, 0);
            gl.enableVertexAttribArray(loc);

            const idxBuffer = gl.createBuffer();
            const idx = new Uint8Array([
                0, 1,  1, 3,  3, 2,  2, 0, 
                4, 5,  5, 7,  7, 6,  6, 4,
                0, 4,  1, 5,  2, 6,  3, 7
            ]);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

            var uProj = gl.getUniformLocation(program, "u_projection");
            gl.uniformMatrix4fv(uProj, false, projection);
            var uView = gl.getUniformLocation(program, "u_view");
            gl.uniformMatrix4fv(uView, false, view);

            gl.drawElements(gl.LINES, idx.length, gl.UNSIGNED_BYTE, 0);
        }
    }

}

export class Car extends PNode { //INode
    constructor(pnode) {
        super(pnode);
        this.currentZDegree = 0;
        this.pivotRotMat = im();
    }

    static mvmtSet = {
        "w": {
            rotate: {
                axis: [1,0,0], 
                degree: -5
            }
        },
        "a": {
            rotate: {
                axis: [0, 0, 1],
                degree: 1
            },
            translate: [0, 0.1, 0]
        },
        "d": {
            rotate: {
                axis: [0, 0, 1],
                degree: 1
            },
            translate: [0, -0.1, 0]
        },
        "s": {
            rotate: {
                axis: [1,0,0], 
                degree: 5
            }
        }
    }

    static getNextMvmt(key) {
        return this.mvmtSet[key];
    }

    applyMvmt(mvmt) {
        if (mvmt === undefined) return;
        if (mvmt.translate) {
            this.translate(translation(mvmt.translate));
        }
        if (mvmt.rotate) {
            if (mvmt.rotate.pivot) {
                this.rotatePivot(quaternionRotation(mvmt.rotate.axis, mvmt.rotate.degree));
            } else {
                if (mvmt.rotate.axis[0] === 1 && 
                    this.currentZDegree + mvmt.rotate.degree < 45 &&
                    this.currentZDegree + mvmt.rotate.degree > -45
                ) {
                    this.currentZDegree += mvmt.rotate.degree
                    this.rotate(quaternionRotation(mvmt.rotate.axis, mvmt.rotate.degree))
                }
            }
        }
        if (mvmt.scale) {
            this.scale(nonUniformScale(mvmt.scale));
        }
        //this.updateBoundingBox();
    }

    rotatePivot(rot) {
        this.pivotRotMat = mat4mult(rot, this.pivotRotMat);
    }

    getWorldMatrix() {
        return multmat4l([this.parentMat, this.pivotRotMat, this.transMat, this.rotMat, this.scaleMat]);
    }

    static getAutoMvmt() {
        return {
            rotate: {
                pivot: true,
                axis: [0, 0, 1],
                degree: 1
            }
        }
    }
}
  
export class CNode extends INode {
    constructor() {
        super();
        this.projectionMatrix = im();
    }

    static mvmtSet = {
        "q": {translate: [0, 0, 0.1]},
        "e": {translate: [0, 0, -0.1]},
        "z": {rotate: toQuaternion([0, 1, 0], 5)},
        "x": {rotate: toQuaternion([1, 0, 0], 5)},
        "c": {rotate: toQuaternion([0, 0, 1], -5)},
    }

    addView(gl, camera) {
        if (camera.type === 'perspective') {
        const pers = camera.perspective;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        this.projectionMatrix = perspective(pers.yfov, pers.znear, pers.zfar, aspect);
        }
    }
    getViewMatrix() {
        return inverse(multmat4l([this.rotMat, this.transMat, this.scaleMat]));
    }
    static getNextMvmt(key) {
        return this.mvmtSet[key];
    }
    static getAutoMvmt() {
        return {
            rotate: toQuaternion([0, 0, 1], 1)
        }
    }
}

export class SkyNode extends INode {
    constructor(rnode) {
        super();
        this.primitives = rnode.primitives;
    }

    render(gl, program, projection, view, env) {
        gl.useProgram(program);
        for (const primitive of this.primitives) {
          gl.bindVertexArray(primitive.vao);
          var uProj = gl.getUniformLocation(program, "u_projection");
          gl.uniformMatrix4fv(uProj, false, projection);
          var uView = gl.getUniformLocation(program, "u_view");
          gl.uniformMatrix4fv(uView, false, view);
          const uFogColor = gl.getUniformLocation(program, "u_fogColor");
          gl.uniform4fv(uFogColor, env.fog.color);
          const uFogNear = gl.getUniformLocation(program, "u_fogNear");
          gl.uniform1f(uFogNear, env.fog.near);
          const uFogFar = gl.getUniformLocation(program, "u_fogFar");
          gl.uniform1f(uFogFar, env.fog.far);
          var uEmissiveTexture = gl.getUniformLocation(program, "u_emissiveTexture");
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, primitive.material["emissiveTexture"]);
          gl.uniform1i(uEmissiveTexture, 0);
          gl.drawElements(gl.TRIANGLES, primitive.numElements, primitive.indexType, 0);
        }
    }
}
  
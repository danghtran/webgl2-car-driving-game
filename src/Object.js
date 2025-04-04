import { im, inverse, mat4mult, multmat4l } from "./Matrix";
import { fromQuaternion, nonUniformScale, perspective, quaternionRotation, toQuaternion, translation } from "./Modeling";

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

    addPrimitive(vao, numElements, material, indexType) {
        this.primitives.push({
            vao: vao,
            numElements: numElements,
            material: material,
            indexType: indexType
        })
    }

    getWorldMatrix() {
        return multmat4l([this.parentMat, this.transMat, this.rotMat, this.scaleMat]);
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
        gl.uniformMatrix4fv(uWorld, false, this.getWorldMatrix());
        var uLight = gl.getUniformLocation(program, "u_lightDirection");
        gl.uniform3fv(uLight, light);
        const ambientColor = [0.5, 0.5, 0.5]; // Soft white ambient light
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
        gl.drawElements(gl.TRIANGLES, primitive.numElements, primitive.indexType, 0);
      }
    }
}

export class Car extends RNode{ //INode
    constructor(rnode) {
        super(rnode);
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

    render(gl, program, projection, view) {
        gl.useProgram(program);
        for (const primitive of this.primitives) {
          gl.bindVertexArray(primitive.vao);
          var uProj = gl.getUniformLocation(program, "u_projection");
          gl.uniformMatrix4fv(uProj, false, projection);
          var uView = gl.getUniformLocation(program, "u_view");
          gl.uniformMatrix4fv(uView, false, view);
          var uEmissiveTexture = gl.getUniformLocation(program, "u_emissiveTexture");
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, primitive.material["emissiveTexture"]);
          gl.uniform1i(uEmissiveTexture, 0);
          gl.drawElements(gl.TRIANGLES, primitive.numElements, primitive.indexType, 0);
        }
    }
}
  
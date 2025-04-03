import { im, inverse, mat4mult, multmat4l } from "./Matrix";
import { fromQuaternion, nonUniformScale, perspective, quaternionRotation, translation } from "./Modeling";

class INode {
    constructor() {
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
    constructor() {
      super();
      this.primitives = [];
    }
    addPrimitive(vao, numElements, material) {
      this.primitives.push({
        vao: vao,
        numElements: numElements,
        material: material
      })
    }

    getWorldMatrix() {
        return multmat4l([this.transMat, this.rotMat, this.scaleMat]);
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
        const ambientColor = [1, 1, 1]; // Soft white ambient light
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
  
export class CNode extends INode {
    constructor() {
        super();
        this.projectionMatrix = im();
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
  
import {applyOp, cross, dot, inverse, length, mat4multn, normalize} from "./Matrix";

const radians = (degree) => {
    return degree * (Math.PI/180);
}

const quaternionRotation = (v, degree) => {
    const angle = radians(degree/2);
    const re = Math.cos(angle);
    const im = Math.sin(angle) * (1 / length(v));
    const q = [re, im * v[0], im * v[1], im * v[2]];
    return fromQuaternion(q); 
}

const fromQuaternion = (q) => {
    return [
        1 - 2*Math.pow(q[2], 2) - 2*Math.pow(q[3], 2), 2*q[1]*q[2] + 2*q[0]*q[3], 2*q[1]*q[3] - 2*q[0]*q[2], 0,
        2*q[1]*q[2] - 2*q[0]*q[3], 1 - 2*Math.pow(q[1], 2) - 2*Math.pow(q[3], 2), 2*q[2]*q[3] + 2*q[0]*q[1], 0,
        2*q[1]*q[3] + 2*q[0]*q[2], 2*q[2]*q[3] - 2*q[0]*q[1], 1 - 2*Math.pow(q[1], 2) - 2*Math.pow(q[2], 2), 0,
        0, 0, 0, 1
    ]; 
}

const eulerRotation = (degrees) => {
    const sa = Math.sin(radians(degrees[2])); //z
    const ca = Math.cos(radians(degrees[2]));
    const sb = Math.sin(radians(degrees[1])); //y
    const cb = Math.cos(radians(degrees[1]));
    const sg = Math.sin(radians(degrees[0])); //x
    const cg = Math.cos(radians(degrees[0]));
    
    return [
        ca * cb, sa * cb, -sb, 0,
        ca * sb * sg - sa * cg, sa * sb * sg + ca * cg, cb * sg, 0,
        ca * sb * cg + sa * sg, sa * sb * cg - ca * sg, cb * cg, 0,
        0, 0, 0, 1
    ];
}

const translation = (v) => {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        v[0], v[1], v[2], 1
    ];
}

const uniformScale = (n) => {
    return [
        n, 0, 0, 0,
        0, n, 0, 0,
        0, 0, n, 0,
        0, 0, 0, 1
    ];
}

const nonUniformScale = (s) => {
    return [
        s[0], 0, 0, 0,
        0, s[1], 0, 0,
        0, 0, s[2], 0,
        0, 0, 0, 1
    ];
}

const perspective = (fov, zNear, zFar, aspect) => {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
    const rangeInv = 1.0 / (zNear - zFar);
  
    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (zNear + zFar) * rangeInv, -1,
        0, 0, zNear * zFar * rangeInv * 2, 0
    ];
}

const ortho = (l, r, b, t, n, f) => {
    return [
        2 / (r - l), 0, 0, 0,
        0, 2 / (t - b), 0, 0,
        0, 0, 2 / (n - f), 0,
        (r + l) / (l - r), (t + b) / (b - t), (f + n) / (n - f), 1
    ];
}

const lookAt = (eye, at, up) => {
    var v = normalize(applyOp(at, eye, (ui, vi) => ui - vi));  // view direction vector
    var n = normalize(cross(v, up));       // perpendicular vector
    var u = normalize(cross(n, v));        // "new" up vector

    v = mat4multn(v, -1);

    return [
        n[0], n[1], n[2], -dot(n, eye),
        u[0], u[1], u[2], -dot(u, eye),
        v[0], v[1], v[2], -dot(v, eye),
        0, 0, 0, 1
    ];
}

function lookAt2(cameraPosition, target, up) {
    var dst = [];
    var zAxis = normalize(
        applyOp(cameraPosition, target, (u,v)=>u - v));
    var xAxis = normalize(cross(up, zAxis));
    var yAxis = normalize(cross(zAxis, xAxis));

    dst[ 0] = xAxis[0];
    dst[ 1] = xAxis[1];
    dst[ 2] = xAxis[2];
    dst[ 3] = 0;
    dst[ 4] = yAxis[0];
    dst[ 5] = yAxis[1];
    dst[ 6] = yAxis[2];
    dst[ 7] = 0;
    dst[ 8] = zAxis[0];
    dst[ 9] = zAxis[1];
    dst[10] = zAxis[2];
    dst[11] = 0;
    dst[12] = cameraPosition[0];
    dst[13] = cameraPosition[1];
    dst[14] = cameraPosition[2];
    dst[15] = 1;

    return dst;
}

export {
    radians,
    translation,
    quaternionRotation,
    perspective,
    uniformScale,
    nonUniformScale,
    eulerRotation,
    ortho,
    lookAt,
    lookAt2,
    fromQuaternion
}

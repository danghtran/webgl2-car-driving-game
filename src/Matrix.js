const length = (m) => {
    var sum = 0;
    for (var i = 0; i < m.length; i++) {
        sum += Math.pow(m[i], 2);
    }
    return Math.sqrt(sum);
}

const mat4multn = (m, n) => {
    var res = [];
    for (var i = 0; i < m.length; i++) {
        res[i] = m[i]*n;
    }
    return res;
}

const mat4multnasym = (m, n) => {
    var res = [];
    for (var i = 0; i < m.length; i++) {
        res[i] = m[i]*n[i];
    }
    return res;
}
 
const mat4multp = (m, p) => {
    return [
        m[0]*p[0] + m[4]*p[1] + m[8]*p[2] + m[12]*p[3],
        m[1]*p[0] + m[5]*p[1] + m[9]*p[2] + m[13]*p[3],
        m[2]*p[0] + m[6]*p[1] + m[10]*p[2] + m[14]*p[3],
        m[3]*p[0] + m[7]*p[1] + m[11]*p[2] + m[15]*p[3]
    ];
}

const mat4mult = (a, b, dst) => {
    var res = dst || [];
    res[0] = a[0]*b[0] + a[4]*b[1] + a[8]*b[2] + a[12]*b[3];
    res[1] = a[1]*b[0] + a[5]*b[1] + a[9]*b[2] + a[13]*b[3];
    res[2] = a[2]*b[0] + a[6]*b[1] + a[10]*b[2] + a[14]*b[3];
    res[3] = a[3]*b[0] + a[7]*b[1] + a[11]*b[2] + a[15]*b[3];
    res[4] = a[0]*b[4] + a[4]*b[5] + a[8]*b[6] + a[12]*b[7];
    res[5] = a[1]*b[4] + a[5]*b[5] + a[9]*b[6] + a[13]*b[7];
    res[6] = a[2]*b[4] + a[6]*b[5] + a[10]*b[6] + a[14]*b[7];
    res[7] = a[3]*b[4] + a[7]*b[5] + a[11]*b[6] + a[15]*b[7];
    res[8] = a[0]*b[8] + a[4]*b[9] + a[8]*b[10] + a[12]*b[11];
    res[9] = a[1]*b[8] + a[5]*b[9] + a[9]*b[10] + a[13]*b[11];
    res[10] = a[2]*b[8] + a[6]*b[9] + a[10]*b[10] + a[14]*b[11];
    res[11] = a[3]*b[8] + a[7]*b[9] + a[11]*b[10] + a[15]*b[11];
    res[12] = a[0]*b[12] + a[4]*b[13] + a[8]*b[14] + a[12]*b[15];
    res[13] = a[1]*b[12] + a[5]*b[13] + a[9]*b[14] + a[13]*b[15];
    res[14] = a[2]*b[12] + a[6]*b[13] + a[10]*b[14] + a[14]*b[15];
    res[15] = a[3]*b[12] + a[7]*b[13] + a[11]*b[14] + a[15]*b[15];
    return res;
}

const multmat4l = (ml, dst) => {
    var res = ml[0];
    for (var i = 1; i < ml.length; i++) {
        res = mat4mult(res, ml[i]);
    }
    return res;
} 

const im = () => {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
}

const normalize = (v) => {
    var res = [];
    var len = length(v);
    for (var i = 0; i < v.length; i++) {
        res[i] = v[i] / len;
    }
    return res;
}

const cross = (u, v) => {
    return [
        u[1]*v[2] - u[2]*v[1],
        u[2]*v[0] - u[0]*v[2],
        u[0]*v[1] - u[1]*v[0]
    ];
}

const dot = (u, v) => {
    var sum = 0.0;
    for (var i = 0; i < u.length; ++i) {
        sum += u[i] * v[i];
    }
    return sum;
}

const applyOp = (u, v, fn) => {
    var result = [];
    for ( var i = 0; i < u.length; ++i ) {
        result.push(fn(u[i],v[i]));
    }
    return result;
}

/**
   * creates a matrix from translation, quaternion, scale
   * @param {Number[]} translation [x, y, z] translation
   * @param {Number[]} quaternion [x, y, z, z] quaternion rotation
   * @param {Number[]} scale [x, y, z] scale
   * @return {Matrix4} dst or a new matrix if none provided
   */
const compose = (translation, quaternion, scale) => {
    const res = [];

    const x = quaternion[0];
    const y = quaternion[1];
    const z = quaternion[2];
    const w = quaternion[3];

    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;

    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;

    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    const sx = scale[0];
    const sy = scale[1];
    const sz = scale[2];

    res[0] = (1 - (yy + zz)) * sx;
    res[1] = (xy + wz) * sx;
    res[2] = (xz - wy) * sx;
    res[3] = 0;

    res[4] = (xy - wz) * sy;
    res[5] = (1 - (xx + zz)) * sy;
    res[6] = (yz + wx) * sy;
    res[7] = 0;

    res[ 8] = (xz + wy) * sz;
    res[ 9] = (yz - wx) * sz;
    res[10] = (1 - (xx + yy)) * sz;
    res[11] = 0;

    res[12] = translation[0];
    res[13] = translation[1];
    res[14] = translation[2];
    res[15] = 1;

    return res;
}

const inverse = (m) => {
    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    var tmp_0  = m22 * m33;
    var tmp_1  = m32 * m23;
    var tmp_2  = m12 * m33;
    var tmp_3  = m32 * m13;
    var tmp_4  = m12 * m23;
    var tmp_5  = m22 * m13;
    var tmp_6  = m02 * m33;
    var tmp_7  = m32 * m03;
    var tmp_8  = m02 * m23;
    var tmp_9  = m22 * m03;
    var tmp_10 = m02 * m13;
    var tmp_11 = m12 * m03;
    var tmp_12 = m20 * m31;
    var tmp_13 = m30 * m21;
    var tmp_14 = m10 * m31;
    var tmp_15 = m30 * m11;
    var tmp_16 = m10 * m21;
    var tmp_17 = m20 * m11;
    var tmp_18 = m00 * m31;
    var tmp_19 = m30 * m01;
    var tmp_20 = m00 * m21;
    var tmp_21 = m20 * m01;
    var tmp_22 = m00 * m11;
    var tmp_23 = m10 * m01;

    var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
        (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
        (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
        (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
        (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);
    var res = [];
    res[0] = d * t0;
    res[1] = d * t1;
    res[2] = d * t2;
    res[3] = d * t3;
    res[4] = d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
          (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30));
    res[5] = d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
          (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30));
    res[6] = d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
          (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30));
    res[7] = d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
          (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20));
    res[8] = d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
          (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33));
    res[9] = d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
          (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33));
    res[10] = d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
          (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33));
    res[11] = d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
          (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23));
    res[12] = d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
          (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22));
    res[13] = d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
          (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02));
    res[14] = d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
          (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12));
    res[15] = d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
          (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02));

    return res;
}

const vector = (p1, p2) => {
    var res= [];
    for (let i = 0; i<p1.length; i++) {
        res[i] = p2[i] - p1[i];
    }
    return res;
}

const randomFloat = (min, max) => {
    return Math.random() * (max - min) + min;
}

const toVec3 = (vec4) => {
    return [vec4[0], vec4[1], vec4[2]]
}


export {
    im,
    length,
    mat4multp,
    mat4mult,
    multmat4l,
    mat4multn,
    mat4multnasym,
    normalize,
    applyOp,
    cross,
    dot,
    compose,
    inverse,
    vector,
    randomFloat,
    toVec3
};
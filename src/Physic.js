const calculateBoundingBox = (data) => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
  
    for (let i = 0; i < data.length; i += 3) {
      const x = data[i];
      const y = data[i + 1];
      const z = data[i + 2];
  
      min[0] = Math.min(min[0], x);
      min[1] = Math.min(min[1], y);
      min[2] = Math.min(min[2], z);
  
      max[0] = Math.max(max[0], x);
      max[1] = Math.max(max[1], y);
      max[2] = Math.max(max[2], z);
    }

    return [
        min[0], min[1], min[2],
        max[0], min[1], min[2], 
        min[0], max[1], min[2],
        max[0], max[1], min[2], 
        min[0], min[1], max[2],
        max[0], min[1], max[2],
        min[0], max[1], max[2],
        max[0], max[1], max[2]
    ];
}

export {
    calculateBoundingBox
}
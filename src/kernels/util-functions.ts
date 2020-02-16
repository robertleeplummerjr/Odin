import { GPU, IKernelFunctionThis } from 'gpu.js';

export function addArray2(value1: [number, number], value2: [number, number]): [number, number] {
  return [
    value1[0] + value2[0],
    value1[1] + value2[1],
  ];
}

export function subtractArray2(value1: [number, number], value2: [number, number]): [number, number] {
  return [
    value1[0] - value2[0],
    value1[1] - value2[1],
  ];
}

export function addArray3(value1: [number, number, number], value2: [number, number, number]): [number, number, number] {
  return [
    value1[0] + value2[0],
    value1[1] + value2[1],
    value1[2] + value2[2],
  ];
}

export function subtractArray3(value1: [number, number, number], value2: [number, number, number]): [number, number, number] {
  return [
    value1[0] - value2[0],
    value1[1] - value2[1],
    value1[2] - value2[2],
  ];
}

export function multiplyArray3(value1: [number, number, number], value2: [number, number, number]): [number, number, number] {
  return [
    value1[0] * value2[0],
    value1[1] * value2[1],
    value1[2] * value2[2],
  ];
}

export function get2DDistance(value: number[]): number {
  return Math.sqrt(value[0] * value[0] + value[1] * value[1]); 
}

// cosTheta = a dot b / (len(a) * len(b))
export function getCosTheta(value1: number[], value2: number[], distance1: number, distance2: number): number {
  return (value1[0] * value2[0] + value1[1] * value2[1]) / (distance1 * distance2);
}

export function computeMarkerWeight(
  thread: [number, number],
  screen: [number, number],
  agent: [number, number],
  target: [number, number]
): number {
  const relativeAgent = addArray2(agent, screen);
  const relativeTarget = addArray2(target, screen);
  const agentToMarker = subtractArray2(relativeAgent, thread);
  const agentToTarget = subtractArray2(relativeAgent, relativeTarget);
  const markerDistance = get2DDistance(agentToMarker);
  const targetDistance = get2DDistance(agentToTarget);
  const cosTheta = getCosTheta(agentToMarker, agentToTarget, markerDistance, targetDistance);
  return (1 + cosTheta) / (1 + markerDistance);
}

// shouldn't need this
// const computeMarkerWeightOptions = {
//   paramTypes: { agent: 'Array(2)', target: 'Array(2)' },
//   returnType: 'Number'
// }

export function colorToIndex(channelValue: number, numParticles: number): number {
  const colorToIndex = channelValue * numParticles;
  let floor = Math.floor(colorToIndex) - colorToIndex;
  if (floor < 0) {
    floor *= -1.0;
  }
  if (floor < 1e-5) {
    return Math.floor(colorToIndex);
  }
  return Math.ceil(colorToIndex);
}

// shouldn't need this
// const colorToIndex_options = {
//   paramTypes: { channel_value: 'Number', numParticles: 'Number'},
//   returnType: 'Number'
// }

export function coneDepth(cone: number[]) {
  // cone math --> dist to center of cone
  // we have height to radius ratio
  // find height of cone at this radius
  // this is depth to be returned

  var distance = Math.sqrt(
    (this.thread.x - cone[0]) * (this.thread.x - cone[0])
    + (this.thread.y - cone[1]) * (this.thread.y - cone[1])
  );

  // for this, all cones will have height to radius ratio of h: 2, r: 1. so c = h / r = 2.
  const c = 2;
  return distance * c;
}

// shouldn't need this
// const coneDepth_options = {
//   paramTypes: { p_x: 'Number', p_y: 'Number', cone_x: 'Number', cone_y: 'Number' },
//   returnType: 'Number'
// };
// gpu.addFunction(coneDepth, coneDepth_options);

export function clampNumber(a: number, b: number, c: number): number {
  return Math.max(b, Math.min(c, a));
}
// shouldn't need this
//gpu.addFunction(clampNumber, { paramTypes: { a: 'Number', b: 'Number', c: 'Number' }, returnType: 'Number' });

export function _clamp(value: number, low: number, high: number): number {
  throw new Error('Placeholder only, should not be called');
}

export function getRay(origin: [number, number, number], target: [number, number, number], screenPos: [number, number], lensLength: number) {
  const camMat = calcLookAtMatrix(origin, target, 0.0);
  return getCameraRay(camMat, screenPos, lensLength);
}

export function getCameraRay(camMat: [number, number, number], screenPos: [number, number], lensLength: number): [number, number, number] {
  return _normalize(multiplyArray3(camMat, [screenPos[0], screenPos[1], lensLength]));
}

export function calcLookAtMatrix(origin: [number, number, number], target: [number, number, number], roll: number): [number, number, number] {
  const rr: [number, number, number] = [Math.sin(roll), Math.cos(roll), 0.0];
  const ww = _normalize(subtractArray3(target, origin));
  const uu = _normalize(_cross(ww, rr));
  const vv = _normalize(_cross(uu, ww));
  return [uu, vv, ww];
}

export function _normalize(value: [number, number, number]): [number, number, number] {
  throw new Error('Placeholder only, should not be called');
}

export function _cross(value1: [number, number, number], value2: [number, number, number]): [number, number, number] {
  throw new Error('Placeholder only, should not be called');
}

export function setup(gpu: GPU) {
  gpu.addFunction(addArray2)
    .addFunction(subtractArray2)
    .addFunction(addArray3)
    .addFunction(multiplyArray3)
    .addFunction(get2DDistance)
    .addFunction(getCosTheta)
    .addFunction(computeMarkerWeight)
    .addFunction(colorToIndex)
    .addFunction(coneDepth)
    .addNativeFunction('_normalize', `vec3 _normalize(vec3 value) {
      return normalize(value);
    }`)
    .addNativeFunction('_cross', `vec3 _cross(vec3 value) {
      return cross(value);
    }`)
    .addNativeFunction('_clamp', `float _clamp(float value, float low, float high) {
      return clamp(value, low, high);
    }`);
}
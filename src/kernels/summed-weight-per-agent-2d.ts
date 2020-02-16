import { GPU, IKernelFunctionThis } from 'gpu.js';
import { colorToIndex, clampNumber } from './util-functions';

type constants = {
  length: number;
  screenX: number;
  screenY: number;
  agentVisRad: number;
}

type This = ({
  constants: constants
} & IKernelFunctionThis);

export function summedWeightPerAgent2D(this: This, pixelWeights: [number, number][][], positions: [number, number][], voronoiRed: number[][]): [number, number] {
  // for each associated agent,
  // for each pixel - this associated with me? ok - add to my sum
  // in gpujs this cant be optimized to for each pixel add to agent sum because cant modify inputted ref values, can only do return 
  //  output for each thread (not per agent).
  // optimization - only check pixels in an associated RADIUS

  // voronoi_red: which agent is associated with which pixel
  // pixel_weights: the weighting for each pixel

  const position = positions[this.thread.x];
  const loc = [
    position[0] * this.constants.screenX,
    position[1] * this.constants.screenY
  ];

  const start = [
    clampNumber(loc[0] - this.constants.agentVisRad, 0, this.constants.screenX),
    clampNumber(loc[1] - this.constants.agentVisRad, 0, this.constants.screenX)
  ];

  const end = [
    clampNumber(loc[0] + this.constants.agentVisRad, 0, this.constants.screenY),
    clampNumber(loc[1] + this.constants.agentVisRad, 0, this.constants.screenY)
  ];

  const sum: [number, number] = [0, 0];
  for (let x = start[0]; x < end[0]; ++x) {
    for (let y = start[1]; y < end[1]; ++y) {
      let index = colorToIndex(voronoiRed[x][y], this.constants.length);
      if (index === this.thread.x) {
        const weight = pixelWeights[y][x];
        sum[0] += weight[0];
        sum[1] += weight[1];
      }
    }
  }

  return sum;
}

interface ISettings {
  NUM_PARTICLES: number;
  FLOOR_WIDTH: number;
  FLOOR_HEIGHT: number;
  AGENT_VIS_RADIUS: number;
}

export function setup(gpu: GPU, settings: ISettings) {
  const {
    NUM_PARTICLES,
    FLOOR_WIDTH,
    FLOOR_HEIGHT,
    AGENT_VIS_RADIUS,
  } = settings;
  return gpu.createKernel<typeof summedWeightPerAgent2D>(summedWeightPerAgent2D)
    .setArgumentTypes({
      pixelWeights: 'Array1D(2)',
      positions: 'Array1D(2)',
      voronoiRed: 'Array'
    })
    .setConstants<constants>({
      length: NUM_PARTICLES,
      screenX : FLOOR_WIDTH,
      screenY: FLOOR_HEIGHT,
      agentVisRad: AGENT_VIS_RADIUS
    })
    .setOutput([NUM_PARTICLES])
    .setImmutable(true)
    .setPipeline(true);
}
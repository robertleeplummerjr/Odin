import { GPU, IKernelFunctionThis } from 'gpu.js';
import { colorToIndex } from './util-functions';
// export const actualVoronoiWeightingPerPixelOld = gpu.createKernel(function(positions, voronoi_pixelWeight, agent_summedWeight, voronoi_red, colors, targets, component) {
//   // for each pixel, compute weight of pixel in relation to associated position

//   // for each pixel,
//   // what is it's associated agent
//   // what is the weighting of this pixel in relation to the agent and its target
//   // what is the total summed weighting of all those affecting pixel's agent
//   // what is mi of this pixel in relation to pixel's agent

//   const x_i = this.thread.y;
//   const y_i = this.thread.x;

//   const agent_index = colorToIndex(voronoi_red[x_i][y_i], this.constants.length);
//   // if not on a valid agent's index (ie in white buffer region) this has no weight
//   if (agent_index == this.constants.length) { return 0;}

//   const mi_x = x_i - positions[agent_index][0] * this.constants.screen_x;
//   const mi_y = y_i - positions[agent_index][1] * this.constants.screen_y;
//   const v_weight = voronoi_pixelWeight[x_i][y_i]  / agent_summedWeight[agent_index];
//   if (component == 0) {
//     return mi_x * v_weight;
//   } else if (component == 1) {
//     return mi_y * v_weight;
//   } else {
//     // invalid component option:
//     // this will throw errors in the fragment shader when passed to the render check
//     // when drawing it on canvas in debug mode
//     return -1;
//   }
// })
// .setConstants({ length: NUM_PARTICLES, screen_x : FLOOR_WIDTH, screen_y: FLOOR_HEIGHT, flt_max: FLT_MAX, agent_vis_rad: AGENT_VIS_RADIUS, pixel_rad: PIXEL_BUFFER_RAD})
// .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT]);

type constants = {
  length: number;
  screenX: number;
  screenY: number;
}

type This = ({
  constants: constants
} & IKernelFunctionThis);

export function actualVoronoiWeightingPerPixel(this: This, positions: number[][], voronoiPixelWeight: number[][], agentSummedWeight: number[], voronoiRed: number[][]): [number, number] {
  // for each pixel, compute weight of pixel in relation to associated position

  // for each pixel,
  // what is it's associated agent
  // what is the weighting of this pixel in relation to the agent and its target
  // what is the total summed weighting of all those affecting pixel's agent
  // what is mi of this pixel in relation to pixel's agent
  const agentIndex = colorToIndex(voronoiRed[this.thread.x][this.thread.y], this.constants.length);
  // if not on a valid agent's index (ie in white buffer region) this has no weight
  if (agentIndex == this.constants.length) { return [0, 0];}

  const position = positions[agentIndex];

  const mi = [
    this.thread.x - position[0] * this.constants.screenX,
    this.thread.y - position[1] * this.constants.screenY
  ];
  const vWeight = voronoiPixelWeight[this.thread.x][this.thread.y] / agentSummedWeight[agentIndex];
  return [mi[0] * vWeight, mi[1] * vWeight];
}

interface ISettings {
  NUM_PARTICLES: number;
  FLOOR_WIDTH: number;
  FLOOR_HEIGHT: number;
  AGENT_VIS_RADIUS: number;
};

export function setup(gpu: GPU, settings: ISettings) {
  const {
    NUM_PARTICLES,
    FLOOR_WIDTH,
    FLOOR_HEIGHT,
  } = settings;
  return gpu.createKernel<typeof actualVoronoiWeightingPerPixel>(actualVoronoiWeightingPerPixel)
    .setArgumentTypes({
      positions: 'Array1D(2)',
      voronoiPixelWeight: 'Array',
      agentSummedWeight: 'Array',
      voronoiRed: 'Array'
    })
    .setConstants<constants>({
      length: NUM_PARTICLES,
      screenX : FLOOR_WIDTH,
      screenY: FLOOR_HEIGHT,
    })
    .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
    .setImmutable(true)
    .setPipeline(true);
}
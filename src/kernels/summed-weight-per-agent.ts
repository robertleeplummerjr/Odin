import { GPU, IKernelFunctionThis } from 'gpu.js';
import { colorToIndex, clampNumber } from './util-functions';

// export const summedWeightPerAgentOld = gpu.createKernel(function(pixel_weights, positions, voronoi_red, colors, targets) {
//   // for each associated agent,
//   // for each pixel - this associated with me? ok - add to my sum
//   // in gpujs this cant be optimized to for each pixel add to agent sum because cant modify inputted ref values, can only do return 
//   //  output for each thread (not per agent).
//   // optimization - only check pixels in an associated RADIUS

//   // voronoi_red: which agent is associated with which pixel
//   // pixel_weights: the weighting for each pixel

//   const x_loc = positions[this.thread.x][0] * this.constants.screen_x;
//   const y_loc = positions[this.thread.x][1] * this.constants.screen_y;

//   const x_start = _clamp(x_loc - this.constants.agent_vis_rad, 0, this.constants.screen_x);
//   const x_end = _clamp(x_loc + this.constants.agent_vis_rad, 0, this.constants.screen_y);
//   const y_start = _clamp(y_loc - this.constants.agent_vis_rad, 0, this.constants.screen_x);
//   const y_end = _clamp(y_loc + this.constants.agent_vis_rad, 0, this.constants.screen_y);

//   var pixel_index = -1;
//   var sum = 0;
//   for (var i = x_start; i < x_end; ++i) {
//     for (var j = y_start; j < y_end; ++j) {
//       pixel_index = colorToIndex(voronoi_red[i][j], this.constants.length);
//       if (pixel_index == this.thread.x) {
//         sum += pixel_weights[i][j];
//       }
//     }
//   }

//   return sum;
// })
// .setConstants({ length: NUM_PARTICLES, screen_x : FLOOR_WIDTH, screen_y: FLOOR_HEIGHT, flt_max: FLT_MAX, agent_vis_rad: AGENT_VIS_RADIUS })
// .setOutput([NUM_PARTICLES]);

type constants = {
  length: number;
  screenX: number;
  screenY: number;
  agentVisRad: number;
}

type This = ({
  constants: constants
} & IKernelFunctionThis);

export function summedWeightPerAgent(this: This, pixelWeights: number[][], positions: number[][], voronoiRed: number[][]): number {
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

  let sum = 0;
  for (let x = start[0]; x < end[0]; ++x) {
    for (let y = start[1]; y < end[1]; ++y) {
      let pixel_index = colorToIndex(voronoiRed[x][y], this.constants.length);
      if (pixel_index == this.thread.x) {
        sum += pixelWeights[y][x];
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
  return gpu.createKernel<typeof summedWeightPerAgent>(summedWeightPerAgent)
    .setArgumentTypes({
      pixelWeights: 'Array',
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

import { GPU, IKernelFunctionThis }from 'gpu.js';
import {
  computeMarkerWeight,
  colorToIndex,
} from './util-functions';

// export const pixelWeightsOld = gpu.createKernel(function(positions, voronoi_red, colors, targets) {
//   // for each pixel,
//   // what is its associated agent
//   // what is the weighting of this pixel in relation to the agent and its target

//   const x_i = this.thread.y;
//   const y_i = this.thread.x;

//   const agent_index = colorToIndex(voronoi_red[x_i][y_i], this.constants.length);
//   // if not on a valid agent's index (ie in white buffer region) this has no weight
//   if (agent_index == this.constants.length) { return 0;}

//   return computeMarkerWeight(
//                   positions[agent_index][0] * this.constants.screen_x,
//   							  positions[agent_index][1] * this.constants.screen_y,
// 		  					  x_i,
// 		  					  y_i,
// 		  					  targets[agent_index][0] * this.constants.screen_x,
// 		  					  targets[agent_index][1] * this.constants.screen_y);
// })
// .setConstants({ length: NUM_PARTICLES, screen_x : FLOOR_WIDTH, screen_y: FLOOR_HEIGHT })
// .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT]);

interface constants {
  length: number;
  screen: [number, number]
}

type This = ({
  constants: constants
}) & IKernelFunctionThis;

export function pixelWeights(this: This, positions: [number, number][], voronoiRed: number[][], targets: [number, number][]): number {
  // for each pixel,
  // what is its associated agent
  // what is the weighting of this pixel in relation to the agent and its target
  const agentIndex = colorToIndex(
    voronoiRed[this.thread.x][this.thread.y],
    this.constants.length
  );

  // if not on a valid agent's index (ie in white buffer region) this has no weight
  if (agentIndex == this.constants.length) { return 0; }

  const agent = positions[agentIndex];
  const target = targets[agentIndex];
  return computeMarkerWeight([this.thread.x, this.thread.y], this.constants.screen, agent, target);
}

interface ISettings {
  NUM_PARTICLES: number;
  FLOOR_WIDTH: number;
  FLOOR_HEIGHT: number;
};

export function setup(gpu: GPU, settings: ISettings) {
  const {
    NUM_PARTICLES,
    FLOOR_WIDTH,
    FLOOR_HEIGHT
  } = settings;
  return gpu.createKernel<typeof pixelWeights>(pixelWeights)
    .setArgumentTypes({
      positions: 'Array1D(2)',
      voronoi_red: 'Array',
      targets: 'Array1D(2)'
    })
    .setConstants<constants>({
      length: NUM_PARTICLES,
      screen: [FLOOR_WIDTH, FLOOR_HEIGHT],
    })
    .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
    .setImmutable(true)
    .setPipeline(true);
}
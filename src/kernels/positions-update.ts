import { GPU, IKernelFunctionThis } from "gpu.js";
import { _clamp } from './util-functions';

// export const positionsUpdateOld = gpu.createKernel(function(old_positions, velocities_x, velocities_y) {
//   // an array of vec2s - created as 2d array is stepped through as
//   // [width][height] s.t. [this.thread.y][this.thread.x]
//   const vec2_element = this.thread.x;
//   const which_vec2 = this.thread.y;

//   // used to normalize velocity
//   const length = Math.sqrt(velocities_x[which_vec2] * velocities_x[which_vec2] + velocities_y[which_vec2] * velocities_y[which_vec2]);
//   var vel_element = velocities_x[which_vec2];
//   if (vec2_element == 1) {
//     vel_element = velocities_y[which_vec2];
//   }

//   // new p = old p + velo
//   const influence = 0.01;
//   var value = old_positions[which_vec2][vec2_element] + vel_element / length * influence;
//   return _clamp(value, 0, 1);
// })
// .setConstants({ length: NUM_PARTICLES, screen_x : FLOOR_WIDTH, screen_y: FLOOR_HEIGHT })
// .setOutput([2, NUM_PARTICLES]);

export function positionsUpdate(this: IKernelFunctionThis, oldPositions: [number, number][], velocities: [number, number][]): [number, number] {
  // used to normalize velocity
  const velocity = velocities[this.thread.x];
  const length = Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1]);
  const influence = 0.01;
  // var value = old_positions[which_vec2][vec2_element] + vel_element / length * influence;
  // return clampNumber(value, 0, 1);
  const oldPosition = oldPositions[this.thread.x];
  return [
    _clamp(oldPosition[0] + velocity[0] / length * influence, 0, 1),
    _clamp(oldPosition[1] + velocity[1] / length * influence, 0, 1)
  ];
}

interface ISettings {
  NUM_PARTICLES: number;
}

export function setup(gpu: GPU, settings: ISettings) {
  const {
    NUM_PARTICLES,
  } = settings;
  return gpu.createKernel<typeof positionsUpdate>(positionsUpdate)
  .setArgumentTypes({
    oldPositions: 'Array1D(2)',
    velocities: 'Array1D(2)'
  })
  .setOutput([NUM_PARTICLES])
  .setImmutable(true)
  .setPipeline(true);
}
import { GPU, IKernelFunctionThis } from 'gpu.js';
import { coneDepth } from './util-functions';
// export const colorByVoronoiOld = gpu.createKernel(function(positions_texture, colors_texture, targets_texture, color_index) {
//   // note: must always have at least two agents in the scene otherwise this will error.
//   var closest_max_depth = this.constants.flt_max;
//   var closest_index = -1;
//   var second_closest_max_depth = this.constants.flt_max;
//   var second_closest_index = -1;

//   // find which depths and vertices this pixel is associated with
//   var depth = 0;
//   var pos_x = 0;
//   var pos_y = 0;
//   const x_i = this.thread.y;
//   const y_i = this.thread.x;
//   for (var i = 0; i < this.constants.length; ++i) {
//     pos_x = positions_texture[i][0] * this.constants.screen_x;
//     pos_y = positions_texture[i][1] * this.constants.screen_y;

//     depth = coneDepth(x_i, y_i, pos_x, pos_y);

//     if (depth < closest_max_depth) {
//       second_closest_max_depth = closest_max_depth;
//       closest_max_depth = depth;
//       second_closest_index = closest_index;
//       closest_index = i;
//     } else if (depth < second_closest_max_depth) {
//       second_closest_max_depth = depth;
//       second_closest_index = i;
//     }
//   }

//   // color based on distances
//   var closest_x_diff = Math.abs(x_i - positions_texture[closest_index][0] * this.constants.screen_x);
//   var closest_y_diff = Math.abs(y_i - positions_texture[closest_index][1] * this.constants.screen_y);
//   var second_closest_x_diff = Math.abs(x_i - positions_texture[second_closest_index][0] * this.constants.screen_x);
//   var second_closest_y_diff = Math.abs(y_i - positions_texture[second_closest_index][1] * this.constants.screen_y);

//   var closest_dist2 = closest_x_diff * closest_x_diff + closest_y_diff * closest_y_diff;
//   var second_closest_dist2 = second_closest_x_diff * second_closest_x_diff + second_closest_y_diff * second_closest_y_diff;

//   var dist = closest_dist2 + second_closest_dist2;

//   if (Math.abs(closest_dist2 / dist - 0.5) < this.constants.pixel_rad) {
//     // for each pixel, if there are at least two different colors within a particular distance to it, color white.
//     // also if closest distance is farther than our agent checking radius, color white.
//     // so that we have a buffer distance.
//     // white bc color choice for particle is done through Math.random which ranges from [0, 1)
//     // so will never actually create white allowing it to act as a flag.
//     return 1;
//   } else {
//     // color_index - to allow for different channel outputs; however, hash function atm denotes all color channels for a pixel are the same
//     return colors_texture[closest_index][color_index];
//   }
// })
// .setConstants({ length: NUM_PARTICLES, screen_x : FLOOR_WIDTH, screen_y: FLOOR_HEIGHT, flt_max: FLT_MAX, agent_vis_rad: AGENT_VIS_RADIUS, pixel_rad: PIXEL_BUFFER_RAD})
// .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT]);

type constants = {
  length: number;
  screenX: number;
  screenY: number;
  fltMax: number;
}

type This = ({
  constants: constants
} & IKernelFunctionThis);

export function colorByVoronoi(this: This, positions: number[][], colors: [number, number, number][]): [number, number, number] {
  // note: must always have at least two agents in the scene otherwise this will error.
  let closestMaxDepth = this.constants.fltMax;
  let closestIndex = -1;
  let secondClosestMaxDepth = this.constants.fltMax;
  let secondClosestIndex = -1;

  // find which depths and vertices this pixel is associated with
  let depth = 0;
  let pos = [0, 0];
  for (let i = 0; i < this.constants.length; ++i) {
    const position = positions[i];
    pos = [
      position[0] * this.constants.screenX,
      position[1] * this.constants.screenY
    ];

    depth = coneDepth(pos);

    if (depth < closestMaxDepth) {
      secondClosestMaxDepth = closestMaxDepth;
      closestMaxDepth = depth;
      secondClosestIndex = closestIndex;
      closestIndex = i;
    } else if (depth < secondClosestMaxDepth) {
      secondClosestMaxDepth = depth;
      secondClosestIndex = i;
    }
  }

  // color based on distances
  const closestPosition = positions[closestIndex];
  const secondClosestPosition = positions[secondClosestIndex];
  const closestDiff = [
    Math.abs(this.thread.x - closestPosition[0] * this.constants.screenX),
    Math.abs(this.thread.y - closestPosition[1] * this.constants.screenY)
  ];
  const secondClosestDiff = [
    Math.abs(this.thread.x - secondClosestPosition[0] * this.constants.screenX),
    Math.abs(this.thread.y - secondClosestPosition[1] * this.constants.screenY)
  ];

  const closestDist2 = closestDiff[0] * closestDiff[0] + closestDiff[1] * closestDiff[1];
  const secondClosestDist2 = secondClosestDiff[0] * secondClosestDiff[0] + secondClosestDiff[1] * secondClosestDiff[1];

  const dist = closestDist2 + secondClosestDist2;

  if (Math.abs(closestDist2 / dist - 0.5) < this.constants.pixel_rad) {
    // for each pixel, if there are at least two different colors within a particular distance to it, color white.
    // also if closest distance is farther than our agent checking radius, color white.
    // so that we have a buffer distance.
    // white bc color choice for particle is done through Math.random which ranges from [0, 1)
    // so will never actually create white allowing it to act as a flag.
    return [1, 1, 1];
  } else {
    return colors[closestIndex];
  }
}

interface ISettings {
  NUM_PARTICLES: number;
  FLOOR_WIDTH: number;
  FLOOR_HEIGHT: number;
  FLT_MAX: number;
}

export function setup(gpu: GPU, settings: ISettings) {
  const {
    NUM_PARTICLES,
    FLOOR_WIDTH,
    FLOOR_HEIGHT,
    FLT_MAX
  } = settings;
  return gpu.createKernel<typeof colorByVoronoi>(colorByVoronoi)
    .setArgumentTypes({
      positions_texture: 'Array1D(2)',
      colors_texture: 'Array1D(3)',
      color_index: 'Integer'
    })
    .setConstants<constants>({
      length: NUM_PARTICLES,
      screenX: FLOOR_WIDTH,
      screenY: FLOOR_HEIGHT,
      fltMax: FLT_MAX,
    })
    .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
    .setImmutable(true)
    .setPipeline(true);
}
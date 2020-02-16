import { GPU, IKernelFunctionThis } from 'gpu.js';

// export const initialVec3toVec2KernelPassingOld = gpu.createKernel(function(input_array) {
//   // an array of vec2s - created as 2d array is stepped through as
//   // [width][height] s.t. [this.thread.y][this.thread.x]
//   const vec2_element = this.thread.x;
//   const which_vec2 = this.thread.y;

//   // if on y element, divide by height : divide by width
//   const div_factor = (1 - vec2_element) * this.constants.screen_x + vec2_element * this.constants.screen_y;
//   return input_array[which_vec2][vec2_element] / div_factor;
// })
// .setConstants({ screen_x: FLOOR_WIDTH, screen_y: FLOOR_HEIGHT })
// .setOutput([2, NUM_PARTICLES]);
//.setOutputToTexture(true);

type constants = {
  screenX: number;
  screenY: number;
}

type This = ({
  constants: constants
} & IKernelFunctionThis);

export function initialVec3toVec2KernelPassing(this: This, input: number[][]): [number, number] {
  const divFactor: number[] = [
    (1 - 0) * this.constants.screenX + 0 * this.constants.screenY,
    (1 - 1) * this.constants.screenX + 1 * this.constants.screenY
  ];

  const value:number[] = input[this.thread.x];
  return [
    value[0] / divFactor[0],
    value[1] / divFactor[1],
  ];
}

interface ISettings {
  FLOOR_WIDTH: number;
  FLOOR_HEIGHT: number;
  NUM_PARTICLES: number;
}

export function setup(gpu: GPU, settings: ISettings) {
  const { FLOOR_WIDTH, FLOOR_HEIGHT, NUM_PARTICLES } = settings;
  return gpu.createKernel<typeof initialVec3toVec2KernelPassing>(initialVec3toVec2KernelPassing)
    .setArgumentTypes({ input: 'Array1D(2)' })
    .setConstants({
      screenX: FLOOR_WIDTH,
      screenY: FLOOR_HEIGHT
    } as constants)
    .setOutput([NUM_PARTICLES])
    .setImmutable(true)
    .setPipeline(true);
}
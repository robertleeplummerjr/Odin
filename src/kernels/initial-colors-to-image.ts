import { GPU, IKernelFunctionThis, Texture } from 'gpu.js';

// export const initialColorsToImageOld = gpu.createKernel(function(colors) {
//   // an array of vec3s - created as 2d array is stepped through as
//   // [width][height] s.t. [this.thread.y][this.thread.x]
//   const vec3_element = this.thread.x;
//   const which_vec3 = this.thread.y;

//   return colors[which_vec3][vec3_element];
// })
// .setConstants({ screen_x: FLOOR_WIDTH, screen_y: FLOOR_HEIGHT })
// .setOutput([3, NUM_PARTICLES]);

export function initialColorsToImage(this: IKernelFunctionThis, colors: [number, number][]): [number, number, number] {
  const pixel = colors[this.thread.x];
  return [pixel[0], pixel[1], 0];
}

interface ISettings {
  NUM_PARTICLES: number;
}

export function setup(gpu: GPU, settings: ISettings) {
  const {
    NUM_PARTICLES
  } = settings;
  return gpu.createKernel<typeof initialColorsToImage>(initialColorsToImage)
  .setArgumentTypes({
    colors: 'Array1D(2)'
  })
  .setOutput([NUM_PARTICLES])
  .setPipeline(true);
}
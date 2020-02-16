import { GPU, IKernelFunctionThis } from 'gpu.js';

export function renderCheckAbs(this: IKernelFunctionThis, voronoi: [number, number][][]): void {
  const a = 10.0; // influence
  const value = voronoi[this.thread.y][this.thread.x];
  this.color(
    Math.abs(a * value[0]),
    0,
    Math.abs(a * value[1])
  );
}

interface ISettings {
  FLOOR_WIDTH: number;
  FLOOR_HEIGHT: number;
}

export function setup(gpu: GPU, settings: ISettings) {
  const {
    FLOOR_WIDTH,
    FLOOR_HEIGHT,
  } = settings;
  return gpu.createKernel<typeof renderCheckAbs>(renderCheckAbs)
    .setArgumentTypes({
      voronoi: 'Array2D(2)'
    })
    .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
    .setGraphical(true);
}
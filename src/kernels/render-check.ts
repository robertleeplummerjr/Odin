import { GPU, IKernelFunctionThis } from 'gpu.js';

export function renderCheck(this: IKernelFunctionThis, voronoi: number[][], colorIndex: number): void {
  if (colorIndex === 0) {
    this.color(voronoi[this.thread.y][this.thread.x], 0, 0);
  } else if (colorIndex === 1) {
    this.color(0, voronoi[this.thread.y][this.thread.x], 0);
  } else if (colorIndex === 2) {
    this.color(0, 0, voronoi[this.thread.y][this.thread.x]);
  } else {
    // should never reach this color index so forcing gpujs fragment shader to error
    this.color(-1, -1, -1);
  }
}

interface ISettings {
  FLOOR_WIDTH: number;
  FLOOR_HEIGHT: number;
}

export function setup(gpu: GPU, settings: ISettings) {
  const {
    FLOOR_WIDTH,
    FLOOR_HEIGHT
  } = settings;
  return gpu.createKernel<typeof renderCheck>(renderCheck)
    .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
    .setGraphical(true);
}
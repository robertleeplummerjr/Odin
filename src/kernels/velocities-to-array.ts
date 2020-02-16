import { GPU, IKernelFunctionThis } from 'gpu.js';

export function velocitiesToArray(this: IKernelFunctionThis, positions: number[][], oldPositions: number[][]): [number, number] {
  const position = positions[this.thread.x];
  const oldPosition = oldPositions[this.thread.x];
  return [position[0] - oldPosition[0], position[1] - oldPosition[1]];
}

interface ISettings {
  NUM_PARTICLES: number;
}

export function setup(gpu: GPU, settings: ISettings) {
  const { NUM_PARTICLES } = settings;
  return gpu.createKernel<typeof velocitiesToArray>(velocitiesToArray)
    .setOutput([NUM_PARTICLES])
    .setImmutable(true)
    .setPipeline(true);
}
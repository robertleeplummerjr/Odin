import { GPU, IKernelFunctionThis } from 'gpu.js';

type constants = {
  screenX: number;
  screenY: number;
}

type This = ({
  constants: constants
} & IKernelFunctionThis);

export function positionsToArray(this: This, positions: number[][]): [number, number] {
  const position = positions[this.thread.x];
  return [
    this.constants.screenX * position[0],
    this.constants.screenY * position[1]
  ];
}

interface ISettings {
  NUM_PARTICLES: number;
  FLOOR_WIDTH: number;
  FLOOR_HEIGHT: number;
}

export function setup(gpu: GPU, settings: ISettings) {
  const {
    NUM_PARTICLES,
    FLOOR_WIDTH,
    FLOOR_HEIGHT,
  } = settings;
  return gpu.createKernel<typeof positionsToArray>(positionsToArray)
    .setConstants<constants>({
      screenX: FLOOR_WIDTH,
      screenY: FLOOR_HEIGHT
    })
    .setOutput([NUM_PARTICLES])
    .setPipeline(true);
}
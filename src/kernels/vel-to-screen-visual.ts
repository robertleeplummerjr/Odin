import { GPU, IKernelFunctionThis } from 'gpu.js';

type constants = {
  length: number;
  screenX: number;
  screenY: number;
}

type This = ({
  constants: constants
} & IKernelFunctionThis);

export function velToScreenVisual(this: This, positions: number[][], vel: number[][]): void {
  let bool = 0;
  for (let i = 0; i < this.constants.length; ++i) {
    const position = positions[i];
    if (Math.abs(position[0] * this.constants.screenX - this.thread.y) < this.constants.drawRad
      && Math.abs(position[1] * this.constants.screenY - this.thread.x) < this.constants.drawRad) {
      const value = vel[i];
      this.color(value[0], 0, value[1]);
      bool = 1;
    }
  }
  if (bool == 0) {
    this.color(1, 1, 1);
  }
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
  return gpu.createKernel<typeof velToScreenVisual>(velToScreenVisual)
    .setConstants<constants>({
      length: NUM_PARTICLES,
      screenX: FLOOR_WIDTH,
      screenY: FLOOR_HEIGHT,
    })
    .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
    .setGraphical(true);
}
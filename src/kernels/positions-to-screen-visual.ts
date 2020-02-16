import { GPU, IKernelFunctionThis } from 'gpu.js';

type constants = {
  length: number;
  screenX: number;
  screenY: number;
  drawRad: number;
}

type This = ({
  constants: constants
} & IKernelFunctionThis);

export function positionsToScreenVisual(this: This, positions: number[][]): void {
  for (var i = 0; i < this.constants.length; ++i) {
    const position = positions[i];
    if (Math.abs(position[0] * this.constants.screenX - this.thread.y) < this.constants.drawRad
      && Math.abs(position[1] * this.constants.screenY - this.thread.x) < this.constants.drawRad
    ) {
      this.color(position[0], 0, position[1]);
      break;
    }
  }
}

interface ISettings {
  NUM_PARTICLES: number;
  FLOOR_WIDTH: number;
  FLOOR_HEIGHT: number;
  AGENT_DRAW_RAD: number;
}

export function setup(gpu: GPU, settings: ISettings) {
  const { 
    NUM_PARTICLES,
    FLOOR_WIDTH,
    FLOOR_HEIGHT,
    AGENT_DRAW_RAD
  } = settings;
  return gpu.createKernel<typeof positionsToScreenVisual>(positionsToScreenVisual)
    .setConstants<constants>({
      length: NUM_PARTICLES,
      screenX: FLOOR_WIDTH,
      screenY: FLOOR_HEIGHT,
      drawRad: AGENT_DRAW_RAD
    })
    .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
    .setGraphical(true);
}

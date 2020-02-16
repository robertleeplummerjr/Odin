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

export function velocityAtPositionsVisual(this: This, velocities: number[][], positions: number[][]): void {
	let red = 0;
  let green = 0;
  let blue = 0;

  const x_i = this.thread.y;
  const y_i = this.thread.x;
  for (let i = 0; i < this.constants.length; ++i) {
    const velocity = velocities[i];
    const position = positions[i];
    if (Math.abs(position[0] * this.constants.screenX - x_i) < this.constants.drawRad
        && Math.abs(position[1] * this.constants.screenY - y_i) < this.constants.drawRad) {
      green = velocity[0];
      blue = velocity[1];
    }
  }
  this.color(red, green, blue);
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
    AGENT_DRAW_RAD,
  } = settings;
  return gpu.createKernel<typeof velocityAtPositionsVisual>(velocityAtPositionsVisual)
    .setConstants<constants>({
      length: NUM_PARTICLES,
      screenX: FLOOR_WIDTH,
      screenY: FLOOR_HEIGHT,
      drawRad: AGENT_DRAW_RAD
    })
    .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
    .setGraphical(true);
}
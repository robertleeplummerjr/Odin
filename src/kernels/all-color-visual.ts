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

export function allColoringVisual(this: This, voronoiRed: number[][], voronoiGreen: [number, number][][], pos: number[][]): void {
	const x_i = this.thread.y;
  const y_i = this.thread.x;

  let red = voronoiRed[x_i][y_i];
  let greenValue = voronoiGreen[x_i][y_i];
	let green = greenValue[0];
  let blue = 0;

  for (let i = 0; i < this.constants.length; ++i) {
    const value = pos[i];
    if (Math.abs(value[0] * this.constants.screenX - x_i) < this.constants.drawRad
        && Math.abs(value[1] * this.constants.screenY - y_i) < this.constants.drawRad) {
      red = 1;
      blue = 1;
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
  return gpu.createKernel<typeof allColoringVisual>(allColoringVisual)
    .setConstants<constants>({
      length: NUM_PARTICLES,
      screenX: FLOOR_WIDTH,
      screenY: FLOOR_HEIGHT,
      drawRad: AGENT_DRAW_RAD
    })
    .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
    .setGraphical(true);
}

import { GPU, IKernelFunctionThis } from 'gpu.js';
import { colorToIndex } from './util-functions';

type constants = {
  length: number;
}

type This = ({
  constants: constants
} & IKernelFunctionThis);

export function agentIndexVisCheck(this: This, voronoiRed: number[][], colors: number[][]): void {
  const agent_index = colorToIndex(voronoiRed[this.thread.y][this.thread.x], this.constants.length);
  if (agent_index >= this.constants.length) {
    this.color(1, 0, 0);
  } else {
    this.color(colors[agent_index][0], 0, 0);
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
  return gpu.createKernel<typeof agentIndexVisCheck>(agentIndexVisCheck)
    .setConstants<constants>({
      length: NUM_PARTICLES
    })
    .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
    .setGraphical(true);
}
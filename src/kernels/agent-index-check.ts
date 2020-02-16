import { GPU, IKernelFunctionThis } from 'gpu.js';
import { colorToIndex } from './util-functions';

type constants = {
  length: number;
}

type This = ({
  constants: constants
} & IKernelFunctionThis);

export function agentIndexCheck(this: This, voronoiRed: number[][], colors: number[][]): number {
  const agent_index = colorToIndex(voronoiRed[this.thread.y][this.thread.x], this.constants.length);
  return colors[agent_index][0];
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
  return gpu.createKernel<typeof agentIndexCheck>(agentIndexCheck)
    .setConstants<constants>({
      length: NUM_PARTICLES
    })
    .setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
    .setPipeline(true);
}

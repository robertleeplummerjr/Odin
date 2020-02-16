import { GPU } from 'gpu.js';
import { setup as setupUtilFunctions } from './util-functions';
import { setup as setupActualVoronoiWeightingPerPixel } from './actual-voronoi-weighting-per-pixel';
import { setup as setupAgentIndexCheck } from './agent-index-check';
import { setup as setupAgentIndexVisCheck } from './agent-index-vis-check';
import { setup as setupAllColorVisual } from './all-color-visual';
import { setup as setupColorByVoronoi } from './color-by-voronoi';
import { setup as setupInitialColorsToImage } from './initial-colors-to-image';
import { setup as setupInitialVec3toVec2KernelPassing } from './initial-vec3-to-vec2-kernel-passing';
import { setup as setupPixelWeights } from './pixel-weights';
import { setup as setupPositionsToArray } from './positions-to-array';
import { setup as setupPositionsToScreenVisual } from './positions-to-screen-visual';
import { setup as setupPositionsUpdate } from './positions-update';
import { setup as setupRenderCheckAbS } from './render-check-abs';
import { setup as setupRenderCheck } from './render-check';
import { setup as setupSummedWeightPerAgent2D } from './summed-weight-per-agent-2d';
import { setup as setupSummedWeightPerAgent } from './summed-weight-per-agent';
import { setup as setupVelToScreenVisual } from './vel-to-screen-visual';
import { setup as setupVelocitiesToArray } from './velocities-to-array';
import { setup as setupVelocityAtPositionsVisual } from './velocity-at-positions-visual';

interface ISettings {
  NUM_PARTICLES: number;
  FLOOR_WIDTH: number;
  FLOOR_HEIGHT: number;
  AGENT_VIS_RADIUS: number;
  AGENT_DRAW_RAD: number;
  FLT_MAX: number;
}

export function setup(gpu: GPU, settings: ISettings) {
  setupUtilFunctions(gpu);
  return {
    actualVoronoiWeightingPerPixel: setupActualVoronoiWeightingPerPixel(gpu, settings),
    agentIndexCheck: setupAgentIndexCheck(gpu, settings),
    agentIndexVisCheck: setupAgentIndexVisCheck(gpu, settings),
    allColorVisual: setupAllColorVisual(gpu, settings),
    colorByVoronoi: setupColorByVoronoi(gpu, settings),
    initialColorsToImage: setupInitialColorsToImage(gpu, settings),
    initialVec3toVec2KernelPassing: setupInitialVec3toVec2KernelPassing(gpu, settings),
    pixelWeights: setupPixelWeights(gpu, settings),
    positionsToArray: setupPositionsToArray(gpu, settings),
    positionsToScreenVisual: setupPositionsToScreenVisual(gpu, settings),
    positionsUpdate: setupPositionsUpdate(gpu, settings),
    renderCheckAbs: setupRenderCheckAbS(gpu, settings),
    renderCheck: setupRenderCheck(gpu, settings),
    summedWeightPerAgent2D: setupSummedWeightPerAgent2D(gpu, settings),
    summedWeightPerAgent: setupSummedWeightPerAgent(gpu, settings),
    velToScreenVisual: setupVelToScreenVisual(gpu, settings),
    velocitiesToArray: setupVelocitiesToArray(gpu, settings),
    velocityAtPositionsVisual: setupVelocityAtPositionsVisual(gpu, settings),
  };
}
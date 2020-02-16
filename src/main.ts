import * as THREE from 'three';
import { Renderer } from './renderer'
import { Scene } from './scene';
import {
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  NUM_PARTICLES
} from './utils';
import {
  camera, 
  cameraControls,
  canvas,
  DEBUG,
  gui,
  gl,
  gpu,
  makeRenderLoop,
  params,
  kernels
} from './init';
const {
  actualVoronoiWeightingPerPixel,
  agentIndexCheck,
  agentIndexVisCheck,
  allColorVisual,
  colorByVoronoi,
  initialVec3toVec2KernelPassing,
  initialColorsToImage,
  pixelWeights,
  positionsUpdate,
  positionsToScreenVisual,
  positionsToArray,
  summedWeightPerAgent,
  summedWeightPerAgent2D,
  renderCheck,
  renderCheckAbs,
  velToScreenVisual,
  velocitiesToArray,
  velocityAtPositionsVisual,
} = kernels;

/*************************
****** INIT SETUP ********
**************************/
const render = new Renderer();
const scene = new Scene();
camera.position.set(0, 10, 0);

let pos1: [number, number][];
let pos2: [number, number][];
let targets: [number, number][];
let colors: [number, number, number][];
let iter = 0;
let iterLimit = 0;
let prevtime = 0;
let currTime = 0;
let voronoiRed: [number, number, number][];
let voronoiWeightingGreen: [number, number][][];
let pixelWeightings: number[][];
let summedWeightings: number[];
let summedDirectionalWeightings: [number, number][];

/*************************
********** RUN ***********
**************************/

makeRenderLoop(() => {
  if (params.pause) {
    return;
  }
  if (params.reset) {
    params.reset = false;
    iter = 0;
    prevtime = 0;
    currTime = 0;
    pos1 = initialVec3toVec2KernelPassing(scene.particlePositions) as [number, number][];
    targets = initialVec3toVec2KernelPassing(scene.particleTargets) as [number, number][];
    colors = initialColorsToImage(scene.particleColors) as [number, number, number][];
    voronoiRed = colorByVoronoi(pos1, colors) as [number, number, number][];

    cameraControls.reset();//position0.Quaternion = new THREE.Quaternion(0.0, -1, 0.0);
    camera.position.set(10, 10, 10);
    camera.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3( 0, 1, 0 ),
      Math.PI
    ));
    cameraControls.update();
  }

  if (DEBUG && iter < iterLimit) { 
    currTime = Date.now();
    console.log(prevtime - currTime); prevtime = currTime;
    console.log('iter:' + iter);
  }
  if (DEBUG && iter < iterLimit) {
    currTime = Date.now();
    prevtime = currTime;
    console.log('render update');
  }

  // only need one color because hash function we're using has all color channels be the same value.
  voronoiRed = colorByVoronoi(pos1, colors) as [number, number, number][];
  pixelWeightings = pixelWeights(pos1, voronoiRed, targets) as number[][];
  summedWeightings = summedWeightPerAgent(pixelWeightings, pos1, voronoiRed) as number[];
  voronoiWeightingGreen = actualVoronoiWeightingPerPixel(pos1, pixelWeightings, summedWeightings, voronoiRed) as [number, number][][];
  summedDirectionalWeightings = summedWeightPerAgent2D(voronoiWeightingGreen, pos1, voronoiRed) as [number, number][];
    
  if (params.renderMode != -1) {
    pos2 = positionsUpdate(pos1, summedDirectionalWeightings) as [number, number][];
  } // otherwise: dont update positions

  if (params.renderMode > 0) {
    if (params.renderMode === 1) {
      // color based on which pixels are associated with which agents
      renderCheck(voronoiRed, 0);
      document.getElementsByTagName('body')[0].appendChild(renderCheck.canvas);
    } else if (params.renderMode == 2) {
      // weightings based on distance to agent and orientation in relation to target check
      renderCheck(pixelWeightings, 2);
      document.getElementsByTagName('body')[0].appendChild(renderCheck.canvas);
    } else if (params.renderMode == 3) {
      // color based on velocity weights
      renderCheckAbs(voronoiWeightingGreen);
      document.getElementsByTagName('body')[0].appendChild(renderCheckAbs.canvas);
    } else if (params.renderMode == 4) {
      // color based on pure positions
      positionsToScreenVisual(pos1);
      document.getElementsByTagName('body')[0].appendChild(positionsToScreenVisual.canvas);
    } else if (params.renderMode == 5) {
      // color based on update velo of pure positions
      velToScreenVisual(pos1, summedDirectionalWeightings);
      document.getElementsByTagName('body')[0].appendChild(velToScreenVisual.canvas);
    } else if (params.renderMode == 6) {
      // full combination
      allColorVisual(voronoiRed, voronoiWeightingGreen, pos1);
      document.getElementsByTagName('body')[0].appendChild(allColorVisual.canvas);
    }
  }
  
  // send stuff to webgl2 pipeline
  // if (not on first frame... then render...)
  render.updateAgents(pos2, velocitiesToArray(pos2, pos1));
  render.update();

  // now pos2 is the starting buffer - dont want to copy over... just switch out target reference variable.
  // swap buffers. (pos2 will be overwritten on output so dont need to change it).
  pos1 = pos2;

  ++iter;
  if (DEBUG && iter < iterLimit) {
    currTime = Date.now();
    prevtime = currTime;
    console.log('end: render update');
  }
})();
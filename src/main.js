import Renderer from './renderer'
import Scene from './scene';
import {
  camera, 
  cameraControls,
  canvas,
  DEBUG,
  gui,
  gl,
  gpu,
  makeRenderLoop,
  params
} from './init';
import {
  actualVoronoiWeightingPerPixel,
  actualVoronoiWeightingPerPixelOld,
  agentIndexCheck,
  agentIndexVisCheck,
  allColoringVisual,
  colorByVoronoiOld,
  colorByVoronoi,
  initialVec3toVec2KernelPassingOld,
  initialVec3toVec2KernelPassing,
  initialColorsToImageOld,
  initialColorsToImage,
  pixelWeightsOld,
  pixelWeights,
  positionsUpdateOld,
  positionsUpdate,
  //positionsUpdate_superKernel,
  positionsToScreenVisual,
  positionsToViableArray,
  summedWeightPerAgentOld,
  summedWeightPerAgent,
  summedWeightPerAgent2D,
  renderCheck,
  renderCheckAbs,
  velocitiesToViableArray,
  velocityAtPositionsVisual,
  velToScreenVisual
} from './kernelFunctions';
import {
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  NUM_PARTICLES
} from './utils';

/*************************
****** INIT SETUP ********
**************************/

const THREE = require('three')

var render = new Renderer();
const scene = new Scene();
camera.position.set(0, 10, 0);

var pos_1;
var pos_1_old;
var pos_2;
var pos_2_old;
var targets;
var targets_old;
var colors;
var colors_old;
var iter;
var iter_limit;
var prevtime;
var currTime;
var voronoi_red;
var voronoi_red_old;
var voronoi_weighting_green;
var voronoi_weighting_green_x_old;
var voronoi_weighting_green_y_old;
var pixel_weightings;
var pixel_weightings_old;
var summed_weightings = [NUM_PARTICLES];
var summed_weightings_old = [NUM_PARTICLES];
var summed_directionalWeightings = [NUM_PARTICLES];
var summed_directionalWeightings_x_old = [NUM_PARTICLES];
var summed_directionalWeightings_y_old = [NUM_PARTICLES];

/*************************
********** RUN ***********
**************************/

makeRenderLoop(
  function() {
    if (params.pause) {
      return;
    }
    if (params.reset) {
      params.reset = false;
      iter = 0;
      prevtime = 0;
      currTime = 0;
      pos_1 = initialVec3toVec2KernelPassing(scene.particle_positions);
      targets = initialVec3toVec2KernelPassing(scene.particle_targets);
      colors = initialColorsToImage(scene.particle_colors);
      voronoi_red = colorByVoronoi(pos_1, colors, 0);

      // test upgraded function
      pos_1_old = initialVec3toVec2KernelPassingOld(scene.particle_positions_old);
      var pos_1_array = pos_1.toArray();
      for (let i = 0; i < pos_1_old.length; i++) {
        if (pos_1_old[i][0] !== pos_1_array[i][0] || pos_1_old[i][1] !== pos_1_array[i][1]) {
          throw new Error('pos_1 initialVec3toVec2KernelPassing upgrade does not match');
        }
      }
      console.log('pos_1 initialVec3toVec2KernelPassing passed');

      targets_old = initialVec3toVec2KernelPassingOld(scene.particle_targets_old);
      var targets_array = targets.toArray();
      for (let i = 0; i < targets_old.length; i++) {
        if (targets_old[i][0] !== targets_array[i][0] || targets_old[i][1] !== targets_array[i][1]) {
          throw new Error('targets initialVec3toVec2KernelPassing upgrade does not match');
        }
      }
      console.log('targets initialVec3toVec2KernelPassing passed');

      colors_old = initialColorsToImageOld(scene.particle_colors_old);
      var colors_array = colors.toArray();
      for (let i = 0; i < colors_old.length; i++) {
        if (colors_old[i][0] !== colors_array[i][0] || colors_old[i][1] !== colors_array[i][1]) {
          throw new Error('colors initialColorsToImage upgrade does not match');
        }
      }
      console.log('colors initialColorsToImage passed');

      voronoi_red_old = colorByVoronoiOld(pos_1_old, colors_old, targets_old, 0);
      var voronoi_red_array = voronoi_red.toArray();
      for (let i = 0; i < voronoi_red_old.length; i++) {
        for (let j = 0; j < voronoi_red_old[i].length; j++) {
          if (voronoi_red_old[i][j] !== voronoi_red_array[i][j]) {
            throw new Error(`voronoi_red colorByVoronoi upgrade does not match at i ${i}, j ${j}.  Off by ${ voronoi_red_old[i][j] - voronoi_red_array[i][j] }`);
          }
        }
      }
      console.log('voronoi_red colorByVoronoi passed');
      // end tests

      cameraControls.reset();//position0.Quaternion = new THREE.Quaternion(0.0, -1, 0.0);
      camera.position.set(10, 10, 10);
      camera.position.applyQuaternion( new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3( 0, 1, 0 ),
        Math.PI
      ));
      cameraControls.update();
    }

    if (DEBUG && iter < iter_limit) { currTime = Date.now(); console.log(prevtime - currTime); prevtime = currTime; console.log('iter:' + iter);}
    if (DEBUG && iter < iter_limit) { currTime = Date.now(); prevtime = currTime; console.log('render update');  }

    // only need one color because hash function we're using has all color channels be the same value.
    voronoi_red = colorByVoronoi(pos_1, colors, targets, 0);
    pixel_weightings = pixelWeights(pos_1, voronoi_red, targets);
    summed_weightings = summedWeightPerAgent(pixel_weightings, pos_1, voronoi_red, colors, targets);
    voronoi_weighting_green = actualVoronoiWeightingPerPixel(pos_1, pixel_weightings, summed_weightings, voronoi_red, colors, targets);
    summed_directionalWeightings = summedWeightPerAgent2D(voronoi_weighting_green, pos_1, voronoi_red, colors, targets);

    voronoi_red_old = colorByVoronoiOld(pos_1_old, colors_old, targets_old, 0);
    pixel_weightings_old = pixelWeightsOld(pos_1_old, voronoi_red_old, colors_old, targets_old);
    summed_weightings_old = summedWeightPerAgentOld(pixel_weightings_old, pos_1_old, voronoi_red_old, colors_old, targets_old);
    voronoi_weighting_green_x_old = actualVoronoiWeightingPerPixelOld(pos_1_old, pixel_weightings_old, summed_weightings_old, voronoi_red_old, colors_old, targets_old, 0);
    voronoi_weighting_green_y_old = actualVoronoiWeightingPerPixelOld(pos_1_old, pixel_weightings_old, summed_weightings_old, voronoi_red_old, colors_old, targets_old, 1);
    summed_directionalWeightings_x_old = summedWeightPerAgentOld(voronoi_weighting_green_x_old, pos_1_old, voronoi_red_old, colors_old, targets_old);
    summed_directionalWeightings_y_old = summedWeightPerAgentOld(voronoi_weighting_green_y_old, pos_1_old, voronoi_red_old, colors_old, targets_old);

    // var pixel_weightings_array = pixel_weightings.toArray();
    // for (let i = 0; i < pixel_weightings_old.length; i++) {
    //   for (let j = 0; j < pixel_weightings_old[i].length; j++) {
    //     if (pixel_weightings_old[i][j] !== pixel_weightings_array[i][j]) {
    //       console.log(pixel_weightings_old[i], pixel_weightings_array[i]);
    //       throw new Error(`pixel_weightings pixelWeights upgrade does not match at i ${i}, j ${j}.  Off by ${ pixel_weightings_old[i][j] - pixel_weightings_array[i][j] }`);
    //     }
    //   }
    // }
    // console.log('pixel_weightings pixelWeights passed');
      
    if (params.render_mode != -1) {
      pos_2 = positionsUpdate(pos_1, summed_directionalWeightings);
      pos_2_old = positionsUpdateOld(pos_1_old, summed_directionalWeightings_x_old, summed_directionalWeightings_y_old);
      // const pos_2_array = pos_2.toArray();
      // for (let i = 0; i < pos_2_old.length; i++) {
      //   for (let j = 0; j < pos_2_old[i].length; j++) {
      //     if (pos_2_old[i][j] !== pos_2_array[i][j]) {
      //       throw new Error('pos_2 positionsUpdate upgrade does not match')
      //     }
      //   }
      // }
    } // otherwise: dont update positions

    if (params.render_mode > 0) {
      if (params.render_mode == 1) {
        // color based on which pixels are associated with which agents
        renderCheck(voronoi_red, 0);
        document.getElementsByTagName('body')[0].appendChild(renderCheck.getCanvas());
      } else if (params.render_mode == 2) {
        // weightings based on distance to agent and orientation in relation to target check
        renderCheck(pixel_weightings, 2);
        document.getElementsByTagName('body')[0].appendChild(renderCheck.getCanvas());
      } else if (params.render_mode == 3) {
        // color based on velocity weights
        renderCheckAbs(voronoi_weighting_green);
        document.getElementsByTagName('body')[0].appendChild(renderCheckAbs.getCanvas());
      } else if (params.render_mode == 4) {
        // color based on pure positions
        positionsToScreenVisual(pos_1);
        document.getElementsByTagName('body')[0].appendChild(positionsToScreenVisual.getCanvas());
      } else if (params.render_mode == 5) {
        // color based on update velo of pure positions
        velToScreenVisual(pos_1, summed_directionalWeightings);
        document.getElementsByTagName('body')[0].appendChild(velToScreenVisual.getCanvas());
      } else if (params.render_mode == 6) {
        // full combination
        allColoringVisual(voronoi_red, voronoi_weighting_green, pos_1);
        document.getElementsByTagName('body')[0].appendChild(allColoringVisual.getCanvas());
      }
    }
    
    // send stuff to webgl2 pipeline
    // if (not on first frame... then render...)
    // render...(outputToRender_pos1, outputToRender_pos2);
    console.log(velocitiesToViableArray(pos_2, pos_1).toArray());
    render.updateAgents(pos_2, velocitiesToViableArray(pos_2, pos_1));
    render.update();

    // now pos_2 is the starting buffer - dont want to copy over... just switch out target reference variable.
    // swap buffers. (pos_2 will be overwritten on output so dont need to change it).
    pos_1 = pos_2;
    pos_1_old = pos_2_old;

    ++iter;
    if (DEBUG && iter < iter_limit) { currTime = Date.now(); prevtime = currTime; console.log('end: render update');  }
  }
)();
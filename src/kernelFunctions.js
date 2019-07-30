import { gpu } from './init';
import { draw2dImage, resizeSpecificCanvas} from './utils'
import { mat4, vec4, vec2 } from 'gl-matrix';
import { FLOOR_HEIGHT, FLOOR_WIDTH, NUM_PARTICLES } from './utils'

const FLT_MAX = Math.pow(3.402823466, 38);
const AGENT_VIS_RADIUS = 80.0;
const PIXEL_BUFFER_RAD = 0.05;
const AGENT_DRAW_RAD = 5.0;


/************************************
**** GPU KERNEL HELPER FUNCTIONS ****
*************************************/

function coneDepth(p_x, p_y, cone_x, cone_y) {
  // cone math --> dist to center of cone
  // we have height to radius ratio
  // find height of cone at this radius
  // this is depth to be returned

  var distance = Math.sqrt((p_x - cone_x) * (p_x - cone_x) + (p_y - cone_y) * (p_y - cone_y));

  // for this, all cones will have height to radius ratio of h: 2, r: 1. so c = h / r = 2.
  const c = 2.0;

  return distance * c;
}
const coneDepth_options = {
  paramTypes: { p_x: 'Number', p_y: 'Number', cone_x: 'Number', cone_y: 'Number' },
  returnType: 'Number'
};
gpu.addFunction(coneDepth, coneDepth_options);

function computeMarkerWeight(agent_x, agent_y, marker_x, marker_y, target_x, target_y) {
  var agent_to_marker_x = agent_x - marker_x;
  var agent_to_marker_y = agent_y - marker_y;

  var agent_to_target_x = agent_x - target_x;
  var agent_to_target_y = agent_y - target_y;

  var m_distance = Math.sqrt( agent_to_marker_x * agent_to_marker_x + agent_to_marker_y * agent_to_marker_y);
  var g_distance = Math.sqrt( agent_to_target_x * agent_to_target_x + agent_to_target_y * agent_to_target_y);

  // cos_theta = a dot b / (len(a) * len(b))
  var cos_theta = (agent_to_marker_x * agent_to_target_x + agent_to_marker_y * agent_to_target_y) / (m_distance * g_distance);

  return (1.0 + cos_theta) / (1.0 + m_distance);
}
const computeMarkerWeight_options = {
  paramTypes: { agent_x: 'Number', agent_y: 'Number', marker_x: 'Number', marker_y: 'Number', target_x: 'Number', target_y: 'Number'},
  returnType: 'Number'
}
gpu.addFunction(computeMarkerWeight, computeMarkerWeight_options);

function colorToIndex(channel_value, numParticles) {
  const temp_colorToIndex = channel_value * numParticles;
  var floor_temp = Math.floor(temp_colorToIndex) - temp_colorToIndex;
  if (floor_temp < 0) {
    floor_temp *= -1.0;
  }
  if (floor_temp < 1e-5) {
    return Math.floor(temp_colorToIndex);
  }
  return Math.ceil(temp_colorToIndex);
}
const colorToIndex_options = {
  paramTypes: { channel_value: 'Number', numParticles: 'Number'},
  returnType: 'Number'
}
gpu.addFunction(colorToIndex, colorToIndex_options);

function clampNumber(a,b,c){
  return Math.max(b, Math.min(c, a));
}
gpu.addFunction(clampNumber, { paramTypes: { a: 'Number', b: 'Number', c: 'Number' }, returnType: 'Number' });

// simple upgrade
gpu.addNativeFunction('_clamp', `float _clamp(float value, float low, float high) {
  return clamp(value, low, high);
}`);
/**********************************
**** INITIAL PORTING FUNCTIONS ****
***********************************/
export const initialVec3toVec2KernelPassingOld = gpu.createKernel(function(input_array) {
  // an array of vec2s - created as 2d array is stepped through as
  // [width][height] s.t. [this.thread.y][this.thread.x]
  const vec2_element = this.thread.x;
  const which_vec2 = this.thread.y;

  // if on y element, divide by height : divide by width
  const div_factor = (1 - vec2_element) * this.constants.screen_x + vec2_element * this.constants.screen_y;
  return input_array[which_vec2][vec2_element] / div_factor;
})
.setConstants({ screen_x: FLOOR_WIDTH, screen_y: FLOOR_HEIGHT })
.setOutput([2, NUM_PARTICLES]);
//.setOutputToTexture(true);

export const initialVec3toVec2KernelPassing = gpu.createKernel(function(input_array) {
  const div_x_factor = (1 - 0) * this.constants.screen_x + 0 * this.constants.screen_y;
  const div_y_factor = (1 - 1) * this.constants.screen_x + 1 * this.constants.screen_y;
  const input_value = input_array[this.thread.x];
  return [
    input_value[0] / div_x_factor,
    input_value[1] / div_y_factor,
  ];
})
.setArgumentTypes({ input_array: 'Array1D(2)' })
.setConstants({ screen_x: FLOOR_WIDTH, screen_y: FLOOR_HEIGHT })
.setOutput([NUM_PARTICLES])
.setImmutable(true)
.setPipeline(true);

export const initialColorsToImageOld = gpu.createKernel(function(colors) {
  // an array of vec3s - created as 2d array is stepped through as
  // [width][height] s.t. [this.thread.y][this.thread.x]
  const vec3_element = this.thread.x;
  const which_vec3 = this.thread.y;

  return colors[which_vec3][vec3_element];
})
.setConstants({ screen_x: FLOOR_WIDTH, screen_y: FLOOR_HEIGHT })
.setOutput([3, NUM_PARTICLES]);

export const initialColorsToImage = gpu.createKernel(function(colors) {
  const color = colors[this.thread.x];
  return [color[0], color[1], 0];
})
.setArgumentTypes({
  colors: 'Array1D(2)'
})
.setConstants({ screen_x: FLOOR_WIDTH, screen_y: FLOOR_HEIGHT })
.setOutput([NUM_PARTICLES])
.setPipeline(true);

/**************************************
**** VORONOI VELOCITY CALCULATIONS ****
***************************************/
export const colorByVoronoiOld = gpu.createKernel(function(positions_texture, colors_texture, targets_texture, color_index) {
  // note: must always have at least two agents in the scene otherwise this will error.
  var closest_max_depth = this.constants.flt_max;
  var closest_index = -1;
  var second_closest_max_depth = this.constants.flt_max;
  var second_closest_index = -1;

  // find which depths and vertices this pixel is associated with
  var depth = 0;
  var pos_x = 0;
  var pos_y = 0;
  const x_i = this.thread.y;
  const y_i = this.thread.x;
  for (var i = 0; i < this.constants.length; ++i) {
    pos_x = positions_texture[i][0] * this.constants.screen_x;
    pos_y = positions_texture[i][1] * this.constants.screen_y;

    depth = coneDepth(x_i, y_i, pos_x, pos_y);

    if (depth < closest_max_depth) {
      second_closest_max_depth = closest_max_depth;
      closest_max_depth = depth;
      second_closest_index = closest_index;
      closest_index = i;
    } else if (depth < second_closest_max_depth) {
      second_closest_max_depth = depth;
      second_closest_index = i;
    }
  }

  // color based on distances
  var closest_x_diff = Math.abs(x_i - positions_texture[closest_index][0] * this.constants.screen_x);
  var closest_y_diff = Math.abs(y_i - positions_texture[closest_index][1] * this.constants.screen_y);
  var second_closest_x_diff = Math.abs(x_i - positions_texture[second_closest_index][0] * this.constants.screen_x);
  var second_closest_y_diff = Math.abs(y_i - positions_texture[second_closest_index][1] * this.constants.screen_y);

  var closest_dist2 = closest_x_diff * closest_x_diff + closest_y_diff * closest_y_diff;
  var second_closest_dist2 = second_closest_x_diff * second_closest_x_diff + second_closest_y_diff * second_closest_y_diff;

  var dist = closest_dist2 + second_closest_dist2;

  if (Math.abs(closest_dist2 / dist - 0.5) < this.constants.pixel_rad) {
    // for each pixel, if there are at least two different colors within a particular distance to it, color white.
    // also if closest distance is farther than our agent checking radius, color white.
    // so that we have a buffer distance.
    // white bc color choice for particle is done through Math.random which ranges from [0, 1)
    // so will never actually create white allowing it to act as a flag.
    return 1;
  } else {
    // color_index - to allow for different channel outputs; however, hash function atm denotes all color channels for a pixel are the same
    return colors_texture[closest_index][color_index];
  }
})
.setConstants({ length: NUM_PARTICLES, screen_x : FLOOR_WIDTH, screen_y: FLOOR_HEIGHT, flt_max: FLT_MAX, agent_vis_rad: AGENT_VIS_RADIUS, pixel_rad: PIXEL_BUFFER_RAD})
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT]);

export const colorByVoronoi = gpu.createKernel(function(positions_texture, colors_texture, color_index) {
  // note: must always have at least two agents in the scene otherwise this will error.
  let closest_max_depth = this.constants.flt_max;
  let closest_index = -1;
  let second_closest_max_depth = this.constants.flt_max;
  let second_closest_index = -1;

  // find which depths and vertices this pixel is associated with
  let depth = 0;
  let pos_x = 0;
  let pos_y = 0;
  const x_i = this.thread.y;
  const y_i = this.thread.x;
  for (let i = 0; i < this.constants.length; ++i) {
    const position = positions_texture[i];
    pos_x = position[0] * this.constants.screen_x;
    pos_y = position[1] * this.constants.screen_y;

    depth = coneDepth(x_i, y_i, pos_x, pos_y);

    if (depth < closest_max_depth) {
      second_closest_max_depth = closest_max_depth;
      closest_max_depth = depth;
      second_closest_index = closest_index;
      closest_index = i;
    } else if (depth < second_closest_max_depth) {
      second_closest_max_depth = depth;
      second_closest_index = i;
    }
  }

  // color based on distances
  var closestPosition = positions_texture[closest_index];
  var secondClosestPosition = positions_texture[second_closest_index];
  var closest_x_diff = Math.abs(x_i - closestPosition[0] * this.constants.screen_x);
  var closest_y_diff = Math.abs(y_i - closestPosition[1] * this.constants.screen_y);
  var second_closest_x_diff = Math.abs(x_i - secondClosestPosition[0] * this.constants.screen_x);
  var second_closest_y_diff = Math.abs(y_i - secondClosestPosition[1] * this.constants.screen_y);

  var closest_dist2 = closest_x_diff * closest_x_diff + closest_y_diff * closest_y_diff;
  var second_closest_dist2 = second_closest_x_diff * second_closest_x_diff + second_closest_y_diff * second_closest_y_diff;

  var dist = closest_dist2 + second_closest_dist2;

  if (Math.abs(closest_dist2 / dist - 0.5) < this.constants.pixel_rad) {
    // for each pixel, if there are at least two different colors within a particular distance to it, color white.
    // also if closest distance is farther than our agent checking radius, color white.
    // so that we have a buffer distance.
    // white bc color choice for particle is done through Math.random which ranges from [0, 1)
    // so will never actually create white allowing it to act as a flag.
    return 1;
  } else {
    // color_index - to allow for different channel outputs; however, hash function atm denotes all color channels for a pixel are the same
    const color = colors_texture[closest_index];
    return color[color_index];
  }
})
.setArgumentTypes({
  positions_texture: 'Array1D(2)',
  colors_texture: 'Array1D(3)',
  color_index: 'Integer'
})
.setConstants({ length: NUM_PARTICLES, screen_x : FLOOR_WIDTH, screen_y: FLOOR_HEIGHT, flt_max: FLT_MAX, agent_vis_rad: AGENT_VIS_RADIUS, pixel_rad: PIXEL_BUFFER_RAD})
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
.setImmutable(true)
.setPipeline(true);

export const summedWeightPerAgentOld = gpu.createKernel(function(pixel_weights, positions, voronoi_red, colors, targets) {
  // for each associated agent,
  // for each pixel - this associated with me? ok - add to my sum
  // in gpujs this cant be optimized to for each pixel add to agent sum because cant modify inputted ref values, can only do return 
  //  output for each thread (not per agent).
  // optimization - only check pixels in an associated RADIUS

  // voronoi_red: which agent is associated with which pixel
  // pixel_weights: the weighting for each pixel

  const x_loc = positions[this.thread.x][0] * this.constants.screen_x;
  const y_loc = positions[this.thread.x][1] * this.constants.screen_y;

  const x_start = _clamp(x_loc - this.constants.agent_vis_rad, 0, this.constants.screen_x);
  const x_end = _clamp(x_loc + this.constants.agent_vis_rad, 0, this.constants.screen_y);
  const y_start = _clamp(y_loc - this.constants.agent_vis_rad, 0, this.constants.screen_x);
  const y_end = _clamp(y_loc + this.constants.agent_vis_rad, 0, this.constants.screen_y);

  var pixel_index = -1;
  var sum = 0;
  for (var i = x_start; i < x_end; ++i) {
    for (var j = y_start; j < y_end; ++j) {
      pixel_index = colorToIndex(voronoi_red[i][j], this.constants.length);
      if (pixel_index == this.thread.x) {
        sum += pixel_weights[i][j];
      }
    }
  }

  return sum;
})
.setConstants({ length: NUM_PARTICLES, screen_x : FLOOR_WIDTH, screen_y: FLOOR_HEIGHT, flt_max: FLT_MAX, agent_vis_rad: AGENT_VIS_RADIUS })
.setOutput([NUM_PARTICLES]);

export const summedWeightPerAgent = gpu.createKernel(function(pixel_weights, positions, voronoi_red, colors, targets) {
  // for each associated agent,
  // for each pixel - this associated with me? ok - add to my sum
  // in gpujs this cant be optimized to for each pixel add to agent sum because cant modify inputted ref values, can only do return 
  //  output for each thread (not per agent).
  // optimization - only check pixels in an associated RADIUS

  // voronoi_red: which agent is associated with which pixel
  // pixel_weights: the weighting for each pixel

  const position = positions[this.thread.x];
  const x_loc = position[0] * this.constants.screen_x;
  const y_loc = position[1] * this.constants.screen_y;

  const x_start = clampNumber(x_loc - this.constants.agent_vis_rad, 0, this.constants.screen_x);
  const x_end = clampNumber(x_loc + this.constants.agent_vis_rad, 0, this.constants.screen_x);
  const y_start = clampNumber(y_loc - this.constants.agent_vis_rad, 0, this.constants.screen_x);
  const y_end = clampNumber(y_loc + this.constants.agent_vis_rad, 0, this.constants.screen_x);

  let sum = 0;
  for (let x = x_start; x < x_end; ++x) {
    for (let y = y_start; y < y_end; ++y) {
      let pixel_index = colorToIndex(voronoi_red[x][y], this.constants.length);
      if (pixel_index == this.thread.x) {
        sum += pixel_weights[y][x];
      }
    }
  }

  return sum;
})
.setArgumentTypes({
  pixel_weights: 'Array',
  positions: 'Array1D(2)',
  voronoi_red: 'Array',
  colors: 'Array',
  targets: 'Array1D(2)'
})
.setConstants({
  length: NUM_PARTICLES,
  screen_x : FLOOR_WIDTH,
  screen_y: FLOOR_HEIGHT,
  flt_max: FLT_MAX,
  agent_vis_rad: AGENT_VIS_RADIUS
})
.setOutput([NUM_PARTICLES])
.setImmutable(true)
.setPipeline(true);

export const summedWeightPerAgent2D = gpu.createKernel(function(pixel_weights, positions, voronoi_red, colors, targets) {
  // for each associated agent,
  // for each pixel - this associated with me? ok - add to my sum
  // in gpujs this cant be optimized to for each pixel add to agent sum because cant modify inputted ref values, can only do return 
  //  output for each thread (not per agent).
  // optimization - only check pixels in an associated RADIUS

  // voronoi_red: which agent is associated with which pixel
  // pixel_weights: the weighting for each pixel

  const position = positions[this.thread.x];
  const x_loc = position[0] * this.constants.screen_x;
  const y_loc = position[1] * this.constants.screen_y;

  const x_start = clampNumber(x_loc - this.constants.agent_vis_rad, 0, this.constants.screen_x);
  const x_end = clampNumber(x_loc + this.constants.agent_vis_rad, 0, this.constants.screen_x);
  const y_start = clampNumber(y_loc - this.constants.agent_vis_rad, 0, this.constants.screen_x);
  const y_end = clampNumber(y_loc + this.constants.agent_vis_rad, 0, this.constants.screen_x);

  let sumX = 0;
  let sumY = 0;
  for (let x = x_start; x < x_end; ++x) {
    for (let y = y_start; y < y_end; ++y) {
      let pixel_index = colorToIndex(voronoi_red[x][y], this.constants.length);
      if (pixel_index == this.thread.x) {
        const weight = pixel_weights[y][x];
        sumX += weight[0];
        sumY += weight[1];
      }
    }
  }

  return [sumX, sumY];
})
.setArgumentTypes({
  pixel_weights: 'Array1D(2)',
  positions: 'Array1D(2)',
  voronoi_red: 'Array',
  colors: 'Array',
  targets: 'Array1D(2)'
})
.setConstants({
  length: NUM_PARTICLES,
  screen_x : FLOOR_WIDTH,
  screen_y: FLOOR_HEIGHT,
  flt_max: FLT_MAX,
  agent_vis_rad: AGENT_VIS_RADIUS
})
.setOutput([NUM_PARTICLES])
.setImmutable(true)
.setPipeline(true);

export const pixelWeightsOld = gpu.createKernel(function(positions, voronoi_red, colors, targets) {
  // for each pixel,
  // what is its associated agent
  // what is the weighting of this pixel in relation to the agent and its target

  const x_i = this.thread.y;
  const y_i = this.thread.x;

  const agent_index = colorToIndex(voronoi_red[x_i][y_i], this.constants.length);
  // if not on a valid agent's index (ie in white buffer region) this has no weight
  if (agent_index == this.constants.length) { return 0;}

  return computeMarkerWeight(
                  positions[agent_index][0] * this.constants.screen_x,
  							  positions[agent_index][1] * this.constants.screen_y,
		  					  x_i,
		  					  y_i,
		  					  targets[agent_index][0] * this.constants.screen_x,
		  					  targets[agent_index][1] * this.constants.screen_y);
})
.setConstants({ length: NUM_PARTICLES, screen_x : FLOOR_WIDTH, screen_y: FLOOR_HEIGHT })
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT]);

export const pixelWeights = gpu.createKernel(function(positions, voronoi_red, targets) {
  // for each pixel,
  // what is its associated agent
  // what is the weighting of this pixel in relation to the agent and its target

  const x_i = this.thread.y;
  const y_i = this.thread.x;

  const agent_index = colorToIndex(voronoi_red[x_i][y_i], this.constants.length);
  // if not on a valid agent's index (ie in white buffer region) this has no weight
  if (agent_index == this.constants.length) { return 0;}

  const agent = positions[agent_index];
  const target = targets[agent_index];
  return computeMarkerWeight(
    agent[0] * this.constants.screen_x,
    agent[1] * this.constants.screen_y,
    x_i,
    y_i,
    target[0] * this.constants.screen_x,
    target[1] * this.constants.screen_y);
})
.setArgumentTypes({
  positions: 'Array1D(2)',
  voronoi_red: 'Array',
  targets: 'Array1D(2)'
})
.setConstants({
  length: NUM_PARTICLES,
  screen_x : FLOOR_WIDTH,
  screen_y: FLOOR_HEIGHT
})
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
.setImmutable(true)
.setPipeline(true);

export const actualVoronoiWeightingPerPixelOld = gpu.createKernel(function(positions, voronoi_pixelWeight, agent_summedWeight, voronoi_red, colors, targets, component) {
  // for each pixel, compute weight of pixel in relation to associated position

  // for each pixel,
  // what is it's associated agent
  // what is the weighting of this pixel in relation to the agent and its target
  // what is the total summed weighting of all those affecting pixel's agent
  // what is mi of this pixel in relation to pixel's agent

  const x_i = this.thread.y;
  const y_i = this.thread.x;

  const agent_index = colorToIndex(voronoi_red[x_i][y_i], this.constants.length);
  // if not on a valid agent's index (ie in white buffer region) this has no weight
  if (agent_index == this.constants.length) { return 0;}

  const mi_x = x_i - positions[agent_index][0] * this.constants.screen_x;
  const mi_y = y_i - positions[agent_index][1] * this.constants.screen_y;
  const v_weight = voronoi_pixelWeight[x_i][y_i]  / agent_summedWeight[agent_index];
  if (component == 0) {
    return mi_x * v_weight;
  } else if (component == 1) {
    return mi_y * v_weight;
  } else {
    // invalid component option:
    // this will throw errors in the fragment shader when passed to the render check
    // when drawing it on canvas in debug mode
    return -1;
  }
})
.setConstants({ length: NUM_PARTICLES, screen_x : FLOOR_WIDTH, screen_y: FLOOR_HEIGHT, flt_max: FLT_MAX, agent_vis_rad: AGENT_VIS_RADIUS, pixel_rad: PIXEL_BUFFER_RAD})
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT]);

export const actualVoronoiWeightingPerPixel = gpu.createKernel(function(positions, voronoi_pixelWeight, agent_summedWeight, voronoi_red, colors, targets) {
  // for each pixel, compute weight of pixel in relation to associated position

  // for each pixel,
  // what is it's associated agent
  // what is the weighting of this pixel in relation to the agent and its target
  // what is the total summed weighting of all those affecting pixel's agent
  // what is mi of this pixel in relation to pixel's agent

  const x_i = this.thread.y;
  const y_i = this.thread.x;

  const agent_index = colorToIndex(voronoi_red[x_i][y_i], this.constants.length);
  // if not on a valid agent's index (ie in white buffer region) this has no weight
  if (agent_index == this.constants.length) { return [0,0];}

  const position = positions[agent_index];

  const mi_x = x_i - position[0] * this.constants.screen_x;
  const mi_y = y_i - position[1] * this.constants.screen_y;
  const v_weight = voronoi_pixelWeight[x_i][y_i]  / agent_summedWeight[agent_index];
  // if (component == 0) {
  //   return mi_x * v_weight;
  // } else if (component == 1) {
  //   return mi_y * v_weight;
  // } else {
  //   // invalid component option:
  //   // this will throw errors in the fragment shader when passed to the render check
  //   // when drawing it on canvas in debug mode
  //   return -1;
  // }
  return [mi_x * v_weight, mi_y * v_weight];
})
.setArgumentTypes({
  positions: 'Array1D(2)',
  voronoi_pixelWeight: 'Array',
  agent_summedWeight: 'Array',
  voronoi_red: 'Array',
  colors: 'Array',
  targets: 'Array1D(2)'
})
.setConstants({ length: NUM_PARTICLES, screen_x : FLOOR_WIDTH, screen_y: FLOOR_HEIGHT, flt_max: FLT_MAX, agent_vis_rad: AGENT_VIS_RADIUS, pixel_rad: PIXEL_BUFFER_RAD})
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
.setImmutable(true)
.setPipeline(true);

export const positionsUpdateOld = gpu.createKernel(function(old_positions, velocities_x, velocities_y) {
  // an array of vec2s - created as 2d array is stepped through as
  // [width][height] s.t. [this.thread.y][this.thread.x]
  const vec2_element = this.thread.x;
  const which_vec2 = this.thread.y;

  // used to normalize velocity
  const length = Math.sqrt(velocities_x[which_vec2] * velocities_x[which_vec2] + velocities_y[which_vec2] * velocities_y[which_vec2]);
  var vel_element = velocities_x[which_vec2];
  if (vec2_element == 1) {
    vel_element = velocities_y[which_vec2];
  }

  // new p = old p + velo
  const influence = 0.01;
  var value = old_positions[which_vec2][vec2_element] + vel_element / length * influence;
  return _clamp(value, 0, 1);
})
.setConstants({ length: NUM_PARTICLES, screen_x : FLOOR_WIDTH, screen_y: FLOOR_HEIGHT })
.setOutput([2, NUM_PARTICLES]);

export const positionsUpdate = gpu.createKernel(function(old_positions, velocities) {
  // used to normalize velocity
  const velocity = velocities[this.thread.x];
  const length = Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1]);
  const influence = 0.01;
  // var value = old_positions[which_vec2][vec2_element] + vel_element / length * influence;
  // return clampNumber(value, 0, 1);
  const old_position = old_positions[this.thread.x];
  return [
    _clamp(old_position[0] + velocity[0] / length * influence, 0, 1),
    _clamp(old_position[1] + velocity[1] / length * influence, 0, 1)
  ];
})
.setArgumentTypes({
  old_positions: 'Array1D(2)',
  velocities: 'Array1D(2)'
})
.setConstants({
  length: NUM_PARTICLES,
  screen_x : FLOOR_WIDTH,
  screen_y: FLOOR_HEIGHT
})
.setOutput([NUM_PARTICLES])
.setImmutable(true)
.setPipeline(true);

/*************************
**** OUTPUT FUNCTIONS ****
**************************/

export const positionsToViableArray = gpu.createKernel(function(positions_2elements) {
  const position = positions_2elements[this.thread.x];
  return [
    this.constants.screen_x * position[0],
    this.constants.screen_y * position[1]
  ];
})
.setConstants({
  length: NUM_PARTICLES,
  screen_x: FLOOR_WIDTH,
  screen_y: FLOOR_HEIGHT
})
.setOutput([NUM_PARTICLES])
.setPipeline(true);

export const velocitiesToViableArray = gpu.createKernel(function(positions_2elements, oldPositions_2elements) {
  const position = positions_2elements[this.thread.x];
  const oldPosition = oldPositions_2elements[this.thread.x];
  return [position[0] - oldPosition[0], position[1] - oldPosition[1]];
})
.setConstants({ length: NUM_PARTICLES })
.setOutput([NUM_PARTICLES])
.setImmutable(true)
.setPipeline(true);

/********************************
**** VISUALIZATION FUNCTIONS ****
*********************************/

export const positionsToScreenVisual = gpu.createKernel(function(positions) {
  const x_i = this.thread.y;
  const y_i = this.thread.x;
	for (var i = 0; i < this.constants.length; ++i) {
    const position = positions[i];
		if (Math.abs(position[0] * this.constants.screen_x - x_i) < this.constants.draw_rad
		  && Math.abs(position[1] * this.constants.screen_y - y_i) < this.constants.draw_rad) {
      this.color(position[0], 0, position[1]);
      break;
		}
	}
})
.setConstants({ length: NUM_PARTICLES, screen_x: FLOOR_WIDTH, screen_y: FLOOR_HEIGHT, draw_rad: AGENT_DRAW_RAD })
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
.setGraphical(true);

export const velToScreenVisual = gpu.createKernel(function(positions, vel) {
  const x_i = this.thread.y;
  const y_i = this.thread.x;
  var bool = 0;
  for (var i = 0; i < this.constants.length; ++i) {
    const position = positions[i];
    if (Math.abs(position[0] * this.constants.screen_x - x_i) < this.constants.draw_rad
      && Math.abs(position[1] * this.constants.screen_y - y_i) < this.constants.draw_rad) {
      const value = vel[i];
      this.color(value[0], 0, value[1]);
      bool = 1;
    }
  }
  if (bool == 0) {
    this.color(1, 1, 1);
  }
})
.setConstants({
  length: NUM_PARTICLES,
  screen_x: FLOOR_WIDTH,
  screen_y: FLOOR_HEIGHT,
  draw_rad: AGENT_DRAW_RAD
})
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
.setGraphical(true);


export const allColoringVisual = gpu.createKernel(function(voronoi_red, voronoi_green, pos) {
	const x_i = this.thread.y;
  const y_i = this.thread.x;

  var red = voronoi_red[x_i][y_i];
  var greenValue = voronoi_green[x_i][y_i];
	var green = greenValue[0];
  var blue = 0;

  for (var i = 0; i < this.constants.length; ++i) {
    const value = pos[i];
    if (Math.abs(value[0] * this.constants.screen_x - x_i) < this.constants.draw_rad
        && Math.abs(value[1] * this.constants.screen_y - y_i) < this.constants.draw_rad) {
      red = 1;
      blue = 1;
    }
  }
  this.color(red, green, blue);
})
.setConstants({
  length: NUM_PARTICLES,
  screen_x: FLOOR_WIDTH,
  screen_y: FLOOR_HEIGHT,
  draw_rad: AGENT_DRAW_RAD
})
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
.setGraphical(true);

export const velocityAtPositionsVisual = gpu.createKernel(function(velocities, positions) {
	var red = 0;
  var green = 0;
  var blue = 0;

  const x_i = this.thread.y;
  const y_i = this.thread.x;
  for (var i = 0; i < this.constants.length; ++i) {
    const velocity = velocities[i];
    const position = positions[i];
    if (Math.abs(position[0] * this.constants.screen_x - x_i) < this.constants.draw_rad
        && Math.abs(position[1] * this.constants.screen_y - y_i) < this.constants.draw_rad) {
      green = velocity[0];
      blue = velocity[1];
    }
  }
  this.color(red, green, blue);
})
.setConstants({ length: NUM_PARTICLES, screen_x: FLOOR_WIDTH, screen_y: FLOOR_HEIGHT, draw_rad: AGENT_DRAW_RAD })
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
.setGraphical(true);

export const renderCheck = gpu.createKernel(function(voronoi, color_index) {
  if (color_index == 0) {
    this.color(voronoi[this.thread.y][this.thread.x], 0, 0);
  } else if (color_index == 1) {
    this.color(0, voronoi[this.thread.y][this.thread.x], 0);
  } else if (color_index == 2) {
    this.color(0, 0, voronoi[this.thread.y][this.thread.x]);
  } else {
    // should never reach this color index so forcing gpujs fragment shader to error
    this.color(-1, -1, -1);
  }
})
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
.setGraphical(true);

export const renderCheckAbs = gpu.createKernel(function(voronoi) {
  const a = 10.0; // influence
  const value = voronoi[this.thread.y][this.thread.x];
  this.color( Math.abs(a * value[0]),
              0,
              Math.abs(a * value[1]));
})
.setArgumentTypes({
  voronoi: 'Array2D(2)'
})
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
.setGraphical(true);

export const agentIndexCheck = gpu.createKernel(function(voronoi_red, colors) {
  const agent_index = colorToIndex(voronoi_red[this.thread.y][this.thread.x], this.constants.length);
  return colors[agent_index][0];
})
.setConstants({ length: NUM_PARTICLES, screen_x: FLOOR_WIDTH, screen_y: FLOOR_HEIGHT, draw_rad: AGENT_DRAW_RAD })
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
.setPipeline(true);

export const agentIndexVisCheck = gpu.createKernel(function(voronoi_red, colors) {
  const agent_index = colorToIndex(voronoi_red[this.thread.y][this.thread.x], this.constants.length);
  if (agent_index >= this.constants.length) {
    this.color(1, 0, 0);
  } else {
    this.color(colors[agent_index][0], 0, 0);
  }
})
.setConstants({ length: NUM_PARTICLES, screen_x: FLOOR_WIDTH, screen_y: FLOOR_HEIGHT, draw_rad: AGENT_DRAW_RAD })
.setOutput([FLOOR_WIDTH, FLOOR_HEIGHT])
.setGraphical(true);
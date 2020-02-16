export const DEBUG = false && process.env.NODE_ENV === 'development';
import * as THREE from 'three';
import { GPU } from 'gpu.js';
import DAT from 'dat.gui';
import WebGLDebug from 'webgl-debug';
import Stats from 'stats-js';
import { PerspectiveCamera } from 'three';
import OrbitControls from 'three-orbitcontrols';
import { SPECTOR } from 'spectorjs';
import { setup } from './kernels';
export let ABORTED = false;
export function abort(message) {
  ABORTED = true;
  throw message;
}

// Setup canvas and webgl context
export const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const glContext = canvas.getContext('webgl2');
const webgl2 = (typeof WebGL2RenderingContext !== "undefined" && glContext instanceof WebGL2RenderingContext);
if (!webgl2) {
  console.log('WebGL 2 is not available. Make sure it is available and properly enabled in this browser');
} else {
  console.log('WebGL 2 activated.');
}

// Get a debug context
export const gl = DEBUG
  ? WebGLDebug.makeDebugContext(glContext, (err, funcName, args) => {
    abort(WebGLDebug.glEnumToString(err) + ' was caused by call to: ' + funcName);
  })
  : glContext;
gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
// ^^^ cant use gl.drawingBufferWidth, gl.drawingBufferHeight here because not matching approp dimensions. forcing the fit instead.

import {
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  NUM_PARTICLES,
  AGENT_DRAW_RAD,
  AGENT_VIS_RADIUS,
  FLT_MAX
} from './utils';

// GPU setup
export const gpu = new GPU({
  mode: 'webgl2',
  canvas,
  context: glContext
});

export const kernels = setup(gpu, {
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  NUM_PARTICLES,
  AGENT_DRAW_RAD,
  AGENT_VIS_RADIUS,
  FLT_MAX
});

// setup gui
export const gui = new DAT.GUI({ width: 500 });
export const params = {
  title: 'gpu.js bioCrowds with webgl2 sdfs',
  renderMode: 0,
  pause: false,
  reset: true
};

gui.add(params, 'title');

gui.add(params, 'render_mode', {
  Simulation: '0',
  Just_Marionette_Movement: '-1',
  Agent_ids: '1',
  First_Pass_of_Weightings_of_Pixel_for_Agent: '2',
  Velocity_Weightings_for_Update: '3',
  Agent_Positions: '4',
  Velocities_of_Agents_at_Positions: '5',
  Combination_Agent_ids_Velocity_and_Weights: '6',
})
  .onChange(function(newVal) {
    if (newVal == 0 || newVal == -1) {
      canvas.style.display = "block";
    } else {
      canvas.style.display = "none";
    }
  })
  .listen();

gui.add(params, 'pause');

const obj = {
  clickToResetTheSim: () => {
    params.reset = true; // this toggles; is set back to false in main's looping after one iter.
    console.log("the sim was reset.") 
  }
};
gui.add(obj,'clickToResetTheSim');

// initialize statistics widget
const stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';
document.body.appendChild(stats.domElement);

// Initialize camera
export const camera = new PerspectiveCamera(120, canvas.clientWidth / canvas.clientHeight, 0.1, 2000);
console.log(camera.getWorldDirection());
camera.position.applyQuaternion(
  new THREE.Quaternion()
    .setFromAxisAngle(
      new THREE.Vector3( 0, 1, 0 ), // The positive y-axis
      Math.PI
    )
);
export const cameraControls = new OrbitControls(camera, canvas);
cameraControls.enableDamping = false;
cameraControls.enableZoom = true;
cameraControls.rotateSpeed = 1.0;
cameraControls.zoomSpeed = 0.5;
cameraControls.panSpeed = 2.0;
camera.position.applyQuaternion( new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3( 0, 1, 0 ), // The positive y-axis
  3.0 * Math.PI / 4.0
));
cameraControls.update();

function setSize(width, height) {
  canvas.width = width;
  canvas.height = height;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function resizeCanvas() {
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  if (canvas.width != displayWidth ||
      canvas.height != displayHeight) {
    setSize(displayWidth, displayHeight);
  }
}

setSize(canvas.clientWidth, canvas.clientHeight);
window.addEventListener('resize', () => setSize(canvas.clientWidth, canvas.clientHeight));

if (DEBUG) {
  const spector = new SPECTOR();
  spector.displayUI();
}

// Creates a render loop that is wrapped with camera update and stats logging
export function makeRenderLoop(render) {
  return function tick() {    
    cameraControls.update();
    stats.begin();
    render();
    stats.end();
    if (!ABORTED) {
      requestAnimationFrame(tick)
    }
  }
}

import { canvas } from './init';

export const NUM_PARTICLES = 64.0;
export const FLOOR_WIDTH = 700.0;
export const FLOOR_HEIGHT = 700.0;
export const FLT_MAX = Math.pow(3.402823466, 38);
export const AGENT_VIS_RADIUS = 80.0;
export const PIXEL_BUFFER_RAD = 0.05;
export const AGENT_DRAW_RAD = 5.0;

function downloadURI(uri, name) {
  const link = document.createElement('a');
  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export function saveCanvas() {
  downloadURI(canvas.toDataURL('image/png'), 'webgl-canvas-' + Date.now() + '.png');
}

export function initShaderProgram(gl, vsSource, fsSource) {
  const vs = loadShader(gl, vsSource, gl.VERTEX_SHADER);
  const fs = loadShader(gl, fsSource, gl.FRAGMENT_SHADER);
  const program = gl.createProgram();

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log('Shader program cannot initializing: ' + gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

function loadShader(gl, src, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log('Cannot compile shaders:' + gl.getShaderInfoLog(shader));
    console.log(src);
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function canvasToImage(inputCanvas) {
  if (!inputCanvas) {
    console.log('canvasToImage: input_canvas is undefined');
  }

  const image = document.createElement("img"); 
  image.src = inputCanvas.toDataURL();

  return image;
}

function loadImage(imageSource, context) {
    var imageObj = new Image();
    imageObj.onload = () => {
        context.drawImage(imageObj, 0, 0);
        var imageData = context.getImageData(0,0,10,10);
        readImage(imageData);
    };
    imageObj.src = imageSource;
    return imageObj;
}

var img = new window.Image();
export function draw2dImage(inputCanvas, context2d, strDataURI) {
    "use strict";
    img.addEventListener("load", function () {
        context2d.drawImage(img, 0, 0);
    });
    img.setAttribute("src", strDataURI);
    return context2d;
}

export function resizeSpecificCanvas(inputCanvas) {
    // Lookup the size the browser is displaying the canvas.
  const displayWidth = inputCanvas.clientWidth;
  const displayHeight = inputCanvas.clientHeight;
 
  // Check if the canvas is not the same size.
  if (inputCanvas.width  != displayWidth ||
      inputCanvas.height != displayHeight) {
 
    // Make the canvas the same size
    inputCanvas.width  = displayWidth;
    inputCanvas.height = displayHeight;
  }
  return inputCanvas;
}

export function mat4FromArray(outputMat4, array) {
  if (!outputMat4) {
    console.log('mat4FromArray: outputMat4 undefined');
  } else if (!array) {
    console.log('mat4FromArray: array undefined');
  }

  for (var i = 0; i < 16; ++i) {
    outputMat4[i] = array[i];
  }
}
import { GPU, IKernelFunctionThis } from 'gpu.js';
import {
  addArray3,
  multiplyArray3,
} from './util-functions';

// Simply for compilation, in native due to need for matrix
function getRay(
  camera: [number, number, number],
  target: [number, number, number],
  screenPos: [number, number],
  fov: number,
  ): [number, number, number] {
  return [0, 0, 0];
}

function raymarching(
  rayOrigin: [number, number, number],
  rayDir: [number, number, number],
  maxd: number,
  precis: number,
): [number, number] {
  const raymarchSteps = 50;
  let latest = precis * 2.0;
  let dist   = 0.0;
  let type   = -1.0;
  for (let i = 0; i < raymarchSteps; i++) 
  {
      if (latest < precis || dist > maxd) break;

      vec2 result = field(rayOrigin + rayDir * dist);
      latest = result.x;
      dist += latest;
      type = result.y;
  }

  vec2 res = vec2(-1.0, -1.0 );
  if (dist < maxd) {res = vec2( dist, type); }
  return res;
}

function calcNormal(
  pos: [number, number, number],
  eps: number
  ): [number, number, number] {
  const v1: [number, number, number] = [ 1.0,-1.0,-1.0];
  const v2: [number, number, number] = [-1.0,-1.0, 1.0];
  const v3: [number, number, number] = [-1.0, 1.0,-1.0];
  const v4: [number, number, number] = [ 1.0, 1.0, 1.0];

  const eps3 = [eps, eps, eps];

  return normalize(
    multiplyArray3(v1, field( addArray3(pos + multiplyArray3(v1, eps3 )[0] +
    multiplyArray3(v2 * field( pos + v2*eps )[0]) +
    multiplyArray3(v3 * field( pos + v3*eps )[0]) +
    multiplyArray3(v4 * field( pos + v4*eps )[0])
  );
}

const FLT_MAX = 0;
const texDim = 0;
function field(position: [number, number, number]): [number, number] {
    const skeleton = [FLT_MAX, 1.0];

    for (let agentY = 0; agentY < texDim; agentY++) {
        for (let agentX = 0; agentX < texDim / 16; agentX = agentX + 16) {
            const uvStartPos = [agentX + 0.5, agentY + 0.5];
            const agentPos = (texture(u_image, (uvStartPos / float(texDim) )).xyz - vec3(0.5)) * worldDim;

            // CAPSULE BOUNDING BOX OPTIMIZATION
            //skeleton = smin(skeleton, capsule( position, agentPos, agentPos + vec3(0.0, AGENT_BOUNDING_HEIGHT, 0.0), AGENT_BOUNDING_RAD), 0.0);
            if (capsule( position, agentPos, agentPos + vec3(0.0, AGENT_BOUNDING_HEIGHT, 0.0), AGENT_BOUNDING_RAD).x < AGENT_BOUNDING_RAD) {
              
              vec3 joint0  = texture(u_image, (uvStartPos + vec2( 1.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint1  = texture(u_image, (uvStartPos + vec2( 2.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint2  = texture(u_image, (uvStartPos + vec2( 3.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint3  = texture(u_image, (uvStartPos + vec2( 4.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint4  = texture(u_image, (uvStartPos + vec2( 5.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint5  = texture(u_image, (uvStartPos + vec2( 6.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint6  = texture(u_image, (uvStartPos + vec2( 7.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint7  = texture(u_image, (uvStartPos + vec2( 8.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint8  = texture(u_image, (uvStartPos + vec2( 9.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint9  = texture(u_image, (uvStartPos + vec2(10.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint10 = texture(u_image, (uvStartPos + vec2(11.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint11 = texture(u_image, (uvStartPos + vec2(12.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint12 = texture(u_image, (uvStartPos + vec2(13.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint13 = texture(u_image, (uvStartPos + vec2(14.0, 0.0)) / float(texDim) ).xyz;
              vec3 joint14 = texture(u_image, (uvStartPos + vec2(15.0, 0.0)) / float(texDim) ).xyz;

              vec3 joints[15] = vec3[]( (joint0  - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint1  - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint2  - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint3  - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint4  - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint5  - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint6  - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint7  - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint8  - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint9  - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint10 - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint11 - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint12 - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint13 - vec3(0.5)) * JOINT_TEX_SCALE + agentPos,
                                         (joint14 - vec3(0.5)) * JOINT_TEX_SCALE + agentPos );

              // float radius = 0.5; 
              // 0.3 to 0.7 is a good range
              float radius = agentRadius[int(agentX / 16) + int(texDim / 16) * agentY];
              float blendFactor = 0.4;

              // head
              skeleton = smin(skeleton, sphere( position, radius*2.3, 0.5 *(joints[0] + joints[1]) + vec3(0.0, 1.0, 0.0) ), blendFactor);

              //left arm
              skeleton = smin(skeleton, line(position, joints[1], joints[2], radius), blendFactor); //shoulder L
              skeleton = smin(skeleton, line(position, joints[2], joints[3], radius), blendFactor);
              skeleton = smin(skeleton, line(position, joints[3], joints[4], radius), blendFactor);

              //right arm
              skeleton = smin(skeleton, line(position, joints[1], joints[5], radius), blendFactor); //shoulder R
              skeleton = smin(skeleton, line(position, joints[5], joints[6], radius), blendFactor);
              skeleton = smin(skeleton, line(position, joints[6], joints[7], radius), blendFactor);

              //spine
              skeleton = smin(skeleton, line(position, joints[1], joints[8], radius * 2.5), blendFactor);

              //belly
              skeleton = smin(skeleton, sphere(position, radius * 3.5, joints[8]), blendFactor);

              //left leg
              skeleton = smin(skeleton, line(position, (0.3*joints[8] + 0.7*joints[9]), joints[10], radius), blendFactor); // shift a bit toward belly
              skeleton = smin(skeleton, line(position, joints[10], joints[11], radius), blendFactor);

              //right leg
              skeleton = smin( skeleton, line( position, (0.3*joints[8] + 0.7*joints[12]), joints[13], radius ), blendFactor); // shift a bit toward belly
              skeleton = smin( skeleton, line( position, joints[13], joints[14], radius ), blendFactor);
            }
            else
            {
              // treat agent as a simple capsule if too far away
              skeleton = smin(skeleton, capsule( position, agentPos, agentPos + vec3(0.0, AGENT_BOUNDING_HEIGHT, 0.0), AGENT_BOUNDING_RAD), 0.0);
            }
            
        }
    }

    vec2 _out = skeleton;
    _out.y = smoothstep( 0.0, 0.0, _out.x );
    return _out;
}
export function crowd(this: IKernelFunctionThis, resolution: number, camera: [number, number, number], target: [number, number, number], fov: number, raymarchMaximumDistance: number, raymarchPrecision: number, worldDim: number): void {
  // const screenPos = squareFrame(resolution);
  const rayDirection = getRay(camera, target, [this.thread.x, this.thread.y], fov);
  const collision = raymarching(camera, rayDirection, raymarchMaximumDistance, raymarchPrecision);
  let col: [number, number, number] = [0.85, 0.85, 0.85];

  // background color
  this.color(0.30, 0.30, 0.34, 1.0);
  
  if (collision[0] > -0.5) {
    const pos = multiplyArray3(addArray3(camera, rayDirection), collision.x);
    const nor = calcNormal(pos, 0.1);
    col = multiplyArray3(col, multiplyArray3(addArray3(rimlight(addArray3(pos, [0, worldDim, 0]), nor), nor), 0.2));
    this.color(col[0], col[1], col[2], 1);
  }
}

export function setup(gpu: GPU) {
  return gpu
    .addNativeFunction('getRay',
    `vec3 getRay(vec3 origin, vec3 target, vec2 screenPos, float lensLength) 
    {
      mat3 camMat = calcLookAtMatrix(origin, target, 0.0);
      return getRay(camMat, screenPos, lensLength);
    }
    vec3 getRay(mat3 camMat, vec2 screenPos, float lensLength) 
    {
      return normalize(camMat * vec3(screenPos, lensLength));
    }`)
    .createKernel(crowd);
}
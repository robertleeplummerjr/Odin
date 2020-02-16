import {
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  NUM_PARTICLES
} from './utils';

export class Scene {
  simStep = 0;
  particlePositions = [];
  particleVelocities = [];
  particleColors = [];
  particleTargets = [];
  constructor() {
    for (var i = 0; i < NUM_PARTICLES; ++i) {
      this.particlePositions.push([0, 0]);
      this.particleVelocities.push([0, 0]);
      this.particleColors.push([0, 0]);
      this.particleTargets.push([0, 0]);
    }

    // create initial values
    for (var i = 0.0; i < NUM_PARTICLES; ++i) {
      this.particlePositions[i][0] = Math.random() * FLOOR_WIDTH;
      this.particlePositions[i][1] = Math.random() * FLOOR_HEIGHT;

      // for biocrowds doesnt matter what init velo is for update since just depends on
      // available markers around current location.
      this.particleVelocities[i][0] = 0;
      this.particleVelocities[i][1] = 0;

      this.particleColors[i][0] = i / NUM_PARTICLES;
      this.particleColors[i][1] = i / NUM_PARTICLES;

      // TODO - update targets to be a better value
      if (i % 2 == 0) {
        this.particleTargets[i][0] = FLOOR_WIDTH - FLOOR_WIDTH / 4.0;
        this.particleTargets[i][1] = i / NUM_PARTICLES * FLOOR_HEIGHT;
      } else {
        this.particleTargets[i][0] = FLOOR_WIDTH / 4.0;
        this.particleTargets[i][1] = i / NUM_PARTICLES * FLOOR_HEIGHT;
      }
    }
  }
}
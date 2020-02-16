import { camera, cameraControls, gui, gl, canvas, resizeCanvas } from './init';
import { initShaderProgram } from './utils';
import { Walker } from './walker.js'

export class Renderer {
  numAgents = 16 * Math.pow(4, 0); // must be 16 times a power of 4
  uniforms = {};
  startTime = Date.now();
  walker = new Walker();

  // SET THESE TWO VARIABLES
  worldDimension = 500.0; // assumes world is square, centered at (0,0)
  // TEX DIMENSION SET AUTOMATICALLY
  texDimension = Math.sqrt(this.numAgents * 16);

  agentPos = null;
  agentFwd = null;

  // RANDOMNESS OF AGENTS TO MAKE SCENE INTERESTING
  agentOff = new Array(this.numAgents);
  agentGen = new Array(this.numAgents);
  agentNer = new Array(this.numAgents);
  agentWei = new Array(this.numAgents);
  agentHap = new Array(this.numAgents);
  agentRad = new Array(this.numAgents);

  constructor() {  
    // initialize randomness of agents
    for (var i = 0; i < this.numAgents; i++) {
        try { throw i }
        catch (agent) {
            this.agentOff[i] = Math.random() * 360;
            this.agentGen[agent] = Math.random() * 5.0;
            this.agentNer[agent] = Math.random() * 5.0;
            this.agentWei[agent] = Math.random() * 5.0;
            this.agentHap[agent] = Math.random() * 5.0;
            this.agentRad[agent] = Math.random() * 0.4 + 0.3; // 0.3 to 0.7

            // replace to display the 4 different walks
            // this.agentOff[agent] = 0;
            // this.agentGen[agent] = (agent == 0) ? 5.0 : 0.0;
            // this.agentNer[agent] = (agent == 1) ? 5.0 : 0.0;
            // this.agentWei[agent] = (agent == 2) ? 5.0 : 0.0;
            // this.agentHap[agent] = (agent == 3) ? 5.0 : 0.0;
            // this.agentRad[agent] = 0.5;
        }
    }

    // SHADER PROGRAMS
    //
    // crowd_vertex_shader_src, crowd_fragment_shader_src 
    // are from shaders.js built by GRUNT, look at Gruntfile.js
    // https://gruntjs.com/getting-started
    // https://www.npmjs.com/package/grunt-glsl
    //
    // WHENEVER YOU UPDATE A SHADER, RUN grunt IN COMMAND LINE
    //
    // HOW TO INSTALL GRUNT:
    // npm install grunt-glsl
    // sudo npm install -g grunt-cli
    // npm install
    // grunt
    this.tex_shader_program = initShaderProgram(gl, tex_vertex_shader_src, tex_fragment_shader_src);
    this.crowd_shader_program = initShaderProgram(gl, crowd_vertex_shader_src, crowd_fragment_shader_src);

    this.tex_uniforms =
    {
        v_position: gl.getAttribLocation(this.tex_shader_program, 'v_position'),

        agentPositions: gl.getUniformLocation(this.tex_shader_program, 'agentPositions'),
        agentPositionsSize: gl.getUniformLocation(this.tex_shader_program, 'agentPositionsSize'),
        agentPositionsDim: gl.getUniformLocation(this.tex_shader_program, 'agentPositionsDim'),
        agentForwards: gl.getUniformLocation(this.tex_shader_program, 'agentForwards'),
        agentForwardsSize: gl.getUniformLocation(this.tex_shader_program, 'agentForwardsSize'),
        agentForwardsDim: gl.getUniformLocation(this.tex_shader_program, 'agentForwardsDim'),

        time: gl.getUniformLocation(this.tex_shader_program, 'time'),
        texDim: gl.getUniformLocation(this.tex_shader_program, 'texDim'),
        worldDim: gl.getUniformLocation(this.tex_shader_program, 'worldDim'),

        agentTimeOffset: gl.getUniformLocation(this.tex_shader_program, 'agentTimeOffset'),
        agentGender: gl.getUniformLocation(this.tex_shader_program, 'agentGender'),
        agentNervous: gl.getUniformLocation(this.tex_shader_program, 'agentNervous'),
        agentWeight: gl.getUniformLocation(this.tex_shader_program, 'agentWeight'),
        agentHappy: gl.getUniformLocation(this.tex_shader_program, 'agentHappy'),
    };

    this.crowd_uniforms = 
    {
        v_position: gl.getAttribLocation(this.crowd_shader_program, 'v_position'),
        //u_MVP: gl.getUniformLocation(this.crowd_shader_program, 'u_viewProj'),

        resolution: gl.getUniformLocation(this.crowd_shader_program, 'resolution'),
        camera: gl.getUniformLocation(this.crowd_shader_program, 'camera'),
        target: gl.getUniformLocation(this.crowd_shader_program, 'target'),
        time: gl.getUniformLocation(this.crowd_shader_program, 'time'),
        fov: gl.getUniformLocation(this.crowd_shader_program, 'fov'),
        raymarchMaximumDistance: gl.getUniformLocation(this.crowd_shader_program, 'raymarchMaximumDistance'),
        raymarchPrecision: gl.getUniformLocation(this.crowd_shader_program, 'raymarchPrecision'),
        
        //joints: gl.getUniformLocation(this.crowd_shader_program, 'joints'),

        u_image: gl.getUniformLocation(this.crowd_shader_program, 'u_image'),
        texDim: gl.getUniformLocation(this.crowd_shader_program, 'texDim'),
        worldDim: gl.getUniformLocation(this.crowd_shader_program, 'worldDim'),

        agentRadius: gl.getUniformLocation(this.crowd_shader_program, 'agentRadius'),
    };

    // variables to be used in program
    this.quad_vertex_buffer_data = new Float32Array([ 
        -1.0, -1.0, 0.0, 1.0,
         1.0, -1.0, 0.0, 1.0,
        -1.0,  1.0, 0.0, 1.0,
        -1.0,  1.0, 0.0, 1.0,
         1.0, -1.0, 0.0, 1.0,
         1.0,  1.0, 0.0, 1.0]);
    // this.viewMatrix = mat4.create();
    // this.projectionMatrix = mat4.create();
    // this.VP = mat4.create();
    // this.canvas_dimensions = vec2.create();

    gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    gl.enable(gl.SCISSOR_TEST);
  }

  update() {
    // updating values
    //mat4FromArray(this.viewMatrix, camera.modelViewMatrix.elements);
    //mat4FromArray(this.projectionMatrix, camera.projectionMatrix.elements);
    //mat4.multiply(this.VP, this.projectionMatrix, this.viewMatrix);

    // this.canvas_dimensions[0] = canvas.clientWidth;
    // this.canvas_dimensions[1] = canvas.clientHeight;

    // draw
    this.drawScene();
  }

  // positions is an array of vec3
  // forwards is an array of vec3
  // offsets is an array of floats (0 to 360)
  updateAgents(positions, forwards) {
    this.agentPos = positions;
    this.agentFwd = forwards;
    /*
    this.agentPos = [];
    this.agentFwd = [];
    for (var i = 0; i < positions.length; i++)
    {
        try { throw i }
        catch (agent)
        {
            agentPos.push(positions[agent].x);
            agentPos.push(positions[agent].y);
            agentPos.push(positions[agent].z);

            agentFwd.push(forwards[agent].x);
            agentFwd.push(forwards[agent].y);
            agentFwd.push(forwards[agent].z);
        }
    }
    */
  }

  drawScene() {
    ////////////////////////////////////////////////////////////////////////////
    // FOR RENDERING TO TEXTURE
    ////////////////////////////////////////////////////////////////////////////
    gl.scissor(0, 0, this.texDimension, this.texDimension);
    // gl.viewport(0, 0, this.texDimension, this.texDimension);

    // for more info on gl framebuffer texture functions:
    // http://math.hws.edu/graphicsbook/c7/s4.html

    const agent_tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, agent_tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.texDimension, this.texDimension, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, agent_tex, 0);

    /*
    var rbo = GL.createRenderbuffer()
    GL.bindRenderbuffer(GL.RENDERBUFFER, rbo)
    GL.renderbufferStorage(GL.RENDERBUFFER, GL.DEPTH_COMPONENT16, width, height)
    */

    //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, agent_tex, 0);
    //GL.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.RENDERBUFFER, rbo)

    gl.useProgram(this.tex_shader_program);
    
    gl.clear( gl.DEPTH_BUFFER_BIT )

    // vbo
    const tex_vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tex_vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.quad_vertex_buffer_data, gl.STATIC_DRAW);
    
    // vao
    gl.enableVertexAttribArray(this.tex_uniforms.v_position);
    gl.vertexAttribPointer(this.tex_uniforms.v_position, 4, gl.FLOAT, false, 0, 0);

    ////////////////////////////////////////////////////////////////////////////
    // uniforms

    /*
    var agentPos = [];
    for (var i = 0; i < this.numAgents; i++)
    {
        try { throw i }
        catch (pos)
        {
            agentPos.push(-75.0 + 10*pos);
            agentPos.push(0.0);
            agentPos.push(0.0);
        }
    }
    gl.uniform3fv(this.tex_uniforms.agentPositions, agentPos);

    var agentFwd = [];
    for (var j = 0; j < this.numAgents; j++)
    {
        try { throw j }
        catch (fwd)
        {
            agentFwd.push(0.0);
            agentFwd.push(0.0);
            agentFwd.push(1.0);
        }
    }
    gl.uniform3fv(this.tex_uniforms.agentForwards, agentFwd);
    */
    this.setUniform2iv(this.tex_uniforms.agentPositionsSize, this.agentPos.size);
    this.setUniform3iv(this.tex_uniforms.agentPositionsDim, this.agentPos.dimensions);
    gl.activeTexture(gl.TEXTURE0 + 1);
    gl.bindTexture(gl.TEXTURE_2D, this.agentPos.texture);
    this.setUniform1i(this.tex_uniforms.agentPositions, 1);
    // gl.uniform3fv(this.tex_uniforms.agentPositions, this.agentPos);

    this.setUniform2iv(this.tex_uniforms.agentForwardsSize, this.agentFwd.size);
    this.setUniform3iv(this.tex_uniforms.agentForwardsDim, this.agentFwd.dimensions);
    gl.activeTexture(gl.TEXTURE0 + 2);
    gl.bindTexture(gl.TEXTURE_2D, this.agentFwd.texture);
    this.setUniform1i(this.tex_uniforms.agentForwards, 2);
    // gl.uniform3fv(this.tex_uniforms.agentForwards, this.agentFwd);

    this.setUniform1fv(this.tex_uniforms.agentTimeOffset, this.agentOff);
    this.setUniform1fv(this.tex_uniforms.agentGender, this.agentGen);
    this.setUniform1fv(this.tex_uniforms.agentNervous, this.agentNer);
    this.setUniform1fv(this.tex_uniforms.agentWeight, this.agentWei);
    this.setUniform1fv(this.tex_uniforms.agentHappy, this.agentHap);

    this.setUniform1f(this.tex_uniforms.time, (Date.now() - this.startTime) * .001);
    this.setUniform1i(this.tex_uniforms.texDim, this.texDimension);
    this.setUniform1f(this.tex_uniforms.worldDim, this.worldDimension);
    
    ////////////////////////////////////////////////////////////////////////////

    // FINALLY, draw, 6 vertices because double sided
    gl.drawArrays(gl.TRIANGLES, 0, 6);


    ////////////////////////////////////////////////////////////////////////////
    // FOR CROWD SIMULATION MAIN SCENE
    ////////////////////////////////////////////////////////////////////////////

    // fixes resizing window
    gl.scissor(0, 0, canvas.clientWidth, canvas.clientHeight);
    // gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    
    // Now draw the main scene, which is 3D, using the texture.
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Draw to default framebuffer.

    // clear all values before redrawing
    gl.clearColor(0.2, 0.0, 0.2, 1.0);  
    gl.clearDepth(1.0);                 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  

    // useMe()
    gl.useProgram(this.crowd_shader_program);
    
    // vbo
    var quad_vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad_vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.quad_vertex_buffer_data, gl.STATIC_DRAW);
    
    // vao
    gl.enableVertexAttribArray(this.crowd_uniforms.v_position);
    gl.vertexAttribPointer(this.crowd_uniforms.v_position, 4, gl.FLOAT, false, 0, 0);
    
    ////////////////////////////////////////////////////////////////////////////
    // uniforms

    //gl.uniformMatrix4fv(this.crowd_uniforms.u_viewProj, false, this.VP);

    // for sdf walking
    this.setUniform2f(this.crowd_uniforms.resolution, canvas.clientWidth, canvas.clientHeight);
    this.setUniform1f(this.crowd_uniforms.time, (Date.now() - this.startTime) * .001);
    this.setUniform1f(this.crowd_uniforms.fov, camera.fov * Math.PI / 180);
    this.setUniform1f(this.crowd_uniforms.raymarchMaximumDistance, this.worldDimension);
    this.setUniform1f(this.crowd_uniforms.raymarchPrecision, 0.01);
    this.setUniform3f(this.crowd_uniforms.camera, camera.position.x, camera.position.y, camera.position.z);
    this.setUniform3f(this.crowd_uniforms.target, 0, 10, 0);

    // NOTE gl.uniform3fv takes in ARRAY OF FLOATS, NOT ARRAY OF VEC3S
    // [vec3(1, 2, 3), vec3(4, 5, 6)] must be converted to [1, 2, 3, 4, 5, 6]
    //gl.uniform3fv(this.crowd_uniforms.joints, this.walker.update());

    this.setUniform1i(this.crowd_uniforms.texDim, this.texDimension);
    this.setUniform1f(this.crowd_uniforms.worldDim, this.worldDimension);
    this.setUniform1fv(this.crowd_uniforms.agentRadius, this.agentRad);

    // PASS TEXTURE OF AGENT POSITIONS FROM FRAME BUFFER    
    // passing agent data texture to crowd shader
    this.setUniform1i(this.crowd_uniforms.u_image, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, agent_tex);

    ////////////////////////////////////////////////////////////////////////////

    // draw, 6 vertices because double sided
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // after draw
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);        
  }

  setUniform1i(loc, value) {
    if (this.uniforms[loc] !== value) {
      gl.uniform1i(loc, value);
      this.uniforms[loc] = value;
    }
  }
  setUniform1f(loc, value) {
    if (this.uniforms[loc] !== value) {
      gl.uniform1f(loc, value);
      this.uniforms[loc] = value;
    }
  }
  setUniform1fv(loc, value) {
    if (this.uniforms[loc] !== value) {
      gl.uniform1fv(loc, value);
      this.uniforms[loc] = value;
    }
  }
  setUniform2i(loc, value1, value2) {
    const uniform = this.uniforms[loc] || [];
    if (uniform[0] !== value1 || uniform[1] !== value2) {
      gl.uniform2i(loc, value1, value2);
      this.uniforms[loc] = [value1, value2];
    }
  }
  setUniform2f(loc, value1, value2) {
    const uniform = this.uniforms[loc] || [];
    if (uniform[0] !== value1 || uniform[1] !== value2) {
      gl.uniform2f(loc, value1, value2);
      this.uniforms[loc] = [value1, value2];
    }
  }
  setUniform2fv(loc, value) {
    const uniform = this.uniforms[loc] || [];
    if (uniform[0] !== value[0] || uniform[1] !== value[1]) {
      gl.uniform2fv(loc, value);
      this.uniforms[loc] = value;
    }
  }
  setUniform2iv(loc, value) {
    const uniform = this.uniforms[loc] || [];
    if (uniform[0] !== value[0] || uniform[1] !== value[1]) {
      gl.uniform2iv(loc, value);
      this.uniforms[loc] = value;
    }
  }
  setUniform3i(loc, value1, value2, value3) {
    const uniform = this.uniforms[loc] || [];
    if (uniform[0] !== value1 || uniform[1] !== value2 || uniform[2] !== value3) {
      gl.uniform3i(loc, value1, value2, value3);
      this.uniforms[loc] = [value1, value2, value3];
    }
  }
  setUniform3f(loc, value1, value2, value3) {
    const uniform = this.uniforms[loc] || [];
    if (uniform[0] !== value1 || uniform[1] !== value2 || uniform[2] !== value3) {
      gl.uniform3f(loc, value1, value2, value3);
      this.uniforms[loc] = [value1, value2, value3];
    }
  }
  setUniform3fv(loc, value) {
    const uniform = this.uniforms[loc] || [];
    if (uniform[0] !== value[0] || uniform[1] !== value[1] || uniform[2] !== value[2]) {
      gl.uniform3fv(loc, value);
      this.uniforms[loc] = value;
    }
  }
  setUniform3iv(loc, value) {
    const uniform = this.uniforms[loc] || [];
    if (uniform[0] !== value[0] || uniform[1] !== value[1] || uniform[2] !== value[2]) {
      gl.uniform3iv(loc, value);
      this.uniforms[loc] = value;
    }
  }
}

export default Renderer;
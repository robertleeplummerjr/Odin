//#gljs varname: 'tex_vertex_shader_src' 

#version 300 es

in vec4 v_position;

void main(void) 
{
  gl_Position = v_position;
}
#version 300 es
precision mediump float;

in vec2 a_position;
uniform vec2 u_translation;

void main() {
  vec2 pos = a_position + u_translation;
  gl_Position = vec4(pos, 0.0, 1.0);
}
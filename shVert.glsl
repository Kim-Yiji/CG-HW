#version 300 es
precision mediump float;

in vec2 a_position;
uniform vec2 u_translation;

void main() {
  // 각 정점에 이동량을 더해 최종 좌표를 계산
  vec2 pos = a_position + u_translation;
  gl_Position = vec4(pos, 0.0, 1.0);
}
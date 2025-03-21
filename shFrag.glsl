#version 300 es
precision mediump float;

out vec4 outColor;

void main() {
  // 모든 프래그먼트를 빨간색으로 칠합니다.
  outColor = vec4(1.0, 0.0, 0.0, 1.0);
}

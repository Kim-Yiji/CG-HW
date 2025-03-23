#version 300 es
precision mediump float;

layout(location = 0) in vec3 aPos;

uniform float positionX;
uniform float positionY;

void main() {
    vec3 pos = aPos;
    pos.x += positionX;
    pos.y += positionY;
    gl_Position = vec4(pos, 1.0);
}
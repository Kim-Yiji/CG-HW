#version 300 es

layout (location = 0) in vec3 aPos;

uniform float positionX;
uniform float positionY;

void main() {
    gl_Position = vec4(aPos[0] + positionX, aPos[1] + positionY, aPos[2], 1.0);
} 
#version 300 es
layout(location = 0) in vec3 aPosition;

uniform vec2 uPosition;

void main() {
    gl_Position = vec4(aPosition.xy + uPosition, 0.0, 1.0);
}
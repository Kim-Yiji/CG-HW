#version 300 es
layout(location = 0) in vec2 a_position;

void main(){
    gl_PointSize = 10.0;
    gl_Position = vec4(a_position, 0.0, 1.0);
}

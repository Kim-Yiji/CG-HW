// util.js에서 resizeAspectRatio 함수를 import
import { resizeAspectRatio } from './util.js';

// HTML 파일에서 canvas 요소를 가져와서 WebGL2 context를 얻음
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    console.error('WebGL 2 is not supported by your browser.');
}

//전역 변수 명명
let program;
let translation = [0.0, 0.0]; //정사각형 초기 위치 (캔버스 중앙, clip space 기준)
const step = 0.01; // Arrow key 누르면서 이동하는 거리
let translationUniformLocation;

function init(){
    //쉐이더 load
    Promise.all([
        fetch('shVert.glsl').then((response) => response.text()),
        fetch('shFrag.glsl').then((response) => response.text())
    ]).then(([vsSource, fsSource]) => {
        program = createProgram(vsSource, fsSource);
        gl.useProgram(program);

        initBuffers();

        // vertex shader의 u_translation uniform 위치를 얻어 초기값을 전달
        translationUniformLocation = gl.getUniformLocation(program, 'u_translation');
        gl.uniform2fv(translationUniformLocation, translation);

        setupEventListeners();
        // 창 크기에 따라 canvas의 비율(1:1)을 유지하도록 함
        resizeAspectRatio(gl, canvas, render);
        render();
    })
    .catch(err => console.error('Shader load error', err));
}

function createProgram(vsSource, fsSource) {
    const vertexShader = createShader(vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(fsSource, gl.FRAGMENT_SHADER,);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

function createShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

let vertexBuffer;
function initBuffers() {
    const vertices = new Float32Array([
        -0.1, -0.1,
         0.1, -0.1,
         0.1,  0.1,
        -0.1,  0.1
      ]);
      ; // 정사각형 4개의 꼭지점

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
}

function setupEventListeners() {
  // 화살표 키 이벤트로 정사각형 이동 (타이트한 경계 처리함함)
  window.addEventListener('keydown', (event) => {
    let moved = false;
    const halfSize = 0.1;  // 정사각형의 반 길이

    if (event.key === 'ArrowUp') {
      if (translation[1] + step + halfSize > 1.0) {
        translation[1] = 1.0 - halfSize;
        moved = true;
      } else {
        translation[1] += step;
        moved = true;
      }
    } else if (event.key === 'ArrowDown') {
      if (translation[1] - step - halfSize < -1.0) {
        translation[1] = -1.0 + halfSize;
        moved = true;
      } else {
        translation[1] -= step;
        moved = true;
      }
    } else if (event.key === 'ArrowLeft') {
      if (translation[0] - step - halfSize < -1.0) {
        translation[0] = -1.0 + halfSize;
        moved = true;
      } else {
        translation[0] -= step;
        moved = true;
      }
    } else if (event.key === 'ArrowRight') {
      if (translation[0] + step + halfSize > 1.0) {
        translation[0] = 1.0 - halfSize;
        moved = true;
      } else {
        translation[0] += step;
        moved = true;
      }
    }
    if (moved) {
      gl.uniform2fv(translationUniformLocation, translation);
      render();
    }
  });
  
  // keyup 이벤트 
  window.addEventListener('keyup', (event) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) {
      // 현재는 keydown에서 처리됨
    }
  });
}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    // TRIANGLE_FAN 방식으로 정사각형 그리기
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}
  
  
window.addEventListener('resize', () => {
  resizeAspectRatio(gl, canvas, render);
});

window.onload = init;
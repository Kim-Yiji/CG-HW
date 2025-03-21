/*-------------------------------------------------------------------------
06_FlipTriangle.js

1) Change the color of the triangle by keyboard input
   : 'r' for red, 'g' for green, 'b' for blue
2) Flip the triangle vertically by keyboard input 'f' 
---------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, updateText } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let position = [0.0, 0.0];
const moveStep = 0.01; 
const squareSize = 0.2;

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 600;
    canvas.height = 600;

    resizeAspectRatio(gl, canvas);

    // Initialize WebGL settings
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    return new Shader(gl, vertexShaderSource, fragmentShaderSource);
}
let keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
};

function setupKeyboardEvents() { // 키 반복 이벤트 설정
    document.addEventListener('keydown', (event) => {
        if (event.key in keys) keys[event.key] = true;
    });
    document.addEventListener('keyup', (event) => {
        if (event.key in keys) keys[event.key] = false;
    });
}

function setupBuffers(shader) {
    const vertices = new Float32Array([
         0.0,  0.0, 0.0,  // center
        -0.1, -0.1, 0.0,  // Bottom left
         0.1, -0.1, 0.0,  // Bottom right
         0.1,  0.1, 0.0,  // Top right
        -0.1,  0.1, 0.0,  // Top left
        -0.1, -0.1, 0.0   // Bottom left 
   ]);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    shader.setAttribPointer("aPosition", 3, gl.FLOAT, false, 0, 0); // 0이라고 하면 안됨

    return vao;
}

function updatePosition() {
    if (keys.ArrowUp) {
        const next = position[1] + moveStep;
        if (next + squareSize / 2 > 1.0) {
            position[1] = 1.0 - squareSize / 2;
        } else {
            position[1] = next;
        }
    }

    if (keys.ArrowDown) {
        const next = position[1] - moveStep;
        if (next - squareSize / 2 < -1.0) {
            position[1] = -1.0 + squareSize / 2;
        } else {
            position[1] = next;
        }
    }

    if (keys.ArrowRight) {
        const next = position[0] + moveStep;
        if (next + squareSize / 2 > 1.0) {
            position[0] = 1.0 - squareSize / 2;
        } else {
            position[0] = next;
        }
    }

    if (keys.ArrowLeft) {
        const next = position[0] - moveStep;
        if (next - squareSize / 2 < -1.0) {
            position[0] = -1.0 + squareSize / 2;
        } else {
            position[0] = next;
        }
    }
}

function render(vao, shader) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    updatePosition();

    let color = [1.0, 0.0, 0.0, 1.0]; // 빨강 사각형

    shader.setVec2("uPosition", position);
    shader.setVec4("uColor", color);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 6);

    requestAnimationFrame(() => render(vao, shader));
}

async function main() {
    try {

        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        shader = await initShader();

        setupText(canvas, "Use arrow keys to move the rectangle", 1);

        setupKeyboardEvents();
        
        shader.use();
        vao = setupBuffers(shader);
        
        render(vao, shader);

        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

// call main function
main().then(success => {
    if (!success) {
        console.log('프로그램을 종료합니다.');
        return;
    }
}).catch(error => {
    console.error('프로그램 실행 중 오류 발생:', error);
});

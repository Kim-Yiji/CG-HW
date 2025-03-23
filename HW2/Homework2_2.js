import { resizeAspectRatio, setupText, updateText } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let positionX = 0.0;
let positionY = 0.0;
const moveStep = 0.01;

// 키 상태 저장용
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
};

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 600;
    canvas.height = 600;

    resizeAspectRatio(gl, canvas);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert2.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

function setupKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
        if (event.key in keys) keys[event.key] = true;
    });

    document.addEventListener('keyup', (event) => {
        if (event.key in keys) keys[event.key] = false;
    });
}

function setupBuffers() {
    const vertices = new Float32Array([
        -0.1, -0.1, 0.0,
         0.1, -0.1, 0.0,
         0.1,  0.1, 0.0,
        -0.1,  0.1, 0.0,
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    shader.setAttribPointer('aPos', 3, gl.FLOAT, false, 0, 0);
}

function updatePosition() {
    if (keys.ArrowLeft) positionX -= moveStep;
    if (keys.ArrowRight) positionX += moveStep;
    if (keys.ArrowUp) positionY += moveStep;
    if (keys.ArrowDown) positionY -= moveStep;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    updatePosition();

    const color = [1.0, 0.0, 0.0, 1.0]; // 빨간색
    shader.setVec4("uColor", color);
    shader.setFloat("positionX", positionX);
    shader.setFloat("positionY", positionY);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);  // 4개의 꼭짓점으로 구성된 사각형

    requestAnimationFrame(render);
}

async function main() {
    try {
        if (!initWebGL()) throw new Error('WebGL 초기화 실패');

        await initShader();
        setupText(canvas, "Use arrow keys to move the rectangle", 1);
        setupKeyboardEvents();

        setupBuffers(shader);
        shader.use();

        render();
        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

main().then(success => {
    if (!success) {
        console.log('프로그램을 종료합니다.');
    }
}).catch(error => {
    console.error('프로그램 실행 중 오류 발생:', error);
});
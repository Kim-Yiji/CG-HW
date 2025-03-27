/*-------------------------------------------------------------------------
Homework3

left mouse button을 원의 중심에 click 한 채로 dragging 하여 반지름을 결정하고 각도를 100개로 쪼갠 형태로 선을 연결해 closedline을 이용하여 circle을 그린다. 
원이 ndc를 넘어갈 경우 범위 안의 원만 그려진다.
임시 원일때는 회색이고 최종 원의 color는 빨간색임.

그 후 left mouse button을 click하면 선분을 그리기 시작하고, 
button up을 하지 않은 상태로 마우스를 움직이면 임시 선분을 그리고, 
button up을 하면 최종 선분을 저장하고 임시 선분을 삭제함.
선분의 색깔은 회색임.

그 후 원과 선분의 판별식을 계산하여 만나는 점의 개수와 위치를 구한 후 intersection point를 size 10pt로 표시한다.

그리고 각 단계마다 
원이 결정되면 원의 정보가 맨 윗줄에 ex) Circle: center (-0.42, 0.11) radius = 0.49
선이 결정되면 선의 정도가 두번째 줄에 ex) Line segment: (0.20, 0.42) ~ (-0.74, -0.50) 
그리고 교차점의 정보가 제일 아래줄에 표시된다. ex) Intersection Points: 2 Point 1: (-0.59, -0.36) Point 2: (0.05, 0.28)
ex) Intersection Points: 1 Point 1: (-0.59, -0.36)
ex) No Intersection
---------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global variables
let isInitialized = false; // global variable로 event listener가 등록되었는지 확인
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let positionBuffer;
let isCircleDrawing = false;
let isCircleFinalized = false
let isLineDrawing = false;
let startPoint = null;
let tempEndPoint = null;
let lines = [];
let intersectionPoints = [];
let circleCenter = null;
let circleRadius = 0;
let circlePoints = [];
let textOverlay;
let textOverlay2;
let textOverlay3;
let axes = new Axes(gl, 0.85);

// DOMContentLoaded event
// 1) 모든 HTML 문서가 완전히 load되고 parsing된 후 발생
// 2) 모든 resource (images, css, js 등) 가 완전히 load된 후 발생
// 3) 모든 DOM 요소가 생성된 후 발생
// DOM: Document Object Model로 HTML의 tree 구조로 표현되는 object model 
// 모든 code를 이 listener 안에 넣는 것은 mouse click event를 원활하게 처리하기 위해서임

// mouse 쓸 때 main call 방법
document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => { // call main function
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 0.8, 0.9, 1.0);
    
    return true;
}

function setupCanvas() {
    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
}

function setupBuffers(shader) {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
}

// 좌표 변환 함수: 캔버스 좌표를 WebGL 좌표로 변환
// 캔버스 좌표: 캔버스 좌측 상단이 (0, 0), 우측 하단이 (canvas.width, canvas.height)
// WebGL 좌표 (NDC): 캔버스 좌측 상단이 (-1, 1), 우측 하단이 (1, -1)
function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,
        -((y / canvas.height) * 2 - 1)
    ];
}

/* 
    browser window
    +----------------------------------------+
    | toolbar, address bar, etc.             |
    +----------------------------------------+
    | browser viewport (컨텐츠 표시 영역)       | 
    | +------------------------------------+ |
    | |                                    | |
    | |    canvas                          | |
    | |    +----------------+              | |
    | |    |                |              | |
    | |    |      *         |              | |
    | |    |                |              | |
    | |    +----------------+              | |
    | |                                    | |
    | +------------------------------------+ |
    +----------------------------------------+

    *: mouse click position

    event.clientX = browser viewport 왼쪽 경계에서 마우스 클릭 위치까지의 거리
    event.clientY = browser viewport 상단 경계에서 마우스 클릭 위치까지의 거리
    rect.left = browser viewport 왼쪽 경계에서 canvas 왼쪽 경계까지의 거리
    rect.top = browser viewport 상단 경계에서 canvas 상단 경계까지의 거리

    x = event.clientX - rect.left  // canvas 내에서의 클릭 x 좌표
    y = event.clientY - rect.top   // canvas 내에서의 클릭 y 좌표
*/

// 원 그리기 시작
function handleMouseDownForCircle(event) {
    if (isCircleFinalized) return

    event.preventDefault();
    event.stopPropagation();
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    console.log("start circle")
    
    if (!isCircleDrawing) {
        let [glX, glY] = convertToWebGLCoordinates(x, y);
        circleCenter = [glX, glY];
        isCircleDrawing = true;  // 원 그리기 상태 시작
        isCircleFinalized = false; // 원이 아직 완성되지 않음
    }
}

// 원 그리기 진행
function handleMouseMoveForCircle(event) {
    if (isCircleDrawing) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        let [glX, glY] = convertToWebGLCoordinates(x, y);
        circleRadius = Math.sqrt(Math.pow(glX - circleCenter[0], 2) + Math.pow(glY - circleCenter[1], 2));

        circlePoints = [];
        console.log("draw circle")
        for (let i = 0; i < 100; i++) {
            let angle = (i / 100) * 2 * Math.PI;
            let px = circleCenter[0] + circleRadius * Math.cos(angle);
            let py = circleCenter[1] + circleRadius * Math.sin(angle);
            circlePoints.push([px, py]);
        }
    }
    render();
}

// 마우스 업 -> 원 그리기 종료 (원 고정)
function handleMouseUpForCircle() {
    if (isCircleDrawing) {
        // 원이 완성된 후 선 그리기로 상태 전환
        console.log("iscircledrawing")
        isCircleFinalized = true; // 원이 고정됨
        render();
        console.log(isCircleDrawing, isCircleFinalized)
        updateText(textOverlay, `Circle: center (${circleCenter[0].toFixed(2)}, ${circleCenter[1].toFixed(2)}) radius = ${circleRadius.toFixed(2)}`);
        isCircleDrawing = false; // 원 그리기 종료
        console.log(isCircleDrawing, isCircleFinalized)
        setupMouseEventsForLine();  // 선 그리기 이벤트로 전환
    }
}

// 선분 그리기 시작
function handleMouseDownForLine(event) {
    if (!isCircleFinalized) return; // 원을 그린 후에만 선을 그릴 수 있음

    event.preventDefault();
    event.stopPropagation();
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let [glX, glY] = convertToWebGLCoordinates(x, y);

    console.log("start line")

    startPoint = [glX, glY];
    isLineDrawing = true;
}

// 선분 그리기 진행
function handleMouseMoveForLine(event) {
    if (isLineDrawing && startPoint) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        let [glX, glY] = convertToWebGLCoordinates(x, y);
        tempEndPoint = [glX, glY];

        console.log("draw line")
        render(); 
    }
}

// 마우스 업 -> 선분 저장, 교차점 계산
function handleMouseUpForLine(event) {
    if (isLineDrawing && startPoint && tempEndPoint) {
        lines.push([...startPoint, ...tempEndPoint]);

        updateText(textOverlay2, `Line segment: (${startPoint[0].toFixed(2)}, ${startPoint[1].toFixed(2)}) ~ (${tempEndPoint[0].toFixed(2)}, ${tempEndPoint[1].toFixed(2)})`);

        intersectionPoints = calculateIntersection(circleCenter, circleRadius, startPoint, tempEndPoint);

        console.log("get intersection", intersectionPoints, intersectionPoints.length)

        handleIntersectionResults(intersectionPoints);

        isLineDrawing = false;
        startPoint = null;
        tempEndPoint = null;
        render();
    }
}

// 원 그리기와 선 그리기 이벤트 설정 함수들
function setupMouseEventsForCircle() {
    canvas.addEventListener("mousedown", handleMouseDownForCircle);
    canvas.addEventListener("mousemove", handleMouseMoveForCircle);
    canvas.addEventListener("mouseup", handleMouseUpForCircle);
}

function setupMouseEventsForLine() {
    canvas.addEventListener("mousedown", handleMouseDownForLine);
    canvas.addEventListener("mousemove", handleMouseMoveForLine);
    canvas.addEventListener("mouseup", handleMouseUpForLine);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.use();
    
    // 원 그리기
    if (circleCenter && circlePoints.length > 0) {
        let circleColor = isCircleFinalized ? [1.0, 0.0, 0.0, 1.0] : [0.5, 0.5, 0.5, 1.0];  // 빨간색 원(완성된 원), 회색 원(임시 원)
        shader.setVec4("u_color", circleColor);  
        let flatCirclePoints = [].concat(...circlePoints);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatCirclePoints), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINE_LOOP, 0, circlePoints.length);
    }

    // 선분 그리기
    let num = 0;
    for (let line of lines) {
        shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]); // 회색 선분
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINES, 0, 2);
        num++;
    }

    if (isLineDrawing && startPoint && tempEndPoint) {
        shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]); // 회색 임시 선분
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...startPoint, ...tempEndPoint]), 
                      gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINES, 0, 2);
    }

    // 교차점 그리기 (교차점이 있을 때만 그리기)
    if (intersectionPoints.length > 0) {
        console.log("draw the intersection point");
        intersectionPoints.forEach(point => {
            // 교차점 위치에서 바로 점을 그리기
            const pointVertices = [
                point[0], point[1],  // 교차점 위치
            ];

            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointVertices), gl.STATIC_DRAW);

            shader.use();

            // 노란색으로 점을 그린다
            shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]);  // 노란색

            gl.bindVertexArray(vao);
            gl.drawArrays(gl.POINTS, 0, 1);  // gl_PointSize에서 설정된 크기로 점을 그림
        });
    }

    axes.draw(mat4.create(), mat4.create());
}

// 교차점 계산 함수 (원과 선분의 교차점 계산)
function calculateIntersection(circleCenter, circleRadius, lineStart, lineEnd) {
    const h = circleCenter[0]; 
    const k = circleCenter[1];
    const r = circleRadius;
    
    const x1 = lineStart[0], y1 = lineStart[1];
    const x2 = lineEnd[0], y2 = lineEnd[1];
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    const a = dx * dx + dy * dy;
    const b = 2 * (dx * (x1 - h) + dy * (y1 - k));
    const c = (x1 - h) * (x1 - h) + (y1 - k) * (y1 - k) - r * r;
    
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) {
        return []; // 교차점 없음
    }
    
    // 두 교차점 계산
    const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
    
    // 교차점이 선분 위에 있는지 확인
    const point1 = (t1 >= 0 && t1 <= 1) ? [x1 + t1 * dx, y1 + t1 * dy] : null;  // t1이 선분 위에 있을 때만 교차점
    const point2 = (t2 >= 0 && t2 <= 1) ? [x1 + t2 * dx, y1 + t2 * dy] : null;  // t2가 선분 위에 있을 때만 교차점
    
    // t1과 t2가 같으면 두 번째 교차점은 null (접선일 경우)
    if (discriminant === 0) {
        return point1 ? [point1] : [];
    }
    
    // 두 교차점이 모두 유효하다면, 두 개의 교차점을 반환
    if (point1 && point2) {
        return [point1, point2];
    }
    
    // 하나의 교차점만 유효하다면, 하나만 반환
    if (point1) {
        return [point1];
    }
    if (point2) {
        return [point2];
    }

    return [];  // 교차점이 하나도 없으면 빈 배열 반환
}

// 교차점 정보 출력 후 정사각형 그리기
function handleIntersectionResults(intersectionPoints, pointSize) {
    if (intersectionPoints.length === 0) {
        updateText(textOverlay3, "Intersection Points: No Intersection");
    } else {
        let intersectionText = `Intersection Points: ${intersectionPoints.length}`;
        
        intersectionPoints.forEach((point, index) => {
            if (point) {  // point2가 null일 경우는 출력하지 않음
                intersectionText += ` Point ${index + 1}: (${point[0].toFixed(2)}, ${point[1].toFixed(2)})`;
            }
        });
        
        updateText(textOverlay3, intersectionText);
    }
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    return new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        // 셰이더 초기화
        shader = await initShader();
        
        // 나머지 초기화
        setupCanvas();
        setupBuffers(shader);
        shader.use();
        
        // 초기 텍스트 초기화
        textOverlay = setupText(canvas, "", 1);
        textOverlay2 = setupText(canvas, "", 2);
        textOverlay3 = setupText(canvas, "", 3);

        console.log("main isCircleFinalized", isCircleFinalized);
        
        // 마우스 이벤트 설정
        // 원이 완성되지 않았다면 원 그리기 이벤트를 설정
        if (!isCircleFinalized) {
            setupMouseEventsForCircle();
            console.log("main draw circle finished")
        }
        // 원이 완성되면 선 그리기 이벤트로 넘어감
        else {
            setupMouseEventsForLine();
            console.log("main draw line possible?")
        }
        
        // 초기 렌더링
        render();

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

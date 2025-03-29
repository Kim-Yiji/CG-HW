/*
기능 요약:
1) 원(Circle) 입력:
   - 마우스 다운 시 원의 중심
   - 드래그로 반지름 실시간 변경 (임시 원)
   - 마우스 업 시 원 확정 (첫 번째 줄에 정보)

2) 선분(Line) 입력:
   - 07_LineSegments 방식으로 클릭/드래그
   - 임시 선분(회색), 업 시 빨간색 확정 (두 번째 줄에 정보)

3) Circle & Line 교차점 계산:
   - 선분 입력 끝나자마자 교차점 계산
   - 교차점 있으면 세 번째 줄에 정보 표시
   - 교차점은 gl.POINTS (크기 10)로 화면에 표시
*/

import { resizeAspectRatio, setupText, updateText, Axes} from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

let isInitialized = false; 
let shader;          
let vao;        
let positionBuffer;  // circle or line vertices
let pointBuffer;     // intersection points
let axes = new Axes(gl, 0.85);

// 텍스트 오버레이
let textOverlay1;       // Circle info
let textOverlay2;       // Line info
let textOverlay3;       // Intersection info

// --- Circle 상태 ---
let circleCenter = null; 
let circleRadius = 0.0;
let isCircleDone = false;   // 원 입력이 끝났는지
let isCircleDragging = false; // 원 드래그 중인지

// --- Line 상태 ---
let isLineDrawing = false;
let startPoint = null;    // 선분 시작점
let lineEnd = null;      // 선분 확정 끝점
let lineTempEnd = null;  // 드래그 임시점
let isLineDone = false;  // 선분 입력이 끝났는지

// --- Intersection ---
let intersectionPoints = []; // 교차점 (최대 2개)
let isIntersectionComputed = false;

// mouse 쓸 때 main call 
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

// ====================초기화 함수들==================== //
//WebGL 초기화
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


async function initShader() {
  const vertexShaderSource = await readShaderFile('shVert.glsl');
  const fragmentShaderSource = await readShaderFile('shFrag.glsl');
  // Shader 클래스를 이용해 Shader 생성
  return new Shader(gl, vertexShaderSource, fragmentShaderSource);;
}

// VAO & 버퍼 초기화
function setupBuffers(shader) {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
  
    // position buffer (원 or 선)
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // 아직 데이터는 없음, 이후 동적으로 업데이트
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.DYNAMIC_DRAW);
  
    // 셰이더 속성 연결 (a_position)
    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);
  
    // 교차점 표시용 point buffer
    pointBuffer = gl.createBuffer();
  
    gl.bindVertexArray(null);
  }


// ====================이벤트==================== //
// 1단계: Circle 입력
function setupCircleEvents() {
    canvas.addEventListener('mousedown', onCircleMouseDown);
    canvas.addEventListener('mousemove', onCircleMouseMove);
    canvas.addEventListener('mouseup', onCircleMouseUp);
  }
function removeCircleEvents() {
    canvas.removeEventListener('mousedown', onCircleMouseDown);
    canvas.removeEventListener('mousemove', onCircleMouseMove);
    canvas.removeEventListener('mouseup', onCircleMouseUp);
}

function onCircleMouseDown(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    // 원의 중심 설정
    if (!isCircleDone && !isLineDone) {
      // 1) browser 좌표 (x,y)
      const rect = canvas.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const y = evt.clientY - rect.top;

      // 2) webgl 좌표 변환
      const [glX, glY] = convertToWebGLCoordinates(x, y);

      circleCenter = [glX, glY];
      circleRadius = 0.0;
      isCircleDragging = true;
    }
}
function onCircleMouseMove(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    if (isCircleDragging) {
      // 1) browser 좌표
      const rect = canvas.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const y = evt.clientY - rect.top;

      // 2) webgl 좌표 변환
      const [mx, my] = convertToWebGLCoordinates(x, y);

      // 반지름 업데이트
      const dx = mx - circleCenter[0];
      const dy = my - circleCenter[1];
      circleRadius = Math.sqrt(dx*dx + dy*dy);
      render();
    }
}
function onCircleMouseUp(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    if (isCircleDragging) {
      isCircleDragging = false;
      isCircleDone = true;
      // 첫 번째 라인에 circle info 표시
      updateText(textOverlay1, `Circle: center (${circleCenter[0].toFixed(2)}, ${circleCenter[1].toFixed(2)}) radius = ${circleRadius.toFixed(2)}`);
      // 원 입력 끝났으니, line input 모드로 이동
      removeCircleEvents();
      setupLineEvents();
      render();
    }
}
  
// 2단계: Line segment 입력
function setupLineEvents() {
    canvas.addEventListener('mousedown', onLineMouseDown);
    canvas.addEventListener('mousemove', onLineMouseMove);
    canvas.addEventListener('mouseup', onLineMouseUp);
}

function removeLineEvents() {
    canvas.removeEventListener('mousedown', onLineMouseDown);
    canvas.removeEventListener('mousemove', onLineMouseMove);
    canvas.removeEventListener('mouseup', onLineMouseUp);
}
  
function onLineMouseDown(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    if (!isLineDone) {
      // 1) browser 좌표
      const rect = canvas.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const y = evt.clientY - rect.top;

      // 2) WebGL 좌표
      const [glX, glY] = convertToWebGLCoordinates(x, y);

      startPoint = [glX, glY];
      lineEnd = null;
      lineTempEnd = null;
      isLineDrawing = true;
    }
}
function onLineMouseMove(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    if (isLineDrawing) {
      // 1) browser 좌표
      const rect = canvas.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const y = evt.clientY - rect.top;

      // 2) WebGL 좌표
      const [mx, my] = convertToWebGLCoordinates(x, y);

      // 임시 끝점
      lineTempEnd = [mx, my];
      render();
    }
}
function onLineMouseUp(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    if (isLineDrawing) {
      isLineDrawing = false;
      lineEnd = lineTempEnd;
      isLineDone = true;
      // 두 번째 라인에 line segment info 표시
      updateText(textOverlay2, `Line segment: (${startPoint[0].toFixed(2)}, ${startPoint[1].toFixed(2)}) ~ (${lineEnd[0].toFixed(2)}, ${lineEnd[1].toFixed(2)})`);
      // 교차점 계산
      computeIntersection();
      removeLineEvents();
      render();
    }
}
  
// ===================== 교차점 계산 =====================
function computeIntersection() {
    // 원: circleCenter, circleRadius
    // 선분: startPoint, lineEnd
    intersectionPoints = [];
    if (!circleRadius || !startPoint || !lineEnd) {
      return;
    }
    const pts = circleLineIntersection(circleCenter, circleRadius, startPoint, lineEnd);
    intersectionPoints = pts;
    isIntersectionComputed = true;
  
    // 세 번째 라인에 intersection 정보
    if (pts.length === 0) {
      updateText(textOverlay3, "No intersection");
    } else {
      // ex. Intersection Points: 2
      // Point 1: (-0.59, -0.36) Point 2: (0.05, 0.28)
      let msg = `Intersection Points: ${pts.length}`;
      pts.forEach((p, i) => {
        msg += `  Point ${i+1}: (${p[0].toFixed(2)}, ${p[1].toFixed(2)})`;
      });
      updateText(textOverlay3, msg);
    }
}
  
// ===================== 보조 함수들 =====================
  
// 마우스 이벤트 → NDC 변환
function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,
        -((y / canvas.height) * 2 - 1)
    ];
}
  
// 원-선분 교차점 계산
function circleLineIntersection(center, radius, p1, p2) {
    // Parametric line: P(t) = p1 + t*(p2 - p1), 0 <= t <= 1
    // Circle: (x - cx)^2 + (y - cy)^2 = r^2
    // Solve for t. Then check 0 <= t <= 1. 
    // Return up to 2 intersection points.
  
    const cx = center[0], cy = center[1];
    const x1 = p1[0], y1 = p1[1];
    const x2 = p2[0], y2 = p2[1];
  
    const dx = x2 - x1;
    const dy = y2 - y1;
  
    // Coeffs for quadratic equation At^2 + Bt + C = 0
    const A = dx*dx + dy*dy;
    const B = 2*(dx*(x1 - cx) + dy*(y1 - cy));
    const C = (x1 - cx)*(x1 - cx) + (y1 - cy)*(y1 - cy) - radius*radius;
  
    const discriminant = B*B - 4*A*C;
    if (A === 0) {
      // p1, p2가 같은 점인 경우
      return [];
    }
    if (discriminant < 0) {
      // no intersection
      return [];
    } else if (discriminant === 0) {
      // one intersection
      const t = -B / (2*A);
      if (t>=0 && t<=1) {
        const ix = x1 + t*dx;
        const iy = y1 + t*dy;
        return [[ix, iy]];
      }
      return [];
    } else {
      // two intersections
      const sqrtD = Math.sqrt(discriminant);
      const t1 = (-B + sqrtD)/(2*A);
      const t2 = (-B - sqrtD)/(2*A);
  
      let result = [];
      [t1, t2].forEach(t => {
        if (t>=0 && t<=1) {
          const ix = x1 + t*dx;
          const iy = y1 + t*dy;
          result.push([ix, iy]);
        }
      });
      return result;
    }
}
  
// ===================== 렌더링 =====================
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
  
    shader.use();
    gl.bindVertexArray(vao);
  
    // 1) 원 그리기 (있다면)
    if (circleRadius > 0) {
      // circleVertices = make circle by e.g. 60 segments
      const segs = 60;
      const verts = [];
      for (let i=0; i<segs; i++) {
        const theta = 2*Math.PI*i/segs;
        const x = circleCenter[0] + circleRadius*Math.cos(theta);
        const y = circleCenter[1] + circleRadius*Math.sin(theta);
        verts.push(x, y);
      }
  
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);

      //원 확정 전에는 회색, 확정 후에는 핑크
      if (isCircleDone) {
        shader.setVec4("u_color", [0.96, 0.0, 0.96, 1.0]); // 핑크
      } else {
        shader.setVec4("u_color", [0.7, 0.7, 0.7, 1.0]); // 회색
      }
      gl.drawArrays(gl.LINE_LOOP, 0, segs);
    }
  
    // 2) 선분 그리기
    if (startPoint && (lineEnd || lineTempEnd)) {
      // 임시 or 확정
      let endP = lineEnd || lineTempEnd; 
      // 선분 vertex
      const lineVerts = new Float32Array([
        startPoint[0], startPoint[1], 
        endP[0], endP[1]
      ]);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, lineVerts, gl.DYNAMIC_DRAW);
  
      if (lineEnd) {
        // 최종 선분 - 파스텔 블루
        shader.setVec4("u_color", [0.47, 0.51, 0.75, 1.0]);
      } else {
        // 드래그 중 임시 선분(회색)
        shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]);
      }
      gl.drawArrays(gl.LINES, 0, 2);
    }
  
    // 3) 교차점 표시 (만약 계산되었다면)
    if (isIntersectionComputed && intersectionPoints.length>0) {
      // gl.POINTS + gl_PointSize=10
      const pts = [];
      intersectionPoints.forEach(p=>{
        pts.push(p[0], p[1]);
      });
      gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW);
  
      // 색상 - 노란색
      shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]);

      gl.vertexAttribPointer(
        gl.getAttribLocation(shader.program, "a_position"), 
        2, gl.FLOAT, false, 0, 0
      );
      // draw
      gl.drawArrays(gl.POINTS, 0, intersectionPoints.length);
    }

     // axes 그리기
     axes.draw(mat4.create(), mat4.create());
}
  
// ===================== main =====================
async function main() {
    try {
      if (!initWebGL()) {
        throw new Error('WebGL 초기화 실패');
      }
  
      // 셰이더
      shader = await initShader();
  
      // 버퍼
      setupCanvas();
      setupBuffers(shader);
      shader.use();
      
      // 텍스트 오버레이
      textOverlay1 = setupText(canvas, "", 1);
      textOverlay2 = setupText(canvas, "", 2);
      textOverlay3 = setupText(canvas, "", 3);

      // Circle 입력 이벤트 등록 (-> 완료 후 Line 이벤트로 넘어감)
      setupCircleEvents();
  
      // 초기 draw
      render();
    } catch (err) {
      console.error("프로그램 실행 중 오류:", err);
      alert("프로그램 실행 중 오류 발생");
    }
}

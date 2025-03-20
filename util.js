// util.js

export function resizeAspectRatio(gl, canvas, callback) {
    // 창의 가로, 세로 중 작은 값을 선택하여 정사각형 크기로 설정
    const size = Math.min(window.innerWidth, window.innerHeight);
    canvas.width = size;
    canvas.height = size;
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (callback && typeof callback === 'function') {
      callback();
    }
  }
  
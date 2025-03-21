// util.js

export function resizeAspectRatio(gl, canvas, callback) {
  const size = Math.min(window.innerWidth, window.innerHeight);
  canvas.width = size;
  canvas.height = size;
  gl.viewport(0, 0, canvas.width, canvas.height);
  if (callback && typeof callback === 'function') {
    callback();
  }
}
(() => {
  'use strict';

  /* ---------- estado ---------- */
  const state = {
    facingMode: 'environment',
    stream: null,
    mode: 'image', // 'image' | 'text'
    overlay: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 0.55 },
    gesture: {
      active: false,
      pointers: new Map(),
      startDist: 0,
      startAngle: 0,
      startScale: 1,
      startRotation: 0,
      startMid: { x: 0, y: 0 },
      startOverlayPos: { x: 0, y: 0 },
      lastMid: { x: 0, y: 0 },
    },
  };

  /* ---------- referencias DOM ---------- */
  const screenDedication = document.getElementById('screen-dedication');
  const screenCamera = document.getElementById('screen-camera');
  const btnEnter = document.getElementById('btn-enter');

  const video = document.getElementById('video');
  const captureCanvas = document.getElementById('capture-canvas');
  const cameraError = document.getElementById('camera-error');
  const btnRetryCamera = document.getElementById('btn-retry-camera');

  const overlayLayer = document.getElementById('overlay-layer');
  const overlayImage = document.getElementById('overlay-image');
  const overlayText = document.getElementById('overlay-text');

  const modeImageBtn = document.getElementById('mode-image');
  const modeTextBtn = document.getElementById('mode-text');
  const panelImage = document.getElementById('panel-image');
  const panelText = document.getElementById('panel-text');

  const inputImage = document.getElementById('input-image');
  const fileBtnLabel = document.getElementById('file-btn-label');
  const inputText = document.getElementById('input-text');
  const inputTextColor = document.getElementById('input-text-color');
  const inputTextSize = document.getElementById('input-text-size');

  const inputOpacity = document.getElementById('input-opacity');
  const opacityValue = document.getElementById('opacity-value');

  const btnReset = document.getElementById('btn-reset');
  const btnCapture = document.getElementById('btn-capture');
  const btnFlip = document.getElementById('btn-flip');

  const btnInfo = document.getElementById('btn-info');
  const infoModal = document.getElementById('info-modal');
  const btnCloseInfo = document.getElementById('btn-close-info');

  const captureToast = document.getElementById('capture-toast');

  /* ---------- pantalla de dedicatoria -> cámara ---------- */
  btnEnter.addEventListener('click', async () => {
    screenDedication.hidden = true;
    screenCamera.hidden = false;
    await startCamera();
  });

  btnInfo.addEventListener('click', () => { infoModal.hidden = false; });
  btnCloseInfo.addEventListener('click', () => { infoModal.hidden = true; });

  /* ---------- cámara ---------- */
  async function startCamera() {
    stopCamera();
    cameraError.hidden = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: state.facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      state.stream = stream;
      video.srcObject = stream;
      await video.play();
    } catch (err) {
      console.error('Camera error:', err);
      cameraError.hidden = false;
    }
  }

  function stopCamera() {
    if (state.stream) {
      state.stream.getTracks().forEach((t) => t.stop());
      state.stream = null;
    }
  }

  btnRetryCamera.addEventListener('click', startCamera);

  btnFlip.addEventListener('click', () => {
    state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment';
    startCamera();
  });

  /* ---------- cambio de modo (imagen / texto) ---------- */
  function setMode(mode) {
    state.mode = mode;
    const isImage = mode === 'image';
    modeImageBtn.classList.toggle('is-active', isImage);
    modeTextBtn.classList.toggle('is-active', !isImage);
    modeImageBtn.setAttribute('aria-selected', String(isImage));
    modeTextBtn.setAttribute('aria-selected', String(!isImage));
    panelImage.hidden = !isImage;
    panelText.hidden = isImage;
    overlayImage.hidden = !isImage;
    overlayText.hidden = isImage;
  }
  modeImageBtn.addEventListener('click', () => setMode('image'));
  modeTextBtn.addEventListener('click', () => setMode('text'));

  /* ---------- entrada de imagen ---------- */
  inputImage.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    overlayImage.src = url;
    overlayImage.hidden = false;
    fileBtnLabel.textContent = file.name.length > 20 ? file.name.slice(0, 17) + '…' : file.name;
  });

  /* ---------- entrada de texto ---------- */
  overlayText.textContent = inputText.value;
  inputText.addEventListener('input', () => {
    overlayText.textContent = inputText.value || ' ';
  });
  inputTextColor.addEventListener('input', () => {
    overlayText.style.color = inputTextColor.value;
  });
  inputTextSize.addEventListener('input', () => {
    overlayText.style.fontSize = `${inputTextSize.value}px`;
  });

  /* ---------- opacidad ---------- */
  function applyOpacity() {
    overlayLayer.style.opacity = state.overlay.opacity;
  }
  inputOpacity.addEventListener('input', () => {
    state.overlay.opacity = Number(inputOpacity.value) / 100;
    opacityValue.textContent = `${inputOpacity.value}%`;
    applyOpacity();
  });
  applyOpacity();

  /* ---------- transformación de la superposición ---------- */
  function applyTransform() {
    const t = `translate(-50%, -50%) translate(${state.overlay.x}px, ${state.overlay.y}px) scale(${state.overlay.scale}) rotate(${state.overlay.rotation}deg)`;
    overlayImage.style.transform = t;
    overlayText.style.transform = t;
  }
  applyTransform();

  function resetOverlay() {
    state.overlay.x = 0;
    state.overlay.y = 0;
    state.overlay.scale = 1;
    state.overlay.rotation = 0;
    applyTransform();
  }
  btnReset.addEventListener('click', resetOverlay);

  /* ---------- gestos: arrastrar / pellizcar / rotar (Pointer Events) ---------- */
  const g = state.gesture;

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI); }
  function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

  overlayLayer.addEventListener('pointerdown', (e) => {
    overlayLayer.setPointerCapture(e.pointerId);
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (g.pointers.size === 1) {
      g.active = true;
      const [p] = g.pointers.values();
      g.lastMid = { x: p.x, y: p.y };
      g.startOverlayPos = { x: state.overlay.x, y: state.overlay.y };
    } else if (g.pointers.size === 2) {
      const pts = [...g.pointers.values()];
      g.startDist = dist(pts[0], pts[1]);
      g.startAngle = angle(pts[0], pts[1]);
      g.startScale = state.overlay.scale;
      g.startRotation = state.overlay.rotation;
      g.startMid = midpoint(pts[0], pts[1]);
      g.lastMid = g.startMid;
      g.startOverlayPos = { x: state.overlay.x, y: state.overlay.y };
    }
  });

  overlayLayer.addEventListener('pointermove', (e) => {
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (g.pointers.size === 1) {
      const [p] = g.pointers.values();
      const dx = p.x - g.lastMid.x;
      const dy = p.y - g.lastMid.y;
      state.overlay.x += dx;
      state.overlay.y += dy;
      g.lastMid = { x: p.x, y: p.y };
      applyTransform();
    } else if (g.pointers.size === 2) {
      const pts = [...g.pointers.values()];
      const newDist = dist(pts[0], pts[1]);
      const newAngle = angle(pts[0], pts[1]);
      const newMid = midpoint(pts[0], pts[1]);

      const scaleFactor = newDist / (g.startDist || 1);
      state.overlay.scale = clamp(g.startScale * scaleFactor, 0.15, 6);
      state.overlay.rotation = g.startRotation + (newAngle - g.startAngle);
      state.overlay.x = g.startOverlayPos.x + (newMid.x - g.startMid.x);
      state.overlay.y = g.startOverlayPos.y + (newMid.y - g.startMid.y);
      applyTransform();
    }
  });

  function endPointer(e) {
    g.pointers.delete(e.pointerId);
    if (g.pointers.size === 1) {
      const [p] = g.pointers.values();
      g.lastMid = { x: p.x, y: p.y };
      g.startOverlayPos = { x: state.overlay.x, y: state.overlay.y };
    } else if (g.pointers.size === 0) {
      g.active = false;
    }
  }
  overlayLayer.addEventListener('pointerup', endPointer);
  overlayLayer.addEventListener('pointercancel', endPointer);
  overlayLayer.addEventListener('pointerleave', endPointer);

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  /* ---------- captura de foto ---------- */
  btnCapture.addEventListener('click', () => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    captureCanvas.width = vw;
    captureCanvas.height = vh;
    const ctx = captureCanvas.getContext('2d');

    // dibuja el video (espejado si es cámara frontal)
    ctx.save();
    if (state.facingMode === 'user') {
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, vw, vh);
    ctx.restore();

    // dibuja la superposición proyectando coordenadas de pantalla -> canvas
    const layerRect = overlayLayer.getBoundingClientRect();
    const scaleX = vw / layerRect.width;
    const scaleY = vh / layerRect.height;

    ctx.save();
    ctx.globalAlpha = state.overlay.opacity;

    const centerX = (layerRect.width / 2 + state.overlay.x) * scaleX;
    const centerY = (layerRect.height / 2 + state.overlay.y) * scaleY;
    ctx.translate(centerX, centerY);
    ctx.rotate((state.overlay.rotation * Math.PI) / 180);
    ctx.scale(state.overlay.scale * scaleX, state.overlay.scale * scaleY);

    if (state.mode === 'image' && overlayImage.src && !overlayImage.hidden) {
      const iw = overlayImage.naturalWidth;
      const ih = overlayImage.naturalHeight;
      const displayW = overlayImage.getBoundingClientRect().width / state.overlay.scale;
      const displayH = displayW * (ih / iw);
      ctx.drawImage(overlayImage, -displayW / 2, -displayH / 2, displayW, displayH);
    } else if (state.mode === 'text') {
      const size = Number(inputTextSize.value);
      ctx.font = `700 ${size}px 'Unbounded', sans-serif`;
      ctx.fillStyle = inputTextColor.value;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lines = (inputText.value || ' ').split('\n');
      const lineHeight = size * 1.15;
      const totalH = lineHeight * lines.length;
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, -totalH / 2 + lineHeight * (i + 0.5));
      });
    }
    ctx.restore();

    captureCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `camara-clara-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast();
    }, 'image/jpeg', 0.92);
  });

  function showToast() {
    captureToast.hidden = false;
    captureToast.style.animation = 'none';
    void captureToast.offsetWidth;
    captureToast.style.animation = '';
    setTimeout(() => { captureToast.hidden = true; }, 1800);
  }

  /* ---------- limpieza al ocultar la pestaña ---------- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // se mantiene el stream activo; algunos navegadores lo pausan solos
    }
  });

})();

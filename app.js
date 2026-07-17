(() => {
  'use strict';

  /* ---------- frases de amor: una distinta cada vez que se abre la app ---------- */
  const LOVE_MESSAGES = [
    'de todo lo que puedo enfocar, siempre volvés a ser vos lo más nítido.',
    'esto es una forma de mirarte a través de lo que ya existe, y de dejar una marca donde antes no había nada.',
    'hay lentes que corrigen la luz. vos corregís todo lo demás.',
    'no necesito superponer nada para verte mejor: sos el fondo nítido de todo lo otro.',
    'cada cámara busca la luz correcta. yo ya encontré la mía.',
    'esta app superpone imágenes sobre el mundo. vos hace tiempo que estás superpuesta al mío.',
    'entre tantas cosas fuera de foco, vos sos la única que no necesita ajuste.',
    'si existiera un diafragma para el tiempo, lo dejaría abierto cada vez que estás cerca.',
  ];

  function pickLoveMessage() {
    return LOVE_MESSAGES[Math.floor(Math.random() * LOVE_MESSAGES.length)];
  }

  const loveMessage = pickLoveMessage();
  const loveMain = document.getElementById('dedication-love-main');
  const loveModal = document.getElementById('dedication-love-modal');
  if (loveMain) loveMain.textContent = loveMessage;
  if (loveModal) loveModal.textContent = loveMessage;

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
  const inputTextFont = document.getElementById('input-text-font');
  const inputCustomFont = document.getElementById('input-custom-font');
  const customFontStatus = document.getElementById('custom-font-status');

  const inputOpacity = document.getElementById('input-opacity');
  const opacityValue = document.getElementById('opacity-value');

  const btnReset = document.getElementById('btn-reset');
  const btnCapture = document.getElementById('btn-capture');
  const btnFlip = document.getElementById('btn-flip');

  const btnInfo = document.getElementById('btn-info');
  const infoModal = document.getElementById('info-modal');
  const btnCloseInfo = document.getElementById('btn-close-info');

  const controlSheet = document.getElementById('control-sheet');
  const btnToggleSheet = document.getElementById('btn-toggle-sheet');

  const captureToast = document.getElementById('capture-toast');

  /* ---------- pantalla de dedicatoria -> cámara ---------- */
  btnEnter.addEventListener('click', async () => {
    screenDedication.hidden = true;
    screenCamera.hidden = false;
    await startCamera();
  });

  btnInfo.addEventListener('click', () => { infoModal.hidden = false; });
  btnCloseInfo.addEventListener('click', () => { infoModal.hidden = true; });

  /* ---------- esconder / mostrar el panel de controles ---------- */
  btnToggleSheet.addEventListener('click', () => {
    const collapsed = controlSheet.classList.toggle('is-collapsed');
    btnToggleSheet.setAttribute('aria-expanded', String(!collapsed));
    btnToggleSheet.setAttribute('aria-label', collapsed ? 'Mostrar controles' : 'Ocultar controles');
  });

  /* ---------- cámara ---------- */
  async function startCamera() {
    await stopCamera();
    cameraError.hidden = true;

    const constraintsFor = (facing) => ({
      video: {
        facingMode: { ideal: facing },
        // sin resolución fija: forzar 1920x1080 hace que algunas cámaras
        // traseras multi-lente entreguen cuadros negros al negociar el sensor
      },
      audio: false,
    });

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraintsFor(state.facingMode));
      } catch (firstErr) {
        // si falla la cámara pedida (p.ej. el dispositivo no tiene esa lente
        // disponible en ese momento), reintentamos sin preferencia de lente
        console.warn('Reintentando cámara sin facingMode:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      state.stream = stream;
      video.srcObject = stream;

      await new Promise((resolve, reject) => {
        const onReady = () => { cleanup(); resolve(); };
        const onError = (e) => { cleanup(); reject(e); };
        function cleanup() {
          video.removeEventListener('loadedmetadata', onReady);
          video.removeEventListener('error', onError);
        }
        video.addEventListener('loadedmetadata', onReady, { once: true });
        video.addEventListener('error', onError, { once: true });
        // por si el evento ya se disparó antes de engancharse
        if (video.readyState >= 1) onReady();
      });

      await video.play();

      // algunos navegadores entregan la primera pista con dimensiones 0x0
      // por una fracción de segundo; si sigue en negro, forzamos un reintento
      if (video.videoWidth === 0) {
        await new Promise((r) => setTimeout(r, 400));
        if (video.videoWidth === 0) throw new Error('Video sin dimensiones tras el intento inicial');
      }
    } catch (err) {
      console.error('Camera error:', err);
      cameraError.hidden = false;
    }
  }

  async function stopCamera() {
    if (state.stream) {
      state.stream.getTracks().forEach((t) => t.stop());
      state.stream = null;
    }
    video.pause();
    video.srcObject = null;
    // pequeño respiro para que el hardware de cámara se libere antes
    // de pedir la siguiente lente (evita cuadros negros al alternar)
    await new Promise((r) => setTimeout(r, 120));
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
    resetOverlay();
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
  inputTextFont.addEventListener('change', () => {
    overlayText.style.fontFamily = inputTextFont.value;
  });

  /* ---------- cargar una fuente propia ---------- */
  let customFontCounter = 0;

  function setFontStatus(message, kind) {
    customFontStatus.textContent = message;
    customFontStatus.hidden = !message;
    customFontStatus.classList.remove('is-error', 'is-success');
    if (kind) customFontStatus.classList.add(kind === 'error' ? 'is-error' : 'is-success');
  }

  function sanitizeFamilyName(filename) {
    const base = filename.replace(/\.[^/.]+$/, '');
    let clean = base.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, ' ');
    if (!clean) clean = 'Fuente personalizada';
    if (/^[0-9]/.test(clean)) clean = `F${clean}`;
    customFontCounter += 1;
    return `${clean} #${customFontCounter}`;
  }

  inputCustomFont.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const validExt = /\.(ttf|otf|woff2?|)$/i.test(file.name) || file.type.includes('font');
    if (!validExt) {
      setFontStatus('Ese archivo no parece ser una fuente (.ttf, .otf, .woff, .woff2).', 'error');
      return;
    }

    setFontStatus('Cargando fuente…', null);

    try {
      const buffer = await file.arrayBuffer();
      const familyName = sanitizeFamilyName(file.name);
      const fontFace = new FontFace(familyName, buffer);
      const loaded = await fontFace.load();
      document.fonts.add(loaded);

      const option = document.createElement('option');
      option.value = `'${familyName}', sans-serif`;
      option.dataset.canvas = familyName;
      option.textContent = `${familyName.replace(/ #\d+$/, '')} (tuya)`;
      inputTextFont.appendChild(option);
      inputTextFont.value = option.value;
      overlayText.style.fontFamily = option.value;

      setFontStatus(`"${file.name}" lista para usar.`, 'success');
    } catch (err) {
      console.error('Error cargando fuente:', err);
      setFontStatus('No se pudo cargar esa fuente. Probá con otro archivo.', 'error');
    } finally {
      inputCustomFont.value = '';
    }
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
  btnCapture.addEventListener('click', async () => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    if (state.mode === 'text') {
      const canvasFontName = inputTextFont.selectedOptions[0].dataset.canvas || 'Unbounded';
      try {
        await document.fonts.load(`700 48px '${canvasFontName}'`);
      } catch (e) { /* si falla, se dibuja con la fuente de respaldo */ }
    }

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
      const canvasFontName = inputTextFont.selectedOptions[0].dataset.canvas || 'Unbounded';
      ctx.font = `700 ${size}px '${canvasFontName}', sans-serif`;
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

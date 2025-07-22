// 3D Viewer App - Three.js r158 ES6 Modules con controles de animación
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

console.log('Three.js loaded via ES6 modules, version:', THREE.REVISION);

// URLs de modelos - usando la URL correcta que proporcionaste
const MODEL_URLS = {
  glb: "https://github.com/CriticalGraphics/criticalgraphics/raw/refs/heads/main/models/modelo1.glb",
  gltf: "./models/modelo1.gltf", // Ruta local como fallback
  obj: "./models/modelo1.obj"    // Ruta local como fallback
};

// URL del archivo LOCAL - evita CORS completamente
const MODEL_URL = "./models/modelo1.glb";

// Variables para control de scroll de animación
let isMouseOverAnimationControls = false;

// Variables para funcionalidades profesionales
let hiddenObjects = new Set();
let currentLightingPreset = 1;
let allLights = [];

// Presets de iluminación profesional
const LIGHTING_PRESETS = {
  1: { // Studio
    ambient: { color: 0x404040, intensity: 0.6 },
    main: { color: 0xffffff, intensity: 1.2, position: [10, 10, 5] },
    fill: { color: 0x8ec5ff, intensity: 0.8, position: [-10, 5, -5] },
    back: { color: 0xffeaa7, intensity: 0.6, position: [0, 10, -10] },
    point1: { color: 0xffffff, intensity: 0.8, position: [5, 5, 5] },
    point2: { color: 0x74b9ff, intensity: 0.6, position: [-5, 3, 8] },
    hemi: { skyColor: 0x87ceeb, groundColor: 0x8b4513, intensity: 0.4 }
  },
  2: { // Soft
    ambient: { color: 0x606060, intensity: 0.8 },
    main: { color: 0xffffff, intensity: 0.8, position: [5, 8, 5] },
    fill: { color: 0xffcc88, intensity: 0.6, position: [-8, 4, -3] },
    back: { color: 0x88ccff, intensity: 0.4, position: [0, 8, -8] },
    point1: { color: 0xffffff, intensity: 0.5, position: [3, 3, 3] },
    point2: { color: 0xffaa88, intensity: 0.4, position: [-3, 2, 6] },
    hemi: { skyColor: 0xffffcc, groundColor: 0xccaa88, intensity: 0.6 }
  },
  3: { // Dramatic
    ambient: { color: 0x202020, intensity: 0.3 },
    main: { color: 0xffffff, intensity: 2.0, position: [15, 15, 8] },
    fill: { color: 0x4488ff, intensity: 0.5, position: [-15, 3, -8] },
    back: { color: 0xff4444, intensity: 0.8, position: [0, 15, -15] },
    point1: { color: 0xffffff, intensity: 1.2, position: [8, 8, 8] },
    point2: { color: 0x8844ff, intensity: 0.8, position: [-8, 5, 10] },
    hemi: { skyColor: 0x4488ff, groundColor: 0x442244, intensity: 0.2 }
  }
};

// Función para iniciar el visor
function startViewer() {
  // Inicializar elemento debug
  debugMsg = document.getElementById('debug');
  
  setDebug('🚀 Initializing Professional 3D Viewer...');
  
  // Inicializar Three.js PRIMERO
  initThreeJS();
  
  // Inicializar controles profesionales
  initProfessionalControls();
  
  // Luego iniciar el loop de animación
  animate();
  
  // Finalmente cargar el modelo
  setDebug('🪑 Loading furniture model...');
  loadGLTFModel(MODEL_URL);
}

// Inicializar controles profesionales
function initProfessionalControls() {
  // Presets de iluminación
  document.getElementById('lightPreset1').addEventListener('click', () => setLightingPreset(1));
  document.getElementById('lightPreset2').addEventListener('click', () => setLightingPreset(2));
  document.getElementById('lightPreset3').addEventListener('click', () => setLightingPreset(3));
  
  // Control de visibilidad
  document.getElementById('resetVisibility').addEventListener('click', resetAllVisibility);
  
  // Toggle menús
  document.getElementById('toggleMenus').addEventListener('click', toggleMenus);
  
  setDebug('✅ Professional controls initialized');
}

// Toggle para mostrar/ocultar menús
function toggleMenus() {
  const controlPanel = document.getElementById('controlPanel');
  const animationControls = document.getElementById('animationControls');
  const toggleBtn = document.getElementById('toggleMenus');
  
  const isHidden = controlPanel.classList.contains('hidden');
  
  if (isHidden) {
    // Mostrar menús
    controlPanel.classList.remove('hidden');
    if (animationControls.classList.contains('visible')) {
      animationControls.classList.remove('hidden');
    }
    toggleBtn.textContent = '☰';
    setDebug('📱 UI panels shown');
  } else {
    // Ocultar menús
    controlPanel.classList.add('hidden');
    if (animationControls.classList.contains('visible')) {
      animationControls.classList.add('hidden');
    }
    toggleBtn.textContent = '👁️';
    setDebug('📱 UI panels hidden');
  }
}

// Configurar detección de clicks en objetos
function setupObjectClickDetection(modelObject) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  function onMouseClick(event) {
    // Evitar clicks en la UI
    if (event.target.closest('#controlPanel') || 
        event.target.closest('#animationControls') || 
        event.target.closest('#header')) {
      return;
    }
    
    // Calcular posición del mouse
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Raycast
    raycaster.setFromCamera(mouse, camera);
    
    if (modelObject) {
      const intersects = raycaster.intersectObject(modelObject, true);
      
      if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        toggleObjectVisibility(clickedObject);
      }
    }
  }
  
  // Agregar event listener para clicks
  window.addEventListener('click', onMouseClick);
}

// Toggle visibilidad de objeto
function toggleObjectVisibility(object) {
  if (object && object.isMesh) {
    if (hiddenObjects.has(object.uuid)) {
      // Mostrar objeto
      object.visible = true;
      hiddenObjects.delete(object.uuid);
      setDebug(`✅ Part restored: ${object.name || 'Unnamed'}`);
    } else {
      // Ocultar objeto
      object.visible = false;
      hiddenObjects.add(object.uuid);
      setDebug(`🔍 Part hidden: ${object.name || 'Unnamed'}`);
    }
    
    // Actualizar contador
    updateHiddenPartsCounter();
  }
}

// Resetear visibilidad de todos los objetos
function resetAllVisibility() {
  if (model) {
    model.traverse(function(child) {
      if (child.isMesh) {
        child.visible = true;
      }
    });
    
    hiddenObjects.clear();
    updateHiddenPartsCounter();
    setDebug('✅ All parts restored');
  }
}

// Actualizar contador de partes ocultas
function updateHiddenPartsCounter() {
  const resetBtn = document.getElementById('resetVisibility');
  if (hiddenObjects.size > 0) {
    resetBtn.textContent = `Show All Parts (${hiddenObjects.size} hidden)`;
    resetBtn.style.background = 'linear-gradient(135deg, #ff9500, #ff7700)';
  } else {
    resetBtn.textContent = 'Show All Parts';
    resetBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a5a)';
  }
}

// Configurar presets de iluminación
function setLightingPreset(presetNumber) {
  const preset = LIGHTING_PRESETS[presetNumber];
  if (!preset) return;
  
  // Actualizar botones activos
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`lightPreset${presetNumber}`).classList.add('active');
  
  currentLightingPreset = presetNumber;
  
  // Limpiar luces existentes
  allLights.forEach(light => scene.remove(light));
  allLights = [];
  
  // Crear nuevas luces según el preset
  createLightsFromPreset(preset);
  
  setDebug(`💡 Lighting preset: ${getPresetName(presetNumber)}`);
}

function getPresetName(presetNumber) {
  const names = { 1: 'Studio', 2: 'Soft', 3: 'Dramatic' };
  return names[presetNumber] || 'Unknown';
}

function createLightsFromPreset(preset) {
  // Luz ambiental
  const ambientLight = new THREE.AmbientLight(preset.ambient.color, preset.ambient.intensity);
  scene.add(ambientLight);
  allLights.push(ambientLight);
  
  // Luz principal direccional
  const mainLight = new THREE.DirectionalLight(preset.main.color, preset.main.intensity);
  mainLight.position.set(...preset.main.position);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  scene.add(mainLight);
  allLights.push(mainLight);
  
  // Luz de relleno
  const fillLight = new THREE.DirectionalLight(preset.fill.color, preset.fill.intensity);
  fillLight.position.set(...preset.fill.position);
  scene.add(fillLight);
  allLights.push(fillLight);
  
  // Luz de respaldo
  const backLight = new THREE.DirectionalLight(preset.back.color, preset.back.intensity);
  backLight.position.set(...preset.back.position);
  scene.add(backLight);
  allLights.push(backLight);
  
  // Luces puntuales
  const pointLight1 = new THREE.PointLight(preset.point1.color, preset.point1.intensity, 50);
  pointLight1.position.set(...preset.point1.position);
  scene.add(pointLight1);
  allLights.push(pointLight1);
  
  const pointLight2 = new THREE.PointLight(preset.point2.color, preset.point2.intensity, 50);
  pointLight2.position.set(...preset.point2.position);
  scene.add(pointLight2);
  allLights.push(pointLight2);
  
  // Luz hemisférica
  const hemiLight = new THREE.HemisphereLight(
    preset.hemi.skyColor, 
    preset.hemi.groundColor, 
    preset.hemi.intensity
  );
  scene.add(hemiLight);
  allLights.push(hemiLight);
}

function initThreeJS() {
  // Inicializar Three.js
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 1000);
  camera.position.set(0, 2, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras suaves
  renderer.outputColorSpace = THREE.SRGBColorSpace; // Mejor renderizado de colores
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // Mejor tonemap para presentaciones
  renderer.toneMappingExposure = 1.0;
  document.getElementById('container').appendChild(renderer.domElement);

  // Inicializar OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 1;
  controls.maxDistance = 100;
  controls.enablePan = true;
  controls.panSpeed = 0.8;
  controls.enableZoom = true;
  controls.zoomSpeed = 1.0;
  console.log('Professional OrbitControls initialized');

  // Configurar iluminación inicial (Studio preset)
  setLightingPreset(1);
  
  console.log('Enhanced professional lighting system initialized');
}

// Variables globales
let camera, scene, renderer, controls, model;
let mixer, animations = [];
let currentAction = null;
let animationClip = null;
let animationScrollControl = false;
let scrollProgress = 0;
let isPlaying = false;
let isDragging = false;
let debugMsg;

// Variables para control de animación automática
let animationMonitoringActive = false;
let animationEndTimeout = null;
let rewindInProgress = false;

// Referencias a elementos de UI
let animationControls, progressBar, progressHandle, progressContainer;
let animationNameEl, animationTimeEl, playPauseBtn;

// Funciones de utilidad
function setDebug(msg, ok) {
  if (!debugMsg) return;
  debugMsg.textContent = msg;
  debugMsg.style.background = ok === undefined ? 'rgba(0,0,0,0.7)' : (ok ? 'rgba(0,80,0,0.7)' : 'rgba(80,0,0,0.7)');
  debugMsg.style.color = ok === undefined ? '#fff' : (ok ? '#b0ffb0' : '#ffb0b0');
  console.log('DEBUG:', msg);
}

function fitAndScaleModel(camera, object, scaleTo = 0.8) {
  const box = new THREE.Box3().setFromObject(object);
  if (!isFinite(box.min.x) || !isFinite(box.max.x)) {
    console.warn('Invalid bounding box for model');
    return;
  }
  
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  let scale = 1;
  const maxDim = Math.max(size.x, size.y, size.z);
  
  if (maxDim > 10) {
    scale = 10 / maxDim;
    object.scale.set(scale, scale, scale);
    
    const scaledBox = new THREE.Box3().setFromObject(object);
    const scaledSize = scaledBox.getSize(new THREE.Vector3());
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    
    center.copy(scaledCenter);
    size.copy(scaledSize);
  }

  const maxScaledDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraDistance = Math.abs(maxScaledDim / 2 / Math.tan(fov / 2)) * 2.5;
  
  const cameraPos = center.clone();
  cameraPos.x += cameraDistance * 0.7;
  cameraPos.y += cameraDistance * 0.5;
  cameraPos.z += cameraDistance;
  
  camera.position.copy(cameraPos);
  camera.lookAt(center);

  if (controls) {
    controls.target.copy(center);
    controls.maxDistance = cameraDistance * 10;
    controls.minDistance = cameraDistance * 0.25;
    controls.update();
  }
}

function addDebugHelpers(model) {
  // Comentamos o eliminamos los helpers de debug
}

// Funciones para manejar la UI de animación
function initAnimationUI() {
  animationControls = document.getElementById('animationControls');
  progressBar = document.getElementById('progressBar');
  progressHandle = document.getElementById('progressHandle');
  progressContainer = document.getElementById('progressContainer');
  animationNameEl = document.getElementById('animationName');
  animationTimeEl = document.getElementById('animationTime');
  playPauseBtn = document.getElementById('playPauseBtn');

  // Event listeners para la barra de progreso
  progressContainer.addEventListener('mousedown', startDrag);
  progressContainer.addEventListener('touchstart', startDrag, { passive: false });
  
  document.addEventListener('mousemove', drag);
  document.addEventListener('touchmove', drag, { passive: false });
  
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);

  // Botones de control mejorados
  playPauseBtn.addEventListener('click', togglePlayPause);
  document.getElementById('resetBtn').addEventListener('click', () => {
    stopAnimationMonitoring(); // Detener cualquier monitoreo activo
    const action = mixer._actions[0];
    if (action) {
      action.paused = true;
      action.time = 0;
    }
    isPlaying = false;
    playPauseBtn.textContent = '▶️ Play';
    playPauseBtn.classList.remove('active');
    setAnimationProgress(0);
    setDebug('🎬 Animation reset to beginning');
  });
  document.getElementById('endBtn').addEventListener('click', () => {
    stopAnimationMonitoring(); // Detener cualquier monitoreo activo
    const action = mixer._actions[0];
    if (action) {
      action.paused = true;
      action.time = animations[0].duration;
    }
    isPlaying = false;
    playPauseBtn.textContent = '▶️ Play';
    playPauseBtn.classList.remove('active');
    setAnimationProgress(1);
    setDebug('🎬 Animation moved to end');
  });
  
  // Event listeners para detectar cuando el mouse está sobre los controles
  animationControls.addEventListener('mouseenter', function() {
    isMouseOverAnimationControls = true;
  });
  
  animationControls.addEventListener('mouseleave', function() {
    isMouseOverAnimationControls = false;
  });
}

function showAnimationControls(animationName, duration) {
  if (!animationControls) initAnimationUI();
  
  animationControls.classList.add('visible');
  animationNameEl.textContent = animationName || 'Animation';
  animationScrollControl = true;
  isPlaying = false;
  playPauseBtn.textContent = '▶️ Play';
  playPauseBtn.classList.remove('active');
}

function hideAnimationControls() {
  if (animationControls) {
    animationControls.classList.remove('visible');
  }
  animationScrollControl = false;
  isMouseOverAnimationControls = false;
}

// Función para monitorear el estado de la animación
function startAnimationMonitoring(action) {
  animationMonitoringActive = true;
  rewindInProgress = false;
  
  function checkAnimationEnd() {
    if (!animationMonitoringActive || rewindInProgress) return;
    
    const currentTime = action.time;
    const duration = animations[0].duration;
    
    // Si la animación llegó al final
    if (isPlaying && currentTime >= duration - 0.05) {
      isPlaying = false;
      action.paused = true;
      playPauseBtn.textContent = '▶️ Play';
      playPauseBtn.classList.remove('active');
      setDebug('🎬 Animation finished - waiting 2 seconds');
      
      // Esperar 2 segundos y hacer rewind
      animationEndTimeout = setTimeout(() => {
        performRewind(action);
      }, 2000);
      
      return; // Detener el monitoreo hasta el rewind
    }
    
    if (animationMonitoringActive && !rewindInProgress) {
      requestAnimationFrame(checkAnimationEnd);
    }
  }
  
  checkAnimationEnd();
}

// Función para realizar el rewind
function performRewind(action) {
  if (rewindInProgress) return;
  
  rewindInProgress = true;
  let rewindTime = action.time;
  const rewindSpeed = animations[0].duration / 60; // Rewind en ~1 segundo
  
  setDebug('🎬 Rewinding animation...');
  
  function rewindStep() {
    if (!rewindInProgress) return;
    
    rewindTime -= rewindSpeed;
    
    if (rewindTime <= 0) {
      rewindTime = 0;
      action.time = 0;
      mixer.update(0);
      updateAnimationUI();
      
      // Resetear estado
      action.paused = true;
      isPlaying = false;
      rewindInProgress = false;
      playPauseBtn.textContent = '▶️ Play';
      playPauseBtn.classList.remove('active');
      setDebug('🎬 Animation reset to start');
      
      return; // Terminar rewind
    }
    
    action.time = rewindTime;
    mixer.update(0);
    updateAnimationUI();
    
    requestAnimationFrame(rewindStep);
  }
  
  rewindStep();
}

// Función para detener el monitoreo de animación
function stopAnimationMonitoring() {
  animationMonitoringActive = false;
  rewindInProgress = false;
  if (animationEndTimeout) {
    clearTimeout(animationEndTimeout);
    animationEndTimeout = null;
  }
}

function updateAnimationUI() {
  if (!mixer || !animations.length) return;
  
  const action = mixer._actions[0];
  if (!action) return;
  
  const currentTime = action.time;
  const duration = animations[0].duration;
  const progress = Math.max(0, Math.min(1, currentTime / duration));
  
  scrollProgress = progress;
  
  // Obtener referencias frescas a los elementos cada vez
  const progressBarEl = document.getElementById('progressBar');
  const progressHandleEl = document.getElementById('progressHandle');
  const animationTimeEl = document.getElementById('animationTime');
  
  if (progressBarEl) {
    progressBarEl.style.width = (progress * 100) + '%';
  }
  
  if (progressHandleEl) {
    progressHandleEl.style.left = (progress * 100) + '%';
  }
  
  if (animationTimeEl) {
    animationTimeEl.textContent = `${currentTime.toFixed(2)}s / ${duration.toFixed(2)}s`;
  }
}

function setAnimationProgress(progress) {
  if (!mixer || !animations.length) return;
  
  scrollProgress = Math.max(0, Math.min(1, progress));
  const action = mixer._actions[0];
  if (action) {
    // Pausar la animación para poder controlarla manualmente
    action.paused = true;
    
    // Establecer el tiempo exacto
    action.time = scrollProgress * animations[0].duration;
    
    // Forzar la actualización del mixer para aplicar la posición inmediatamente
    mixer.update(0);
    
    // Actualizar la UI
    updateAnimationUI();
    
    // Si no está reproduciendo, actualizar el estado del botón
    if (!isPlaying) {
      playPauseBtn.textContent = '▶️ Play';
      playPauseBtn.classList.remove('active');
    }
  }
}

function togglePlayPause() {
  if (!mixer || !animations.length) return;
  
  // Detener monitoreo si está activo
  if (rewindInProgress) {
    stopAnimationMonitoring();
  }
  
  const action = mixer._actions[0];
  if (!action) return;
  
  if (isPlaying) {
    // Pausar
    action.paused = true;
    isPlaying = false;
    playPauseBtn.textContent = '▶️ Play';
    playPauseBtn.classList.remove('active');
    stopAnimationMonitoring();
    setDebug('⏸️ Animation paused');
  } else {
    // Reproducir
    action.paused = false;
    isPlaying = true;
    playPauseBtn.textContent = '⏸️ Pause';
    playPauseBtn.classList.add('active');
    
    // Si estamos al final, resetear al inicio
    if (action.time >= animations[0].duration - 0.1) {
      action.time = 0;
    }
    
    // Iniciar monitoreo
    startAnimationMonitoring(action);
    setDebug('▶️ Animation playing');
  }
}

// Funciones de arrastre - MEJORADAS
function startDrag(e) {
  if (!animationScrollControl) return;
  
  isDragging = true;
  
  // Pausar animación si estaba reproduciéndose
  if (isPlaying) {
    isPlaying = false;
    playPauseBtn.textContent = '▶️ Play';
    playPauseBtn.classList.remove('active');
  }
  
  if (mixer && animations.length) {
    const action = mixer._actions[0];
    if (action) action.paused = true;
  }
  
  updateProgressFromEvent(e);
  e.preventDefault();
}

function drag(e) {
  if (!isDragging || !animationScrollControl) return;
  updateProgressFromEvent(e);
  e.preventDefault();
}

function endDrag() {
  if (isDragging) {
    isDragging = false;
    setDebug(`🎬 Animation position: ${(scrollProgress * 100).toFixed(1)}%`);
  }
}

function updateProgressFromEvent(e) {
  if (!progressContainer) return;
  
  const rect = progressContainer.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const x = clientX - rect.left;
  const progress = Math.max(0, Math.min(1, x / rect.width));
  
  setAnimationProgress(progress);
}

// Cargadores de modelos
function loadGLTFModel(modelUrl) {
  setDebug('Loading GLTF/GLB model from: ' + modelUrl);
  
  const loader = new GLTFLoader();
  
  loader.load(
    modelUrl,
    function(gltf) {
      console.log('GLTF loaded successfully:', gltf);
      
      if (model) scene.remove(model);
      model = gltf.scene;
      
      animations = gltf.animations;
      if (animations && animations.length > 0) {
        console.log('Found animations:', animations.length);
        mixer = new THREE.AnimationMixer(model);
        
        animations.forEach((clip, index) => {
          console.log(`Animation ${index}: ${clip.name}, duration: ${clip.duration}s`);
        });
        
        showAnimationControls(animations[0].name || 'Animation', animations[0].duration);
        
        if (animations[0]) {
          const action = mixer.clipAction(animations[0]);
          // NO LOOP - la animación se detiene al final
          action.setLoop(THREE.LoopOnce);
          action.clampWhenFinished = true;
          action.paused = true;
          action.time = 0;
          
          // Iniciar animación después de 2 segundos
          setTimeout(() => {
            if (action) {
              action.paused = false;
              isPlaying = true;
              playPauseBtn.textContent = '⏸️ Pause';
              playPauseBtn.classList.add('active');
              setDebug('🎬 Animation started');
              
              // Iniciar monitoreo de la animación
              startAnimationMonitoring(action);
            }
          }, 2000);
        }
      } else {
        console.log('No animations found');
        hideAnimationControls();
        mixer = null;
      }
      
      let meshCount = 0;
      model.traverse(function(child) {
        if (child.isMesh) {
          meshCount++;
          
          // Mejorar materiales para mejor percepción de luz
          if (!child.material || child.material.type === 'MeshBasicMaterial') {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              metalness: 0.2,
              roughness: 0.4,
              envMapIntensity: 1.0
            });
          }
          
          // Habilitar sombras
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Asegurar normales correctas para mejor iluminación
          if (child.geometry.attributes.normal === undefined) {
            child.geometry.computeVertexNormals();
          }
        }
      });
      
      scene.add(model);
      addDebugHelpers(model);
      fitAndScaleModel(camera, model, 0.8);
      
      // Setup professional object interaction
      setupObjectClickDetection(model);
      
      setDebug('✅ GLTF Model loaded! ' + meshCount + ' meshes found' + 
               (animations.length > 0 ? ` | ${animations.length} animations` : ''), true);
      // Ocultar el mensaje después de 10 segundos
      setTimeout(() => setDebug(''), 10000);
    },
    function(xhr) {
      if (xhr.lengthComputable) {
        const percentComplete = xhr.loaded / xhr.total * 100;
        setDebug('📥 Loading GLTF: ' + percentComplete.toFixed(1) + '%');
      } else {
        setDebug('📥 Loading GLTF model...');
      }
    },
    function(err) {
      console.error('GLTF Load Error:', err);
      setDebug('❌ Failed to load GLTF model: ' + err.message, false);
    }
  );
}

function loadOBJModel(objUrl) {
  setDebug('Loading OBJ model from: ' + objUrl);
  
  const loader = new OBJLoader();
  
  loader.load(
    objUrl,
    function(obj) {
      console.log('OBJ loaded successfully:', obj);
      
      if (model) scene.remove(model);
      model = obj;
      
      hideAnimationControls(); // OBJ no tiene animaciones
      
      let meshCount = 0;
      model.traverse(function(child) {
        if (child.isMesh) {
          meshCount++;
          
          // Material mejorado para OBJ con mejor respuesta a luces
          child.material = new THREE.MeshStandardMaterial({
            color: 0xf0f0f0, // Ligeramente más cálido que blanco puro
            metalness: 0.3,
            roughness: 0.5,
            wireframe: false,
            envMapIntensity: 0.8
          });
          
          // Habilitar sombras
          child.castShadow = true;
          child.receiveShadow = true;
          
          if (child.geometry.attributes.normal === undefined) {
            child.geometry.computeVertexNormals();
          }
        }
      });
      
      scene.add(model);
      addDebugHelpers(model);
      fitAndScaleModel(camera, model, 0.8);
      setDebug('✅ OBJ Model loaded! ' + meshCount + ' meshes found', true);
    },
    function(xhr) {
      if (xhr.lengthComputable) {
        const percentComplete = xhr.loaded / xhr.total * 100;
        setDebug('📥 Loading OBJ: ' + percentComplete.toFixed(1) + '%');
      } else {
        setDebug('📥 Loading OBJ model...');
      }
    },
    function(err) {
      console.error('OBJ Load Error:', err);
      setDebug('❌ Failed to load OBJ model: ' + err.message, false);
    }
  );
}

function loadModel(modelUrl) {
  const extension = modelUrl.split('.').pop().toLowerCase();
  
  console.log('Detecting file type:', extension);
  
  switch(extension) {
    case 'gltf':
    case 'glb':
      loadGLTFModel(modelUrl);
      break;
    case 'obj':
      loadOBJModel(modelUrl);
      break;
    default:
      setDebug('❌ Unsupported file format: ' + extension, false);
      console.error('Unsupported file format:', extension);
      break;
  }
}

// Event listeners
window.addEventListener('resize', function() {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

// Control de scroll SOLO cuando el mouse está sobre los controles de animación
window.addEventListener('wheel', function(event) {
  // Solo funcionar si hay animación Y el mouse está sobre los controles
  if (animationScrollControl && 
      mixer && 
      animations.length > 0 && 
      isMouseOverAnimationControls) {
    
    event.preventDefault();
    
    const scrollDelta = event.deltaY * 0.001;
    scrollProgress += scrollDelta;
    scrollProgress = Math.max(0, Math.min(1, scrollProgress));
    
    const action = mixer._actions[0];
    if (action) {
      const animationDuration = animations[0].duration;
      action.time = scrollProgress * animationDuration;
      updateAnimationUI();
    }
  }
}, { passive: false });

// Loop de animación
function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  
  if (mixer && isPlaying && !isDragging && !rewindInProgress) {
    mixer.update(0.016);
    updateAnimationUI();
  }
  
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startViewer);
} else {
  startViewer();
}

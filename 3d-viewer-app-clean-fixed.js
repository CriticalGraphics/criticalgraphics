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

// Variables para auto-hide de menús
let autoHideTimeout = null;
let autoShowTimeout = null;
let menusAutoHidden = false;
let autoHintShown = false; // Nueva variable para controlar si ya se mostró el hint automático
let userHasInteracted = false; // Nueva variable para deshabilitar auto-hide después de interacción manual

// Variables para optimización de rendimiento
let isMobileDevice = false;
let devicePixelRatio = 1;
let shadowQuality = 'high';
let deviceType = 'desktop'; // 'desktop', 'mobile', 'fold-closed', 'fold-open', 'iphone', 'tablet'

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
  // Detectar dispositivo móvil y optimizar configuraciones
  detectMobileAndOptimize();
  
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

// Detectar dispositivo móvil y optimizar configuraciones
function detectMobileAndOptimize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;
  const userAgent = navigator.userAgent;
  
  // Detectar dispositivo móvil básico
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const hasTouchscreen = 'ontouchstart' in window;
  
  // Detectar Galaxy Fold específicamente
  const isGalaxyFold = /SM-F(90|91|92|93|94|95|96|97)/i.test(userAgent) || // Detectar por modelo
                       (width >= 1768 && width <= 2200 && aspectRatio >= 0.85 && aspectRatio <= 1.15); // Fold abierto: casi cuadrado
  
  const isFoldClosed = (width >= 280 && width <= 380 && aspectRatio >= 2.0); // Fold cerrado: muy alargado
  
  // Detectar iPhone específicamente
  const isIPhone = /iPhone/i.test(userAgent) && aspectRatio >= 1.8 && aspectRatio <= 2.2;
  
  // Detectar tablet
  const isTablet = (width >= 768 && width <= 1200 && (isMobileUA || hasTouchscreen)) && 
                   aspectRatio >= 1.2 && aspectRatio <= 1.8;
  
  // Clasificar dispositivo
  if (isGalaxyFold) {
    deviceType = 'fold-open';
    isMobileDevice = true;
  } else if (isFoldClosed) {
    deviceType = 'fold-closed';
    isMobileDevice = true;
  } else if (isIPhone) {
    deviceType = 'iphone';
    isMobileDevice = true;
  } else if (isTablet) {
    deviceType = 'tablet';
    isMobileDevice = true;
  } else if (isMobileUA || hasTouchscreen || width <= 768) {
    deviceType = 'mobile';
    isMobileDevice = true;
  } else {
    deviceType = 'desktop';
    isMobileDevice = false;
  }
  
  // Configurar pixel ratio según dispositivo
  switch (deviceType) {
    case 'fold-open':
      devicePixelRatio = Math.min(window.devicePixelRatio, 2.0); // Mayor calidad para pantalla grande
      break;
    case 'fold-closed':
      devicePixelRatio = Math.min(window.devicePixelRatio, 1.0); // Menor para ahorrar batería
      break;
    case 'iphone':
      devicePixelRatio = Math.min(window.devicePixelRatio, 2.0); // iPhones manejan bien alta densidad
      break;
    case 'tablet':
      devicePixelRatio = Math.min(window.devicePixelRatio, 1.5);
      break;
    case 'mobile':
      devicePixelRatio = Math.min(window.devicePixelRatio, 1.5);
      break;
    default:
      devicePixelRatio = window.devicePixelRatio;
  }
  
  // Configurar calidad de sombras según dispositivo específico
  switch (deviceType) {
    case 'fold-open':
      shadowQuality = 'medium'; // Pantalla grande pero móvil
      break;
    case 'fold-closed':
      shadowQuality = 'ultra-low'; // Pantalla muy pequeña
      break;
    case 'iphone':
      shadowQuality = 'low'; // Optimizado para iPhone
      break;
    case 'tablet':
      shadowQuality = 'medium';
      break;
    case 'mobile':
      shadowQuality = 'low';
      break;
    default:
      shadowQuality = 'high'; // Desktop
  }
  
  console.log('Device optimization:', {
    deviceType: deviceType,
    isMobile: isMobileDevice,
    width: width,
    height: height,
    aspectRatio: aspectRatio.toFixed(2),
    pixelRatio: devicePixelRatio,
    shadowQuality: shadowQuality,
    userAgent: userAgent.substring(0, 50) + '...'
  });
}

// Inicializar controles profesionales
function initProfessionalControls() {
  // Presets de iluminación
  document.getElementById('lightPreset1').addEventListener('click', () => {
    setLightingPreset(1);
    userHasInteracted = true; // Marcar interacción del usuario
    resetAutoHideTimers();
  });
  document.getElementById('lightPreset2').addEventListener('click', () => {
    setLightingPreset(2);
    userHasInteracted = true; // Marcar interacción del usuario
    resetAutoHideTimers();
  });
  document.getElementById('lightPreset3').addEventListener('click', () => {
    setLightingPreset(3);
    userHasInteracted = true; // Marcar interacción del usuario
    resetAutoHideTimers();
  });
  
  // Control de visibilidad
  document.getElementById('resetVisibility').addEventListener('click', () => {
    resetAllVisibility();
    userHasInteracted = true; // Marcar interacción del usuario
    resetAutoHideTimers();
  });
  
  // Toggle menús
  document.getElementById('toggleMenus').addEventListener('click', toggleMenus);
  
  // Event listeners para resetear timers en interacciones
  const controlPanel = document.getElementById('controlPanel');
  const animationControls = document.getElementById('animationControls');
  
  // Detener ciclo automático al interactuar con paneles
  [controlPanel, animationControls].forEach(panel => {
    if (panel) {
      panel.addEventListener('mouseenter', () => {
        if (!autoHintShown) {
          userHasInteracted = true; // Marcar interacción del usuario
          resetAutoHideTimers();
        }
      });
      panel.addEventListener('touchstart', () => {
        // Cualquier interacción táctil detiene el ciclo automático
        clearTimeout(autoHideTimeout);
        clearTimeout(autoShowTimeout);
        autoHintShown = true;
      });
      panel.addEventListener('click', () => {
        // Cualquier click detiene el ciclo automático
        clearTimeout(autoHideTimeout);
        clearTimeout(autoShowTimeout);
        autoHintShown = true;
      });
    }
  });
  
  setDebug('✅ Professional controls initialized');
  
  // Iniciar el primer ciclo de auto-hide (secuencia única de demostración)
  setTimeout(() => {
    if (!autoHintShown) { // Solo si no ha habido interacción manual
      startAutoHideTimer();
      setDebug('🔄 Auto-hide hint sequence started');
    }
  }, 1000);
}

// Toggle para mostrar/ocultar menús
function toggleMenus() {
  const controlPanel = document.getElementById('controlPanel');
  const animationControls = document.getElementById('animationControls');
  const toggleIcon = document.getElementById('toggleIcon');
  
  const isHidden = controlPanel.classList.contains('hidden');
  
  // Detener todos los timers automáticos cuando el usuario interactúa manualmente
  clearTimeout(autoHideTimeout);
  clearTimeout(autoShowTimeout);
  autoHintShown = true; // Marcar que el usuario ya interactuó, no más hints automáticos
  userHasInteracted = true; // Deshabilitar completamente el auto-hide
  
  if (isHidden || menusAutoHidden) {
    // Mostrar menús manualmente
    showMenus();
    menusAutoHidden = false;
    setDebug('📱 UI panels shown manually');
  } else {
    // Ocultar menús manualmente
    hideMenus();
    menusAutoHidden = true;
    setDebug('📱 UI panels hidden manually');
  }
}

// Función para mostrar menús
function showMenus() {
  const controlPanel = document.getElementById('controlPanel');
  const animationControls = document.getElementById('animationControls');
  const toggleIcon = document.getElementById('toggleIcon');
  
  controlPanel.classList.remove('hidden');
  if (animationControls.classList.contains('visible')) {
    animationControls.classList.remove('hidden');
  }
  
  toggleIcon.textContent = '✕'; // X para cerrar cuando están visibles
  
  // NO reiniciar timer si el usuario ya interactuó manualmente
  if (autoHintShown && !userHasInteracted) {
    startAutoHideTimer();
  }
}

// Función para ocultar menús
function hideMenus() {
  const controlPanel = document.getElementById('controlPanel');
  const animationControls = document.getElementById('animationControls');
  const toggleIcon = document.getElementById('toggleIcon');
  
  controlPanel.classList.add('hidden');
  if (animationControls.classList.contains('visible')) {
    animationControls.classList.add('hidden');
  }
  
  toggleIcon.textContent = '☰'; // Menú hamburguesa cuando están ocultos
}

// Iniciar timer de auto-hide (2 segundos) - SOLO la primera vez
function startAutoHideTimer() {
  clearTimeout(autoHideTimeout);
  autoHideTimeout = setTimeout(() => {
    if (!menusAutoHidden) {
      hideMenus();
      menusAutoHidden = true;
      setDebug('📱 UI panels auto-hidden');
      
      // Solo activar auto-show si NO se ha mostrado el hint aún
      if (!autoHintShown) {
        startAutoShowTimer();
      }
    }
  }, 2000);
}

// Iniciar timer de auto-show (2 segundos después de auto-hide) - SOLO COMO HINT
function startAutoShowTimer() {
  clearTimeout(autoShowTimeout);
  autoShowTimeout = setTimeout(() => {
    if (menusAutoHidden && !autoHintShown) {
      showMenus();
      menusAutoHidden = false;
      autoHintShown = true; // Marcar que ya se mostró el hint
      setDebug('📱 UI panels shown as hint - auto-cycle complete');
    }
  }, 2000);
}

// Resetear timers cuando el usuario interactúa - SOLO si el hint no se ha mostrado Y el usuario no ha interactuado
function resetAutoHideTimers() {
  if (!menusAutoHidden && !autoHintShown && !userHasInteracted) {
    clearTimeout(autoHideTimeout);
    startAutoHideTimer();
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
  // Configuración de sombras según calidad del dispositivo
  const shadowConfig = getShadowConfig(shadowQuality);
  
  // Luz ambiental
  const ambientLight = new THREE.AmbientLight(preset.ambient.color, preset.ambient.intensity);
  scene.add(ambientLight);
  allLights.push(ambientLight);
  
  // Luz principal direccional con sombras optimizadas
  const mainLight = new THREE.DirectionalLight(preset.main.color, preset.main.intensity);
  mainLight.position.set(...preset.main.position);
  
  if (shadowConfig.enableShadows) {
    mainLight.castShadow = true;
    configureLight(mainLight, shadowConfig.main);
  }
  
  scene.add(mainLight);
  allLights.push(mainLight);
  
  // Luz de relleno - solo para calidad media/alta
  if (shadowQuality !== 'ultra-low') {
    const fillLight = new THREE.DirectionalLight(preset.fill.color, preset.fill.intensity);
    fillLight.position.set(...preset.fill.position);
    
    if (shadowConfig.enableShadows && shadowQuality !== 'low') {
      fillLight.castShadow = true;
      configureLight(fillLight, shadowConfig.fill);
    }
    
    scene.add(fillLight);
    allLights.push(fillLight);
  }
  
  // Luz de respaldo - sin sombras para optimización
  const backLight = new THREE.DirectionalLight(preset.back.color, preset.back.intensity);
  backLight.position.set(...preset.back.position);
  scene.add(backLight);
  allLights.push(backLight);
  
  // Luces puntuales - solo para calidad alta
  if (shadowQuality === 'high') {
    const pointLight1 = new THREE.PointLight(preset.point1.color, preset.point1.intensity, 50);
    pointLight1.position.set(...preset.point1.position);
    pointLight1.castShadow = true;
    configurePointLight(pointLight1, shadowConfig.point);
    scene.add(pointLight1);
    allLights.push(pointLight1);
    
    const pointLight2 = new THREE.PointLight(preset.point2.color, preset.point2.intensity, 50);
    pointLight2.position.set(...preset.point2.position);
    pointLight2.castShadow = true;
    configurePointLight(pointLight2, shadowConfig.point);
    scene.add(pointLight2);
    allLights.push(pointLight2);
  }
  
  // Luz hemisférica - siempre presente, es eficiente
  const hemiLight = new THREE.HemisphereLight(
    preset.hemi.skyColor, 
    preset.hemi.groundColor, 
    preset.hemi.intensity
  );
  scene.add(hemiLight);
  allLights.push(hemiLight);
}

// Configuración de sombras según calidad
function getShadowConfig(quality) {
  const configs = {
    'ultra-low': {
      enableShadows: false,
      main: { mapSize: 512, radius: 5, blurSamples: 5 }
    },
    'low': {
      enableShadows: true,
      main: { mapSize: 1024, radius: 8, blurSamples: 10 },
      fill: { mapSize: 512, radius: 5, blurSamples: 8 }
    },
    'medium': {
      enableShadows: true,
      main: { mapSize: 2048, radius: 15, blurSamples: 20 },
      fill: { mapSize: 1024, radius: 10, blurSamples: 15 },
      point: { mapSize: 512, radius: 10, blurSamples: 15 }
    },
    'high': {
      enableShadows: true,
      main: { mapSize: 4096, radius: 25, blurSamples: 35 },
      fill: { mapSize: 2048, radius: 15, blurSamples: 25 },
      point: { mapSize: 1024, radius: 20, blurSamples: 25 }
    }
  };
  
  return configs[quality] || configs['medium'];
}

// Configurar luz direccional
function configureLight(light, config) {
  light.shadow.mapSize.width = config.mapSize;
  light.shadow.mapSize.height = config.mapSize;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 50;
  light.shadow.camera.left = -15;
  light.shadow.camera.right = 15;
  light.shadow.camera.top = 15;
  light.shadow.camera.bottom = -15;
  light.shadow.radius = config.radius;
  light.shadow.blurSamples = config.blurSamples;
  light.shadow.bias = -0.0005;
}

// Configurar luz puntual
function configurePointLight(light, config) {
  light.shadow.mapSize.width = config.mapSize;
  light.shadow.mapSize.height = config.mapSize;
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 25;
  light.shadow.radius = config.radius;
  light.shadow.blurSamples = config.blurSamples;
  light.shadow.bias = -0.0002;
}

function initThreeJS() {
  // Inicializar Three.js
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 1000);
  camera.position.set(0, 2, 5);

  // Configuración optimizada del renderer según dispositivo
  const rendererConfig = {
    antialias: !isMobileDevice, // Desactivar antialiasing en móviles
    alpha: true,
    powerPreference: isMobileDevice ? "low-power" : "high-performance",
    stencil: false,
    depth: true
  };

  renderer = new THREE.WebGLRenderer(rendererConfig);
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Configurar pixel ratio optimizado
  renderer.setPixelRatio(devicePixelRatio);
  
  // Configurar sombras según calidad del dispositivo
  if (shadowQuality !== 'ultra-low') {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = isMobileDevice ? THREE.PCFShadowMap : THREE.VSMShadowMap;
    renderer.shadowMap.autoUpdate = true;
  } else {
    renderer.shadowMap.enabled = false;
  }
  
  // Configuraciones de color y tone mapping optimizadas
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = isMobileDevice ? THREE.LinearToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  
  // Configuraciones adicionales según dispositivo
  if (!isMobileDevice) {
    renderer.physicallyCorrectLights = true;
    renderer.gammaFactor = 2.2;
  }
  
  document.getElementById('container').appendChild(renderer.domElement);

  // Inicializar OrbitControls con configuración optimizada por dispositivo
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  
  // Configuración específica por tipo de dispositivo
  switch (deviceType) {
    case 'fold-closed':
      // Fold cerrado: controles más lentos y precisos para pantalla pequeña
      controls.dampingFactor = 0.15;
      controls.panSpeed = 0.6;
      controls.zoomSpeed = 1.0;
      controls.rotateSpeed = 0.8;
      break;
    case 'fold-open':
      // Fold abierto: controles balanceados para pantalla grande
      controls.dampingFactor = 0.08;
      controls.panSpeed = 1.0;
      controls.zoomSpeed = 1.3;
      controls.rotateSpeed = 1.0;
      break;
    case 'iphone':
      // iPhone: controles optimizados para pantalla alargada
      controls.dampingFactor = 0.1;
      controls.panSpeed = 1.1;
      controls.zoomSpeed = 1.4;
      controls.rotateSpeed = 1.0;
      break;
    case 'tablet':
      // Tablet: controles suaves para pantalla grande
      controls.dampingFactor = 0.07;
      controls.panSpeed = 0.9;
      controls.zoomSpeed = 1.2;
      controls.rotateSpeed = 0.9;
      break;
    case 'mobile':
      // Móvil genérico
      controls.dampingFactor = 0.1;
      controls.panSpeed = 1.2;
      controls.zoomSpeed = 1.5;
      controls.rotateSpeed = 1.0;
      break;
    default:
      // Desktop: configuración original
      controls.dampingFactor = 0.05;
      controls.panSpeed = 0.8;
      controls.zoomSpeed = 1.0;
      controls.rotateSpeed = 1.0;
  }
  
  controls.minDistance = 1;
  controls.maxDistance = 100;
  controls.enablePan = true;
  controls.enableZoom = true;
  
  // Configuración táctil para dispositivos móviles
  if (isMobileDevice) {
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    controls.enableKeys = false;
    
    // Ajustes adicionales para Galaxy Fold
    if (deviceType === 'fold-closed') {
      // En Fold cerrado, hacer zoom más fácil con un dedo
      controls.touches.ONE = THREE.TOUCH.DOLLY_ROTATE;
    }
  }
  
  console.log('Professional OrbitControls initialized for:', deviceType, {
    dampingFactor: controls.dampingFactor,
    panSpeed: controls.panSpeed,
    zoomSpeed: controls.zoomSpeed,
    rotateSpeed: controls.rotateSpeed
  });

  // Configurar iluminación inicial (Studio preset)
  setLightingPreset(1);
  
  console.log('Enhanced lighting system initialized with quality:', shadowQuality);
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
  
  // Ajustar distancia de cámara según tipo de dispositivo
  let distanceMultiplier = 2.5; // Default
  let positionOffset = { x: 0.7, y: 0.5, z: 1.0 }; // Default
  
  switch (deviceType) {
    case 'fold-closed':
      // Fold cerrado: modelo más pequeño, más alejado para ver completo
      distanceMultiplier = 4.0;
      positionOffset = { x: 0.8, y: 0.6, z: 1.2 };
      break;
    case 'fold-open':
      // Fold abierto: modelo más grande, más cerca para aprovechar pantalla
      distanceMultiplier = 1.8;
      positionOffset = { x: 0.5, y: 0.4, z: 0.8 };
      break;
    case 'iphone':
      // iPhone: balance entre tamaño y visibilidad
      distanceMultiplier = 2.8;
      positionOffset = { x: 0.6, y: 0.5, z: 1.0 };
      break;
    case 'tablet':
      // Tablet: aprovechar pantalla más grande
      distanceMultiplier = 2.2;
      positionOffset = { x: 0.6, y: 0.4, z: 0.9 };
      break;
    case 'mobile':
      // Móvil genérico
      distanceMultiplier = 3.0;
      positionOffset = { x: 0.7, y: 0.5, z: 1.1 };
      break;
    default:
      // Desktop: configuración original
      distanceMultiplier = 2.5;
      positionOffset = { x: 0.7, y: 0.5, z: 1.0 };
  }
  
  let cameraDistance = Math.abs(maxScaledDim / 2 / Math.tan(fov / 2)) * distanceMultiplier;
  
  const cameraPos = center.clone();
  cameraPos.x += cameraDistance * positionOffset.x;
  cameraPos.y += cameraDistance * positionOffset.y;
  cameraPos.z += cameraDistance * positionOffset.z;
  
  camera.position.copy(cameraPos);
  camera.lookAt(center);

  if (controls) {
    controls.target.copy(center);
    
    // Ajustar límites de zoom según dispositivo
    switch (deviceType) {
      case 'fold-closed':
        controls.maxDistance = cameraDistance * 8;
        controls.minDistance = cameraDistance * 0.3;
        break;
      case 'fold-open':
        controls.maxDistance = cameraDistance * 12;
        controls.minDistance = cameraDistance * 0.15;
        break;
      case 'iphone':
        controls.maxDistance = cameraDistance * 10;
        controls.minDistance = cameraDistance * 0.2;
        break;
      case 'tablet':
        controls.maxDistance = cameraDistance * 15;
        controls.minDistance = cameraDistance * 0.1;
        break;
      default:
        controls.maxDistance = cameraDistance * 10;
        controls.minDistance = cameraDistance * 0.25;
    }
    
    controls.update();
  }
  
  console.log('Model fitted for device:', {
    deviceType: deviceType,
    cameraDistance: cameraDistance.toFixed(2),
    distanceMultiplier: distanceMultiplier,
    minZoom: controls?.minDistance?.toFixed(2),
    maxZoom: controls?.maxDistance?.toFixed(2)
  });
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
  
  // Debug cada segundo para verificar que la animación progresa
  if (Math.floor(currentTime * 10) % 10 === 0) {
    console.log(`Animation progress: ${(progress * 100).toFixed(1)}% (${currentTime.toFixed(2)}s/${duration.toFixed(2)}s)`);
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
        console.log('Animation details:', animations.map(anim => ({
          name: anim.name,
          duration: anim.duration,
          tracks: anim.tracks.length
        })));
        
        mixer = new THREE.AnimationMixer(model);
        
        animations.forEach((clip, index) => {
          console.log(`Animation ${index}: ${clip.name}, duration: ${clip.duration}s, tracks: ${clip.tracks.length}`);
        });
        
        showAnimationControls(animations[0].name || 'Animation', animations[0].duration);
        
        if (animations[0]) {
          const action = mixer.clipAction(animations[0]);
          // NO LOOP - la animación se detiene al final
          action.setLoop(THREE.LoopOnce);
          action.clampWhenFinished = true;
          action.time = 0;
          
          // IMPORTANTE: Primero reproducir la animación para que funcione
          action.play();
          action.paused = true; // Luego pausarla inmediatamente
          
          // Iniciar animación después de 2 segundos
          setTimeout(() => {
            if (action) {
              action.paused = false; // Desactivar pausa
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
          
          // Optimizar materiales según dispositivo
          if (!child.material || child.material.type === 'MeshBasicMaterial') {
            if (isMobileDevice) {
              // Material simplificado para móviles
              child.material = new THREE.MeshLambertMaterial({
                color: 0xffffff,
                transparent: false,
                fog: false
              });
            } else {
              // Material estándar para desktop
              child.material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.2,
                roughness: 0.4,
                envMapIntensity: 1.0
              });
            }
          } else if (isMobileDevice && child.material.type === 'MeshStandardMaterial') {
            // Simplificar materiales existentes en móviles
            const oldMaterial = child.material;
            child.material = new THREE.MeshLambertMaterial({
              color: oldMaterial.color,
              map: oldMaterial.map,
              transparent: oldMaterial.transparent,
              opacity: oldMaterial.opacity
            });
            oldMaterial.dispose();
          }
          
          // Habilitar sombras según calidad
          if (shadowQuality !== 'ultra-low') {
            child.castShadow = true;
            child.receiveShadow = true;
          }
          
          // Asegurar normales correctas para mejor iluminación
          if (child.geometry.attributes.normal === undefined) {
            child.geometry.computeVertexNormals();
          }
          
          // Optimizar geometría en móviles extremos
          if (shadowQuality === 'ultra-low' && child.geometry.attributes.position.count > 10000) {
            console.log('High poly mesh detected on low-end device:', child.geometry.attributes.position.count, 'vertices');
            // Aquí podrías aplicar simplificación de geometría si fuera necesario
          }
        }
      });
      
      scene.add(model);
      addDebugHelpers(model);
      fitAndScaleModel(camera, model, 0.8);
      
      // Setup professional object interaction
      setupObjectClickDetection(model);
      
      setDebug(`✅ GLTF Model loaded! ${meshCount} meshes found` + 
               (animations.length > 0 ? ` | ${animations.length} animations` : '') +
               ` | Quality: ${shadowQuality}`, true);
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

// Event listeners optimizados
window.addEventListener('resize', function() {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Redetectar tipo de dispositivo (importante para Galaxy Fold al abrir/cerrar)
    const oldDeviceType = deviceType;
    const oldShadowQuality = shadowQuality;
    const oldPixelRatio = devicePixelRatio;
    
    detectMobileAndOptimize();
    
    // Si cambió el tipo de dispositivo, reconfigurar completamente
    if (oldDeviceType !== deviceType) {
      console.log('Device type changed from', oldDeviceType, 'to', deviceType);
      
      // Reconfigurar controles para el nuevo dispositivo
      if (controls) {
        switch (deviceType) {
          case 'fold-closed':
            controls.dampingFactor = 0.15;
            controls.panSpeed = 0.6;
            controls.zoomSpeed = 1.0;
            controls.rotateSpeed = 0.8;
            controls.touches.ONE = THREE.TOUCH.DOLLY_ROTATE;
            break;
          case 'fold-open':
            controls.dampingFactor = 0.08;
            controls.panSpeed = 1.0;
            controls.zoomSpeed = 1.3;
            controls.rotateSpeed = 1.0;
            controls.touches.ONE = THREE.TOUCH.ROTATE;
            break;
          case 'iphone':
            controls.dampingFactor = 0.1;
            controls.panSpeed = 1.1;
            controls.zoomSpeed = 1.4;
            controls.rotateSpeed = 1.0;
            break;
          case 'tablet':
            controls.dampingFactor = 0.07;
            controls.panSpeed = 0.9;
            controls.zoomSpeed = 1.2;
            controls.rotateSpeed = 0.9;
            break;
          case 'mobile':
            controls.dampingFactor = 0.1;
            controls.panSpeed = 1.2;
            controls.zoomSpeed = 1.5;
            controls.rotateSpeed = 1.0;
            break;
          default:
            controls.dampingFactor = 0.05;
            controls.panSpeed = 0.8;
            controls.zoomSpeed = 1.0;
            controls.rotateSpeed = 1.0;
        }
      }
      
      // Reajustar modelo para el nuevo tipo de dispositivo
      if (model) {
        fitAndScaleModel(camera, model, 0.8);
      }
    }
    
    // Si cambió la calidad de sombras, recrear luces
    if (oldShadowQuality !== shadowQuality) {
      console.log('Shadow quality changed from', oldShadowQuality, 'to', shadowQuality);
      setLightingPreset(currentLightingPreset);
    }
    
    // Si cambió el pixel ratio, actualizar renderer
    if (oldPixelRatio !== devicePixelRatio) {
      console.log('Pixel ratio changed from', oldPixelRatio, 'to', devicePixelRatio);
      renderer.setPixelRatio(devicePixelRatio);
    }
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

// Loop de animación optimizado
function animate() {
  requestAnimationFrame(animate);
  
  if (controls) controls.update();
  
  // Actualizar mixer con delta time optimizado para móviles
  if (mixer) {
    const deltaTime = isMobileDevice ? 0.02 : 0.016; // ~50fps en móviles, ~60fps en desktop
    mixer.update(deltaTime);
    
    // Solo actualizar UI si está reproduciendo y no arrastrando
    if (isPlaying && !isDragging && !rewindInProgress) {
      updateAnimationUI();
    }
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
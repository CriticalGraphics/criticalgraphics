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

// Función para iniciar el visor
function startViewer() {
  // Inicializar elemento debug
  debugMsg = document.getElementById('debug');
  
  setDebug('🚀 Initializing 3D viewer...');
  
  // Inicializar Three.js PRIMERO
  initThreeJS();
  
  // Luego iniciar el loop de animación
  animate();
  
  // Finalmente cargar el modelo
  setDebug('🔍 Cargando modelo GLB local...');
  loadGLTFModel(MODEL_URL);
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
  document.getElementById('container').appendChild(renderer.domElement);

  // Inicializar OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  console.log('OrbitControls initialized successfully');

  // Sistema de iluminación mejorado para mejor percepción
  // 1. Luz ambiental más suave pero presente
  scene.add(new THREE.AmbientLight(0x404040, 0.6)); // Gris suave para sombras naturales
  
  // 2. Luz principal direccional (sol)
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(10, 10, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  scene.add(mainLight);
  
  // 3. Luz de relleno desde el lado opuesto
  const fillLight = new THREE.DirectionalLight(0x8ec5ff, 0.8); // Azul suave
  fillLight.position.set(-10, 5, -5);
  scene.add(fillLight);
  
  // 4. Luz de respaldo desde atrás y arriba
  const backLight = new THREE.DirectionalLight(0xffeaa7, 0.6); // Amarillo cálido
  backLight.position.set(0, 10, -10);
  scene.add(backLight);
  
  // 5. Luces puntuales para destacar detalles
  const pointLight1 = new THREE.PointLight(0xffffff, 0.8, 50);
  pointLight1.position.set(5, 5, 5);
  scene.add(pointLight1);
  
  const pointLight2 = new THREE.PointLight(0x74b9ff, 0.6, 50); // Azul suave
  pointLight2.position.set(-5, 3, 8);
  scene.add(pointLight2);
  
  // 6. Luz hemisférica para simular luz del cielo
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x8b4513, 0.4); // Cielo azul, tierra marrón
  scene.add(hemiLight);
  
  console.log('Enhanced lighting system initialized with 7 light sources');
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

  // Botones de control
  playPauseBtn.addEventListener('click', togglePlayPause);
  document.getElementById('resetBtn').addEventListener('click', () => setAnimationProgress(0));
  document.getElementById('endBtn').addEventListener('click', () => setAnimationProgress(1));
  
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

function updateAnimationUI() {
  if (!mixer || !animations.length || !animationControls) return;
  
  const action = mixer._actions[0];
  if (!action) return;
  
  const currentTime = action.time;
  const duration = animations[0].duration;
  const progress = currentTime / duration;
  
  scrollProgress = Math.max(0, Math.min(1, progress));
  
  progressBar.style.width = (scrollProgress * 100) + '%';
  progressHandle.style.left = (scrollProgress * 100) + '%';
  
  animationTimeEl.textContent = `${currentTime.toFixed(2)}s / ${duration.toFixed(2)}s`;
  
  // Detectar si la animación terminó
  if (isPlaying && currentTime >= duration) {
    isPlaying = false;
    action.paused = true;
    playPauseBtn.textContent = '▶️ Play';
    playPauseBtn.classList.remove('active');
    setDebug('🎬 Animation finished');
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
  
  const action = mixer._actions[0];
  
  // Si la animación terminó, reiniciarla
  if (action.time >= animations[0].duration) {
    action.time = 0;
    setAnimationProgress(0);
  }
  
  isPlaying = !isPlaying;
  
  if (isPlaying) {
    action.paused = false;
    playPauseBtn.textContent = '⏸️ Pause';
    playPauseBtn.classList.add('active');
    setDebug('🎬 Animation playing');
  } else {
    action.paused = true;
    playPauseBtn.textContent = '▶️ Play';
    playPauseBtn.classList.remove('active');
    setDebug('🎬 Animation paused');
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
          
          action.play();
          action.paused = true;
          action.time = 0;
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
      setDebug('✅ GLTF Model loaded! ' + meshCount + ' meshes found' + 
               (animations.length > 0 ? ` | ${animations.length} animations` : ''), true);
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
  
  if (mixer && isPlaying && !isDragging) {
    mixer.update(0.016);
    updateAnimationUI();
  }
  
  renderer.render(scene, camera);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startViewer);
} else {
  startViewer();
}

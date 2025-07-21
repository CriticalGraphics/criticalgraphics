// 3D Viewer App - Three.js r158 ES6 Modules
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
      if (animations && animations.length > 0) {
        console.log('Found animations:', animations.length);
        mixer = new THREE.AnimationMixer(model);
        
        // Crear clips de animación pero no los reproducir automáticamente
        animations.forEach((clip, index) => {
          console.log(`Animation ${index}: ${clip.name}, duration: ${clip.duration}s`);
        });
        
        // Mostrar controles de animación
        showAnimationControls(animations[0].name || 'Animation', animations[0].duration);
        
        // Si hay animaciones, usar la primera por defecto
        if (animations[0]) {
          const action = mixer.clipAction(animations[0]);
          action.play();
          action.paused = true; // Pausar para control manual
          action.time = 0; // Empezar desde el inicio
        }
      } else {
        console.log('No animations found');
        hideAnimationControls();
        mixer = null;
      }
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

console.log('Three.js loaded via ES6 modules, version:', THREE.REVISION);

// URLs de modelos de ejemplo - cambia estas para probar diferentes formatos
const MODEL_URLS = {
  obj: "https://raw.githubusercontent.com/CriticalGraphics/criticalgraphics/main/models/modelo1.obj",
  // Agrega aquí URLs de tus archivos GLTF/GLB cuando los tengas
  gltf: "https://raw.githubusercontent.com/CriticalGraphics/criticalgraphics/main/models/modelo1.gltf",
  glb: "https://raw.githubusercontent.com/CriticalGraphics/criticalgraphics/main/models/modelo1.glb"
};

// URL actual a cargar (cambia 'obj' por 'gltf' o 'glb' cuando tengas esos archivos)
const OBJ_URL = MODEL_URLS.obj;

let camera, scene, renderer, controls, model;
let mixer, animations = []; // Para manejar animaciones
let animationScrollControl = false; // Flag para saber si hay animaciones
let scrollProgress = 0; // Progreso del scroll (0-1)
let isPlaying = false; // Estado de reproducción
let isDragging = false; // Estado de arrastre de la barra
const debugMsg = document.getElementById('debug');

// Referencias a elementos de UI
let animationControls, progressBar, progressHandle, progressContainer;
let animationNameEl, animationTimeEl, playPauseBtn;

// Inicializar Three.js
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 1000);
camera.position.set(0, 2, 5);

renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('container').appendChild(renderer.domElement);

// Inicializar OrbitControls
controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
console.log('OrbitControls initialized successfully');

// Iluminación mejorada
scene.add(new THREE.AmbientLight(0xffffff, 0.8)); // Más luz ambiental
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5); // Más intensidad
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
scene.add(dirLight);

// Agregar luz adicional desde otro ángulo
const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight2.position.set(-5, 5, -7);
scene.add(dirLight2);

// Funciones de utilidad
function setDebug(msg, ok) {
  debugMsg.textContent = msg;
  debugMsg.style.background = ok === undefined ? 'rgba(0,0,0,0.7)' : (ok ? 'rgba(0,80,0,0.7)' : 'rgba(80,0,0,0.7)');
  debugMsg.style.color = ok === undefined ? '#fff' : (ok ? '#b0ffb0' : '#ffb0b0');
  console.log('DEBUG:', msg);
}

function fitAndScaleModel(camera, object, scaleTo = 0.8) {
  console.log('=== DEBUGGING MODEL FITTING ===');
  
  const box = new THREE.Box3().setFromObject(object);
  console.log('Original bounding box:', box.min, box.max);
  
  if (!isFinite(box.min.x) || !isFinite(box.max.x)) {
    console.warn('Invalid bounding box for model');
    return;
  }
  
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  console.log('Model size:', size);
  console.log('Model center (where object really is):', center);
  console.log('Model position (origin):', object.position);

  // NO mover el objeto, solo escalar si es necesario
  let scale = 1;
  const maxDim = Math.max(size.x, size.y, size.z);
  console.log('Max dimension:', maxDim);
  
  if (maxDim > 10) { // Solo escalar si es muy grande
    scale = 10 / maxDim; // Escalar a máximo 10 unidades
    object.scale.set(scale, scale, scale);
    console.log('Applied scale (object was too big):', scale);
    
    // Recalcular bounding box después del escalado
    const scaledBox = new THREE.Box3().setFromObject(object);
    const scaledSize = scaledBox.getSize(new THREE.Vector3());
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    console.log('After scaling - size:', scaledSize, 'center:', scaledCenter);
    
    // Usar el centro escalado
    center.copy(scaledCenter);
    size.copy(scaledSize);
  } else {
    console.log('Object size is good, no scaling needed');
  }

  // Calcular distancia de cámara basada en el tamaño real del objeto
  const maxScaledDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraDistance = Math.abs(maxScaledDim / 2 / Math.tan(fov / 2)) * 2.5;
  
  // Posicionar la cámara para mirar AL CENTRO del bounding box, no al origen
  const cameraPos = center.clone();
  cameraPos.x += cameraDistance * 0.7;
  cameraPos.y += cameraDistance * 0.5;
  cameraPos.z += cameraDistance;
  
  camera.position.copy(cameraPos);
  camera.lookAt(center); // Mirar al centro del objeto real
  console.log('Camera positioned at:', camera.position);
  console.log('Camera looking at center:', center);

  if (controls) {
    controls.target.copy(center); // Target en el centro del objeto real
    controls.maxDistance = cameraDistance * 10;
    controls.minDistance = cameraDistance * 0.25;
    controls.update();
    console.log('Controls target set to object center:', center);
  }

  console.log('=== DEBUG COMPLETE ===');
}

function addDebugHelpers(model) {
  // Primero obtener el bounding box para colocar los helpers en el lugar correcto
  const tempBox = new THREE.Box3().setFromObject(model);
  const tempCenter = tempBox.getCenter(new THREE.Vector3());
  
  // Agregar ejes de referencia en el centro del objeto real
  const axesHelper = new THREE.AxesHelper(2);
  axesHelper.position.copy(tempCenter);
  scene.add(axesHelper);
  console.log('Added axes helper at object center:', tempCenter);
  
  // Agregar una esfera pequeña en el centro del objeto real
  const sphereGeometry = new THREE.SphereGeometry(0.2, 8, 6);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const centerSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  centerSphere.position.copy(tempCenter);
  scene.add(centerSphere);
  console.log('Added red sphere at object center:', tempCenter);
}

function loadGLTFModel(modelUrl) {
  setDebug('Loading GLTF/GLB model from: ' + modelUrl);
  
  const loader = new GLTFLoader();
  
  loader.load(
    modelUrl,
    // onLoad
    function(gltf) {
      console.log('GLTF loaded successfully:', gltf);
      
      if (model) scene.remove(model);
      model = gltf.scene;
      
      let meshCount = 0;
      model.traverse(function(child) {
        if (child.isMesh) {
          meshCount++;
          // GLTF ya viene con materiales, solo los mejoramos si es necesario
          if (!child.material || child.material.type === 'MeshBasicMaterial') {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              metalness: 0.1,
              roughness: 0.7
            });
          }
          // Asegurar que las normales estén correctas
          if (child.geometry.attributes.normal === undefined) {
            child.geometry.computeVertexNormals();
          }
        }
      });
      
      scene.add(model);
      addDebugHelpers(model);
function loadGLTFModel(modelUrl) {
  setDebug('Loading GLTF/GLB model from: ' + modelUrl);
  const loader = new GLTFLoader();
  loader.load(
    modelUrl,
    function(gltf) {
      if (model) scene.remove(model);
      model = gltf.scene;
      animations = gltf.animations;
      if (animations && animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        animationScrollControl = true;
        animationDuration = animations[0].duration;
        animationName = animations[0].name || 'Animation';
        showAnimationControls(true, animationName, animationDuration);
        const action = mixer.clipAction(animations[0]);
        action.play();
        action.paused = true;
        action.time = 0;
        updateAnimationSlider(0, animationDuration);
      } else {
        animationScrollControl = false;
        mixer = null;
        showAnimationControls(false);
      }
      
      let meshCount = 0;
      model.traverse(function(child) {
        if (child.isMesh) {
          meshCount++;
          // GLTF ya viene con materiales, solo los mejoramos si es necesario
          if (!child.material || child.material.type === 'MeshBasicMaterial') {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              metalness: 0.1,
              roughness: 0.7
            });
          }
          // Asegurar que las normales estén correctas
          if (child.geometry.attributes.normal === undefined) {
            child.geometry.computeVertexNormals();
          }
        }
      });
      
      scene.add(model);
      addDebugHelpers(model);
      fitAndScaleModel(camera, model, 0.8);
      setDebug('✅ GLTF Model loaded! ' + meshCount + ' meshes found', true);
    },
    // onProgress
    function(xhr) {
      if (xhr.lengthComputable) {
        const percentComplete = xhr.loaded / xhr.total * 100;
        setDebug('📥 Loading GLTF: ' + percentComplete.toFixed(1) + '%');
      } else {
        setDebug('📥 Loading GLTF model...');
      }
    },
    // onError
    function(err) {
      console.error('GLTF Load Error:', err);
      setDebug('❌ Failed to load GLTF model: ' + err.message, false);
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

function loadOBJModel(objUrl) {
  setDebug('Loading OBJ model from: ' + objUrl);
  
  const loader = new OBJLoader();
  
  loader.load(
    objUrl,
    // onLoad
    function(obj) {
      console.log('OBJ loaded successfully:', obj);
      
      if (model) scene.remove(model);
      model = obj;
      
      let meshCount = 0;
      model.traverse(function(child) {
        if (child.isMesh) {
          meshCount++;
          // Material más visible con colores brillantes
          child.material = new THREE.MeshStandardMaterial({
            color: 0xffffff, // Blanco para máxima visibilidad
            metalness: 0.1,
            roughness: 0.7,
            wireframe: false
          });
          // Asegurar que las normales estén correctas
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
    // onProgress
    function(xhr) {
      if (xhr.lengthComputable) {
        const percentComplete = xhr.loaded / xhr.total * 100;
        setDebug('📥 Loading: ' + percentComplete.toFixed(1) + '%');
      } else {
        setDebug('📥 Loading model...');
      }
    },
    // onError
    function(err) {
      console.error('OBJ Load Error:', err);
      setDebug('❌ Failed to load model: ' + err.message, false);
    }
  );
}

// Control de barra de animación
if (animationSlider) {
  animationSlider.addEventListener('input', function(e) {
    if (animationScrollControl && mixer && animations.length > 0) {
      const percent = parseFloat(animationSlider.value) / 100;
      scrollProgress = Math.max(0, Math.min(1, percent));
      const action = mixer._actions[0];
      if (action) {
        action.time = scrollProgress * animationDuration;
        updateAnimationSlider(action.time, animationDuration);
      }
    }
  });
}

// Control de botón play/pause
if (playButton) {
  playButton.addEventListener('click', function() {
    if (animationScrollControl && mixer && animations.length > 0) {
      const action = mixer._actions[0];
      if (action) {
        action.paused = !action.paused;
        playButton.textContent = action.paused ? '▶' : '⏸';
      }
    }
  });
}

// Touch support para slider
if (animationSlider) {
  animationSlider.addEventListener('touchstart', function(e) {
    e.stopPropagation();
  });
  animationSlider.addEventListener('touchmove', function(e) {
    if (animationScrollControl && mixer && animations.length > 0) {
      const touch = e.touches[0];
      const rect = animationSlider.getBoundingClientRect();
      const percent = (touch.clientX - rect.left) / rect.width;
      scrollProgress = Math.max(0, Math.min(1, percent));
      const action = mixer._actions[0];
      if (action) {
        action.time = scrollProgress * animationDuration;
        updateAnimationSlider(action.time, animationDuration);
      }
    }
  });
}

// Event listeners
window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Loop de animación
function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  
  // Actualizar mixer de animaciones si existe y está reproduciéndose
  if (mixer && isPlaying && !isDragging) {
    mixer.update(0.016); // ~60fps
    updateAnimationUI();
  }
  
  renderer.render(scene, camera);
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
}

function updateAnimationUI() {
  if (!mixer || !animations.length || !animationControls) return;
  
  const action = mixer._actions[0];
  if (!action) return;
  
  const currentTime = action.time;
  const duration = animations[0].duration;
  const progress = currentTime / duration;
  
  scrollProgress = Math.max(0, Math.min(1, progress));
  
  // Actualizar UI
  progressBar.style.width = (scrollProgress * 100) + '%';
  progressHandle.style.left = (scrollProgress * 100) + '%';
  
  animationTimeEl.textContent = `${currentTime.toFixed(2)}s / ${duration.toFixed(2)}s`;
}

function setAnimationProgress(progress) {
  if (!mixer || !animations.length) return;
  
  scrollProgress = Math.max(0, Math.min(1, progress));
  const action = mixer._actions[0];
  if (action) {
    action.time = scrollProgress * animations[0].duration;
    updateAnimationUI();
  }
}

function togglePlayPause() {
  if (!mixer || !animations.length) return;
  
  isPlaying = !isPlaying;
  const action = mixer._actions[0];
  
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

// Funciones de arrastre
function startDrag(e) {
  if (!animationScrollControl) return;
  
  isDragging = true;
  isPlaying = false; // Pausar durante el arrastre
  
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
  isDragging = false;
}

function updateProgressFromEvent(e) {
  if (!progressContainer) return;
  
  const rect = progressContainer.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const x = clientX - rect.left;
  const progress = Math.max(0, Math.min(1, x / rect.width));
  
  setAnimationProgress(progress);
}

// Función para iniciar el visor
function startViewer() {
  setDebug('🚀 Initializing 3D viewer...');
  animate();
  loadModel(OBJ_URL); // Ahora usa la función universal
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startViewer);
} else {
  startViewer();
}

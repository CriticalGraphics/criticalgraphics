// 3D Viewer App - Three.js r158 ES6 Modules con controles de animación
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

console.log('Three.js loaded via ES6 modules, version:', THREE.REVISION);

// URLs de modelos - ajusta estos según los archivos que tengas
const MODEL_URLS = {
  obj: "https://raw.githubusercontent.com/CriticalGraphics/criticalgraphics/main/models/modelo1.obj",
  gltf: "https://raw.githubusercontent.com/CriticalGraphics/criticalgraphics/main/models/modelo1.gltf",
  glb: "https://github.com/CriticalGraphics/criticalgraphics/raw/refs/heads/main/models/modelo1.glb"
};

// Para agregar más modelos, descomenta y ajusta:
// const ALTERNATIVE_MODELS = {
//   modelo2_glb: "https://raw.githubusercontent.com/CriticalGraphics/criticalgraphics/main/models/modelo2.glb",
//   modelo3_glb: "https://raw.githubusercontent.com/CriticalGraphics/criticalgraphics/main/models/modelo3.glb"
// };

// Priorizar GLB si existe, luego GLTF, luego OBJ
const CURRENT_MODEL_URL = MODEL_URLS.glb;

// Variables globales
let camera, scene, renderer, controls, model;
let mixer, animations = [];
let animationScrollControl = false;
let scrollProgress = 0;
let isPlaying = false;
let isDragging = false;
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
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
scene.add(dirLight);

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
  const tempBox = new THREE.Box3().setFromObject(model);
  const tempCenter = tempBox.getCenter(new THREE.Vector3());
  
  const axesHelper = new THREE.AxesHelper(2);
  axesHelper.position.copy(tempCenter);
  scene.add(axesHelper);
  
  const sphereGeometry = new THREE.SphereGeometry(0.2, 8, 6);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const centerSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  centerSphere.position.copy(tempCenter);
  scene.add(centerSphere);
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
  isPlaying = false;
  
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
          if (!child.material || child.material.type === 'MeshBasicMaterial') {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              metalness: 0.1,
              roughness: 0.7
            });
          }
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
          child.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.7,
            wireframe: false
          });
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

// Función inteligente que intenta cargar en orden de preferencia
function loadModelWithFallback() {
  const modelPriority = [
    { url: MODEL_URLS.glb, name: 'GLB (con animaciones)' },
    { url: MODEL_URLS.gltf, name: 'GLTF (con animaciones)' },
    { url: MODEL_URLS.obj, name: 'OBJ (solo geometría)' }
  ];
  
  async function tryLoad(index = 0) {
    if (index >= modelPriority.length) {
      setDebug('❌ No se pudo cargar ningún modelo', false);
      return;
    }
    
    const currentModel = modelPriority[index];
    setDebug(`🔍 Intentando cargar ${currentModel.name}...`);
    
    try {
      // Verificar si el archivo existe haciendo una petición HEAD
      const response = await fetch(currentModel.url, { method: 'HEAD' });
      
      if (response.ok) {
        console.log(`✅ Archivo encontrado: ${currentModel.url}`);
        loadModel(currentModel.url);
        return;
      } else {
        console.log(`❌ Archivo no encontrado: ${currentModel.url}`);
        tryLoad(index + 1);
      }
    } catch (error) {
      console.log(`❌ Error al verificar: ${currentModel.url}`, error);
      tryLoad(index + 1);
    }
  }
  
  tryLoad();
}

// Event listeners
window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Control de scroll para animaciones (wheel)
window.addEventListener('wheel', function(event) {
  if (animationScrollControl && mixer && animations.length > 0) {
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

// Función para iniciar el visor
function startViewer() {
  setDebug('🚀 Initializing 3D viewer...');
  animate();
  loadModelWithFallback(); // Intenta cargar en orden de preferencia
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startViewer);
} else {
  startViewer();
}

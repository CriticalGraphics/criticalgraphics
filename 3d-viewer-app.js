// 3D Viewer App - Three.js r158 ES6 Modules
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

console.log('Three.js loaded via ES6 modules, version:', THREE.REVISION);

const OBJ_URL = "https://raw.githubusercontent.com/CriticalGraphics/criticalgraphics/main/models/modelo1.obj";

let camera, scene, renderer, controls, model;
const debugMsg = document.getElementById('debug');

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

// Iluminación
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

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

  object.position.sub(center);

  let scale = 1; // Declarar scale fuera del bloque if
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    scale = scaleTo / maxDim;
    object.scale.set(scale, scale, scale);
  }

  const scaledBox = new THREE.Box3().setFromObject(object);
  const scaledSize = scaledBox.getSize(new THREE.Vector3());
  const scaledMaxDim = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(scaledMaxDim / 2 / Math.tan(fov / 2)) * 1.8;
  
  camera.position.set(0, 0, cameraZ);
  camera.lookAt(0, 0, 0);

  if (controls) {
    controls.target.set(0, 0, 0);
    controls.maxDistance = cameraZ * 10;
    controls.minDistance = cameraZ * 0.25;
    controls.update();
  }

  console.log('Model fitted. Scale:', scale, 'Camera Z:', cameraZ);
}

function loadOBJModel(objUrl) {
  setDebug('Loading model from: ' + objUrl);
  
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
          child.material = new THREE.MeshStandardMaterial({
            color: 0x999999,
            metalness: 0.4,
            roughness: 0.5
          });
        }
      });
      
      scene.add(model);
      fitAndScaleModel(camera, model, 0.8);
      setDebug('✅ Model loaded! ' + meshCount + ' meshes found', true);
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
  renderer.render(scene, camera);
}

// Función para iniciar el visor
function startViewer() {
  setDebug('🚀 Initializing 3D viewer...');
  animate();
  loadOBJModel(OBJ_URL);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startViewer);
} else {
  startViewer();
}

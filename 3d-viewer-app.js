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

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BLOCK_SIZE, buildBlockMeshGroup, getBlockSurfaceY } from './geometry.js';
import { createLevel01Preset } from './level01Preset.js';

// ============================================================================
// EDITOR STATE
// ============================================================================
const state = {
  cols: 13,
  rows: 13,
  blocks: {}, // key: "bx,bz" -> block object
  selectedCell: { bx: 4, bz: 4 },
  hoveredCell: null,
  activeTool: 'select', // 'select' | 'paint_block' | 'paint_element' | 'paint_decal' | 'erase' | 'pick'
  cameraMode: 'ortho',  // 'ortho' | 'persp'
  showGridHelper: false,
  isSimulating: false,

  // Brush / Inspector values
  brush: {
    shape: 'flat',
    elevation: 12.0,
    slope: 0.0,
    tilt: 0.0,
    rotation: 0,
    element: 'tube_corner',
    elemRotation: 0,
    decal: 'arrow_wide_diag',
    decalRotation: 0,
    subHeights: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]
  },

  undoStack: [],
  redoStack: []
};

// ============================================================================
// THREE.JS SCENE SETUP
// ============================================================================
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Cameras: Orthographic (Authentic Isometric Arcade) & Perspective
const aspect = container.clientWidth / container.clientHeight;
const orthoFrustum = 34;
const orthoCamera = new THREE.OrthographicCamera(
  (-orthoFrustum * aspect) / 2,
  (orthoFrustum * aspect) / 2,
  orthoFrustum / 2,
  -orthoFrustum / 2,
  -200,
  400
);

const perspCamera = new THREE.PerspectiveCamera(42, aspect, 0.5, 400);
let activeCamera = orthoCamera;

const controls = new OrbitControls(activeCamera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.49;

// Lighting (Matches Marble Madness crisp directional sun from top-left + ambient)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffaf0, 1.15);
sunLight.position.set(-22, 48, 12);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 160;
const d = 38;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
sunLight.shadow.bias = -0.0008;
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x90a8ff, 0.25);
fillLight.position.set(25, 20, -20);
scene.add(fillLight);

// Groups
const worldGroup = new THREE.Group();
scene.add(worldGroup);

const blockMeshes = new Map(); // key "bx,bz" -> THREE.Group

// Interactive Base Grid & Selection/Hover Cursors
const helperGroup = new THREE.Group();
scene.add(helperGroup);

let gridPlaneMesh = null;
let hoverCursor = null;
let selectCursor = null;

function gridToWorldCenter(bx, bz) {
  const offsetX = -((state.cols - 1) * BLOCK_SIZE) / 2;
  const offsetZ = -((state.rows - 1) * BLOCK_SIZE) / 2;
  return {
    wx: offsetX + bx * BLOCK_SIZE,
    wz: offsetZ + bz * BLOCK_SIZE
  };
}

function worldToGridCell(wx, wz) {
  const offsetX = -((state.cols - 1) * BLOCK_SIZE) / 2;
  const offsetZ = -((state.rows - 1) * BLOCK_SIZE) / 2;
  const bx = Math.round((wx - offsetX) / BLOCK_SIZE);
  const bz = Math.round((wz - offsetZ) / BLOCK_SIZE);
  if (bx < 0 || bx >= state.cols || bz < 0 || bz >= state.rows) return null;
  return { bx, bz };
}

function buildHelpers() {
  helperGroup.clear();

  const totalW = state.cols * BLOCK_SIZE;
  const totalD = state.rows * BLOCK_SIZE;

  // Invisible raycast plane at Y = 0.0 for empty cell picking
  const planeGeom = new THREE.PlaneGeometry(totalW, totalD);
  planeGeom.rotateX(-Math.PI / 2);
  gridPlaneMesh = new THREE.Mesh(
    planeGeom,
    new THREE.MeshBasicMaterial({ visible: false })
  );
  gridPlaneMesh.position.y = 0.0;
  helperGroup.add(gridPlaneMesh);

  // Subtle wireframe macro-grid showing 3x3 block slots
  const gridLines = new THREE.GridHelper(
    Math.max(totalW, totalD),
    Math.max(state.cols, state.rows),
    0x3a4466,
    0x1e2436
  );
  gridLines.position.y = 0.0;
  gridLines.visible = state.showGridHelper;
  gridLines.name = 'macroGridLines';
  helperGroup.add(gridLines);

  // Hover & Selection 3x3 Wireframe Frames
  const createCursorBox = (color, linewidth = 2) => {
    const geom = new THREE.BoxGeometry(BLOCK_SIZE + 0.06, 0.35, BLOCK_SIZE + 0.06);
    const edges = new THREE.EdgesGeometry(geom);
    const mat = new THREE.LineBasicMaterial({ color, linewidth });
    const wire = new THREE.LineSegments(edges, mat);

    // Direction indicator arrow on top of the cursor showing rotation!
    const arrowShape = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.4, 0.22, -0.3),
      new THREE.Vector3(0, 0.22, 0.9),
      new THREE.Vector3(0.4, 0.22, -0.3)
    ]);
    const arrowLine = new THREE.Line(arrowShape, mat);
    wire.add(arrowLine);
    return wire;
  };

  hoverCursor = createCursorBox(0x2ed573);
  hoverCursor.visible = false;
  helperGroup.add(hoverCursor);

  selectCursor = createCursorBox(0xff4757);
  selectCursor.visible = false;
  helperGroup.add(selectCursor);
}

function updateCursorPose(cursorMesh, bx, bz) {
  if (!cursorMesh) return;
  const { wx, wz } = gridToWorldCenter(bx, bz);
  const block = state.blocks[`${bx},${bz}`];
  const y = block && !block.isVoid ? Number(block.elevation ?? 6.0) : 6.0;
  const rot = block ? Number(block.rotation ?? 0) : Number(state.brush.rotation ?? 0);

  cursorMesh.position.set(wx, y + 0.1, wz);
  cursorMesh.rotation.y = (-rot * Math.PI) / 180;
  cursorMesh.visible = true;
}

// ============================================================================
// CAMERA ALIGNMENT (TRUE ARCADE ISOMETRIC VIEW)
// ============================================================================
function setArcadeIsometricView() {
  // In Marble Madness, looking from (+X, +Y, +Z) back toward (-X, -Y, -Z)
  // puts (0,0) at the top-center, +bx going down-right, and +bz going down-left!
  const target = new THREE.Vector3(1.5, 4.5, 1.5);
  const dist = 52;
  activeCamera.position.set(target.x + dist, target.y + dist * 0.96, target.z + dist);
  activeCamera.lookAt(target);
  if (activeCamera.isOrthographicCamera) {
    activeCamera.zoom = 0.88;
    activeCamera.updateProjectionMatrix();
  }
  controls.target.copy(target);
  controls.update();
}

function switchCameraMode(mode) {
  state.cameraMode = mode;
  const prevPos = activeCamera.position.clone();
  const prevTarget = controls.target.clone();

  activeCamera = mode === 'ortho' ? orthoCamera : perspCamera;
  activeCamera.position.copy(prevPos);
  controls.object = activeCamera;
  controls.target.copy(prevTarget);
  controls.update();

  document.getElementById('btn-cam-ortho').classList.toggle('active', mode === 'ortho');
  document.getElementById('btn-cam-persp').classList.toggle('active', mode === 'persp');
}

// ============================================================================
// LEVEL MESH MANAGEMENT
// ============================================================================
function rebuildSingleBlockMesh(bx, bz) {
  const key = `${bx},${bz}`;
  if (blockMeshes.has(key)) {
    const old = blockMeshes.get(key);
    worldGroup.remove(old);
    old.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
    });
    blockMeshes.delete(key);
  }

  const block = state.blocks[key];
  if (!block || block.isVoid) return;

  const group = buildBlockMeshGroup(block);
  const { wx, wz } = gridToWorldCenter(bx, bz);
  group.position.set(wx, 0, wz);
  group.userData = { bx, bz };
  group.traverse((child) => {
    if (child.isMesh) {
      child.userData = { bx, bz };
    }
  });

  worldGroup.add(group);
  blockMeshes.set(key, group);
}

function rebuildAllBlocks() {
  for (const [, grp] of blockMeshes) {
    worldGroup.remove(grp);
  }
  blockMeshes.clear();

  for (let bz = 0; bz < state.rows; bz++) {
    for (let bx = 0; bx < state.cols; bx++) {
      rebuildSingleBlockMesh(bx, bz);
    }
  }
  if (state.selectedCell) {
    updateCursorPose(selectCursor, state.selectedCell.bx, state.selectedCell.bz);
  }
}

function saveUndoSnapshot() {
  state.undoStack.push(JSON.stringify(state.blocks));
  if (state.undoStack.length > 40) state.undoStack.shift();
  state.redoStack = [];
}

function undo() {
  if (!state.undoStack.length) return;
  state.redoStack.push(JSON.stringify(state.blocks));
  state.blocks = JSON.parse(state.undoStack.pop());
  rebuildAllBlocks();
  syncInspectorFromSelection();
}

function redo() {
  if (!state.redoStack.length) return;
  state.undoStack.push(JSON.stringify(state.blocks));
  state.blocks = JSON.parse(state.redoStack.pop());
  rebuildAllBlocks();
  syncInspectorFromSelection();
}

// ============================================================================
// BLOCK EDITING OPERATIONS
// ============================================================================
function ensureBlockAt(bx, bz) {
  const key = `${bx},${bz}`;
  if (!state.blocks[key]) {
    state.blocks[key] = {
      bx,
      bz,
      isVoid: false,
      elevation: state.brush.elevation,
      slope: 0,
      tilt: 0,
      rotation: 0,
      shape: 'flat',
      element: 'none',
      elemRotation: 0,
      decal: 'none',
      decalRotation: 0,
      subHeights: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ]
    };
  }
  return state.blocks[key];
}

function applyToolAtCell(bx, bz, isDrag = false) {
  const key = `${bx},${bz}`;
  state.selectedCell = { bx, bz };

  if (state.activeTool === 'select') {
    syncInspectorFromSelection();
    updateCursorPose(selectCursor, bx, bz);
    return;
  }

  if (state.activeTool === 'pick') {
    const b = state.blocks[key];
    if (b && !b.isVoid) {
      state.brush.shape = b.shape || 'flat';
      state.brush.elevation = Number(b.elevation ?? 10);
      state.brush.slope = Number(b.slope ?? 0);
      state.brush.tilt = Number(b.tilt ?? 0);
      state.brush.rotation = Number(b.rotation ?? 0);
      state.brush.element = b.element || 'none';
      state.brush.elemRotation = Number(b.elemRotation ?? 0);
      state.brush.decal = b.decal || 'none';
      state.brush.decalRotation = Number(b.decalRotation ?? 0);
      syncInspectorFromSelection();
      updatePaletteHighlights();
    }
    updateCursorPose(selectCursor, bx, bz);
    return;
  }

  if (!isDrag) saveUndoSnapshot();

  if (state.activeTool === 'erase') {
    delete state.blocks[key];
    rebuildSingleBlockMesh(bx, bz);
    syncInspectorFromSelection();
    updateCursorPose(selectCursor, bx, bz);
    return;
  }

  const block = ensureBlockAt(bx, bz);
  block.isVoid = false;

  if (state.activeTool === 'paint_block') {
    block.shape = state.brush.shape;
    block.elevation = state.brush.elevation;
    block.slope = state.brush.slope;
    block.tilt = state.brush.tilt;
    block.rotation = state.brush.rotation;
    delete block.corners;
    if (state.brush.shape === 'subtiles_custom') {
      block.subHeights = JSON.parse(JSON.stringify(state.brush.subHeights));
    }
  } else if (state.activeTool === 'paint_element') {
    if (!isDrag && block.element === state.brush.element && block.element !== 'none') {
      // Clicking again rotates the 3D element by 90 degrees!
      block.elemRotation = ((block.elemRotation || 0) + 90) % 360;
      state.brush.elemRotation = block.elemRotation;
    } else {
      block.element = state.brush.element;
      block.elemRotation = state.brush.elemRotation;
    }
  } else if (state.activeTool === 'paint_decal') {
    if (!isDrag && block.decal === state.brush.decal && block.decal !== 'none') {
      // Clicking again rotates the Decal by 90 degrees!
      block.decalRotation = ((block.decalRotation || 0) + 90) % 360;
      state.brush.decalRotation = block.decalRotation;
    } else {
      block.decal = state.brush.decal;
      block.decalRotation = state.brush.decalRotation;
    }
  }

  rebuildSingleBlockMesh(bx, bz);
  syncInspectorFromSelection();
  updateCursorPose(selectCursor, bx, bz);
}

// ============================================================================
// RAYCASTING & MOUSE INTERACTION
// ============================================================================
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let isLeftMouseDown = false;
let lastPaintedKey = null;

function getCellUnderPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, activeCamera);

  // First test existing 3D blocks
  const blockHits = raycaster.intersectObjects(worldGroup.children, true);
  if (blockHits.length > 0) {
    for (const hit of blockHits) {
      if (hit.object.userData && hit.object.userData.bx !== undefined) {
        return { bx: hit.object.userData.bx, bz: hit.object.userData.bz };
      }
    }
  }

  // Fallback to base grid plane
  if (gridPlaneMesh) {
    const planeHits = raycaster.intersectObject(gridPlaneMesh, false);
    if (planeHits.length > 0) {
      return worldToGridCell(planeHits[0].point.x, planeHits[0].point.z);
    }
  }
  return null;
}

renderer.domElement.addEventListener('pointermove', (e) => {
  const cell = getCellUnderPointer(e);
  const badge = document.getElementById('coords-badge');

  if (cell) {
    state.hoveredCell = cell;
    updateCursorPose(hoverCursor, cell.bx, cell.bz);
    const b = state.blocks[`${cell.bx},${cell.bz}`];
    const hStr = b && !b.isVoid ? `Y:${b.elevation.toFixed(1)} P:${b.slope.toFixed(1)}` : 'Vuoto';
    badge.textContent = `Blocco 3×3 [${cell.bx}, ${cell.bz}] • ${hStr}`;

    if (isLeftMouseDown && (state.activeTool === 'paint_block' || state.activeTool === 'erase')) {
      const k = `${cell.bx},${cell.bz}`;
      if (k !== lastPaintedKey) {
        lastPaintedKey = k;
        applyToolAtCell(cell.bx, cell.bz, true);
      }
    }
  } else {
    state.hoveredCell = null;
    if (hoverCursor) hoverCursor.visible = false;
    badge.textContent = 'Blocco 3×3 [-, -]';
  }
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.altKey || e.shiftKey) return;
  const cell = getCellUnderPointer(e);
  if (!cell) return;

  if (state.activeTool !== 'select') {
    controls.enabled = false;
  }
  isLeftMouseDown = true;
  lastPaintedKey = `${cell.bx},${cell.bz}`;
  applyToolAtCell(cell.bx, cell.bz, false);
});

window.addEventListener('pointerup', () => {
  isLeftMouseDown = false;
  lastPaintedKey = null;
  controls.enabled = true;
});

// ============================================================================
// UI PALETTES & INSPECTOR BINDING
// ============================================================================
const SHAPE_ITEMS = [
  { id: 'flat', icon: '⬛', label: 'Piano / Rampa' },
  { id: 'fold_right', icon: '📐', label: 'Piega Diag. DX' },
  { id: 'fold_left', icon: '📏', label: 'Piega Diag. SX' },
  { id: 'chute_funnel', icon: '⏬', label: 'Imbocco Scivolo' },
  { id: 'pit_stepped', icon: '🪜', label: 'Gradoni Fossa' },
  { id: 'goal_bevel', icon: '🏁', label: 'Punta GOAL' },
  { id: 'pit', icon: '🕳️', label: 'Buca (con Bordo)' },
  { id: 'subtiles_custom', icon: '🎛️', label: 'Sub-Griglia 3×3' }
];

const ELEMENT_ITEMS = [
  { id: 'none', icon: '✖️', label: 'Nessun Elem.' },
  { id: 'tube_straight', icon: '➖', label: 'Tubo Dritto' },
  { id: 'tube_corner', icon: '⌜', label: 'Tubo Angolo L' },
  { id: 'tube_u', icon: '∏', label: 'Tubo a U' },
  { id: 'cone_small', icon: '▲', label: 'Piramide Piccola' },
  { id: 'cone_large', icon: '⛰️', label: 'Piramide Grande' },
  { id: 'goal_flags', icon: '🚩', label: 'Bandiere GOAL' },
  { id: 'marble_start', icon: '🔴', label: 'Biglia Start' }
];

const DECAL_ITEMS = [
  { id: 'none', icon: '✖️', label: 'Nessuna Decal' },
  { id: 'arrow_wide_diag', icon: '↘️', label: 'Freccia Grande' },
  { id: 'arrow_wide_ortho', icon: '⬇️', label: 'Freccia Dritta' },
  { id: 'arrow_long_chevrons', icon: '🏹', label: 'Freccia 3 Punte' },
  { id: 'arrow_shaft_only', icon: '┃', label: 'Asta Freccia' },
  { id: 'pad_456', icon: '🔢', label: 'Griglia 4-5-6' },
  { id: 'goal_banner', icon: '🔤', label: 'Scritta GOAL' }
];

function renderPalettes() {
  const bindPalette = (containerId, items, brushKey, autoTool) => {
    const el = document.getElementById(containerId);
    el.innerHTML = '';
    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'palette-item';
      card.dataset.id = item.id;
      card.innerHTML = `
        <div class="palette-icon">${item.icon}</div>
        <div class="palette-label">${item.label}</div>
      `;
      card.addEventListener('click', () => {
        state.brush[brushKey] = item.id;
        // If a block is currently selected in Select mode, apply immediately to it as well!
        if (state.activeTool === 'select' && state.selectedCell) {
          saveUndoSnapshot();
          const b = ensureBlockAt(state.selectedCell.bx, state.selectedCell.bz);
          b.isVoid = false;
          b[brushKey] = item.id;
          if (brushKey === 'shape' && item.id === 'subtiles_custom' && !b.subHeights) {
            b.subHeights = JSON.parse(JSON.stringify(state.brush.subHeights));
          }
          rebuildSingleBlockMesh(state.selectedCell.bx, state.selectedCell.bz);
          syncInspectorFromSelection();
        } else {
          setActiveTool(autoTool);
        }
        updatePaletteHighlights();
      });
      el.appendChild(card);
    }
  };

  bindPalette('palette-shapes', SHAPE_ITEMS, 'shape', 'paint_block');
  bindPalette('palette-elements', ELEMENT_ITEMS, 'element', 'paint_element');
  bindPalette('palette-decals', DECAL_ITEMS, 'decal', 'paint_decal');
  updatePaletteHighlights();
}

function updatePaletteHighlights() {
  const highlightGroup = (containerId, activeVal) => {
    document.querySelectorAll(`#${containerId} .palette-item`).forEach((el) => {
      el.classList.toggle('selected', el.dataset.id === activeVal);
    });
  };
  highlightGroup('palette-shapes', state.brush.shape);
  highlightGroup('palette-elements', state.brush.element);
  highlightGroup('palette-decals', state.brush.decal);
}

function setActiveTool(tool) {
  state.activeTool = tool;
  document.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
}

function syncInspectorFromSelection() {
  const sel = state.selectedCell;
  const headerEl = document.getElementById('inspector-cell-title');
  if (!sel) {
    headerEl.textContent = 'Nessun Blocco';
    return;
  }

  const key = `${sel.bx},${sel.bz}`;
  const b = state.blocks[key];
  headerEl.textContent = `Blocco [${sel.bx}, ${sel.bz}] ${b && !b.isVoid ? '' : '(Vuoto)'}`;

  if (b && !b.isVoid) {
    state.brush.shape = b.shape || 'flat';
    state.brush.elevation = Number(b.elevation ?? 12);
    state.brush.slope = Number(b.slope ?? 0);
    state.brush.tilt = Number(b.tilt ?? 0);
    state.brush.rotation = Number(b.rotation ?? 0);
    state.brush.element = b.element || 'none';
    state.brush.elemRotation = Number(b.elemRotation ?? 0);
    state.brush.decal = b.decal || 'none';
    state.brush.decalRotation = Number(b.decalRotation ?? 0);
    if (b.subHeights) {
      state.brush.subHeights = JSON.parse(JSON.stringify(b.subHeights));
    }
  }

  // Update sliders & labels
  const setSlider = (id, valId, val, suffix = '') => {
    const input = document.getElementById(id);
    const label = document.getElementById(valId);
    if (input) input.value = val;
    if (label) label.textContent = `${Number(val).toFixed(1)}${suffix}`;
  };

  setSlider('inp-elevation', 'val-elevation', state.brush.elevation, '');
  setSlider('inp-slope', 'val-slope', state.brush.slope, '');
  setSlider('inp-tilt', 'val-tilt', state.brush.tilt, '');

  // Update rotation buttons
  const updateRotButtons = (groupClass, val) => {
    document.querySelectorAll(`.${groupClass} .rot-btn`).forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.rot) === Number(val));
    });
  };
  updateRotButtons('rot-block-group', state.brush.rotation);
  updateRotButtons('rot-elem-group', state.brush.elemRotation);
  updateRotButtons('rot-decal-group', state.brush.decalRotation);

  // Update 3x3 custom sub-tile matrix inputs
  document.querySelectorAll('.subtile-input').forEach((inp) => {
    const r = Number(inp.dataset.r);
    const c = Number(inp.dataset.c);
    const v = state.brush.subHeights?.[r]?.[c] ?? 0;
    inp.value = v;
  });

  // Update 4-corner inputs (showing effective corner offsets relative to elevation)
  const bCurr = sel ? state.blocks[`${sel.bx},${sel.bz}`] : null;
  const cornerCoords = [[0, 0], [3, 0], [0, 3], [3, 3]];
  document.querySelectorAll('.corner-input').forEach((inp) => {
    const idx = Number(inp.dataset.corner);
    if (bCurr && !bCurr.isVoid) {
      const [cu, cv] = cornerCoords[idx];
      const relY = getBlockSurfaceY(bCurr, cu, cv) - Number(bCurr.elevation ?? 0);
      inp.value = Math.round(relY * 100) / 100;
    } else {
      inp.value = 0;
    }
  });

  updatePaletteHighlights();
}

function applyInspectorChange(prop, value) {
  state.brush[prop] = value;
  if (state.selectedCell) {
    const { bx, bz } = state.selectedCell;
    const b = ensureBlockAt(bx, bz);
    b.isVoid = false;
    b[prop] = value;
    if (prop === 'slope' || prop === 'tilt' || prop === 'rotation') {
      delete b.corners;
    }
    rebuildSingleBlockMesh(bx, bz);
    updateCursorPose(selectCursor, bx, bz);
  }
  syncInspectorFromSelection();
}

// ============================================================================
// PHYSICS MARBLE TEST SIMULATION
// ============================================================================
let simMarbleMesh = null;
const simState = {
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  keys: { up: false, down: false, left: false, right: false }
};

function toggleSimulation() {
  state.isSimulating = !state.isSimulating;
  const btn = document.getElementById('btn-simulate');
  btn.classList.toggle('active', state.isSimulating);
  btn.textContent = state.isSimulating ? '⏹ Ferma Biglia' : '▶ Test Biglia';

  if (state.isSimulating) {
    // Find start marble block or use selected block
    let startBlock = null;
    for (const k in state.blocks) {
      if (state.blocks[k].element === 'marble_start') {
        startBlock = state.blocks[k];
        break;
      }
    }
    if (!startBlock && state.selectedCell) {
      startBlock = state.blocks[`${state.selectedCell.bx},${state.selectedCell.bz}`];
    }
    const bx = startBlock ? startBlock.bx : 1;
    const bz = startBlock ? startBlock.bz : 1;
    const { wx, wz } = gridToWorldCenter(bx, bz);
    const y = startBlock ? getBlockSurfaceY(startBlock, 1.5, 1.5) : 14.0;

    if (!simMarbleMesh) {
      simMarbleMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 24, 24),
        new THREE.MeshPhongMaterial({ color: 0xff2222, specular: 0xffffff, shininess: 90 })
      );
      simMarbleMesh.castShadow = true;
      scene.add(simMarbleMesh);
    }
    simMarbleMesh.visible = true;
    simState.pos.set(wx, y + 0.5, wz);
    simState.vel.set(0, 0, 0);
  } else if (simMarbleMesh) {
    simMarbleMesh.visible = false;
  }
}

function stepMarbleSimulation(dt) {
  if (!state.isSimulating || !simMarbleMesh) return;

  // Player nudge forces (Arrow keys)
  const accel = 11.0;
  if (simState.keys.up) { simState.vel.x -= accel * dt; simState.vel.z -= accel * dt; }
  if (simState.keys.down) { simState.vel.x += accel * dt; simState.vel.z += accel * dt; }
  if (simState.keys.left) { simState.vel.x -= accel * dt; simState.vel.z += accel * dt; }
  if (simState.keys.right) { simState.vel.x += accel * dt; simState.vel.z -= accel * dt; }

  // Find current cell and local (u, v)
  const offsetX = -((state.cols - 1) * BLOCK_SIZE) / 2;
  const offsetZ = -((state.rows - 1) * BLOCK_SIZE) / 2;
  const fx = (simState.pos.x - offsetX) / BLOCK_SIZE;
  const fz = (simState.pos.z - offsetZ) / BLOCK_SIZE;
  const bx = Math.round(fx);
  const bz = Math.round(fz);

  const block = state.blocks[`${bx},${bz}`];
  if (block && !block.isVoid && block.shape !== 'pit') {
    const { wx, wz } = gridToWorldCenter(bx, bz);
    const u = Math.max(0, Math.min(3, simState.pos.x - wx + 1.5));
    const v = Math.max(0, Math.min(3, simState.pos.z - wz + 1.5));

    const surfY = getBlockSurfaceY(block, u, v);
    // Estimate local surface gradient via finite difference
    const eps = 0.08;
    const dydx = (getBlockSurfaceY(block, Math.min(3, u + eps), v) - getBlockSurfaceY(block, Math.max(0, u - eps), v)) / (2 * eps);
    const dydz = (getBlockSurfaceY(block, u, Math.min(3, v + eps)) - getBlockSurfaceY(block, u, Math.max(0, v - eps))) / (2 * eps);

    // Gravity along slope
    const g = 18.0;
    simState.vel.x -= dydx * g * dt;
    simState.vel.z -= dydz * g * dt;

    // Damping
    simState.vel.multiplyScalar(Math.pow(0.92, dt * 60));

    simState.pos.x += simState.vel.x * dt;
    simState.pos.z += simState.vel.z * dt;

    const newU = Math.max(0, Math.min(3, simState.pos.x - wx + 1.5));
    const newV = Math.max(0, Math.min(3, simState.pos.z - wz + 1.5));
    const newSurfY = getBlockSurfaceY(block, newU, newV);

    if (simState.pos.y <= newSurfY + 0.55) {
      simState.pos.y = newSurfY + 0.48;
      simState.vel.y = 0;
    } else {
      simState.vel.y -= 28.0 * dt;
      simState.pos.y += simState.vel.y * dt;
    }
  } else {
    // Freefall into pit / off cliff!
    simState.vel.y -= 32.0 * dt;
    simState.pos.addScaledVector(simState.vel, dt);
    if (simState.pos.y < -35) {
      // Respawn at top
      toggleSimulation();
      toggleSimulation();
    }
  }

  simMarbleMesh.position.copy(simState.pos);
}

// ============================================================================
// EVENT LISTENERS & SHORTCUTS
// ============================================================================
function initUIEvents() {
  renderPalettes();

  // Tool buttons
  document.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
  });

  // Sliders
  const bindSlider = (inputId, stepMinusId, stepPlusId, prop, stepAmount) => {
    const inp = document.getElementById(inputId);
    inp.addEventListener('change', () => saveUndoSnapshot());
    inp.addEventListener('input', (e) => {
      applyInspectorChange(prop, parseFloat(e.target.value));
    });
    document.getElementById(stepMinusId)?.addEventListener('click', () => {
      saveUndoSnapshot();
      const next = Math.round((state.brush[prop] - stepAmount) * 100) / 100;
      applyInspectorChange(prop, next);
    });
    document.getElementById(stepPlusId)?.addEventListener('click', () => {
      saveUndoSnapshot();
      const next = Math.round((state.brush[prop] + stepAmount) * 100) / 100;
      applyInspectorChange(prop, next);
    });
  };

  bindSlider('inp-elevation', 'btn-elev-minus', 'btn-elev-plus', 'elevation', 0.25);
  bindSlider('inp-slope', 'btn-slope-minus', 'btn-slope-plus', 'slope', 0.2);
  bindSlider('inp-tilt', 'btn-tilt-minus', 'btn-tilt-plus', 'tilt', 0.2);

  // Rotation button groups
  const bindRotGroup = (groupClass, prop) => {
    document.querySelectorAll(`.${groupClass} .rot-btn`).forEach((btn) => {
      btn.addEventListener('click', () => {
        saveUndoSnapshot();
        applyInspectorChange(prop, Number(btn.dataset.rot));
      });
    });
  };
  bindRotGroup('rot-block-group', 'rotation');
  bindRotGroup('rot-elem-group', 'elemRotation');
  bindRotGroup('rot-decal-group', 'decalRotation');

  // 3x3 Sub-tile matrix inputs
  document.querySelectorAll('.subtile-input').forEach((inp) => {
    inp.addEventListener('change', (e) => {
      saveUndoSnapshot();
      const r = Number(e.target.dataset.r);
      const c = Number(e.target.dataset.c);
      const val = parseFloat(e.target.value) || 0;
      state.brush.subHeights[r][c] = val;
      state.brush.shape = 'subtiles_custom';
      if (state.selectedCell) {
        const b = ensureBlockAt(state.selectedCell.bx, state.selectedCell.bz);
        b.shape = 'subtiles_custom';
        b.subHeights = JSON.parse(JSON.stringify(state.brush.subHeights));
        rebuildSingleBlockMesh(state.selectedCell.bx, state.selectedCell.bz);
      }
      updatePaletteHighlights();
    });
  });

  // 4-Corner inputs & Diagonal Split toggle
  document.querySelectorAll('.corner-input').forEach((inp) => {
    inp.addEventListener('change', () => {
      if (!state.selectedCell) return;
      saveUndoSnapshot();
      const b = ensureBlockAt(state.selectedCell.bx, state.selectedCell.bz);
      const vals = [0, 0, 0, 0];
      document.querySelectorAll('.corner-input').forEach((el) => {
        vals[Number(el.dataset.corner)] = parseFloat(el.value) || 0;
      });
      b.corners = vals;
      rebuildSingleBlockMesh(state.selectedCell.bx, state.selectedCell.bz);
      syncInspectorFromSelection();
    });
  });

  document.getElementById('btn-toggle-diag')?.addEventListener('click', () => {
    if (!state.selectedCell) return;
    saveUndoSnapshot();
    const b = ensureBlockAt(state.selectedCell.bx, state.selectedCell.bz);
    b.diagSplit = b.diagSplit === 'anti' ? 'main' : 'anti';
    rebuildSingleBlockMesh(state.selectedCell.bx, state.selectedCell.bz);
    syncInspectorFromSelection();
  });

  // Camera & View buttons
  document.getElementById('btn-cam-ortho').addEventListener('click', () => switchCameraMode('ortho'));
  document.getElementById('btn-cam-persp').addEventListener('click', () => switchCameraMode('persp'));
  document.getElementById('btn-cam-reset').addEventListener('click', setArcadeIsometricView);

  document.getElementById('btn-toggle-grid').addEventListener('click', (e) => {
    state.showGridHelper = !state.showGridHelper;
    e.currentTarget.classList.toggle('active', state.showGridHelper);
    const grid = helperGroup.getObjectByName('macroGridLines');
    if (grid) grid.visible = state.showGridHelper;
  });

  // Reference Ghost Image Overlay Slider
  const refSlider = document.getElementById('inp-ref-opacity');
  const refImg = document.getElementById('ref-overlay');
  refSlider.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    refImg.style.opacity = v;
  });

  // Undo / Redo
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);

  // Load Level 01 Preset / Clear
  document.getElementById('btn-load-preset').addEventListener('click', () => {
    saveUndoSnapshot();
    const preset = createLevel01Preset();
    state.cols = preset.cols;
    state.rows = preset.rows;
    state.blocks = preset.blocks;
    buildHelpers();
    rebuildAllBlocks();
    setArcadeIsometricView();
    syncInspectorFromSelection();
  });

  document.getElementById('btn-clear-map').addEventListener('click', () => {
    saveUndoSnapshot();
    state.blocks = {};
    rebuildAllBlocks();
    syncInspectorFromSelection();
  });

  // Simulate Marble
  document.getElementById('btn-simulate').addEventListener('click', toggleSimulation);

  // JSON Export / Import Modal
  const modal = document.getElementById('json-modal');
  const txtArea = document.getElementById('json-textarea');

  document.getElementById('btn-export-json').addEventListener('click', () => {
    const payload = {
      version: 1,
      cols: state.cols,
      rows: state.rows,
      blocks: state.blocks
    };
    txtArea.value = JSON.stringify(payload, null, 2);
    modal.classList.add('open');
  });

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modal.classList.remove('open');
  });

  document.getElementById('btn-apply-json').addEventListener('click', () => {
    try {
      const parsed = JSON.parse(txtArea.value);
      if (parsed && parsed.blocks) {
        saveUndoSnapshot();
        state.cols = parsed.cols || 13;
        state.rows = parsed.rows || 13;
        state.blocks = parsed.blocks;
        buildHelpers();
        rebuildAllBlocks();
        syncInspectorFromSelection();
        modal.classList.remove('open');
      }
    } catch (err) {
      alert('JSON non valido: ' + err.message);
    }
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (state.isSimulating) {
      if (e.key === 'ArrowUp') simState.keys.up = true;
      if (e.key === 'ArrowDown') simState.keys.down = true;
      if (e.key === 'ArrowLeft') simState.keys.left = true;
      if (e.key === 'ArrowRight') simState.keys.right = true;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }

    const key = e.key.toLowerCase();
    if (key === '1') setActiveTool('select');
    else if (key === '2') setActiveTool('paint_block');
    else if (key === '3') setActiveTool('paint_element');
    else if (key === '4') setActiveTool('paint_decal');
    else if (key === '5') setActiveTool('erase');
    else if (key === 'r') {
      saveUndoSnapshot();
      applyInspectorChange('rotation', (state.brush.rotation + 90) % 360);
    } else if (key === 'w') {
      saveUndoSnapshot();
      applyInspectorChange('elevation', Math.round((state.brush.elevation + 0.5) * 100) / 100);
    } else if (key === 's') {
      saveUndoSnapshot();
      applyInspectorChange('elevation', Math.round((state.brush.elevation - 0.5) * 100) / 100);
    } else if (key === 'a') {
      saveUndoSnapshot();
      applyInspectorChange('slope', Math.round((state.brush.slope - 0.2) * 100) / 100);
    } else if (key === 'd') {
      saveUndoSnapshot();
      applyInspectorChange('slope', Math.round((state.brush.slope + 0.2) * 100) / 100);
    } else if (key === 'q') {
      saveUndoSnapshot();
      applyInspectorChange('tilt', Math.round((state.brush.tilt - 0.2) * 100) / 100);
    } else if (key === 'e') {
      saveUndoSnapshot();
      applyInspectorChange('tilt', Math.round((state.brush.tilt + 0.2) * 100) / 100);
    } else if (key === 'delete' || key === 'backspace') {
      if (state.selectedCell) {
        saveUndoSnapshot();
        delete state.blocks[`${state.selectedCell.bx},${state.selectedCell.bz}`];
        rebuildSingleBlockMesh(state.selectedCell.bx, state.selectedCell.bz);
        syncInspectorFromSelection();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') simState.keys.up = false;
    if (e.key === 'ArrowDown') simState.keys.down = false;
    if (e.key === 'ArrowLeft') simState.keys.left = false;
    if (e.key === 'ArrowRight') simState.keys.right = false;
  });

  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const asp = w / h;

    orthoCamera.left = (-orthoFrustum * asp) / 2;
    orthoCamera.right = (orthoFrustum * asp) / 2;
    orthoCamera.top = orthoFrustum / 2;
    orthoCamera.bottom = -orthoFrustum / 2;
    orthoCamera.updateProjectionMatrix();

    perspCamera.aspect = asp;
    perspCamera.updateProjectionMatrix();

    renderer.setSize(w, h);
  });
}

// ============================================================================
// INITIALIZE & RENDER LOOP
// ============================================================================
const preset = createLevel01Preset();
state.cols = preset.cols;
state.rows = preset.rows;
state.blocks = preset.blocks;

buildHelpers();
initUIEvents();
rebuildAllBlocks();
setArcadeIsometricView();
syncInspectorFromSelection();

let lastTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  controls.update();
  stepMarbleSimulation(dt);
  renderer.render(scene, activeCamera);
}
requestAnimationFrame(animate);


import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BLOCK_SIZE, buildBlockMeshGroup, getBlockSurfaceY, createReflectiveMarble } from './geometry.js';
import { createLevel01Preset } from './level01Preset.js';

// ============================================================================
// LOCALIZATION (EN / IT — Default: English)
// ============================================================================
const I18N = {
  en: {
    page_title: 'Marble Madness 3D Level Editor (3×3 Blocks)',
    brand_title: 'MARBLE MADNESS 3D EDITOR',
    brand_badge: '3×3 BLOCK GRID',

    tool_select: '🎯 Select',
    tool_select_title: 'Select and edit block (Key 1)',
    tool_paint_block: '🧱 Block Brush',
    tool_paint_block_title: 'Paint 3×3 blocks (Key 2)',
    tool_paint_element: '🚧 Place Element',
    tool_paint_element_title: 'Place 3D Elements like tubes, cones, flags (Key 3)',
    tool_paint_decal: '🎨 Place Decal',
    tool_paint_decal_title: 'Apply Decals like arrows, GOAL, numbers 4-5-6 (Key 4)',
    tool_erase: '🧹 Eraser',
    tool_erase_title: 'Remove block / Create void (Key 5)',
    tool_pick: '💧 Copy',
    tool_pick_title: 'Eyedropper: copy properties from block',

    cam_ortho: '📐 Isometric',
    cam_ortho_title: 'Arcade-faithful Isometric Orthographic Camera',
    cam_persp: '🎥 Perspective',
    cam_persp_title: '3D Perspective Camera',
    cam_reset: '🎯 Arcade View',
    cam_reset_title: 'Align view to original Arcade framing',
    toggle_grid: '# Grid',
    toggle_grid_title: 'Show/Hide base grid',
    undo_title: 'Undo (Ctrl+Z)',
    redo_title: 'Redo',

    simulate_start: '▶ Test Marble',
    simulate_stop: '⏹ Stop Marble',
    simulate_title: 'Launch the red marble along the slopes (Arrow keys to steer)',

    load_preset: '🗺️ Level 1',
    load_preset_title: 'Reload full Level 01 map from reference image',
    clear_map: '🗑️ Clear',
    clear_map_title: 'Clear the map',
    export_json: '💾 JSON',
    export_json_title: 'Export / Import 3D Level (JSON)',
    lang_toggle_btn: '🌐 EN',
    lang_toggle_title: 'Switch language to Italiano (IT)',

    sec_shapes_title: '1. 3×3 Block Profile',
    sec_shapes_badge: 'Pillar ∞',
    sec_elements_title: '2. 3D Elements on Block',
    sec_decals_title: '3. Surface Decals',
    sec_click_rotate: 'Click = Rotate',

    coords_prefix: '3×3 Block',
    coords_empty: 'Empty',
    slope_short: 'S',

    hud_mouse_html:
      '<kbd>L-Click</kbd> Select / Apply &nbsp;•&nbsp; <kbd>R-Click / Drag</kbd> Rotate / 3D Pan &nbsp;•&nbsp; <kbd>Wheel</kbd> Zoom',
    hud_keys_html:
      '<kbd>W</kbd>/<kbd>S</kbd> Block Height &nbsp;•&nbsp; <kbd>A</kbd>/<kbd>D</kbd> Slope &nbsp;•&nbsp; <kbd>Q</kbd>/<kbd>E</kbd> Tilt &nbsp;•&nbsp; <kbd>R</kbd> Rotate 90° &nbsp;•&nbsp; <kbd>Del</kbd> Delete',

    inspector_no_block: 'No Block',
    inspector_block: 'Block',
    inspector_empty_suffix: '(Empty)',
    inspector_tile_badge: '3×3 Tile',

    lbl_elevation: 'Base Height (Y)',
    lbl_slope: 'Slope (Primary)',
    lbl_tilt: 'Lateral Tilt',
    lbl_block_rot: 'Block & Slope Rotation (Key R)',
    lbl_corners: '3×3 Corner Vertices [NW, NE, SW, SE]',
    btn_diag: 'Diag ⟍/⟋',
    btn_diag_title: 'Flip fold diagonal',

    sec_orient_title: 'Element & Decal Orientation',
    lbl_elem_rot: '3D Element Rotation (Tubes / Cones / Flags)',
    lbl_decal_rot: 'Surface Decal Rotation (Arrows / Numbers)',
    lbl_marble_color: 'Marble Sphere Color (Semi-Transparent)',

    sec_subtiles_title: '3×3 Sub-Blocks (Offset ΔY)',
    sec_subtiles_badge: 'Steps',

    sec_ref_title: 'Original Image Comparison',
    lbl_ref_opacity: 'Overlay Opacity (level01.png)',

    modal_json_title: 'Export / Import 3D Level (JSON)',
    btn_close_modal: 'Close',
    btn_apply_json: 'Load JSON into Editor',
    err_invalid_json: 'Invalid JSON: ',

    // Palette items
    shape_flat: 'Flat / Ramp',
    shape_chute_leg_x: 'White Ramp R',
    shape_chute_leg_z: 'Shadow Chute L',
    shape_fold_right: 'Sharp Turn R',
    shape_fold_left: 'Dark Turn L',
    shape_wing_left: '45° Wing Tip L',
    shape_chute_funnel: 'Chute Funnel',
    shape_pit_stepped: 'Stepped Pit',
    shape_goal_bevel: 'GOAL Tip',
    shape_pit: 'Pit (Rim Wall)',
    shape_subtiles_custom: '3×3 Sub-Grid',

    elem_none: 'No Element',
    elem_tube_straight: 'Straight Tube',
    elem_tube_corner: 'L-Corner Tube',
    elem_tube_u: 'U-Shape Tube',
    elem_cone_small: 'Small Pyramid',
    elem_cone_large: 'Large Pyramid',
    elem_goal_flags: 'GOAL Flags',
    elem_marble_start: 'Start Marble',

    decal_none: 'No Decal',
    decal_arrow_wide_diag: 'Large Arrow',
    decal_arrow_wide_ortho: 'Straight Arrow',
    decal_arrow_long_chevrons: '3-Chevron Arrow',
    decal_arrow_shaft_only: 'Arrow Shaft',
    decal_pad_456: '4-5-6 Grid',
    decal_goal_banner: 'GOAL Banner'
  },

  it: {
    page_title: 'Marble Madness 3D Level Editor (Blocchi 3×3)',
    brand_title: 'MARBLE MADNESS 3D EDITOR',
    brand_badge: 'GRIGLIA BLOCCHI 3×3',

    tool_select: '🎯 Seleziona',
    tool_select_title: 'Seleziona e modifica blocco (Tasto 1)',
    tool_paint_block: '🧱 Pennello Blocco',
    tool_paint_block_title: 'Disegna blocchi 3×3 (Tasto 2)',
    tool_paint_element: '🚧 Posiziona Elemento',
    tool_paint_element_title: 'Posiziona Elementi 3D come tubi, coni, bandiere (Tasto 3)',
    tool_paint_decal: '🎨 Posiziona Decal',
    tool_paint_decal_title: 'Applica Decal come frecce, GOAL, numeri 4-5-6 (Tasto 4)',
    tool_erase: '🧹 Gomma',
    tool_erase_title: 'Rimuovi blocco / Crea vuoto (Tasto 5)',
    tool_pick: '💧 Copia',
    tool_pick_title: 'Contagocce: copia proprietà dal blocco',

    cam_ortho: '📐 Isometrica',
    cam_ortho_title: "Telecamera Isometrica Ortografica fedele all'Arcade",
    cam_persp: '🎥 Prospettiva',
    cam_persp_title: 'Telecamera Prospettica 3D',
    cam_reset: '🎯 Inquadratura Arcade',
    cam_reset_title: "Allinea vista all'inquadratura originale Arcade",
    toggle_grid: '# Griglia',
    toggle_grid_title: 'Mostra/Nascondi griglia base',
    undo_title: 'Annulla (Ctrl+Z)',
    redo_title: 'Ripeti',

    simulate_start: '▶ Test Biglia',
    simulate_stop: '⏹ Ferma Biglia',
    simulate_title: 'Lancia la biglia rossa lungo le pendenze (Frecce per guidare)',

    load_preset: '🗺️ Livello 1',
    load_preset_title: "Ricarica la mappa completa Level 01 dall'immagine",
    clear_map: '🗑️ Svuota',
    clear_map_title: 'Svuota la mappa',
    export_json: '💾 JSON',
    export_json_title: 'Esporta / Importa Livello 3D (JSON)',
    lang_toggle_btn: '🌐 IT',
    lang_toggle_title: 'Switch language to English (EN)',

    sec_shapes_title: '1. Profilo Blocco 3×3',
    sec_shapes_badge: 'Pilastro ∞',
    sec_elements_title: '2. Elementi 3D sul Blocco',
    sec_decals_title: '3. Decals di Superficie',
    sec_click_rotate: 'Click = Ruota',

    coords_prefix: 'Blocco 3×3',
    coords_empty: 'Vuoto',
    slope_short: 'P',

    hud_mouse_html:
      '<kbd>Click SX</kbd> Seleziona / Applica &nbsp;•&nbsp; <kbd>Click DX / Trascina</kbd> Ruota / Panoramica 3D &nbsp;•&nbsp; <kbd>Rotella</kbd> Zoom',
    hud_keys_html:
      '<kbd>W</kbd>/<kbd>S</kbd> Altezza Blocco &nbsp;•&nbsp; <kbd>A</kbd>/<kbd>D</kbd> Pendenza &nbsp;•&nbsp; <kbd>Q</kbd>/<kbd>E</kbd> Angolazione &nbsp;•&nbsp; <kbd>R</kbd> Ruota 90° &nbsp;•&nbsp; <kbd>Canc</kbd> Elimina',

    inspector_no_block: 'Nessun Blocco',
    inspector_block: 'Blocco',
    inspector_empty_suffix: '(Vuoto)',
    inspector_tile_badge: '3×3 Tile',

    lbl_elevation: 'Altezza Base (Y)',
    lbl_slope: 'Pendenza (Slope Principale)',
    lbl_tilt: 'Angolazione Laterale (Tilt)',
    lbl_block_rot: 'Rotazione Blocco & Pendenza (Tasto R)',
    lbl_corners: 'Vertici Angoli 3×3 [NW, NE, SW, SE]',
    btn_diag: 'Diag ⟍/⟋',
    btn_diag_title: 'Inverti diagonale di piega',

    sec_orient_title: 'Orientamento Elementi & Decal',
    lbl_elem_rot: 'Rotazione Elemento 3D (Tubi / Coni / Bandiere)',
    lbl_decal_rot: 'Rotazione Decal Superficie (Frecce / Numeri)',
    lbl_marble_color: 'Colore Sfera Biglia (Semi-Trasparente)',

    sec_subtiles_title: 'Sub-Blocchi 3×3 (Offset ΔY)',
    sec_subtiles_badge: 'Gradoni',

    sec_ref_title: 'Confronto Immagine Originale',
    lbl_ref_opacity: 'Opacità Sovrapposizione (level01.png)',

    modal_json_title: 'Esporta / Importa Livello 3D (JSON)',
    btn_close_modal: 'Chiudi',
    btn_apply_json: "Carica JSON nell'Editor",
    err_invalid_json: 'JSON non valido: ',

    // Palette items
    shape_flat: 'Piano / Rampa',
    shape_chute_leg_x: 'Rampa Bianca DX',
    shape_chute_leg_z: 'Canale Ombra SX',
    shape_fold_right: 'Curva Punta DX',
    shape_fold_left: 'Curva Scura SX',
    shape_wing_left: 'Ala Punta 45° SX',
    shape_chute_funnel: 'Imbocco Scivolo',
    shape_pit_stepped: 'Gradoni Fossa',
    shape_goal_bevel: 'Punta GOAL',
    shape_pit: 'Buca (con Bordo)',
    shape_subtiles_custom: 'Sub-Griglia 3×3',

    elem_none: 'Nessun Elem.',
    elem_tube_straight: 'Tubo Dritto',
    elem_tube_corner: 'Tubo Angolo L',
    elem_tube_u: 'Tubo a U',
    elem_cone_small: 'Piramide Piccola',
    elem_cone_large: 'Piramide Grande',
    elem_goal_flags: 'Bandiere GOAL',
    elem_marble_start: 'Biglia Start',

    decal_none: 'Nessuna Decal',
    decal_arrow_wide_diag: 'Freccia Grande',
    decal_arrow_wide_ortho: 'Freccia Dritta',
    decal_arrow_long_chevrons: 'Freccia 3 Punte',
    decal_arrow_shaft_only: 'Asta Freccia',
    decal_pad_456: 'Griglia 4-5-6',
    decal_goal_banner: 'Scritta GOAL'
  }
};

// ============================================================================
// EDITOR STATE
// ============================================================================
const state = {
  lang: 'en', // 'en' (default) | 'it'
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
    marbleColor: '#e61922',
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

function t(key) {
  return I18N[state.lang]?.[key] ?? I18N.en[key] ?? key;
}

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

// Real-time CubeCamera for the semi-transparent reflective marble
const marbleCubeTarget = new THREE.WebGLCubeRenderTarget(128, {
  generateMipmaps: true,
  minFilter: THREE.LinearMipmapLinearFilter
});
const marbleCubeCamera = new THREE.CubeCamera(0.1, 180, marbleCubeTarget);
scene.add(marbleCubeCamera);

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

  block._envMap = marbleCubeTarget.texture;
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
    applyShapeIdToBlock(block, state.brush.shape);
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

function updateCoordsBadge() {
  const badge = document.getElementById('coords-badge');
  if (!badge) return;
  const cell = state.hoveredCell;
  if (cell) {
    const b = state.blocks[`${cell.bx},${cell.bz}`];
    const hStr =
      b && !b.isVoid
        ? `Y:${b.elevation.toFixed(1)} ${t('slope_short')}:${b.slope.toFixed(1)}`
        : t('coords_empty');
    badge.textContent = `${t('coords_prefix')} [${cell.bx}, ${cell.bz}] • ${hStr}`;
  } else {
    badge.textContent = `${t('coords_prefix')} [-, -]`;
  }
}

renderer.domElement.addEventListener('pointermove', (e) => {
  const cell = getCellUnderPointer(e);

  if (cell) {
    state.hoveredCell = cell;
    updateCursorPose(hoverCursor, cell.bx, cell.bz);
    updateCoordsBadge();

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
    updateCoordsBadge();
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
  { id: 'flat', icon: '⬛', labelKey: 'shape_flat' },
  { id: 'chute_leg_x', icon: '⬜', labelKey: 'shape_chute_leg_x' },
  { id: 'chute_leg_z', icon: '🌗', labelKey: 'shape_chute_leg_z' },
  { id: 'fold_right', icon: '📐', labelKey: 'shape_fold_right' },
  { id: 'fold_left', icon: '◣', labelKey: 'shape_fold_left' },
  { id: 'wing_left', icon: '◤', labelKey: 'shape_wing_left' },
  { id: 'chute_funnel', icon: '⏬', labelKey: 'shape_chute_funnel' },
  { id: 'pit_stepped', icon: '🪜', labelKey: 'shape_pit_stepped' },
  { id: 'goal_bevel', icon: '🏁', labelKey: 'shape_goal_bevel' },
  { id: 'pit', icon: '🕳️', labelKey: 'shape_pit' },
  { id: 'subtiles_custom', icon: '🎛️', labelKey: 'shape_subtiles_custom' }
];

const ELEMENT_ITEMS = [
  { id: 'none', icon: '✖️', labelKey: 'elem_none' },
  { id: 'tube_straight', icon: '➖', labelKey: 'elem_tube_straight' },
  { id: 'tube_corner', icon: '⌜', labelKey: 'elem_tube_corner' },
  { id: 'tube_u', icon: '∏', labelKey: 'elem_tube_u' },
  { id: 'cone_small', icon: '▲', labelKey: 'elem_cone_small' },
  { id: 'cone_large', icon: '⛰️', labelKey: 'elem_cone_large' },
  { id: 'goal_flags', icon: '🚩', labelKey: 'elem_goal_flags' },
  { id: 'marble_start', icon: '🔴', labelKey: 'elem_marble_start' }
];

const DECAL_ITEMS = [
  { id: 'none', icon: '✖️', labelKey: 'decal_none' },
  { id: 'arrow_wide_diag', icon: '↘️', labelKey: 'decal_arrow_wide_diag' },
  { id: 'arrow_wide_ortho', icon: '⬇️', labelKey: 'decal_arrow_wide_ortho' },
  { id: 'arrow_long_chevrons', icon: '🏹', labelKey: 'decal_arrow_long_chevrons' },
  { id: 'arrow_shaft_only', icon: '┃', labelKey: 'decal_arrow_shaft_only' },
  { id: 'pad_456', icon: '🔢', labelKey: 'decal_pad_456' },
  { id: 'goal_banner', icon: '🔤', labelKey: 'decal_goal_banner' }
];

function applyShapeIdToBlock(b, shapeId) {
  delete b.subShades;
  delete b.cutout;
  delete b.shadePreset;
  if (shapeId === 'chute_leg_x') {
    b.shape = 'flat';
    b.shadePreset = 'chute_leg_x';
  } else if (shapeId === 'chute_leg_z') {
    b.shape = 'flat';
    b.shadePreset = 'chute_leg_z';
  } else if (shapeId === 'fold_right') {
    b.shape = 'fold_right';
    b.shadePreset = 'turn_right';
  } else if (shapeId === 'fold_left') {
    b.shape = 'fold_left';
    b.shadePreset = 'turn_left_dark';
  } else if (shapeId === 'wing_left') {
    b.shape = 'flat';
    b.cutout = 'wing_left';
    b.shadePreset = 'wing_dark';
  } else if (shapeId === 'chute_funnel') {
    b.shape = 'chute_funnel';
    b.shadePreset = 'funnel_center';
  } else {
    b.shape = shapeId;
  }
}

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
        <div class="palette-label">${t(item.labelKey)}</div>
      `;
      card.addEventListener('click', () => {
        state.brush[brushKey] = item.id;
        // If a block is currently selected in Select mode, apply immediately to it as well!
        if (state.activeTool === 'select' && state.selectedCell) {
          saveUndoSnapshot();
          const b = ensureBlockAt(state.selectedCell.bx, state.selectedCell.bz);
          b.isVoid = false;
          if (brushKey === 'shape') {
            applyShapeIdToBlock(b, item.id);
            if (item.id === 'subtiles_custom' && !b.subHeights) {
              b.subHeights = JSON.parse(JSON.stringify(state.brush.subHeights));
            }
          } else {
            b[brushKey] = item.id;
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
    headerEl.textContent = t('inspector_no_block');
    return;
  }

  const key = `${sel.bx},${sel.bz}`;
  const b = state.blocks[key];
  headerEl.textContent = `${t('inspector_block')} [${sel.bx}, ${sel.bz}] ${b && !b.isVoid ? '' : t('inspector_empty_suffix')}`;

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
      delete b.vGrid;
    }
    rebuildSingleBlockMesh(bx, bz);
    updateCursorPose(selectCursor, bx, bz);
  }
  syncInspectorFromSelection();
}

// ============================================================================
// PHYSICS MARBLE TEST SIMULATION (Semi-transparent Reflective Sphere + 8-Point Square)
// ============================================================================
let simMarbleAssembly = null;
const simState = {
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  rollAxis: new THREE.Vector3(1, 0, 0),
  keys: { up: false, down: false, left: false, right: false }
};

function setStaticMarblesVisible(vis) {
  worldGroup.traverse((obj) => {
    if (obj.name === 'reflectiveMarbleRoot') {
      obj.visible = vis;
    }
  });
}

function toggleSimulation() {
  state.isSimulating = !state.isSimulating;
  const btn = document.getElementById('btn-simulate');
  btn.classList.toggle('active', state.isSimulating);
  btn.textContent = state.isSimulating ? t('simulate_stop') : t('simulate_start');

  if (state.isSimulating) {
    setStaticMarblesVisible(false);

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
    const mColor = startBlock?.marbleColor || state.brush.marbleColor || '#e61922';

    if (!simMarbleAssembly) {
      simMarbleAssembly = createReflectiveMarble(marbleCubeTarget.texture, mColor);
      scene.add(simMarbleAssembly.root);
    } else {
      simMarbleAssembly.backMat.color.set(mColor);
      simMarbleAssembly.frontMat.color.set(mColor);
    }
    simMarbleAssembly.root.visible = true;
    simState.pos.set(wx, y + simMarbleAssembly.radius, wz);
    simState.vel.set(0, 0, 0);
    simMarbleAssembly.root.position.copy(simState.pos);
  } else {
    if (simMarbleAssembly) {
      simMarbleAssembly.root.visible = false;
    }
    setStaticMarblesVisible(true);
  }
}

function stepMarbleSimulation(dt) {
  if (!state.isSimulating || !simMarbleAssembly) return;

  const accel = 11.0;
  if (simState.keys.up) { simState.vel.x -= accel * dt; simState.vel.z -= accel * dt; }
  if (simState.keys.down) { simState.vel.x += accel * dt; simState.vel.z += accel * dt; }
  if (simState.keys.left) { simState.vel.x -= accel * dt; simState.vel.z += accel * dt; }
  if (simState.keys.right) { simState.vel.x += accel * dt; simState.vel.z -= accel * dt; }

  const offsetX = -((state.cols - 1) * BLOCK_SIZE) / 2;
  const offsetZ = -((state.rows - 1) * BLOCK_SIZE) / 2;
  const fx = (simState.pos.x - offsetX) / BLOCK_SIZE;
  const fz = (simState.pos.z - offsetZ) / BLOCK_SIZE;
  const bx = Math.round(fx);
  const bz = Math.round(fz);

  const R = simMarbleAssembly.radius;
  const block = state.blocks[`${bx},${bz}`];
  if (block && !block.isVoid && block.shape !== 'pit') {
    const { wx, wz } = gridToWorldCenter(bx, bz);
    const u = Math.max(0, Math.min(3, simState.pos.x - wx + 1.5));
    const v = Math.max(0, Math.min(3, simState.pos.z - wz + 1.5));

    const eps = 0.08;
    const dydx = (getBlockSurfaceY(block, Math.min(3, u + eps), v) - getBlockSurfaceY(block, Math.max(0, u - eps), v)) / (2 * eps);
    const dydz = (getBlockSurfaceY(block, u, Math.min(3, v + eps)) - getBlockSurfaceY(block, u, Math.max(0, v - eps))) / (2 * eps);

    const g = 18.0;
    simState.vel.x -= dydx * g * dt;
    simState.vel.z -= dydz * g * dt;

    simState.vel.multiplyScalar(Math.pow(0.92, dt * 60));

    simState.pos.x += simState.vel.x * dt;
    simState.pos.z += simState.vel.z * dt;

    const newU = Math.max(0, Math.min(3, simState.pos.x - wx + 1.5));
    const newV = Math.max(0, Math.min(3, simState.pos.z - wz + 1.5));
    const newSurfY = getBlockSurfaceY(block, newU, newV);

    if (simState.pos.y <= newSurfY + R + 0.08) {
      simState.pos.y = newSurfY + R;
      simState.vel.y = 0;
    } else {
      simState.vel.y -= 28.0 * dt;
      simState.pos.y += simState.vel.y * dt;
    }
  } else {
    simState.vel.y -= 32.0 * dt;
    simState.pos.addScaledVector(simState.vel, dt);
    if (simState.pos.y < -35) {
      toggleSimulation();
      toggleSimulation();
    }
  }

  simMarbleAssembly.root.position.copy(simState.pos);

  // Rotate the internal 8-Point Square according to the exact rolling direction (v_x, v_z)!
  const speedXZ = Math.hypot(simState.vel.x, simState.vel.z);
  if (speedXZ > 0.01) {
    simState.rollAxis.set(simState.vel.z / speedXZ, 0, -simState.vel.x / speedXZ);
    const dAngle = (speedXZ * dt) / R;
    simMarbleAssembly.innerGroup.rotateOnWorldAxis(simState.rollAxis, dAngle);
  }
}

// ============================================================================
// LANGUAGE SWITCHER & UI LOCALIZATION
// ============================================================================
function applyLanguage(lang) {
  state.lang = lang === 'it' ? 'it' : 'en';
  document.documentElement.lang = state.lang;
  document.title = t('page_title');

  // Update all elements with [data-i18n]
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  // Update all elements with [data-i18n-title]
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', t(key));
  });

  // Update HUD rows (contains <kbd> markup)
  const hudMouse = document.getElementById('hud-row-mouse');
  if (hudMouse) hudMouse.innerHTML = t('hud_mouse_html');
  const hudKeys = document.getElementById('hud-row-keys');
  if (hudKeys) hudKeys.innerHTML = t('hud_keys_html');

  // Update Simulate button label according to current state
  const simBtn = document.getElementById('btn-simulate');
  if (simBtn) {
    simBtn.textContent = state.isSimulating ? t('simulate_stop') : t('simulate_start');
  }

  // Update Language toggle button
  const langBtn = document.getElementById('btn-lang-toggle');
  if (langBtn) {
    langBtn.textContent = t('lang_toggle_btn');
    langBtn.setAttribute('title', t('lang_toggle_title'));
  }

  // Re-render palettes, inspector header, and coordinates badge
  renderPalettes();
  syncInspectorFromSelection();
  updateCoordsBadge();
}

// ============================================================================
// EVENT LISTENERS & SHORTCUTS
// ============================================================================
function initUIEvents() {
  applyLanguage(state.lang);

  // Language Toggle Button
  document.getElementById('btn-lang-toggle')?.addEventListener('click', () => {
    const nextLang = state.lang === 'en' ? 'it' : 'en';
    applyLanguage(nextLang);
  });

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
      delete b.vGrid;
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

  // Marble Color Picker
  document.getElementById('inp-marble-color')?.addEventListener('input', (e) => {
    const col = e.target.value;
    state.brush.marbleColor = col;
    if (simMarbleAssembly) {
      simMarbleAssembly.backMat.color.set(col);
      simMarbleAssembly.frontMat.color.set(col);
    }
    for (const k in state.blocks) {
      if (state.blocks[k].element === 'marble_start') {
        state.blocks[k].marbleColor = col;
        rebuildSingleBlockMesh(state.blocks[k].bx, state.blocks[k].bz);
      }
    }
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
  document.getElementById('btn-simulate').addEventListener('click', (e) => {
    e.currentTarget.blur();
    toggleSimulation();
  });

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
      alert(t('err_invalid_json') + err.message);
    }
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (state.isSimulating && e.key.startsWith('Arrow')) {
      e.preventDefault();
      if (e.key === 'ArrowUp') simState.keys.up = true;
      if (e.key === 'ArrowDown') simState.keys.down = true;
      if (e.key === 'ArrowLeft') simState.keys.left = true;
      if (e.key === 'ArrowRight') simState.keys.right = true;
      return;
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
let frameCounter = 0;
const tempWorldPos = new THREE.Vector3();
const staticRollAxis = new THREE.Vector3();

function updateMarbleReflectionsAndInnerSquare(dt) {
  frameCounter++;

  if (state.isSimulating && simMarbleAssembly && simMarbleAssembly.root.visible) {
    // Update real-time CubeCamera reflection at the simulation marble's position
    if (frameCounter % 2 === 0) {
      simMarbleAssembly.root.visible = false;
      marbleCubeCamera.position.copy(simState.pos);
      marbleCubeCamera.update(renderer, scene);
      simMarbleAssembly.root.visible = true;
    }
    return;
  }

  // In Editor Mode: rotate the 8-point square inside any static `marble_start` blocks
  // according to the block's elemRotation direction, and update the CubeCamera reflection!
  let firstMarbleRoot = null;
  worldGroup.traverse((obj) => {
    if (obj.name === 'reflectiveMarbleRoot') {
      if (!firstMarbleRoot) firstMarbleRoot = obj;
      const inner = obj.getObjectByName('innerEightPointSquare');
      if (inner) {
        // Compute rolling axis from parent block's elemRotation (0, 90, 180, 270)
        const cellData = obj.parent?.parent?.userData;
        const blk = cellData ? state.blocks[`${cellData.bx},${cellData.bz}`] : null;
        const dirRad = ((Number(blk?.elemRotation ?? 0)) * Math.PI) / 180;
        // Direction vector (sin(dirRad), 0, cos(dirRad)) -> Roll axis = Up x Dir = (cos(dirRad), 0, -sin(dirRad))
        staticRollAxis.set(Math.cos(dirRad), 0, -Math.sin(dirRad)).normalize();
        inner.rotateOnWorldAxis(staticRollAxis, dt * 2.4);
      }
    }
  });

  if (firstMarbleRoot && frameCounter % 4 === 0) {
    firstMarbleRoot.getWorldPosition(tempWorldPos);
    firstMarbleRoot.visible = false;
    marbleCubeCamera.position.copy(tempWorldPos);
    marbleCubeCamera.update(renderer, scene);
    firstMarbleRoot.visible = true;
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  controls.update();
  stepMarbleSimulation(dt);
  updateMarbleReflectionsAndInnerSquare(dt);
  renderer.render(scene, activeCamera);
}
requestAnimationFrame(animate);


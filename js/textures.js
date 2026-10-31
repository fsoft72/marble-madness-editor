import * as THREE from 'three';

const materialCache = new Map();

/**
 * Draws the base 3x3 Marble Madness arcade tile grid onto a 192x192 canvas (64px per sub-tile).
 */
function drawBase3x3Tiles(ctx, size = 192) {
  const tilePx = size / 3; // 64px per sub-tile

  ctx.fillStyle = '#d0d0d0';
  ctx.fillRect(0, 0, size, size);

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = c * tilePx;
      const y = r * tilePx;

      // Subtle checkerboard variation inside sub-tile
      ctx.fillStyle = (r + c) % 2 === 0 ? '#d4d4d4' : '#cacaca';
      ctx.fillRect(x + 2, y + 2, tilePx - 4, tilePx - 4);

      // Subtle pixel dithering dots like Atari System 1
      ctx.fillStyle = '#dedede';
      for (let py = 6; py < tilePx - 6; py += 8) {
        for (let px = 6; px < tilePx - 6; px += 8) {
          if ((px + py) % 16 === 0) {
            ctx.fillRect(x + px, y + py, 2, 2);
          }
        }
      }

      // Inner highlight (top & left)
      ctx.fillStyle = '#e6e6e6';
      ctx.fillRect(x + 2, y + 2, tilePx - 4, 2);
      ctx.fillRect(x + 2, y + 2, 2, tilePx - 4);

      // Inner shadow (bottom & right)
      ctx.fillStyle = '#a8a8a8';
      ctx.fillRect(x + 2, y + tilePx - 4, tilePx - 4, 2);
      ctx.fillRect(x + tilePx - 4, y + 2, 2, tilePx - 4);

      // Crisp dark mortar line around each sub-tile
      ctx.strokeStyle = '#525252';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, tilePx - 3, tilePx - 3);
    }
  }
}

/**
 * Draws a specific arcade decal onto the 192x192 3x3 block canvas, rotated by decalRotation (0, 90, 180, 270).
 * Default orientation (decalRotation = 0) points toward +Z (bottom of canvas, Down-Left in isometric view).
 * decalRotation = 90 points toward +X (right of canvas, Down-Right in isometric view).
 */
function drawDecalOverlay(ctx, decalType, decalRotation = 0, size = 192) {
  if (!decalType || decalType === 'none') return;

  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate((-decalRotation * Math.PI) / 180);
  ctx.translate(-size / 2, -size / 2);

  const red = '#b8221c';
  const redBright = '#cf2a22';

  if (decalType === 'arrow_wide_diag') {
    // Diagonal big red arrow pointing from top-left (0,0) toward bottom-right (size,size)
    // which in isometric view points straight DOWN toward the chute!
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = red;

    // 2 dashed tail bars
    ctx.fillRect(-15, -80, 30, 8);
    ctx.fillRect(-19, -65, 38, 10);

    // Thick body shaft
    ctx.fillRect(-22, -48, 44, 58);

    // Wide arrowhead
    ctx.beginPath();
    ctx.moveTo(-52, 8);
    ctx.lineTo(52, 8);
    ctx.lineTo(0, 74);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (decalType === 'arrow_wide_ortho') {
    // Orthogonal wide red arrow with dashed tail pointing +Z (down in canvas)
    ctx.fillStyle = red;
    ctx.fillRect(size / 2 - 15, 14, 30, 9);
    ctx.fillRect(size / 2 - 19, 29, 38, 11);
    ctx.fillRect(size / 2 - 22, 46, 44, 64);

    ctx.beginPath();
    ctx.moveTo(size / 2 - 52, 108);
    ctx.lineTo(size / 2 + 52, 108);
    ctx.lineTo(size / 2, 176);
    ctx.closePath();
    ctx.fill();
  } else if (decalType === 'arrow_long_chevrons') {
    // Long red arrow shaft + main head + 3 COLLINEAR chevron triangles ahead of the tip!
    ctx.fillStyle = red;
    const cx = size / 2;
    // Shaft from top edge
    ctx.fillRect(cx - 11, 0, 22, 82);
    // Main arrowhead
    ctx.beginPath();
    ctx.moveTo(cx - 30, 78);
    ctx.lineTo(cx + 30, 78);
    ctx.lineTo(cx, 114);
    ctx.closePath();
    ctx.fill();

    // 3 collinear chevron triangles in a single line ahead of the arrow tip (exact match to level01.png!)
    const drawChevron = (ty, halfW, h) => {
      ctx.beginPath();
      ctx.moveTo(cx - halfW, ty);
      ctx.lineTo(cx + halfW, ty);
      ctx.lineTo(cx, ty + h);
      ctx.closePath();
      ctx.fill();
    };
    drawChevron(122, 18, 16);
    drawChevron(144, 15, 15);
    drawChevron(165, 12, 14);
  } else if (decalType === 'arrow_shaft_only') {
    // Long red shaft segment (for multi-block long arrows)
    ctx.fillStyle = red;
    const cx = size / 2;
    ctx.fillRect(cx - 11, 0, 22, size);
  } else if (decalType === 'goal_banner') {
    // Iconic GOAL stencil text with parallel border lines spanning the 3 tiles
    ctx.fillStyle = '#505050';
    ctx.fillRect(4, 34, size - 8, 10);
    ctx.fillRect(4, size - 44, size - 8, 10);

    ctx.fillStyle = '#383838';
    ctx.font = '900 56px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GOAL', size / 2, size / 2 + 2);
  } else if (decalType === 'pad_456') {
    // Red 3x3 numbered pad (4, 5, 6 + arrow) seen on lower side platforms
    const t = size / 3; // 64px per sub-tile
    const drawRedTile = (c, r, label) => {
      const x = c * t;
      const y = r * t;
      ctx.fillStyle = redBright;
      ctx.fillRect(x + 3, y + 3, t - 6, t - 6);
      ctx.strokeStyle = '#f0ded8';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 6, y + 6, t - 12, t - 12);
      if (label) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + t / 2, y + t / 2 + 1);
      }
    };

    drawRedTile(0, 0, '4');
    drawRedTile(1, 0, '5');
    drawRedTile(0, 1, '5');
    drawRedTile(1, 1, '6');
    drawRedTile(2, 0, '4');
    drawRedTile(2, 1, '6');

    // Red arrow in Row 2 pointing +Z
    ctx.fillStyle = redBright;
    ctx.fillRect(t * 1.5 - 8, t * 2 + 2, 16, 28);
    ctx.beginPath();
    ctx.moveTo(t * 1.5 - 24, t * 2 + 26);
    ctx.lineTo(t * 1.5 + 24, t * 2 + 26);
    ctx.lineTo(t * 1.5, size - 6);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Returns a cached MeshLambertMaterial for a 3x3 block top surface with the given decal & decalRotation.
 */
export function getTopSurfaceMaterial(decalType = 'none', decalRotation = 0) {
  const key = `top_${decalType}_${decalRotation}`;
  if (materialCache.has(key)) {
    return materialCache.get(key);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  drawBase3x3Tiles(ctx, 192);
  drawDecalOverlay(ctx, decalType, decalRotation, 192);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    flatShading: true
  });

  materialCache.set(key, mat);
  return mat;
}

/**
 * Creates the authentic Marble Madness cliff wall materials:
 * - leftCliff: Yellow/Chartreuse vertical stripes (3 stripes per sub-tile = 9 per 3x3 block)
 * - leftCliffTrim: Warm Orange top band (0.85 sub-tiles tall) that follows the top sloped edge of left walls!
 * - rightCliff: Crimson/Maroon vertical stripes (3 stripes per sub-tile = 9 per 3x3 block)
 * - rightCliffTrim: Warm Orange-Red top band for right walls
 */
export function getCliffWallMaterials() {
  if (materialCache.has('cliff_materials')) {
    return materialCache.get('cliff_materials');
  }

  function makeRepeatingStripeMaterial(stripeLight, stripeDark, seamColor, topRimLip = false) {
    const W = 96; // 1 sub-tile = 3 stripes of 32px
    const H = 64;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const stripeW = W / 3; // 32px per stripe
    for (let s = 0; s < 3; s++) {
      const sx = s * stripeW;
      ctx.fillStyle = s % 2 === 0 ? stripeLight : stripeDark;
      ctx.fillRect(sx, 0, stripeW, H);

      // Dark vertical groove line
      ctx.fillStyle = seamColor;
      ctx.fillRect(sx + stripeW - 4, 0, 4, H);
    }

    if (topRimLip) {
      ctx.fillStyle = '#282010';
      ctx.fillRect(0, 0, W, 5);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    return new THREE.MeshBasicMaterial({ map: tex });
  }

  // Note: Using MeshBasicMaterial (unlit arcade palette colors) for the vertical cliff walls
  // ensures the left walls are ALWAYS crisp bright yellow/orange and right walls are ALWAYS
  // crisp dark red/maroon without 3D lighting washing them out or darkening them!
  const mats = {
    // Yellow/Green main vertical stripes on left-facing (+Z / -Z) walls
    leftCliff: makeRepeatingStripeMaterial('#d8dc24', '#8e9212', '#2e3004', false),
    // Orange top band (0.85 units tall) right under the floor on left-facing walls
    leftCliffTrim: makeRepeatingStripeMaterial('#e07018', '#b04e0c', '#381804', true),

    // Red/Maroon main vertical stripes on right-facing (+X / -X) walls
    rightCliff: makeRepeatingStripeMaterial('#9e2016', '#56100a', '#240402', false),
    // Subtle warm top rim on right-facing walls
    rightCliffTrim: makeRepeatingStripeMaterial('#b83018', '#68160c', '#240402', true)
  };

  materialCache.set('cliff_materials', mats);
  return mats;
}

/**
 * Checkered flag texture (black & orange/yellow like in the screenshot).
 */
export function getFlagMaterial() {
  if (materialCache.has('flag_mat')) return materialCache.get('flag_mat');

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');

  const cols = 4;
  const rows = 3;
  const cw = canvas.width / cols;
  const ch = canvas.height / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#f59f18' : '#181818';
      ctx.fillRect(c * cw, r * ch, cw, ch);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.DoubleSide
  });
  materialCache.set('flag_mat', mat);
  return mat;
}

import * as THREE from 'three';

const materialCache = new Map();

/**
 * Draws the base 3x3 Marble Madness arcade tile grid onto a 192x192 canvas (64px per sub-tile).
 * Uses a clean bright neutral base (#f4f4f4) so per-triangle Vertex Colors can tint any sub-tile
 * or diagonal half-tile into exact Arcade shades:
 * - Bright White (#f2f2f2) for lit ramps & outer banks
 * - Neutral Plateau Grey (#bcbcbc) for flat surfaces
 * - Medium-Dark Chute Grey (#7e7e7e) for down-left chute channels
 * - Dark Charcoal (#555555) for steep inner bevels & dark turn wings
 */
function drawBase3x3Tiles(ctx, size = 192) {
  const tilePx = size / 3; // 64px per sub-tile

  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(0, 0, size, size);

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = c * tilePx;
      const y = r * tilePx;

      // Subtle checkerboard variation inside sub-tile
      ctx.fillStyle = (r + c) % 2 === 0 ? '#f6f6f6' : '#eeeeee';
      ctx.fillRect(x + 2, y + 2, tilePx - 4, tilePx - 4);

      // Subtle pixel dithering dots like Atari System 1
      ctx.fillStyle = '#ffffff';
      for (let py = 6; py < tilePx - 6; py += 8) {
        for (let px = 6; px < tilePx - 6; px += 8) {
          if ((px + py) % 16 === 0) {
            ctx.fillRect(x + px, y + py, 2, 2);
          }
        }
      }

      // Inner highlight (top & left)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 2, y + 2, tilePx - 4, 2);
      ctx.fillRect(x + 2, y + 2, 2, tilePx - 4);

      // Inner shadow (bottom & right)
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(x + 2, y + tilePx - 4, tilePx - 4, 2);
      ctx.fillRect(x + tilePx - 4, y + 2, 2, tilePx - 4);

      // Crisp dark mortar line around each sub-tile
      ctx.strokeStyle = '#484848';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(x + 1.5, y + 1.5, tilePx - 3, tilePx - 3);
    }
  }
}

/**
 * Draws a specific arcade decal onto the 192x192 3x3 block canvas, rotated by decalRotation (0, 90, 180, 270).
 */
function drawDecalOverlay(ctx, decalType, decalRotation = 0, size = 192) {
  if (!decalType || decalType === 'none') return;

  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate((-decalRotation * Math.PI) / 180);
  ctx.translate(-size / 2, -size / 2);

  const red = '#cf241c';
  const redBright = '#e62e24';

  if (decalType === 'arrow_wide_diag') {
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
    ctx.fillStyle = red;
    const cx = size / 2;
    ctx.fillRect(cx - 11, 0, 22, 82);
    ctx.beginPath();
    ctx.moveTo(cx - 30, 78);
    ctx.lineTo(cx + 30, 78);
    ctx.lineTo(cx, 114);
    ctx.closePath();
    ctx.fill();

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
    ctx.fillStyle = red;
    const cx = size / 2;
    ctx.fillRect(cx - 11, 0, 22, size);
  } else if (decalType === 'goal_banner') {
    ctx.fillStyle = '#555555';
    ctx.fillRect(4, 34, size - 8, 10);
    ctx.fillRect(4, size - 44, size - 8, 10);

    ctx.fillStyle = '#363636';
    ctx.font = '900 56px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GOAL', size / 2, size / 2 + 2);
  } else if (decalType === 'pad_456') {
    const t = size / 3;
    const drawRedTile = (c, r, label) => {
      const x = c * t;
      const y = r * t;
      ctx.fillStyle = redBright;
      ctx.fillRect(x + 3, y + 3, t - 6, t - 6);
      ctx.strokeStyle = '#ffece8';
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
 * Returns a cached Material for a 3x3 block top surface with vertexColors enabled
 * so each sub-tile or diagonal triangle renders with authentic Marble Madness facet shading.
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

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    vertexColors: true
  });

  materialCache.set(key, mat);
  return mat;
}

/**
 * Creates the authentic Marble Madness cliff wall materials:
 * - leftCliff: Yellow/Chartreuse vertical stripes (3 stripes per sub-tile = 9 per 3x3 block)
 * - leftCliffTrim: Warm Orange top band / diagonal cast shadow band on left-facing walls!
 * - rightCliff: Crimson/Maroon vertical stripes (3 stripes per sub-tile = 9 per 3x3 block)
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

    const stripeW = W / 3;
    for (let s = 0; s < 3; s++) {
      const sx = s * stripeW;
      ctx.fillStyle = s % 2 === 0 ? stripeLight : stripeDark;
      ctx.fillRect(sx, 0, stripeW, H);

      ctx.fillStyle = seamColor;
      ctx.fillRect(sx + stripeW - 4, 0, 4, H);
    }

    if (topRimLip) {
      ctx.fillStyle = '#282010';
      ctx.fillRect(0, 0, W, 4);
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

  const mats = {
    leftCliff: makeRepeatingStripeMaterial('#d8dc24', '#8e9212', '#2e3004', false),
    leftCliffTrim: makeRepeatingStripeMaterial('#e07018', '#b04e0c', '#381804', true),
    rightCliff: makeRepeatingStripeMaterial('#9e2016', '#56100a', '#240402', false)
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

import * as THREE from 'three';
import { getTopSurfaceMaterial, getCliffWallMaterials, getFlagMaterial } from './textures.js';

export const BLOCK_SIZE = 3.0; // Each block is 3x3 sub-tiles (1 unit per sub-tile)
export const PILLAR_BOTTOM = -75.0; // "Infinite" pillar depth
const DEFAULT_TRIM_HEIGHT = 0.78; // Default height of the orange top cliff band

// Authentic Marble Madness 1984 Tile Brightness Levels (applied via Vertex Colors)
export const SHADE = {
  WHITE: 0.99,     // Bright white lit ramp / banked outer lip (#f4f4f4)
  LIGHT: 0.86,     // Light grey переход (#dcdcdc)
  FLAT: 0.75,      // Standard flat plateau tile (#bcbcbc)
  MID: 0.52,       // Medium-dark chute floor going down-left (#808080)
  DARK: 0.35       // Dark charcoal steep inner bevel / left turn wing (#565656)
};

/**
 * Rotates local (u, v) in [0..3] x [0..3] around the block center (1.5, 1.5).
 */
export function rotateUV(u, v, rotation = 0) {
  const rot = ((rotation % 360) + 360) % 360;
  if (rot === 90) return { ru: 3.0 - v, rv: u };
  if (rot === 180) return { ru: 3.0 - u, rv: 3.0 - v };
  if (rot === 270) return { ru: v, rv: 3.0 - u };
  return { ru: u, rv: v };
}

/**
 * Computes the world Y height at local coordinates (u, v) in [0..3] within a 3x3 block.
 * Supports:
 * - Explicit 4x4 sub-tile vertex grid `vGrid` (4 rows x 4 cols of relative Y offsets)
 * - Explicit 4-corner offsets `corners: [c00, c10, c01, c11]`
 * - Parametric `elevation`, `slope`, `tilt`, `rotation`, `shape`
 */
export function getBlockSurfaceY(block, u, v) {
  const elev = Number(block.elevation ?? 0);
  const slope = Number(block.slope ?? 0);
  const tilt = Number(block.tilt ?? 0);
  const rot = Number(block.rotation ?? 0);
  const shape = block.shape || 'flat';

  // 1. If a 4x4 vertex grid `vGrid` is provided (for banked chute channels / beveled steps),
  // bilinearly/triangularly interpolate within the sub-tile (c, r)
  if (Array.isArray(block.vGrid) && block.vGrid.length === 4) {
    const c = Math.min(2, Math.max(0, Math.floor(u === 3 ? 2 : u)));
    const r = Math.min(2, Math.max(0, Math.floor(v === 3 ? 2 : v)));
    const fu = Math.max(0, Math.min(1, u - c));
    const fv = Math.max(0, Math.min(1, v - r));
    const h00 = block.vGrid[r][c];
    const h10 = block.vGrid[r][c + 1];
    const h01 = block.vGrid[r + 1][c];
    const h11 = block.vGrid[r + 1][c + 1];
    if (block.diagSplit === 'main') {
      if (fu >= fv) {
        return elev + h00 * (1.0 - fu) + h10 * (fu - fv) + h11 * fv;
      } else {
        return elev + h00 * (1.0 - fv) + h01 * (fv - fu) + h11 * fu;
      }
    } else {
      if (fu + fv <= 1.0) {
        return elev + h00 + (h10 - h00) * fu + (h01 - h00) * fv;
      } else {
        return elev + h11 + (h01 - h11) * (1.0 - fu) + (h10 - h11) * (1.0 - fv);
      }
    }
  }

  // 2. If explicit 4-corner heights [c00, c10, c01, c11] are provided
  if (Array.isArray(block.corners) && block.corners.length === 4) {
    const [c00, c10, c01, c11] = block.corners;
    const nu = u / 3.0;
    const nv = v / 3.0;
    if (block.diagSplit === 'anti') {
      // Split along horizontal screen anti-diagonal (3,0) - (0,3) (nu + nv = 1)
      if (nu + nv <= 1.0) {
        return elev + c00 + (c10 - c00) * nu + (c01 - c00) * nv;
      } else {
        return elev + c11 + (c01 - c11) * (1.0 - nu) + (c10 - c11) * (1.0 - nv);
      }
    } else {
      // Split along vertical screen main diagonal (0,0) - (3,3) (nu = nv)
      if (nu >= nv) {
        return elev + c00 * (1.0 - nu) + c10 * (nu - nv) + c11 * nv;
      } else {
        return elev + c00 * (1.0 - nv) + c01 * (nv - nu) + c11 * nu;
      }
    }
  }

  // 3. Standard parametric shapes
  const { ru, rv } = rotateUV(u, v, rot);
  const du = (ru - 1.5) / 3.0;
  const dv = (rv - 1.5) / 3.0;
  const nu = ru / 3.0;
  const nv = rv / 3.0;

  if (shape === 'fold_right') {
    const c00 = -slope * 0.5;
    const c10 = -slope * 0.25 + tilt * 0.4;
    const c01 = 0;
    const c11 = slope * 0.5;
    if (nu + nv <= 1.0) {
      return elev + c00 + (c10 - c00) * nu + (c01 - c00) * nv;
    } else {
      return elev + c11 + (c01 - c11) * (1.0 - nu) + (c10 - c11) * (1.0 - nv);
    }
  }

  if (shape === 'fold_left') {
    const c00 = -slope * 0.5;
    const c10 = 0;
    const c01 = -slope * 0.25 + tilt * 0.4;
    const c11 = slope * 0.5;
    if (nu + nv <= 1.0) {
      return elev + c00 + (c10 - c00) * nu + (c01 - c00) * nv;
    } else {
      return elev + c11 + (c01 - c11) * (1.0 - nu) + (c10 - c11) * (1.0 - nv);
    }
  }

  if (shape === 'chute_funnel') {
    const c00 = 0;
    const c10 = 0;
    const c01 = slope * 0.5;
    const c11 = slope;
    if (nu >= nv) {
      return elev + c00 * (1.0 - nu) + c10 * (nu - nv) + c11 * nv;
    } else {
      return elev + c00 * (1.0 - nv) + c01 * (nv - nu) + c11 * nu;
    }
  }

  return elev + dv * slope + du * tilt;
}

/**
 * Computes the brightness shade (in [0.35 .. 0.99]) for a sub-tile triangle on a block.
 * Uses `block.shadePreset` or `block.subShades` if defined, otherwise computes automatically from normal.
 */
function getSubtileTriangleShade(block, r, c, isUpperLeftTri, normal) {
  // Explicit 3x3 subShades matrix: each entry can be a number or [tri0, tri1]
  if (Array.isArray(block.subShades) && block.subShades[r] && block.subShades[r][c] !== undefined) {
    const entry = block.subShades[r][c];
    if (Array.isArray(entry)) {
      return isUpperLeftTri ? entry[0] : entry[1];
    }
    return Number(entry);
  }

  const preset = block.shadePreset;
  if (preset === 'funnel_bevel_left') {
    // Left edge of chute entrance: sawtooth of flat grey (upper-left) & dark charcoal bevel (lower-right)
    if (c === 2) {
      return isUpperLeftTri ? SHADE.FLAT : SHADE.DARK;
    }
    return SHADE.FLAT;
  }
  if (preset === 'funnel_center') {
    // Center of chute entrance below the big red arrow:
    // Left column has dark bevel, middle columns are medium-grey ramp, right column is white bank
    if (c === 0) return isUpperLeftTri ? SHADE.FLAT : SHADE.DARK;
    if (c === 1) return SHADE.MID;
    return SHADE.LIGHT;
  }
  if (preset === 'funnel_throat') {
    // Transition from dark bevel on left into bright white Leg 1 ramp on right
    if (c === 0) return SHADE.DARK;
    if (c === 1) return isUpperLeftTri ? SHADE.DARK : SHADE.WHITE;
    return SHADE.WHITE;
  }
  if (preset === 'chute_leg_x') {
    // Leg going Down-Right (+X): bright white banked ramp (with dark inner bevel on top-left if r=2)
    return SHADE.WHITE;
  }
  if (preset === 'turn_right') {
    // Right-pointing bend (Turn 1 & Turn 3):
    // Anti-diagonal (r + c = 2) separates Bright White upper-left triangle from Dark Charcoal lower-right triangle!
    if (r + c < 2) return SHADE.WHITE;
    if (r + c > 2) return c === 2 ? SHADE.WHITE : SHADE.DARK;
    return isUpperLeftTri ? SHADE.WHITE : SHADE.DARK;
  }
  if (preset === 'chute_leg_z') {
    // Leg going Down-Left (+Z): left 2 columns (c=0,1) are Medium-Dark Chute Floor, right column (c=2) is Bright White Bank!
    return c < 2 ? SHADE.MID : SHADE.WHITE;
  }
  if (preset === 'turn_left_dark') {
    // Left-pointing bend (Turn 2):
    // Anti-diagonal (r + c = 2) separates Dark Charcoal upper-left pointed wing from Bright White lower-right Leg 3 launch!
    if (r + c < 2) return SHADE.DARK;
    if (r + c > 2) return SHADE.WHITE;
    return isUpperLeftTri ? SHADE.DARK : SHADE.WHITE;
  }
  if (preset === 'wing_dark') {
    return SHADE.DARK;
  }
  if (preset === 'wing_white') {
    return SHADE.WHITE;
  }

  // Automatic normal-based shading for user-edited blocks
  if (Math.abs(normal.x) < 0.04 && Math.abs(normal.z) < 0.04) {
    return SHADE.FLAT;
  }
  // Light direction tuned to match Marble Madness contrast
  const lightDir = new THREE.Vector3(-0.45, 0.75, -0.48).normalize();
  const dot = normal.dot(lightDir);
  if (dot > 0.82) return SHADE.WHITE;
  if (dot > 0.68) return SHADE.FLAT;
  if (dot > 0.52) return SHADE.MID;
  return SHADE.DARK;
}

/**
 * Appends a vertical cliff wall from top edge (x0, y0, z0) -> (x1, y1, z1) down to PILLAR_BOTTOM,
 * with configurable orange top shadow/trim depth (trimH0, trimH1) on left-facing (+Z/-Z) walls!
 */
function addCliffWallWithTrim(
  mainPos, mainNorm, mainUV,
  trimPos, trimNorm, trimUV,
  x0, y0, z0,
  x1, y1, z1,
  u0, u1,
  trimH0 = DEFAULT_TRIM_HEIGHT,
  trimH1 = DEFAULT_TRIM_HEIGHT
) {
  const yBot = PILLAR_BOTTOM;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len;
  const nz = dx / len;

  const pushQuad = (posArr, normArr, uvArr, tx0, ty0, tz0, tx1, ty1, tz1, by0, by1, vTop, vBot) => {
    posArr.push(
      tx0, ty0, tz0,
      tx0, by0, tz0,
      tx1, by1, tz1,
      tx0, ty0, tz0,
      tx1, by1, tz1,
      tx1, ty1, tz1
    );
    for (let i = 0; i < 6; i++) {
      normArr.push(nx, 0, nz);
    }
    uvArr.push(
      u0, vTop,
      u0, vBot,
      u1, vBot,
      u0, vTop,
      u1, vBot,
      u1, vTop
    );
  };

  if (trimPos) {
    const yMid0 = y0 - trimH0;
    const yMid1 = y1 - trimH1;
    pushQuad(trimPos, trimNorm, trimUV, x0, y0, z0, x1, y1, z1, yMid0, yMid1, 1.0, 0.0);
    pushQuad(mainPos, mainNorm, mainUV, x0, yMid0, z0, x1, yMid1, z1, yBot, yBot, 1.0, 0.0);
  } else {
    pushQuad(mainPos, mainNorm, mainUV, x0, y0, z0, x1, y1, z1, yBot, yBot, 1.0, 0.0);
  }
}

/**
 * Builds the stepped sub-tile pillar group for `pit_stepped` and `subtiles_custom` blocks.
 */
function buildSteppedSubtilesGroup(block) {
  const group = new THREE.Group();
  const topMat = getTopSurfaceMaterial(block.decal || 'none', block.decalRotation || 0);
  const { leftCliff, leftCliffTrim, rightCliff } = getCliffWallMaterials();

  const elev = Number(block.elevation ?? 0);
  const rot = Number(block.rotation ?? 0);

  const defaultSteps = [
    [0.0, 0.0, -1.2],
    [0.0, 0.0, -2.2],
    [-1.2, -2.2, null]
  ];

  const topPos = [], topNorm = [], topUV = [], topCol = [];
  const leftPos = [], leftNorm = [], leftUV = [];
  const trimPos = [], trimNorm = [], trimUV = [];
  const rightPos = [], rightNorm = [], rightUV = [];

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const { ru, rv } = rotateUV(c + 0.5, r + 0.5, rot);
      const sc = Math.min(2, Math.max(0, Math.floor(ru)));
      const sr = Math.min(2, Math.max(0, Math.floor(rv)));

      let hOffset = 0;
      if (block.shape === 'subtiles_custom' && block.subHeights) {
        hOffset = block.subHeights[r]?.[c];
        if (hOffset === null || hOffset === undefined) continue;
      } else {
        hOffset = defaultSteps[sr][sc];
        if (hOffset === null) continue;
      }

      const y = elev + Number(hOffset);
      const x0 = c - 1.5;
      const x1 = c - 0.5;
      const z0 = r - 1.5;
      const z1 = r - 0.5;

      const u0 = c / 3;
      const u1 = (c + 1) / 3;
      const v0 = 1 - r / 3;
      const v1 = 1 - (r + 1) / 3;

      topPos.push(
        x0, y, z0,
        x0, y, z1,
        x1, y, z1,
        x0, y, z0,
        x1, y, z1,
        x1, y, z0
      );
      const s = SHADE.FLAT;
      for (let i = 0; i < 6; i++) {
        topNorm.push(0, 1, 0);
        topCol.push(s, s, s);
      }
      topUV.push(
        u0, v0,
        u0, v1,
        u1, v1,
        u0, v0,
        u1, v1,
        u1, v0
      );

      addCliffWallWithTrim(leftPos, leftNorm, leftUV, trimPos, trimNorm, trimUV, x0, y, z1, x1, y, z1, c, c + 1);
      addCliffWallWithTrim(leftPos, leftNorm, leftUV, trimPos, trimNorm, trimUV, x1, y, z0, x0, y, z0, c, c + 1);
      addCliffWallWithTrim(rightPos, rightNorm, rightUV, null, null, null, x1, y, z1, x1, y, z0, r, r + 1);
      addCliffWallWithTrim(rightPos, rightNorm, rightUV, null, null, null, x0, y, z0, x0, y, z1, r, r + 1);
    }
  }

  if (topPos.length) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(topPos, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(topNorm, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(topUV, 2));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(topCol, 3));
    group.add(new THREE.Mesh(geom, topMat));
  }

  const addWall = (pos, norm, uv, mat) => {
    if (!pos.length) return;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    group.add(new THREE.Mesh(geom, mat));
  };

  addWall(trimPos, trimNorm, trimUV, leftCliffTrim);
  addWall(leftPos, leftNorm, leftUV, leftCliff);
  addWall(rightPos, rightNorm, rightUV, rightCliff);

  return group;
}

/**
 * Builds the complete 3D Mesh Group for a single 3x3 Block (including top tiled surface
 * with per-triangle arcade shading, infinitely tall striped cliff walls with orange top/shadow band,
 * and any attached 3D elements).
 */
export function buildBlockMeshGroup(block) {
  const root = new THREE.Group();
  if (!block || block.isVoid) return root;

  if (block.shape === 'pit') {
    if (block.element && block.element !== 'none') {
      const elemGroup = buildElementOnBlock(block);
      if (elemGroup) root.add(elemGroup);
    }
    return root;
  }

  if (block.shape === 'pit_stepped' || block.shape === 'subtiles_custom') {
    const stepped = buildSteppedSubtilesGroup(block);
    root.add(stepped);
  } else {
    const topMat = getTopSurfaceMaterial(block.decal || 'none', block.decalRotation || 0);
    const { leftCliff, leftCliffTrim, rightCliff } = getCliffWallMaterials();

    const topPos = [];
    const topNorm = [];
    const topUV = [];
    const topCol = [];

    const pushTriangle = (pA, pB, pC, uvA, uvB, uvC, r, c, isUpperLeftTri) => {
      const vAB = new THREE.Vector3().subVectors(pB, pA);
      const vAC = new THREE.Vector3().subVectors(pC, pA);
      const n = new THREE.Vector3().crossVectors(vAB, vAC).normalize();
      const s = getSubtileTriangleShade(block, r, c, isUpperLeftTri, n);

      topPos.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z, pC.x, pC.y, pC.z);
      for (let i = 0; i < 3; i++) {
        topNorm.push(n.x, n.y, n.z);
        topCol.push(s, s, s);
      }
      topUV.push(uvA[0], uvA[1], uvB[0], uvB[1], uvC[0], uvC[1]);
    };

    const isGoalBevel = block.shape === 'goal_bevel';
    const rot = Number(block.rotation ?? 0);
    const cutout = block.cutout || null; // 'wing_left' (only r+c >= 2) or 'wing_right' (only r+c <= 2)

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const u0 = c;
        const u1 = c + 1;
        const v0 = r;
        const v1 = r + 1;

        const p00 = new THREE.Vector3(u0 - 1.5, getBlockSurfaceY(block, u0, v0), v0 - 1.5);
        const p10 = new THREE.Vector3(u1 - 1.5, getBlockSurfaceY(block, u1, v0), v0 - 1.5);
        const p01 = new THREE.Vector3(u0 - 1.5, getBlockSurfaceY(block, u0, v1), v1 - 1.5);
        const p11 = new THREE.Vector3(u1 - 1.5, getBlockSurfaceY(block, u1, v1), v1 - 1.5);

        const uv00 = [u0 / 3, 1 - v0 / 3];
        const uv10 = [u1 / 3, 1 - v0 / 3];
        const uv01 = [u0 / 3, 1 - v1 / 3];
        const uv11 = [u1 / 3, 1 - v1 / 3];

        // Support 45° triangular wing blocks (for the sharp pointed turns of the zig-zag chute!)
        if (cutout === 'wing_left') {
          // Keep only the lower-right half (r + c >= 2) that forms the sharp left tip at (u=0,v=3)-(u=3,v=3)
          if (r + c < 2) continue;
          if (r + c === 2) {
            pushTriangle(p10, p01, p11, uv10, uv01, uv11, r, c, false);
            continue;
          }
        } else if (cutout === 'wing_right') {
          // Keep only the upper-left half (r + c <= 2)
          if (r + c > 2) continue;
          if (r + c === 2) {
            pushTriangle(p00, p01, p10, uv00, uv01, uv10, r, c, true);
            continue;
          }
        }

        if (isGoalBevel) {
          const { ru, rv } = rotateUV(c + 0.5, r + 0.5, rot);
          const sc = Math.floor(ru);
          const sr = Math.floor(rv);
          if (sr === 2 && sc === 0) {
            pushTriangle(p00, p11, p10, uv00, uv11, uv10, r, c, true);
            continue;
          }
          if (sr === 2 && sc === 2) {
            pushTriangle(p00, p01, p10, uv00, uv01, uv10, r, c, true);
            continue;
          }
        }

        const useAntiDiag = block.diagSplit
          ? block.diagSplit === 'anti'
          : (
              block.shape === 'fold_left' ||
              block.shape === 'fold_right' ||
              block.shadePreset === 'funnel_bevel_left' ||
              block.shadePreset === 'funnel_center' ||
              block.shadePreset === 'turn_right' ||
              block.shadePreset === 'turn_left_dark'
            );

        if (useAntiDiag) {
          // Split along anti-diagonal (p10 - p01):
          // Triangle 1 (Upper-Left): p00, p01, p10
          // Triangle 2 (Lower-Right): p10, p01, p11
          pushTriangle(p00, p01, p10, uv00, uv01, uv10, r, c, true);
          pushTriangle(p10, p01, p11, uv10, uv01, uv11, r, c, false);
        } else {
          // Split along main diagonal (p00 - p11):
          // Triangle 1 (Lower-Left): p00, p01, p11
          // Triangle 2 (Upper-Right): p00, p11, p10
          pushTriangle(p00, p01, p11, uv00, uv01, uv11, r, c, true);
          pushTriangle(p00, p11, p10, uv00, uv11, uv10, r, c, false);
        }
      }
    }

    const topGeom = new THREE.BufferGeometry();
    topGeom.setAttribute('position', new THREE.Float32BufferAttribute(topPos, 3));
    topGeom.setAttribute('normal', new THREE.Float32BufferAttribute(topNorm, 3));
    topGeom.setAttribute('uv', new THREE.Float32BufferAttribute(topUV, 2));
    topGeom.setAttribute('color', new THREE.Float32BufferAttribute(topCol, 3));
    const topMesh = new THREE.Mesh(topGeom, topMat);
    root.add(topMesh);

    // Build infinite vertical cliff walls around the perimeter
    const leftPos = [], leftNorm = [], leftUV = [];
    const trimPos = [], trimNorm = [], trimUV = [];
    const rightPos = [], rightNorm = [], rightUV = [];

    // Optional per-vertex orange shadow depth along the +Z yellow wall: [d0, d1, d2, d3]
    const cs = Array.isArray(block.cliffShadow) && block.cliffShadow.length === 4
      ? block.cliffShadow
      : [DEFAULT_TRIM_HEIGHT, DEFAULT_TRIM_HEIGHT, DEFAULT_TRIM_HEIGHT, DEFAULT_TRIM_HEIGHT];

    for (let i = 0; i < 3; i++) {
      const a = i;
      const b = i + 1;

      if (cutout !== 'wing_right') {
        // Front-Left Wall (v = 3, u from a to b) -> Normal +Z -> Yellow stripes + Orange shadow/trim band
        addCliffWallWithTrim(
          leftPos, leftNorm, leftUV,
          trimPos, trimNorm, trimUV,
          a - 1.5, getBlockSurfaceY(block, a, 3), 1.5,
          b - 1.5, getBlockSurfaceY(block, b, 3), 1.5,
          a, b,
          cs[i], cs[i + 1]
        );
      }

      if (cutout !== 'wing_left') {
        // Back-Right Wall (v = 0, u from b to a) -> Normal -Z -> Yellow stripes + Orange trim
        addCliffWallWithTrim(
          leftPos, leftNorm, leftUV,
          trimPos, trimNorm, trimUV,
          b - 1.5, getBlockSurfaceY(block, b, 0), -1.5,
          a - 1.5, getBlockSurfaceY(block, a, 0), -1.5,
          a, b
        );
      }

      if (cutout !== 'wing_right') {
        // Front-Right Wall (u = 3, v from b to a) -> Normal +X -> Red/Maroon stripes
        addCliffWallWithTrim(
          rightPos, rightNorm, rightUV,
          null, null, null,
          1.5, getBlockSurfaceY(block, 3, b), b - 1.5,
          1.5, getBlockSurfaceY(block, 3, a), a - 1.5,
          a, b
        );
      }

      if (cutout !== 'wing_left') {
        // Back-Left Wall (u = 0, v from a to b) -> Normal -X -> Red/Maroon stripes
        addCliffWallWithTrim(
          rightPos, rightNorm, rightUV,
          null, null, null,
          -1.5, getBlockSurfaceY(block, 0, a), a - 1.5,
          -1.5, getBlockSurfaceY(block, 0, b), b - 1.5,
          a, b
        );
      }
    }

    const addWallMesh = (pos, norm, uv, mat) => {
      if (!pos.length) return;
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      root.add(new THREE.Mesh(geom, mat));
    };

    addWallMesh(trimPos, trimNorm, trimUV, leftCliffTrim);
    addWallMesh(leftPos, leftNorm, leftUV, leftCliff);
    addWallMesh(rightPos, rightNorm, rightUV, rightCliff);
  }

  // Attach 3D Element (if any) on top of the block
  if (block.element && block.element !== 'none') {
    const elemGroup = buildElementOnBlock(block);
    if (elemGroup) root.add(elemGroup);
  }

  return root;
}

/**
 * Helper to create a red guard tube segment between local (u0, v0) and (u1, v1) on a block,
 * plus its crisp dark arcade shadow strip on the floor!
 */
function createGuardTubeSegment(block, u0, v0, u1, v1, tubeMat, postHeight = 0.42, radius = 0.13) {
  const group = new THREE.Group();
  const y0 = getBlockSurfaceY(block, u0, v0);
  const y1 = getBlockSurfaceY(block, u1, v1);

  const p0 = new THREE.Vector3(u0 - 1.5, y0 + postHeight, v0 - 1.5);
  const p1 = new THREE.Vector3(u1 - 1.5, y1 + postHeight, v1 - 1.5);

  const postGeom = new THREE.CylinderGeometry(radius * 0.85, radius * 0.92, postHeight, 12);
  const post0 = new THREE.Mesh(postGeom, tubeMat);
  post0.position.set(p0.x, y0 + postHeight * 0.5, p0.z);
  group.add(post0);

  const post1 = new THREE.Mesh(postGeom, tubeMat);
  post1.position.set(p1.x, y1 + postHeight * 0.5, p1.z);
  group.add(post1);

  const sphereGeom = new THREE.SphereGeometry(radius * 1.05, 12, 12);
  const joint0 = new THREE.Mesh(sphereGeom, tubeMat);
  joint0.position.copy(p0);
  group.add(joint0);

  const joint1 = new THREE.Mesh(sphereGeom, tubeMat);
  joint1.position.copy(p1);
  group.add(joint1);

  const dir = new THREE.Vector3().subVectors(p1, p0);
  const len = dir.length();
  const barGeom = new THREE.CylinderGeometry(radius, radius, len, 12);
  const bar = new THREE.Mesh(barGeom, tubeMat);
  bar.position.copy(p0).addScaledVector(dir, 0.5);
  bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  group.add(bar);

  return group;
}

/**
 * Creates the Marble Madness Glass Sphere with:
 * 1. Semi-transparent colored outer sphere that reflects the underlying 3D scenario via `envMap` (CubeCamera).
 * 2. Internal 3D Square formed by 8 points (4 square vertices + 4 side midpoints/medians)
 *    that rotates dynamically according to the marble's rolling direction.
 */
export function createReflectiveMarble(envMap = null, sphereColor = 0xe61922) {
  const root = new THREE.Group();
  root.name = 'reflectiveMarbleRoot';
  const radius = 0.52;

  // 1. Contact shadow on the floor below the sphere
  const shadowGeom = new THREE.CircleGeometry(radius * 0.88, 24);
  shadowGeom.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x181818,
    transparent: true,
    opacity: 0.48,
    depthWrite: false
  });
  const shadowDisc = new THREE.Mesh(shadowGeom, shadowMat);
  shadowDisc.position.y = -radius + 0.02;
  shadowDisc.renderOrder = 0;
  root.add(shadowDisc);

  // 2. Inner Rotating Square formed by 8 Points (4 corners + 4 midpoints/medians)
  const innerGroup = new THREE.Group();
  innerGroup.name = 'innerEightPointSquare';

  const s = radius * 0.48; // Half-side of the square so all 8 points sit cleanly inside the sphere
  const eightPoints = [
    // 4 Square Vertices (Corners)
    [-s, 0, -s],
    [+s, 0, -s],
    [+s, 0, +s],
    [-s, 0, +s],
    // 4 Side Midpoints (Medians)
    [0, 0, -s],
    [+s, 0, 0],
    [0, 0, +s],
    [-s, 0, 0]
  ];

  const dotGeom = new THREE.SphereGeometry(radius * 0.095, 14, 14);
  const cornerMat = new THREE.MeshBasicMaterial({ color: 0xfff275 }); // Bright gold-white for vertices
  const medianMat = new THREE.MeshBasicMaterial({ color: 0x48dbfb }); // Crisp cyan-white for medians

  eightPoints.forEach(([px, py, pz], idx) => {
    const dot = new THREE.Mesh(dotGeom, idx < 4 ? cornerMat : medianMat);
    dot.position.set(px, py, pz);
    dot.renderOrder = 1;
    innerGroup.add(dot);
  });

  // Subtle connecting square wire so the 8-point square structure is crisp and unmistakable
  const squareLoop = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-s, 0, -s),
    new THREE.Vector3(+s, 0, -s),
    new THREE.Vector3(+s, 0, +s),
    new THREE.Vector3(-s, 0, +s),
    new THREE.Vector3(-s, 0, -s)
  ]);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.65
  });
  const squareWire = new THREE.Line(squareLoop, lineMat);
  squareWire.renderOrder = 1;
  innerGroup.add(squareWire);

  // Give initial slight 3D tilt so the 8-point square is visible in 3D perspective immediately
  innerGroup.rotation.x = Math.PI * 0.22;
  innerGroup.rotation.z = Math.PI * 0.15;
  root.add(innerGroup);

  // 3. Semi-transparent Reflective Colored Sphere (Inner BackSide + Outer FrontSide with CubeCamera envMap)
  const sphereGeom = new THREE.SphereGeometry(radius, 32, 32);

  const backMat = new THREE.MeshPhongMaterial({
    color: sphereColor,
    emissive: 0x220004,
    specular: 0xffaaaa,
    shininess: 90,
    envMap: envMap,
    combine: THREE.MixOperation,
    reflectivity: 0.55,
    transparent: true,
    opacity: 0.28,
    side: THREE.BackSide,
    depthWrite: false
  });
  const backSphere = new THREE.Mesh(sphereGeom, backMat);
  backSphere.name = 'outerGlassBack';
  backSphere.renderOrder = 2;
  root.add(backSphere);

  const frontMat = new THREE.MeshPhongMaterial({
    color: sphereColor,
    emissive: 0x180002,
    specular: 0xffffff,
    shininess: 140,
    envMap: envMap,
    combine: THREE.MixOperation,
    reflectivity: 0.72,
    transparent: true,
    opacity: 0.52,
    side: THREE.FrontSide,
    depthWrite: false
  });
  const frontSphere = new THREE.Mesh(sphereGeom, frontMat);
  frontSphere.name = 'outerGlassFront';
  frontSphere.renderOrder = 3;
  root.add(frontSphere);

  return {
    root,
    innerGroup,
    backMat,
    frontMat,
    radius
  };
}

function rotateElemPoint(u, v, elemRot = 0) {
  const { ru, rv } = rotateUV(u, v, elemRot);
  return [ru, rv];
}

/**
 * Builds the 3D Element placed on a 3x3 block (tubes, pyramids/cones with crisp right-pointing
 * floor shadow, checkered flags, start marble).
 */
export function buildElementOnBlock(block) {
  const type = block.element;
  if (!type || type === 'none') return null;

  const rot = Number(block.elemRotation ?? 0);
  const group = new THREE.Group();

  const tubeMat = new THREE.MeshPhongMaterial({
    color: 0xd82218,
    specular: 0xffaaaa,
    shininess: 50
  });

  if (type === 'tube_straight') {
    const [t0, t1] = Array.isArray(block.tubeSpan) ? block.tubeSpan : [0.08, 2.92];
    const [u0, v0] = rotateElemPoint(0.18, t0, rot);
    const [u1, v1] = rotateElemPoint(0.18, t1, rot);
    group.add(createGuardTubeSegment(block, u0, v0, u1, v1, tubeMat));
  } else if (type === 'tube_corner') {
    const [u0, v0] = rotateElemPoint(0.18, 2.85, rot);
    const [u1, v1] = rotateElemPoint(0.18, 0.18, rot);
    const [u2, v2] = rotateElemPoint(2.85, 0.18, rot);
    group.add(createGuardTubeSegment(block, u0, v0, u1, v1, tubeMat));
    group.add(createGuardTubeSegment(block, u1, v1, u2, v2, tubeMat));
  } else if (type === 'tube_u') {
    const [u0, v0] = rotateElemPoint(0.15, 2.85, rot);
    const [u1, v1] = rotateElemPoint(0.15, 0.15, rot);
    const [u2, v2] = rotateElemPoint(2.85, 0.15, rot);
    const [u3, v3] = rotateElemPoint(2.85, 2.85, rot);
    group.add(createGuardTubeSegment(block, u0, v0, u1, v1, tubeMat));
    group.add(createGuardTubeSegment(block, u1, v1, u2, v2, tubeMat));
    group.add(createGuardTubeSegment(block, u2, v2, u3, v3, tubeMat));
  } else if (type === 'cone_small' || type === 'cone_large') {
    const isLarge = type === 'cone_large';
    const radius = isLarge ? 1.18 : 0.72;
    const height = isLarge ? 1.85 : 1.18;

    let cu = 1.5;
    let cv = 1.5;
    if (isLarge && block.shape === 'pit_stepped') {
      [cu, cv] = rotateElemPoint(1.0, 1.0, block.rotation || 0);
    }

    const baseY = block.shape === 'pit_stepped'
      ? Number(block.elevation ?? 0)
      : getBlockSurfaceY(block, cu, cv);

    const coneMat = new THREE.MeshLambertMaterial({
      color: 0xd0d4da,
      flatShading: true
    });

    const coneGeom = new THREE.ConeGeometry(radius, height, 4);
    coneGeom.rotateY(Math.PI / 4 + (rot * Math.PI) / 180);
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.set(cu - 1.5, baseY + height * 0.5, cv - 1.5);
    group.add(cone);

    // Crisp right-pointing triangular arcade shadow on the floor (exact match to reference image!)
    if (block.shape !== 'pit') {
      const shLen = isLarge ? 2.1 : 1.35;
      const shHalf = isLarge ? 0.78 : 0.48;
      const shGeom = new THREE.BufferGeometry();
      const sx = cu - 1.5;
      const sz = cv - 1.5;
      const sy = baseY + 0.02;
      shGeom.setAttribute('position', new THREE.Float32BufferAttribute([
        sx, sy, sz - shHalf,
        sx, sy, sz + shHalf,
        sx + shLen, sy, sz - shLen * 0.65
      ], 3));
      const shMat = new THREE.MeshBasicMaterial({
        color: 0x484848,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      });
      group.add(new THREE.Mesh(shGeom, shMat));
    }
  } else if (type === 'goal_flags') {
    const flagMat = getFlagMaterial();
    const poleMat = new THREE.MeshBasicMaterial({ color: 0xe8a828 });

    const sidePoints = [
      rotateElemPoint(0.15, 1.5, rot),
      rotateElemPoint(2.85, 1.5, rot)
    ];

    for (const [u, v] of sidePoints) {
      const y = getBlockSurfaceY(block, u, v);
      const poleH = 1.95;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, poleH, 8), poleMat);
      pole.position.set(u - 1.5, y + poleH * 0.5, v - 1.5);
      group.add(pole);

      const flagW = 0.92;
      const flagH = 0.65;
      const flagGeom = new THREE.PlaneGeometry(flagW, flagH, 3, 2);
      const flag = new THREE.Mesh(flagGeom, flagMat);
      flag.position.set(u - 1.5 - 0.25, y + poleH - flagH * 0.5, v - 1.5 - 0.25);
      flag.rotation.y = Math.PI / 4 + (rot * Math.PI) / 180;
      group.add(flag);
    }
  } else if (type === 'marble_start') {
    const y = getBlockSurfaceY(block, 1.5, 1.5);
    const { root: marbleRoot, innerGroup, radius } = createReflectiveMarble(
      block._envMap || null,
      block.marbleColor || 0xe61922
    );
    marbleRoot.position.set(0, y + radius, 0);
    // Orient initial rotation according to elemRotation
    innerGroup.rotation.y = (rot * Math.PI) / 180;
    group.add(marbleRoot);
  }

  return group;
}

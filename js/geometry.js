import * as THREE from 'three';
import { getTopSurfaceMaterial, getCliffWallMaterials, getFlagMaterial } from './textures.js';

export const BLOCK_SIZE = 3.0; // Each block is 3x3 sub-tiles (1 unit per sub-tile)
export const PILLAR_BOTTOM = -75.0; // "Infinite" pillar depth
const TOP_TRIM_HEIGHT = 0.78; // Exact height (in sub-tile units) of the orange top cliff band

/**
 * Rotates local (u, v) in [0..3] x [0..3] around the block center (1.5, 1.5).
 * Convention:
 * - rotation = 0°   -> forward (+rv) is +Z (Down-Left in isometric view)
 * - rotation = 90°  -> forward (+rv) is +X (Down-Right in isometric view)
 * - rotation = 180° -> forward (+rv) is -Z (Up-Right in isometric view)
 * - rotation = 270° -> forward (+rv) is -X (Up-Left in isometric view)
 */
export function rotateUV(u, v, rotation = 0) {
  const rot = ((rotation % 360) + 360) % 360;
  if (rot === 90) {
    return { ru: 3.0 - v, rv: u };
  }
  if (rot === 180) {
    return { ru: 3.0 - u, rv: 3.0 - v };
  }
  if (rot === 270) {
    return { ru: v, rv: 3.0 - u };
  }
  return { ru: u, rv: v };
}

/**
 * Computes the world Y height at local coordinates (u, v) in [0..3] within a 3x3 block.
 * - u in [0..3] is along +X (Down-Right)
 * - v in [0..3] is along +Z (Down-Left)
 */
export function getBlockSurfaceY(block, u, v) {
  const elev = Number(block.elevation ?? 0);
  const slope = Number(block.slope ?? 0);
  const tilt = Number(block.tilt ?? 0);
  const rot = Number(block.rotation ?? 0);
  const shape = block.shape || 'flat';

  // If explicit 4-corner heights [h00, h10, h01, h11] (relative to elevation or absolute) are provided,
  // interpolate along the two triangles so any custom or turn block is 100% seamless!
  if (Array.isArray(block.corners) && block.corners.length === 4) {
    const [c00, c10, c01, c11] = block.corners; // (u=0,v=0), (u=3,v=0), (u=0,v=3), (u=3,v=3)
    const nu = u / 3.0;
    const nv = v / 3.0;
    if (block.diagSplit === 'anti') {
      // Split along (3,0) - (0,3) (nu + nv = 1)
      if (nu + nv <= 1.0) {
        return elev + c00 + (c10 - c00) * nu + (c01 - c00) * nv;
      } else {
        return elev + c11 + (c01 - c11) * (1.0 - nu) + (c10 - c11) * (1.0 - nv);
      }
    } else {
      // Split along main diagonal (0,0) - (3,3) (nu = nv)
      if (nu >= nv) {
        return elev + c00 * (1.0 - nu) + c10 * (nu - nv) + c11 * nv;
      } else {
        return elev + c00 * (1.0 - nv) + c01 * (nv - nu) + c11 * nu;
      }
    }
  }

  const { ru, rv } = rotateUV(u, v, rot);
  const du = (ru - 1.5) / 3.0; // [-0.5 .. +0.5]
  const dv = (rv - 1.5) / 3.0; // [-0.5 .. +0.5]
  const nu = ru / 3.0;         // [0 .. 1]
  const nv = rv / 3.0;         // [0 .. 1]

  if (shape === 'fold_right') {
    // 90° Turn Block: connects incoming ramp along +U (left edge ru=0) to outgoing ramp along +V (front edge rv=3)
    // Corner offsets relative to elev:
    // (0,0) = +slope * 0.5, (3,0) = +tilt * 0.5, (0,3) = 0, (3,3) = slope * 0.5
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
    // 90° Turn Block: connects incoming ramp along +V (back edge rv=0) to outgoing ramp along +U (right edge ru=3)
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
    // Funnel block below the big red arrow: outer rim matches platform, center/front slopes down into chute
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
 * Appends a vertical cliff wall from top edge (x0, y0, z0) -> (x1, y1, z1) down to PILLAR_BOTTOM.
 * If trimPos/trimNorm/trimUV are passed (for left-facing +Z/-Z walls), builds a crisp
 * TOP_TRIM_HEIGHT (0.78 sub-tiles) orange top band that follows the exact slope from y0 to y1!
 */
function addCliffWallWithTrim(
  mainPos, mainNorm, mainUV,
  trimPos, trimNorm, trimUV,
  x0, y0, z0,
  x1, y1, z1,
  u0, u1
) {
  const yBot = PILLAR_BOTTOM;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len;
  const nz = dx / len;

  const pushQuad = (posArr, normArr, uvArr, tx0, ty0, tz0, tx1, ty1, tz1, by0, by1, vTop, vBot) => {
    // Winding order so front-facing normals point toward (+nx, 0, +nz)
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
    // 1. Orange top trim band (exact TOP_TRIM_HEIGHT = 0.78 units tall, shearing with the top slope!)
    const yMid0 = y0 - TOP_TRIM_HEIGHT;
    const yMid1 = y1 - TOP_TRIM_HEIGHT;
    pushQuad(trimPos, trimNorm, trimUV, x0, y0, z0, x1, y1, z1, yMid0, yMid1, 1.0, 0.0);

    // 2. Infinite yellow/chartreuse striped pillar below the orange band
    pushQuad(mainPos, mainNorm, mainUV, x0, yMid0, z0, x1, yMid1, z1, yBot, yBot, 1.0, 0.0);
  } else {
    // Right-facing red/maroon wall (thin 0.25-unit top rim lip + infinite crimson/maroon stripes)
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

  // Authentic stepped pattern inside the central pit of Level 1:
  // Back 2x2 sub-tiles at top elevation (supporting the large pyramid),
  // front row/column stepping down by -1.2 and -2.4 units!
  const defaultSteps = [
    [0.0, 0.0, -1.2],
    [0.0, 0.0, -2.2],
    [-1.2, -2.2, null]
  ];

  const topPos = [];
  const topNorm = [];
  const topUV = [];

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

      // Top quad for sub-tile (r, c) with upward +Y normal
      topPos.push(
        x0, y, z0,
        x0, y, z1,
        x1, y, z1,
        x0, y, z0,
        x1, y, z1,
        x1, y, z0
      );
      for (let i = 0; i < 6; i++) topNorm.push(0, 1, 0);
      topUV.push(
        u0, v0,
        u0, v1,
        u1, v1,
        u0, v0,
        u1, v1,
        u1, v0
      );

      // +Z wall (Yellow + Orange top band)
      addCliffWallWithTrim(leftPos, leftNorm, leftUV, trimPos, trimNorm, trimUV, x0, y, z1, x1, y, z1, c, c + 1);
      // -Z wall (Yellow + Orange top band)
      addCliffWallWithTrim(leftPos, leftNorm, leftUV, trimPos, trimNorm, trimUV, x1, y, z0, x0, y, z0, c, c + 1);
      // +X wall (Red stripes)
      addCliffWallWithTrim(rightPos, rightNorm, rightUV, null, null, null, x1, y, z1, x1, y, z0, r, r + 1);
      // -X wall (Red stripes)
      addCliffWallWithTrim(rightPos, rightNorm, rightUV, null, null, null, x0, y, z0, x0, y, z1, r, r + 1);
    }
  }

  const makeMesh = (pos, norm, uv, mat, castShadow = false) => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const m = new THREE.Mesh(geom, mat);
    m.castShadow = castShadow;
    m.receiveShadow = true;
    return m;
  };

  if (topPos.length) group.add(makeMesh(topPos, topNorm, topUV, topMat, true));
  if (trimPos.length) group.add(makeMesh(trimPos, trimNorm, trimUV, leftCliffTrim, false));
  if (leftPos.length) group.add(makeMesh(leftPos, leftNorm, leftUV, leftCliff, false));
  if (rightPos.length) group.add(makeMesh(rightPos, rightNorm, rightUV, rightCliff, false));

  return group;
}

/**
 * Builds the complete 3D Mesh Group for a single 3x3 Block (including top tiled surface,
 * infinitely tall striped cliff walls with orange top band, and any attached 3D elements).
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

    const pushTriangle = (pA, pB, pC, uvA, uvB, uvC) => {
      const vAB = new THREE.Vector3().subVectors(pB, pA);
      const vAC = new THREE.Vector3().subVectors(pC, pA);
      const n = new THREE.Vector3().crossVectors(vAB, vAC).normalize();

      topPos.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z, pC.x, pC.y, pC.z);
      for (let i = 0; i < 3; i++) topNorm.push(n.x, n.y, n.z);
      topUV.push(uvA[0], uvA[1], uvB[0], uvB[1], uvC[0], uvC[1]);
    };

    const isGoalBevel = block.shape === 'goal_bevel';
    const rot = Number(block.rotation ?? 0);

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

        if (isGoalBevel) {
          const { ru, rv } = rotateUV(c + 0.5, r + 0.5, rot);
          const sc = Math.floor(ru);
          const sr = Math.floor(rv);
          if (sr === 2 && sc === 0) {
            pushTriangle(p00, p11, p10, uv00, uv11, uv10);
            continue;
          }
          if (sr === 2 && sc === 2) {
            pushTriangle(p00, p01, p10, uv00, uv01, uv10);
            continue;
          }
        }

        const useAntiDiag = block.diagSplit
          ? block.diagSplit === 'anti'
          : (block.shape === 'fold_left' || block.shape === 'fold_right');

        if (useAntiDiag) {
          pushTriangle(p00, p01, p10, uv00, uv01, uv10);
          pushTriangle(p10, p01, p11, uv10, uv01, uv11);
        } else {
          pushTriangle(p00, p01, p11, uv00, uv01, uv11);
          pushTriangle(p00, p11, p10, uv00, uv11, uv10);
        }
      }
    }

    const topGeom = new THREE.BufferGeometry();
    topGeom.setAttribute('position', new THREE.Float32BufferAttribute(topPos, 3));
    topGeom.setAttribute('normal', new THREE.Float32BufferAttribute(topNorm, 3));
    topGeom.setAttribute('uv', new THREE.Float32BufferAttribute(topUV, 2));
    const topMesh = new THREE.Mesh(topGeom, topMat);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    root.add(topMesh);

    // Build infinite vertical cliff walls around the 3x3 perimeter
    const leftPos = [], leftNorm = [], leftUV = [];
    const trimPos = [], trimNorm = [], trimUV = [];
    const rightPos = [], rightNorm = [], rightUV = [];

    for (let i = 0; i < 3; i++) {
      const a = i;
      const b = i + 1;

      // Front-Left Wall (v = 3, u from a to b) -> Normal +Z -> Yellow stripes + Orange top band
      addCliffWallWithTrim(
        leftPos, leftNorm, leftUV,
        trimPos, trimNorm, trimUV,
        a - 1.5, getBlockSurfaceY(block, a, 3), 1.5,
        b - 1.5, getBlockSurfaceY(block, b, 3), 1.5,
        a, b
      );

      // Back-Right Wall (v = 0, u from b to a) -> Normal -Z -> Yellow stripes + Orange top band
      addCliffWallWithTrim(
        leftPos, leftNorm, leftUV,
        trimPos, trimNorm, trimUV,
        b - 1.5, getBlockSurfaceY(block, b, 0), -1.5,
        a - 1.5, getBlockSurfaceY(block, a, 0), -1.5,
        a, b
      );

      // Front-Right Wall (u = 3, v from b to a) -> Normal +X -> Red/Maroon stripes
      addCliffWallWithTrim(
        rightPos, rightNorm, rightUV,
        null, null, null,
        1.5, getBlockSurfaceY(block, 3, b), b - 1.5,
        1.5, getBlockSurfaceY(block, 3, a), a - 1.5,
        a, b
      );

      // Back-Left Wall (u = 0, v from a to b) -> Normal -X -> Red/Maroon stripes
      addCliffWallWithTrim(
        rightPos, rightNorm, rightUV,
        null, null, null,
        -1.5, getBlockSurfaceY(block, 0, a), a - 1.5,
        -1.5, getBlockSurfaceY(block, 0, b), b - 1.5,
        a, b
      );
    }

    const addWallMesh = (pos, norm, uv, mat) => {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const m = new THREE.Mesh(geom, mat);
      root.add(m);
    };

    if (trimPos.length) addWallMesh(trimPos, trimNorm, trimUV, leftCliffTrim);
    if (leftPos.length) addWallMesh(leftPos, leftNorm, leftUV, leftCliff);
    if (rightPos.length) addWallMesh(rightPos, rightNorm, rightUV, rightCliff);
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
 * automatically matching the block's sloped height at both endpoints!
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
  post0.castShadow = true;
  group.add(post0);

  const post1 = new THREE.Mesh(postGeom, tubeMat);
  post1.position.set(p1.x, y1 + postHeight * 0.5, p1.z);
  post1.castShadow = true;
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
  bar.castShadow = true;
  group.add(bar);

  return group;
}

function rotateElemPoint(u, v, elemRot = 0) {
  const { ru, rv } = rotateUV(u, v, elemRot);
  return [ru, rv];
}

/**
 * Builds the 3D Element placed on a 3x3 block (tubes, pyramids/cones, checkered flags, start marble).
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

  const coneMat = new THREE.MeshLambertMaterial({
    color: 0xc8ccd2,
    flatShading: true
  });

  if (type === 'tube_straight') {
    // Straight red guard rail along edge u = 0.18 (back-left edge when rot=0)
    const [u0, v0] = rotateElemPoint(0.18, 0.12, rot);
    const [u1, v1] = rotateElemPoint(0.18, 2.88, rot);
    group.add(createGuardTubeSegment(block, u0, v0, u1, v1, tubeMat));
  } else if (type === 'tube_corner') {
    // L-shaped red guard rail along back-left (u=0.18) and back-right (v=0.18) edges
    const [u0, v0] = rotateElemPoint(0.18, 2.85, rot);
    const [u1, v1] = rotateElemPoint(0.18, 0.18, rot);
    const [u2, v2] = rotateElemPoint(2.85, 0.18, rot);
    group.add(createGuardTubeSegment(block, u0, v0, u1, v1, tubeMat));
    group.add(createGuardTubeSegment(block, u1, v1, u2, v2, tubeMat));
  } else if (type === 'tube_u') {
    // 3-sided U guard rail (like around the upper-left and upper-right 3x3 pits!)
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

    const coneGeom = new THREE.ConeGeometry(radius, height, 4);
    coneGeom.rotateY(Math.PI / 4 + (rot * Math.PI) / 180);
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.set(cu - 1.5, baseY + height * 0.5, cv - 1.5);
    cone.castShadow = true;
    cone.receiveShadow = true;
    group.add(cone);
  } else if (type === 'goal_flags') {
    const flagMat = getFlagMaterial();
    const poleMat = new THREE.MeshBasicMaterial({ color: 0xe8a828 });

    const sidePoints = [
      rotateElemPoint(0.15, 1.5, rot),
      rotateElemPoint(2.85, 1.5, rot)
    ];

    for (const [u, v] of sidePoints) {
      const y = getBlockSurfaceY(block, u, v);
      const poleH = 1.9;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, poleH, 8), poleMat);
      pole.position.set(u - 1.5, y + poleH * 0.5, v - 1.5);
      pole.castShadow = true;
      group.add(pole);

      const flagW = 0.92;
      const flagH = 0.65;
      const flagGeom = new THREE.PlaneGeometry(flagW, flagH, 3, 2);
      const flag = new THREE.Mesh(flagGeom, flagMat);
      // Orient flag perpendicular to the camera so the orange/black checkers are clearly visible!
      flag.position.set(u - 1.5 - 0.25, y + poleH - flagH * 0.5, v - 1.5 - 0.25);
      flag.rotation.y = Math.PI / 4 + (rot * Math.PI) / 180;
      flag.castShadow = true;
      group.add(flag);
    }
  } else if (type === 'marble_start') {
    const y = getBlockSurfaceY(block, 1.5, 1.5);
    const radius = 0.48;
    const sphereGeom = new THREE.SphereGeometry(radius, 24, 24);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0xe01b1b,
      specular: 0xffcccc,
      shininess: 80
    });
    const marble = new THREE.Mesh(sphereGeom, sphereMat);
    marble.position.set(0, y + radius, 0);
    marble.castShadow = true;
    group.add(marble);
  }

  return group;
}

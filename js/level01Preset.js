import { SHADE } from './geometry.js';

const { WHITE: W, LIGHT: L, FLAT: F, MID: M, DARK: D } = SHADE;

/**
 * Helper: converts a 4x4 matrix of absolute world Y heights into `{ elevation, vGrid }`
 * so shared edges between adjacent 3x3 blocks can be matched vertex-by-vertex with 0.000 error!
 */
function makeVGrid(absRows4x4) {
  let sum = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      sum += absRows4x4[r][c];
    }
  }
  const elevation = Math.round((sum / 16) * 100) / 100;
  const vGrid = absRows4x4.map((row) =>
    row.map((y) => Math.round((y - elevation) * 1000) / 1000)
  );
  return { elevation, vGrid };
}

/**
 * Complete 3x3 Block Map recreating the Marble Madness Level 1 (Practice Race)
 * with banked 3D half-pipe chute geometry, raised upward-sweeping spurs,
 * horizontal guard rails, 4-tone Atari tile shading, and diagonal orange cliff shadows.
 */
export function createLevel01Preset() {
  const cols = 14;
  const rows = 14;
  const blocks = {};

  const setBlock = (bx, bz, props = {}) => {
    blocks[`${bx},${bz}`] = {
      bx,
      bz,
      isVoid: false,
      elevation: 14.0,
      slope: 0,
      tilt: 0,
      rotation: 0,
      shape: 'flat',
      element: 'none',
      elemRotation: 0,
      decal: 'none',
      decalRotation: 0,
      ...props
    };
  };

  // =========================================================================
  // 1. UPPER STARTING PLATEAU (Coplanar Flat Plateau at Elevation = 14.0)
  // =========================================================================
  setBlock(1, 1, { elevation: 14.0, element: 'marble_start' });
  setBlock(0, 2, { elevation: 14.0 });
  setBlock(2, 0, { elevation: 14.0 });

  for (let bx = 0; bx <= 5; bx++) {
    for (let bz = 0; bz <= 5; bz++) {
      if (bx === 0 && bz <= 1) continue;
      if (bz === 0 && bx <= 1) continue;
      if (bx === 0 && bz === 5) continue;
      if (bz === 0 && bx === 5) continue;
      if (!blocks[`${bx},${bz}`]) {
        setBlock(bx, bz, { elevation: 14.0 });
      }
    }
  }

  // Upper-Left 3x3 Pit at (1, 3) with L-shaped Red Guard Tube on its top rim
  setBlock(1, 3, {
    elevation: 14.0,
    shape: 'pit',
    element: 'tube_corner',
    elemRotation: 0
  });

  // Upper-Right 3x3 Pit at (3, 1) with L-shaped Red Guard Tube on its top rim
  setBlock(3, 1, {
    elevation: 14.0,
    shape: 'pit',
    element: 'tube_corner',
    elemRotation: 0
  });

  // =========================================================================
  // 2. CENTRAL PIT (2x2 Macro-Blocks: (2,2), (2,3), (3,2), (3,3))
  // =========================================================================
  setBlock(2, 2, {
    elevation: 14.0,
    shape: 'pit',
    element: 'tube_corner',
    elemRotation: 0
  });
  setBlock(2, 3, {
    elevation: 13.6,
    shape: 'pit_stepped',
    rotation: 0,
    element: 'cone_large',
    elemRotation: 0
  });
  setBlock(3, 2, {
    elevation: 13.6,
    shape: 'pit_stepped',
    rotation: 0,
    element: 'cone_large',
    elemRotation: 0
  });
  setBlock(3, 3, {
    elevation: 14.0,
    shape: 'pit'
  });

  // Guard tubes flanking the Central Pit
  setBlock(2, 4, {
    elevation: 14.0,
    element: 'tube_straight',
    elemRotation: 90
  });
  setBlock(4, 2, {
    elevation: 14.0,
    element: 'tube_straight',
    elemRotation: 0
  });

  // =========================================================================
  // 3. LONG RED CHEVRON ARROWS & CHUTE PLATFORM RIM
  // =========================================================================
  setBlock(1, 5, {
    elevation: 14.0,
    decal: 'arrow_shaft_only',
    decalRotation: 90
  });
  setBlock(2, 5, {
    elevation: 14.0,
    decal: 'arrow_long_chevrons',
    decalRotation: 90
  });
  setBlock(3, 5, { elevation: 14.0 });

  setBlock(5, 1, {
    elevation: 14.0,
    decal: 'arrow_shaft_only',
    decalRotation: 0
  });
  setBlock(5, 2, {
    elevation: 14.0,
    decal: 'arrow_long_chevrons',
    decalRotation: 0
  });
  setBlock(5, 3, { elevation: 14.0 });

  // (4,4): Central block with the Big Wide Dashed Red Arrow pointing down to the chute!
  setBlock(4, 4, {
    elevation: 14.0,
    decal: 'arrow_wide_diag',
    decalRotation: 0
  });

  // Front cliff guard rails on the chute platform (100% straight & horizontal at Y = 14.0!)
  setBlock(3, 6, {
    elevation: 14.0,
    element: 'tube_straight',
    elemRotation: 270,
    cliffShadow: [0.8, 0.8, 0.8, 0.8]
  });
  setBlock(4, 6, {
    elevation: 14.0,
    element: 'tube_straight',
    elemRotation: 270,
    cliffShadow: [0.8, 0.8, 1.1, 1.5]
  });

  setBlock(6, 3, {
    elevation: 14.0,
    element: 'tube_straight',
    elemRotation: 180
  });
  setBlock(6, 4, {
    elevation: 14.0,
    element: 'tube_straight',
    elemRotation: 180
  });

  // =========================================================================
  // 4. BANKED V-CHANNEL FUNNEL & ZIG-ZAG CHUTE WITH UPWARD-SWEEPING SPURS
  // =========================================================================

  // (4,5): Left of Chute Entrance — completely flat at 14.0
  setBlock(4, 5, {
    elevation: 14.0
  });

  // (5,4): Right-Back of Chute Entrance — completely flat at 14.0
  setBlock(5, 4, {
    elevation: 14.0
  });

  // (5,5): Center Chute Entrance Funnel (directly below Big Red Arrow)
  // - Left edge c=0 is [14, 14, 14, 14] (matches (4,5)!)
  // - Back edge r=0 is [14, 14, 14, 14] (matches (5,4)!)
  // - Column c=0->1 is the 1-tile dark charcoal bevel dropping into the valley at c=1!
  setBlock(5, 5, {
    ...makeVGrid([
      [14.0, 14.0, 14.0, 14.0],
      [14.0, 13.3, 13.5, 13.8],
      [14.0, 12.7, 13.0, 13.4],
      [14.0, 12.2, 12.5, 13.0]
    ]),
    diagSplit: 'anti',
    subShades: [
      [[F, D], M, [L, W]],
      [[F, D], M, [M, W]],
      [[F, D], M, W]
    ]
  });

  // (5,6): Left Funnel Wing with HORIZONTAL Red Guard Tube
  // - Left edge c=0 is [14, 14, 14, 14] (matches (4,6)!)
  // - Back edge r=0 is [14.0, 12.2, 12.5, 13.0] (matches (5,5) front edge!)
  // - Right edge c=3 is [13.0, 12.4, 11.8, 11.2] (matches (6,6) left edge!)
  setBlock(5, 6, {
    ...makeVGrid([
      [14.0, 12.2, 12.5, 13.0],
      [14.0, 14.0, 12.2, 12.4],
      [14.0, 14.0, 11.9, 11.8],
      [14.0, 14.0, 11.6, 11.2]
    ]),
    diagSplit: 'anti',
    element: 'tube_straight',
    elemRotation: 270,
    tubeSpan: [1.85, 2.92], // Sits on the flat 14.0 rim (u=0..1.15) so tube is 100% horizontal!
    cliffShadow: [1.5, 2.1, 2.8, 3.6],
    subShades: [
      [[F, D], D, M],
      [F, [F, D], D],
      [F, [F, D], D]
    ]
  });

  // (6,5): Right Funnel Wing with HORIZONTAL Red Guard Tube (outer edge c=3 stays at 14.0!)
  // - Back edge r=0 is [14, 14, 14, 14] (matches (6,4)!)
  // - Left edge c=0 is [14.0, 13.8, 13.4, 13.0] (matches (5,5) right edge!)
  // - Front edge r=3 is [13.0, 13.4, 13.6, 13.8] (matches (6,6) back edge!)
  setBlock(6, 5, {
    ...makeVGrid([
      [14.0, 14.0, 14.0, 14.0],
      [13.8, 13.9, 14.0, 14.0],
      [13.4, 13.7, 13.9, 14.0],
      [13.0, 13.4, 13.6, 13.8]
    ]),
    diagSplit: 'anti',
    element: 'tube_straight',
    elemRotation: 180,
    tubeSpan: [0.08, 2.15], // Straight horizontal at Y = 14.0!
    subShades: [
      [F, F, M],
      [L, F, M],
      [W, L, M]
    ]
  });

  // (6,6): Funnel Throat Turning into Leg 1
  // - Left edge c=0 is [13.0, 12.4, 11.8, 11.2] (matches (5,6) right edge!)
  // - Back edge r=0 is [13.0, 13.4, 13.6, 13.8] (matches (6,5) front edge!)
  // - Right edge c=3 is [13.8, 12.4, 11.2, 10.2] (matches (7,6) left edge!)
  setBlock(6, 6, {
    ...makeVGrid([
      [13.0, 13.4, 13.6, 13.8],
      [12.4, 12.5, 12.6, 12.4],
      [11.8, 11.6, 11.5, 11.2],
      [11.2, 10.9, 10.6, 10.2]
    ]),
    diagSplit: 'anti',
    cliffShadow: [3.6, 2.8, 2.0, 1.2],
    subShades: [
      [D, [D, W], W],
      [D, W, W],
      [[D, W], W, W]
    ]
  });

  // (7,6): Leg 1 (Bright White Banked Ramp going Down-Right +X)
  // Left edge c=0 matches (6,6) right edge [13.8, 12.4, 11.2, 10.2]
  // Notice how r=0 (back-right wall) stays +2.2 units HIGHER than r=3 (front-left valley)!
  setBlock(7, 6, {
    ...makeVGrid([
      [13.8, 13.0, 12.3, 11.6],
      [12.4, 11.7, 11.0, 10.3],
      [11.2, 10.5, 9.8, 9.1],
      [10.2, 9.6, 9.0, 8.4]
    ]),
    diagSplit: 'anti',
    cliffShadow: [4.2, 3.0, 1.8, 0.9],
    subShades: [
      [W, W, W],
      [W, W, W],
      [W, W, W]
    ]
  });

  // (8,6): Right Spur 1 (First Right-Pointing Sharp Bend)
  // Left edge c=0 matches (7,6) right edge [11.6, 10.3, 9.1, 8.4].
  // Outer right tip (r=0, c=3) is BANKED HIGH at Y = 11.0 (+2.6 units higher than inner corner 8.4!),
  // so in isometric view the right spur sweeps SHARPLY UP-RIGHT like a raised wing tip!
  // Front edge r=3 is [8.4, 8.2, 8.0, 8.8] (V-channel with raised white lip at c=3)!
  setBlock(8, 6, {
    ...makeVGrid([
      [11.6, 11.4, 11.2, 11.0],
      [10.3, 10.2, 10.1, 10.0],
      [9.1, 9.1, 9.0, 9.3],
      [8.4, 8.2, 8.0, 8.8]
    ]),
    diagSplit: 'anti',
    subShades: [
      [W, W, [W, D]],
      [W, [W, D], D],
      [[W, D], D, W]
    ]
  });

  // (8,7): Leg 2 (Going Down-Left +Z with 2 medium-dark columns c=0,1 and 1 bright-white right lip c=2)
  // Back edge r=0 matches (8,6) front edge [8.4, 8.2, 8.0, 8.8].
  // As it approaches Turn 2 (r=3), the left side (c=0) banks UPWARD to 8.0 while valley c=2 drops to 6.4!
  setBlock(8, 7, {
    ...makeVGrid([
      [8.4, 8.2, 8.0, 8.8],
      [8.2, 7.7, 7.4, 8.1],
      [8.0, 7.3, 6.9, 7.5],
      [8.0, 7.1, 6.4, 7.0]
    ]),
    diagSplit: 'anti',
    subShades: [
      [D, M, W],
      [M, M, W],
      [M, M, W]
    ]
  });

  // (7,8): Left Spur 2 — Protruding 45° Dark-Charcoal Sharp Left Wing!
  // Right edge c=3 matches (8,8) left edge [8.0, 7.6, 7.1, 6.6].
  // Outer left tip (r=3, c=0) is BANKED HIGH at Y = 9.4 (+2.8 units higher than (r=3,c=3) = 6.6!),
  // so in isometric view the dark spur sweeps SHARPLY UP-LEFT and its front cliff edge dives steeply down-right!
  setBlock(7, 8, {
    ...makeVGrid([
      [9.6, 9.0, 8.5, 8.0],
      [9.5, 8.9, 8.2, 7.6],
      [9.4, 8.6, 7.8, 7.1],
      [9.4, 8.4, 7.5, 6.6]
    ]),
    cutout: 'wing_left',
    diagSplit: 'anti',
    shadePreset: 'wing_dark',
    cliffShadow: [0.9, 2.2, 3.6, 4.8]
  });

  // (8,8): Core Turn 2 Block (Joins (8,7) at r=0, (7,8) at c=0, and launches Bright White Leg 3 at c=3!)
  // Notice how along the diagonal crease (r + c = 3), heights drop into the valley and then bank
  // UPWARD toward r=0, c=3 (Y = 7.4) while r=3, c=3 is at Y = 5.2, so the crease line tilts UP-LEFT!
  setBlock(8, 8, {
    ...makeVGrid([
      [8.0, 7.1, 6.4, 7.0],
      [7.6, 6.7, 6.4, 6.6],
      [7.1, 6.3, 5.9, 5.9],
      [6.6, 6.0, 5.5, 5.2]
    ]),
    diagSplit: 'anti',
    cliffShadow: [4.8, 3.6, 2.2, 1.0],
    subShades: [
      [D, D, [D, W]],
      [D, [D, W], W],
      [[D, W], W, W]
    ]
  });

  // (9,8): Leg 3 (Bright White Banked Ramp going Down-Right +X)
  // Left edge c=0 matches (8,8) right edge [7.0, 6.6, 5.9, 5.2].
  // Back-right edge r=0 stays banked high [7.0, 6.6, 6.2, 5.8] while valley r=3 drops [5.2, 4.7, 4.2, 3.8]!
  setBlock(9, 8, {
    ...makeVGrid([
      [7.0, 6.6, 6.2, 5.8],
      [6.6, 6.1, 5.6, 5.1],
      [5.9, 5.4, 4.9, 4.4],
      [5.2, 4.7, 4.2, 3.8]
    ]),
    diagSplit: 'anti',
    cliffShadow: [4.0, 2.8, 1.6, 0.8],
    subShades: [
      [W, W, W],
      [W, W, W],
      [W, W, W]
    ]
  });

  // (10,8): Right Spur 3 (Second Right-Pointing Sharp Bend)
  // Left edge c=0 matches (9,8) right edge [5.8, 5.1, 4.4, 3.8].
  // Outer right tip (r=0, c=3) is BANKED HIGH at Y = 5.6 (+1.8 units above inner corner 3.8!),
  // so Right Spur 3 sweeps SHARPLY UP-RIGHT just like Right Spur 1!
  setBlock(10, 8, {
    ...makeVGrid([
      [5.8, 5.7, 5.6, 5.6],
      [5.1, 5.0, 4.9, 4.9],
      [4.4, 4.3, 4.2, 4.5],
      [3.8, 3.7, 3.6, 4.2]
    ]),
    diagSplit: 'anti',
    subShades: [
      [W, W, [W, D]],
      [W, [W, D], D],
      [[W, D], D, W]
    ]
  });

  // (10,9): Leg 4 Upper Final Ramp going Down-Left (+Z) toward Checkered Flags
  // Back edge r=0 matches (10,8) front edge [3.8, 3.7, 3.6, 4.2].
  setBlock(10, 9, {
    ...makeVGrid([
      [3.8, 3.7, 3.6, 4.2],
      [3.3, 3.2, 3.1, 3.6],
      [2.8, 2.7, 2.6, 3.1],
      [2.4, 2.3, 2.2, 2.6]
    ]),
    diagSplit: 'anti',
    subShades: [
      [D, M, W],
      [M, M, W],
      [M, M, W]
    ]
  });

  // (10,10): Checkered Goal Flags Block
  // Back edge r=0 matches (10,9) front edge [2.4, 2.3, 2.2, 2.6].
  setBlock(10, 10, {
    ...makeVGrid([
      [2.4, 2.3, 2.2, 2.6],
      [2.0, 1.9, 1.9, 2.2],
      [1.7, 1.6, 1.6, 1.8],
      [1.4, 1.4, 1.4, 1.5]
    ]),
    diagSplit: 'anti',
    element: 'goal_flags',
    elemRotation: 0,
    subShades: [
      [M, M, W],
      [M, M, W],
      [M, L, W]
    ]
  });

  // (10,11): "GOAL" Banner Block
  // Back edge r=0 matches (10,10) front edge [1.4, 1.4, 1.4, 1.5].
  setBlock(10, 11, {
    ...makeVGrid([
      [1.4, 1.4, 1.4, 1.5],
      [1.2, 1.2, 1.2, 1.25],
      [1.1, 1.1, 1.1, 1.1],
      [1.0, 1.0, 1.0, 1.0]
    ]),
    decal: 'goal_banner',
    decalRotation: 0,
    subShades: [
      [F, F, L],
      [F, F, F],
      [F, F, F]
    ]
  });

  // (10,12): Beveled Tip at the end of GOAL
  setBlock(10, 12, {
    elevation: 1.0,
    slope: 0,
    rotation: 0,
    shape: 'goal_bevel',
    cliffShadow: [0.8, 0.8, 0.8, 0.8],
    subShades: [
      [F, F, F],
      [F, F, F],
      [F, F, F]
    ]
  });

  // =========================================================================
  // 5. SIDE LEDGES & LOWER PLATFORMS (Small Cones, Shadows & Red 4-5-6 Pads)
  // =========================================================================
  setBlock(1, 7, { elevation: 10.0, element: 'cone_small' });
  setBlock(0, 7, { elevation: 10.0 });
  setBlock(0, 8, { elevation: 8.5 });

  setBlock(7, 1, { elevation: 10.0, element: 'cone_small' });
  setBlock(7, 0, { elevation: 10.0 });
  setBlock(8, 1, { elevation: 8.5 });
  setBlock(8, 2, { elevation: 8.5 });

  setBlock(3, 8, { elevation: 7.0 });
  setBlock(4, 8, { elevation: 7.0 });
  setBlock(5, 8, { elevation: 7.0, cliffShadow: [0.8, 1.8, 3.0, 4.2] });
  setBlock(3, 9, { elevation: 7.0 });
  setBlock(4, 9, { elevation: 7.0 });
  setBlock(5, 9, { elevation: 7.0, cliffShadow: [1.2, 2.4, 3.6, 4.8] });

  setBlock(5, 10, {
    elevation: 3.6,
    decal: 'pad_456',
    decalRotation: 0
  });
  setBlock(4, 10, { elevation: 3.6 });
  setBlock(4, 11, { elevation: 3.6 });

  setBlock(8, 4, { elevation: 7.0 });
  setBlock(9, 4, { elevation: 7.0 });
  setBlock(10, 5, {
    elevation: 5.2,
    decal: 'pad_456',
    decalRotation: 90
  });
  setBlock(11, 5, {
    elevation: 5.2,
    diagSplit: 'anti',
    subShades: [
      [D, [D, F], F],
      [[D, F], F, F],
      [F, F, F]
    ]
  });
  setBlock(12, 5, { elevation: 5.2 });
  setBlock(10, 6, { elevation: 5.2, cliffShadow: [0.8, 2.0, 3.4, 4.6] });
  setBlock(11, 6, {
    elevation: 5.2,
    cliffShadow: [2.2, 1.4, 0.8, 0.8],
    diagSplit: 'anti',
    subShades: [
      [F, F, F],
      [D, [D, F], F],
      [D, D, [D, F]]
    ]
  });
  setBlock(12, 6, { elevation: 5.2 });

  setBlock(12, 9, {
    elevation: 2.0,
    decal: 'pad_456',
    decalRotation: 90
  });
  setBlock(13, 9, { elevation: 2.0 });
  setBlock(12, 10, { elevation: 2.0 });
  setBlock(13, 10, { elevation: 2.0 });

  setBlock(11, 11, {
    elevation: 0.2,
    subShades: [
      [M, F, F],
      [M, F, F],
      [F, F, F]
    ]
  });

  return {
    cols,
    rows,
    blocks
  };
}

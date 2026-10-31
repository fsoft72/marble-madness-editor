/**
 * Complete 3x3 Block Map recreating the Marble Madness Level 1 (Practice Race)
 * from the reference image (level01.png), with 100% watertight vertex-matched seams
 * across the entire funnel and zig-zag chute.
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
  // Top-most 3 Isometric Peaks: Left Peak (0,2), Center Peak (1,1) with Red Marble, Right Peak (2,0)
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
  // Left path along bz = 5 (pointing Down-Right +X)
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
  setBlock(4, 5, { elevation: 14.0 });

  // Right path along bx = 5 (pointing Down-Left +Z)
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
  setBlock(5, 4, { elevation: 14.0 });

  // (4,4): Central block with the Big Wide Dashed Red Arrow pointing down to the chute!
  setBlock(4, 4, {
    elevation: 14.0,
    decal: 'arrow_wide_diag',
    decalRotation: 0
  });

  // Front cliff guard rails on the chute platform (bz = 6 on left, bx = 6 on right)
  setBlock(3, 6, {
    elevation: 14.0,
    element: 'tube_straight',
    elemRotation: 270
  });
  setBlock(4, 6, {
    elevation: 14.0,
    element: 'tube_straight',
    elemRotation: 270
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
  // 4. WATERTIGHT 4-BLOCK FUNNEL ((5,5), (5,6), (6,5), (6,6)) & ZIG-ZAG CHUTE
  // =========================================================================
  // Corner array format: [NW (u=0,v=0), NE (u=3,v=0), SW (u=0,v=3), SE (u=3,v=3)] relative to elevation.

  // (5,5): Upper Funnel Center — [14.0, 14.0, 14.0, 12.8]
  // Joins (4,4), (5,4), (4,5) at 14.0, and slopes smoothly down to 12.8 at SE (3,3)!
  setBlock(5, 5, {
    elevation: 14.0,
    corners: [0.0, 0.0, 0.0, -1.2],
    diagSplit: 'anti'
  });

  // (5,6): Left Funnel Wing with Red Guard Tube — [14.0, 12.8, 14.0, 12.0]
  // - Edge v=0 (NW->NE) is [14.0, 12.8] -> matches (5,5) front edge!
  // - Edge u=0 (NW->SW) is [14.0, 14.0] -> matches (4,6) right edge!
  // - Edge u=3 (NE->SE) is [12.8, 12.0] -> matches (6,6) left edge!
  setBlock(5, 6, {
    elevation: 14.0,
    corners: [0.0, -1.2, 0.0, -2.0],
    diagSplit: 'main',
    element: 'tube_straight',
    elemRotation: 270
  });

  // (6,5): Right Funnel Wing with Red Guard Tube — [14.0, 14.0, 12.8, 12.0]
  // - Edge u=0 (NW->SW) is [14.0, 12.8] -> matches (5,5) right edge!
  // - Edge v=0 (NW->NE) is [14.0, 14.0] -> matches (6,4) front edge!
  // - Edge v=3 (SW->SE) is [12.8, 12.0] -> matches (6,6) back edge!
  setBlock(6, 5, {
    elevation: 14.0,
    corners: [0.0, 0.0, -1.2, -2.0],
    diagSplit: 'main',
    element: 'tube_straight',
    elemRotation: 180
  });

  // (6,6): Lower Funnel Throat — [12.8, 12.0, 12.0, 11.2]
  // - Edge u=0 (NW->SW) is [12.8, 12.0] -> matches (5,6) right edge!
  // - Edge v=0 (NW->NE) is [12.8, 12.0] -> matches (6,5) front edge!
  // - Edge u=3 (NE->SE) is [12.0, 11.2] -> matches (7,6) left edge!
  setBlock(6, 6, {
    elevation: 12.0,
    corners: [0.8, 0.0, 0.0, -0.8],
    diagSplit: 'anti'
  });

  // Leg 1 (Going Down-Right +X): (7,6) -> Turn 1 at (8,6)
  // Left edge u=0 matches (6,6) right edge [12.0, 11.2]; Right edge u=3 is [10.4, 9.6]
  setBlock(7, 6, {
    elevation: 10.8,
    corners: [1.2, -0.4, 0.4, -1.2]
  });

  // Turn 1 at (8,6): Left edge u=0 is [10.4, 9.6]; Front edge v=3 is [9.6, 8.8]
  setBlock(8, 6, {
    elevation: 9.6,
    corners: [0.8, 0.4, 0.0, -0.8],
    diagSplit: 'anti',
    shape: 'fold_right'
  });

  // Leg 2 (Going Down-Left +Z): (8,7) -> Turn 2 at (8,8)
  // Back edge v=0 matches (8,6) front edge [9.6, 8.8]; Front edge v=3 is [8.0, 7.2]
  setBlock(8, 7, {
    elevation: 8.4,
    corners: [1.2, 0.4, -0.4, -1.2]
  });

  // Turn 2 at (8,8): Back edge v=0 is [8.0, 7.2]; Right edge u=3 is [7.2, 6.4]
  setBlock(8, 8, {
    elevation: 7.2,
    corners: [0.8, 0.0, 0.4, -1.0],
    diagSplit: 'anti',
    shape: 'fold_left'
  });

  // Leg 3 (Going Down-Right +X): (9,8) -> Turn 3 at (10,8)
  // Left edge u=0 matches (8,8) right edge [7.2, 6.2]; Right edge u=3 is [5.6, 4.6]
  setBlock(9, 8, {
    elevation: 6.0,
    corners: [1.2, -0.4, 0.2, -1.4]
  });

  // Turn 3 at (10,8): Left edge u=0 is [5.6, 4.6]; Front edge v=3 is [4.4, 4.4]
  setBlock(10, 8, {
    elevation: 4.8,
    corners: [0.8, 0.4, -0.2, -0.2],
    diagSplit: 'anti',
    shape: 'fold_right'
  });

  // Leg 4 (Final Straight Ramp going Down-Left +Z to GOAL): (10,9) -> (10,10) -> (10,11) -> (10,12)
  // (10,9): Back edge v=0 is [4.6, 4.6], Front edge v=3 is [3.0, 3.0]
  setBlock(10, 9, {
    elevation: 3.8,
    slope: -1.6,
    rotation: 0,
    shape: 'flat'
  });

  // (10,10): Back edge v=0 is [3.0, 3.0], Front edge v=3 is [1.8, 1.8] + Checkered Goal Flags!
  setBlock(10, 10, {
    elevation: 2.4,
    slope: -1.2,
    rotation: 0,
    shape: 'flat',
    element: 'goal_flags',
    elemRotation: 0
  });

  // (10,11): Back edge v=0 is [1.8, 1.8], Front edge v=3 is [1.2, 1.2] + "GOAL" Banner Decal!
  setBlock(10, 11, {
    elevation: 1.5,
    slope: -0.6,
    rotation: 0,
    shape: 'flat',
    decal: 'goal_banner',
    decalRotation: 0
  });

  // (10,12): Beveled Tip at the end of GOAL!
  setBlock(10, 12, {
    elevation: 1.2,
    slope: 0,
    rotation: 0,
    shape: 'goal_bevel'
  });

  // =========================================================================
  // 5. SIDE LEDGES & LOWER PLATFORMS (Small Cones & Red 4-5-6 Numbered Pads)
  // =========================================================================
  // Mid-Left Ledge with Small Metallic Cone
  setBlock(1, 7, { elevation: 10.0, element: 'cone_small' });
  setBlock(0, 7, { elevation: 10.0 });
  setBlock(0, 8, { elevation: 8.5 });

  // Mid-Right Ledge with Small Metallic Cone
  setBlock(7, 1, { elevation: 10.0, element: 'cone_small' });
  setBlock(7, 0, { elevation: 10.0 });
  setBlock(8, 1, { elevation: 8.5 });
  setBlock(8, 2, { elevation: 8.5 });

  // Lower-Left Platform & Red 4-5-6 Numbered Pad
  setBlock(3, 8, { elevation: 7.0 });
  setBlock(4, 8, { elevation: 7.0 });
  setBlock(5, 8, { elevation: 7.0 });
  setBlock(3, 9, { elevation: 7.0 });
  setBlock(4, 9, { elevation: 7.0 });
  setBlock(5, 9, { elevation: 7.0 });

  setBlock(5, 10, {
    elevation: 3.6,
    decal: 'pad_456',
    decalRotation: 0
  });
  setBlock(4, 10, { elevation: 3.6 });
  setBlock(4, 11, { elevation: 3.6 });

  // Lower-Right Platform Upper Tier (with first right-side 4-5-6 Pad)
  setBlock(8, 4, { elevation: 7.0 });
  setBlock(9, 4, { elevation: 7.0 });
  setBlock(10, 5, {
    elevation: 5.2,
    decal: 'pad_456',
    decalRotation: 90
  });
  setBlock(11, 5, { elevation: 5.2 });
  setBlock(12, 5, { elevation: 5.2 });
  setBlock(10, 6, { elevation: 5.2 });
  setBlock(11, 6, { elevation: 5.2 });
  setBlock(12, 6, { elevation: 5.2 });

  // Lower-Right Platform Bottom Tier (with second right-side 4-5-6 Pad)
  setBlock(12, 9, {
    elevation: 2.0,
    decal: 'pad_456',
    decalRotation: 90
  });
  setBlock(13, 9, { elevation: 2.0 });
  setBlock(12, 10, { elevation: 2.0 });
  setBlock(13, 10, { elevation: 2.0 });

  return {
    cols,
    rows,
    blocks
  };
}

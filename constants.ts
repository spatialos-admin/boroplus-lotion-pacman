import { TileType } from './types';

/**
 * OBSTACLE POSITIONS - Edit this array to change obstacle placement!
 * 
 * Each obstacle is a 2x2 wall block positioned using percentage-based coordinates:
 * - x: horizontal position (0 = left edge, 0.5 = center, 1 = right edge)
 * - y: vertical position (0 = top edge, 0.5 = center, 1 = bottom edge)
 * 
 * The actual pixel position is calculated as: x * cols, y * rows
 * Obstacles are automatically skipped if they overlap with:
 * - Map borders
 * - Text display area
 * - Ghost spawn points
 */
export const OBSTACLE_POSITIONS: { x: number; y: number; type: 'horizontal' | 'vertical' | 'u-shape' }[] = [
  { x: 0.0, y: 0.42, type: 'horizontal' },  // Touches Left Edge
  { x: 1.0, y: 0.80, type: 'horizontal' },  // Touches Right Edge
  { x: 0.82, y: 0.0, type: 'vertical' },    // Touches Top Edge
  { x: 0.5, y: 0.5, type: 'u-shape' },      // Center
];

export const ENTITY_SIZE = 5; // Base player size in blocks
export const GHOST_SIZE = 1.5; // Ghosts are 2x2 blocks (2x bigger)

// Player dimensions based on image aspect ratio (bottle is typically taller than wide)
// Default aspect ratio for a bottle: ~0.6 (width/height) - bottle is taller
// This means if height = ENTITY_SIZE, width = ENTITY_SIZE * aspectRatio
export const BOTTLE_ASPECT_RATIO = 0.6; // Width/Height ratio (bottle is taller)
export const PLAYER_WIDTH = Math.max(1, Math.floor(ENTITY_SIZE * BOTTLE_ASPECT_RATIO)); // Width in blocks
export const PLAYER_HEIGHT = ENTITY_SIZE; // Height in blocks

// Map: 1=Wall, 0=Empty, 2=Pellet, 9=GhostSpawn
// Layout designed for 2x2 characters (Wider paths)
// 13 columns, 18 rows

// Generate responsive map layout based on screen size
// This function will be called with actual container dimensions for optimal space usage
export const generateResponsiveMapLayout = (availableWidth?: number, availableHeight?: number): number[][] => {
  // If dimensions not provided, estimate from viewport
  if (availableWidth === undefined || availableHeight === undefined) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Account for header, controls, and padding
    // We assume LARGER height occupants to maintain a "safe" height for calculation.
    // Underestimating available height causes the calculated Aspect Ratio (Width/Height) to be LARGER.
    // This forces the generator to prefer WIDER maps (more cols, fewer rows), which helps fill the width 
    // and solves the "side gaps" issue when the map is otherwise height-bound.
    const headerHeight = 85; // Increased from 64
    const controlsHeight = 140; // Reduced from 180 - D-pad is now 20% smaller
    const padding = 8; // Tighter padding assumption

    // Max width clamp
    const maxGameWidth = 800; // Increased to be safe

    availableWidth = Math.min(viewportWidth, maxGameWidth) - padding;
    availableHeight = viewportHeight - headerHeight - controlsHeight - padding;
  }

  // Optimal block size range for good visibility and gameplay
  const minBlockSize = 14;
  const maxBlockSize = 50;
  const idealBlockSize = 22; // Reduced from 24 to help standard phones

  // Calculate aspect ratio to maintain good proportions
  const aspectRatio = availableWidth / availableHeight;

  // Calculate dimensions that maximize space usage
  // Try to find the best balance between width and height utilization
  let bestCols = 0;
  let bestRows = 0;
  let bestBlockSize = 0;
  let bestUtilization = 0;

  // Try different block sizes to find the one that uses the most space
  for (let blockSize = minBlockSize; blockSize <= maxBlockSize; blockSize += 0.5) {
    // Calculate maximum columns and rows that fit
    let cols = Math.floor(availableWidth / blockSize);
    let rows = Math.floor(availableHeight / blockSize);

    // Ensure reasonable dimensions
    if (cols < 12 || rows < 15) continue;
    if (cols > 45 || rows > 55) continue; // Increased limits

    // Calculate actual used space with optimized columns
    const usedWidth = cols * blockSize;
    const usedHeight = rows * blockSize;
    const widthUtilization = usedWidth / availableWidth;
    const heightUtilization = usedHeight / availableHeight;

    // Combined utilization score (prefer solutions that use both dimensions well)
    const utilization = (widthUtilization + heightUtilization) / 2;

    // Bonus for solutions that use more than 95% of width and 90% of height
    const bonus = (widthUtilization > 0.95 && heightUtilization > 0.9) ? 0.2 :
      (widthUtilization > 0.9 && heightUtilization > 0.9) ? 0.1 : 0;

    // Add bias for larger blocks to prevent tiny UI on high-res screens
    // Reduced bias to avoid overly large blocks on mid-size screens
    const sizeBias = (blockSize / maxBlockSize) * 0.08;

    // Add heavy bias for aspect ratio match (filling width)
    const arDiff = Math.abs((cols / rows) - aspectRatio);
    const arScore = Math.max(0, 0.2 - arDiff);

    const totalScore = utilization + bonus + sizeBias + arScore;

    // Prefer solutions that use more space
    if (totalScore > bestUtilization) {
      bestUtilization = totalScore;
      bestCols = cols;
      bestRows = rows;
      bestBlockSize = blockSize;
    }
  }

  // If no good solution found, use fallback calculation
  if (bestCols === 0 || bestRows === 0) {
    const blockSize = idealBlockSize;
    bestCols = Math.floor(availableWidth / blockSize);
    bestRows = Math.floor(availableHeight / blockSize);

    // Ensure minimum dimensions
    bestCols = Math.max(15, Math.min(35, bestCols));
    bestRows = Math.max(20, Math.min(45, bestRows));
  }

  // Post-correction: If the generated map is significantly narrower (aspect ratio wise)
  // than the screen, it renders being height-bound and leaves side gaps.
  // We can force it to be wider by adding columns.
  const screenAR = availableWidth / availableHeight;
  const mapAR = bestCols / bestRows;

  // If map is taller/narrower than screen AR (by even > 1%), force widen
  if (mapAR < screenAR * 0.99) {
    // Calculate how many cols to add to match AR better
    const targetCols = Math.ceil(bestRows * screenAR);
    // Aggressively add columns to ensure we are width-bound, not height-bound
    // Being width-bound is safer because we can center vertically easily, 
    // whereas being height-bound forces side gaps.
    // We add +2 extra columns to be sure.
    bestCols = Math.max(targetCols, bestCols + 2);
  }

  // Relaxed even/odd requirement to maximize screen usage
  // Only adjust rows to be odd if needed for vertical symmetry, but allow even
  // Keeping cols even/odd flexible allows for better fit
  // if (bestCols % 2 === 0) bestCols--; // Removed to allow full width usage
  if (bestRows % 2 === 0) bestRows--; // Keep rows odd for symmetry if desired, or remove too

  return generateMapLayout(bestCols, bestRows);
};

// Check if the map is fully connected (no isolated areas) using flood fill
const isMapConnected = (grid: number[][], playerWidth: number, playerHeight: number): boolean => {
  const rows = grid.length;
  const cols = grid[0].length;

  // Find first walkable cell
  let startX = -1, startY = -1;
  outer: for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (grid[y][x] !== TileType.WALL) {
        startX = x;
        startY = y;
        break outer;
      }
    }
  }

  if (startX === -1) return false;

  // Flood fill from start position
  const visited = new Set<string>();
  const queue: [number, number][] = [[startX, startY]];
  visited.add(`${startX},${startY}`);

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;

    // Check all 4 directions
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;

      if (nx >= 1 && nx < cols - 1 && ny >= 1 && ny < rows - 1 &&
        !visited.has(key) && grid[ny][nx] !== TileType.WALL) {
        visited.add(key);
        queue.push([nx, ny]);
      }
    }
  }

  // Count all walkable cells
  let walkableCount = 0;
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (grid[y][x] !== TileType.WALL) {
        walkableCount++;
      }
    }
  }

  return visited.size === walkableCount;
};

// Check if placing a wall at (x, y) would create a dead end
const wouldCreateDeadEnd = (grid: number[][], x: number, y: number): boolean => {
  const rows = grid.length;
  const cols = grid[0].length;

  // Check adjacent cells for potential dead ends
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;

    if (nx < 1 || nx >= cols - 1 || ny < 1 || ny >= rows - 1) continue;
    if (grid[ny][nx] === TileType.WALL) continue;

    // Count open neighbors of this adjacent cell (excluding the current position)
    let openNeighbors = 0;
    for (const [ddx, ddy] of dirs) {
      const nnx = nx + ddx;
      const nny = ny + ddy;

      // Skip the cell we're considering placing a wall at
      if (nnx === x && nny === y) continue;

      if (nnx >= 0 && nnx < cols && nny >= 0 && nny < rows &&
        grid[nny][nnx] !== TileType.WALL) {
        openNeighbors++;
      }
    }

    // If placing a wall here would leave this neighbor with only 1 exit, it's a dead end
    if (openNeighbors < 2) {
      return true;
    }
  }

  return false;
};

// Check if position has enough clearance for the player
const hasPlayerClearance = (grid: number[][], x: number, y: number, playerWidth: number, playerHeight: number): boolean => {
  const rows = grid.length;
  const cols = grid[0].length;

  // Check if there's a clear path around this position for the player size
  // We need to ensure corridors are wide enough
  const minClearance = Math.max(playerWidth, playerHeight) + 1;

  let horizontalClear = 0;
  let verticalClear = 0;

  // Check horizontal clearance
  for (let dx = -minClearance; dx <= minClearance; dx++) {
    const nx = x + dx;
    if (nx >= 0 && nx < cols && grid[y]?.[nx] !== TileType.WALL) {
      horizontalClear++;
    }
  }

  // Check vertical clearance
  for (let dy = -minClearance; dy <= minClearance; dy++) {
    const ny = y + dy;
    if (ny >= 0 && ny < rows && grid[ny]?.[x] !== TileType.WALL) {
      verticalClear++;
    }
  }

  return horizontalClear >= playerWidth || verticalClear >= playerHeight;
};

// Generate map layout with specified dimensions - FIXED LEVEL DESIGN
// Designed with wide corridors (8+ tiles) for the bottle player (4x6 tiles)
const generateMapLayout = (cols: number, rows: number): number[][] => {
  const grid: number[][] = [];

  // Calculate positions for key features (as percentages, then scaled)
  const textAreaStartRow = Math.max(2, Math.floor(rows * 0.12));
  const textAreaEndRow = Math.max(4, Math.floor(rows * 0.22));
  const textAreaStartCol = Math.max(2, Math.floor(cols * 0.2));
  const textAreaEndCol = Math.min(cols - 2, Math.floor(cols * 0.8));

  // Ghost spawn positions - distributed around the map
  const ghostSpawns = [
    { y: 2, x: 2 },                              // Top-Left
    { y: 2, x: cols - 3 },                       // Top-Right
    { y: rows - 3, x: 2 },                       // Bottom-Left
    { y: rows - 3, x: cols - 3 },                // Bottom-Right
    { y: Math.floor(rows / 2), x: 2 },           // Mid-Left
    { y: Math.floor(rows / 2), x: cols - 3 },    // Mid-Right
    { y: 5, x: Math.floor(cols / 2) },           // Top-Center
    { y: rows - 6, x: Math.floor(cols / 2) }     // Bottom-Center
  ];

  // Generate base grid - all pellets inside, walls on border
  for (let y = 0; y < rows; y++) {
    const row: number[] = [];

    for (let x = 0; x < cols; x++) {
      // Outer walls only
      if (y === 0 || y === rows - 1 || x === 0 || x === cols - 1) {
        row.push(TileType.WALL);
      }
      // Text area (empty space for text overlay)
      else if (y >= textAreaStartRow && y < textAreaEndRow &&
        x >= textAreaStartCol && x < textAreaEndCol) {
        row.push(TileType.EMPTY);
      }
      // Ghost Spawn Points
      else if (ghostSpawns.some(s => s.x === x && s.y === y)) {
        row.push(TileType.GHOST_SPAWN);
      }
      // Everything else is pellets - wide open for bottle movement
      else {
        row.push(TileType.PELLET);
      }
    }

    grid.push(row);
  }
  // Helper function to check if a wall can be placed
  const canPlaceWall = (x: number, y: number): boolean => {
    // Check bounds (must be within playable area, inside the outer border walls)
    // Outer walls are at 0 and cols-1. So valid placement is 1 to cols-2.
    if (x < 1 || x > cols - 2 || y < 1 || y > rows - 2) return false;

    // Check for Text Area collision
    if (y >= textAreaStartRow && y < textAreaEndRow &&
      x >= textAreaStartCol && x < textAreaEndCol) return false;

    // Check for Ghost Spawn collision
    if (grid[y][x] === TileType.GHOST_SPAWN) return false;

    return true;
  };

  const placeWall = (x: number, y: number) => {
    if (canPlaceWall(x, y)) {
      grid[y][x] = TileType.WALL;
    }
  };

  // Place special shape obstacles with smart bounds checking and conflict avoidance
  for (const obstacle of OBSTACLE_POSITIONS) {
    let centerX = Math.floor(cols * obstacle.x);
    let centerY = Math.floor(rows * obstacle.y);

    // Smart adjustment: Allow touching the walls (indices 1 and cols-2)
    const minX = 1;
    const maxX = cols - 2;
    const minY = 1;
    const maxY = rows - 2;

    // Helper to find a safe Y-offset if the preferred position hits a ghost
    const findSafeY = (xArr: number[], yBase: number, height: number): number => {
      const offsets = [0, -1, 1, -2, 2];
      for (const off of offsets) {
        let allClear = true;
        for (const tx of xArr) {
          for (let i = 0; i < height; i++) {
            if (!canPlaceWall(tx, yBase + off + i)) allClear = false;
          }
        }
        if (allClear) return yBase + off;
      }
      return yBase;
    };

    if (obstacle.type === 'horizontal') {
      // 2x1 Horizontal: [X][X]
      // Ensure X fits
      if (centerX + 1 > maxX) centerX = maxX - 1;
      if (centerX < minX) centerX = minX;

      // Find safe Y
      centerY = findSafeY([centerX, centerX + 1], centerY, 1);

      placeWall(centerX, centerY);
      placeWall(centerX + 1, centerY);
    }
    else if (obstacle.type === 'vertical') {
      // 1x2 Vertical: [X]
      //               [X]
      // Ensure Y fits
      if (centerY + 1 > maxY) centerY = maxY - 1;
      if (centerY < minY) centerY = minY;

      // Ensure X fits
      if (centerX > maxX) centerX = maxX;
      if (centerX < minX) centerX = minX;

      // Check collision and shift if needed (simple shift logic)
      if (!canPlaceWall(centerX, centerY) || !canPlaceWall(centerX, centerY + 1)) {
        if (canPlaceWall(centerX, centerY - 1) && canPlaceWall(centerX, centerY)) {
          centerY--;
        } else if (canPlaceWall(centerX, centerY + 1) && canPlaceWall(centerX, centerY + 2)) {
          centerY++;
        }
      }

      placeWall(centerX, centerY);
      placeWall(centerX, centerY + 1);
    }
    else if (obstacle.type === 'u-shape') {
      // U-shape facing up
      if (centerX + 1 > maxX) centerX = maxX - 1;
      if (centerX - 1 < minX) centerX = minX + 1;

      if (centerY < minY + 1) centerY = minY + 1;
      if (centerY > maxY) centerY = maxY;

      centerY = findSafeY([centerX - 1, centerX, centerX + 1], centerY, 1);

      placeWall(centerX - 1, centerY - 1); // Top left tip
      placeWall(centerX + 1, centerY - 1); // Top right tip
      placeWall(centerX - 1, centerY);     // Bottom left
      placeWall(centerX, centerY);         // Bottom middle
      placeWall(centerX + 1, centerY);     // Bottom right
    }
  }

  return grid;
};

// Default/fallback map layout (20 cols, 36 rows)
export const INITIAL_MAP_LAYOUT = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 1], // Open area for Text (size 12)
  [1, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 1],
  [1, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 1, 1, 1, 2, 2, 1, 1, 1, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 1, 9, 9, 9, 9, 9, 9, 1, 2, 2, 2, 2, 2, 1], // Ghost House
  [1, 2, 2, 2, 2, 2, 1, 9, 9, 9, 9, 9, 9, 1, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 1, 1, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export const GAME_SPEED_MS = 180;

export const COLORS = {
  WALL: '#000000',      // Walls have black bg
  WALL_BORDER: '#A855F7', // Neon Purple Border
  BG: '#000000',        // Black background
  PLAYER: '#FFFF00',    // Yellow Pacman
  PELLET: '#FFFFFF',    // White dots
  GHOSTS: ['#FF0000', '#FFB8FF', '#A855F7', '#00FFFF'], // Red, Pink, Purple, Cyan
};

export const MOVEMENT_VECTORS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export const BLOCK_SIZE = 20; // Pixels per grid block
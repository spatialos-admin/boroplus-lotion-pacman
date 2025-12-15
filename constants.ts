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
export const OBSTACLE_POSITIONS: { x: number; y: number }[] = [
  { x: 0.45, y: 0.40 },  // TOP-LEFT block
  { x: 0.90, y: 0.30 },  // TOP-RIGHT block
  { x: 0.45, y: 0.65 },  // BOTTOM-LEFT block
  { x: 0.90, y: 0.65 },  // BOTTOM-RIGHT block
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
  const idealBlockSize = 24;

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
    const sizeBias = (blockSize / maxBlockSize) * 0.15;

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

  // Add 4 simple obstacle blocks - one on each side of the map
  // Each block is 2x2 (4 tiles total), positioned with enough clearance for bottle (4x6)

  // Helper function to place a single wall block (1 tile only)
  const placeBlock = (x: number, y: number): void => {
    // Skip if out of bounds (must be at least 2 tiles from border for clearance)
    if (x <= 1 || x >= cols - 2 || y <= 1 || y >= rows - 2) return;

    // Skip if in text area
    if (y >= textAreaStartRow && y < textAreaEndRow &&
      x >= textAreaStartCol && x < textAreaEndCol) return;

    // Skip if already a special tile
    if (grid[y][x] === TileType.WALL || grid[y][x] === TileType.GHOST_SPAWN) return;

    grid[y][x] = TileType.WALL;
  };

  // Place obstacle blocks from OBSTACLE_POSITIONS array
  // Edit OBSTACLE_POSITIONS at the top of this file to change obstacle placement!
  for (const obstaclePos of OBSTACLE_POSITIONS) {
    const blockX = Math.floor(cols * obstaclePos.x) - 1; // Center the 2x2 block
    const blockY = Math.floor(rows * obstaclePos.y) - 1;
    placeBlock(blockX, blockY);
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
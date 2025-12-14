import { TileType } from './types';

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
    
    // Account for header, controls, and padding (conservative estimates)
    const headerHeight = 64;
    const controlsHeight = 120;
    const padding = 32;
    
    availableWidth = viewportWidth - padding;
    availableHeight = viewportHeight - headerHeight - controlsHeight - padding;
  }
  
  // Optimal block size range for good visibility and gameplay
  const minBlockSize = 10;
  const maxBlockSize = 35; // Increased for better space usage
  const idealBlockSize = 18;
  
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
    if (cols > 40 || rows > 50) continue;
    
    // Try to maximize columns - add more if there's remaining space
    // This ensures we use the full width (including 2 blocks on each side if possible)
    const remainingWidth = availableWidth - (cols * blockSize);
    const additionalColsPossible = Math.floor(remainingWidth / blockSize);
    if (additionalColsPossible > 0 && cols + additionalColsPossible <= 40) {
      // Add columns to use more width (prefer adding up to 4 columns = 2 on each side)
      const colsToAdd = Math.min(additionalColsPossible, 4);
      cols += colsToAdd;
    }
    
    // Calculate actual used space with optimized columns
    const usedWidth = cols * blockSize;
    const usedHeight = rows * blockSize;
    const widthUtilization = usedWidth / availableWidth;
    const heightUtilization = usedHeight / availableHeight;
    
    // Combined utilization score (prefer solutions that use both dimensions well)
    const utilization = (widthUtilization + heightUtilization) / 2;
    
    // Bonus for solutions that use more than 95% of width and 90% of height
    const bonus = (widthUtilization > 0.95 && heightUtilization > 0.9) ? 0.15 : 
                  (widthUtilization > 0.9 && heightUtilization > 0.9) ? 0.1 : 0;
    const totalScore = utilization + bonus;
    
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
  
  // Make dimensions odd for better centering (optional, but can help with symmetry)
  if (bestCols % 2 === 0) bestCols--;
  if (bestRows % 2 === 0) bestRows--;
  
  return generateMapLayout(bestCols, bestRows);
};

// Generate map layout with specified dimensions
const generateMapLayout = (cols: number, rows: number): number[][] => {
  const grid: number[][] = [];
  
  // Calculate positions for key features (as percentages, then scaled)
  const textAreaStartRow = Math.max(2, Math.floor(rows * 0.12));
  const textAreaEndRow = Math.max(4, Math.floor(rows * 0.22));
  const textAreaStartCol = Math.max(2, Math.floor(cols * 0.2));
  const textAreaEndCol = Math.min(cols - 2, Math.floor(cols * 0.8));
  
  const ghostHouseStartRow = Math.max(4, Math.floor(rows * 0.28));
  const ghostHouseEndRow = Math.max(7, Math.floor(rows * 0.38));
  const ghostHouseCenterCol = Math.floor(cols / 2);
  const ghostHouseWidth = Math.min(8, Math.floor(cols * 0.4));
  const ghostHouseStartCol = ghostHouseCenterCol - Math.floor(ghostHouseWidth / 2);
  const ghostHouseEndCol = ghostHouseStartCol + ghostHouseWidth;
  
  // Generate grid
  for (let y = 0; y < rows; y++) {
    const row: number[] = [];
    
    for (let x = 0; x < cols; x++) {
      // Outer walls
      if (y === 0 || y === rows - 1 || x === 0 || x === cols - 1) {
        row.push(TileType.WALL);
      }
      // Text area (empty space for text overlay)
      else if (y >= textAreaStartRow && y < textAreaEndRow && 
               x >= textAreaStartCol && x < textAreaEndCol) {
        row.push(TileType.EMPTY);
      }
      // Ghost house area
      else if (y >= ghostHouseStartRow && y < ghostHouseEndRow && 
               x >= ghostHouseStartCol && x < ghostHouseEndCol) {
        // Top wall of ghost house - create opening for ghosts to exit
        if (y === ghostHouseStartRow) {
          const centerX = Math.floor((ghostHouseStartCol + ghostHouseEndCol) / 2);
          const openingWidth = 2; // 2-block opening [2,2] = pellets
          const openingStartX = centerX - Math.floor(openingWidth / 2);
          const openingEndX = openingStartX + openingWidth;
          
          // Create opening in top wall (replace walls with pellets)
          if (x >= openingStartX && x < openingEndX) {
            row.push(TileType.PELLET);
          } else {
            row.push(TileType.WALL);
          }
        }
        // Bottom and side walls of ghost house
        else if (y === ghostHouseEndRow - 1 || 
                 x === ghostHouseStartCol || x === ghostHouseEndCol - 1) {
          row.push(TileType.WALL);
        }
        // Ghost spawn area (center of ghost house)
        else {
          const centerX = Math.floor((ghostHouseStartCol + ghostHouseEndCol) / 2);
          const centerY = Math.floor((ghostHouseStartRow + ghostHouseEndRow) / 2);
          const spawnWidth = 4;
          const spawnStartX = centerX - Math.floor(spawnWidth / 2);
          const spawnEndX = spawnStartX + spawnWidth;
          
          if (y >= ghostHouseStartRow + 1 && y < ghostHouseEndRow - 1 &&
              x >= spawnStartX && x < spawnEndX) {
            row.push(TileType.GHOST_SPAWN);
          } else {
            row.push(TileType.WALL);
          }
        }
      }
      // Regular paths with pellets
      else {
        row.push(TileType.PELLET);
      }
    }
    
    grid.push(row);
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
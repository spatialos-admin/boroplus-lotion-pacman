import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameStatus, Direction, Position, TileType, Entity, Ghost } from '../types';
import { INITIAL_MAP_LAYOUT, MOVEMENT_VECTORS, GAME_SPEED_MS, generateResponsiveMapLayout } from '../constants';
import { GHOST_TYPES } from '../ghostData';

export const ENTITY_SIZE = 6; // Base player size in blocks
export const GHOST_SIZE = 1; // Ghosts are 2x2 blocks (2x bigger)

// Player dimensions based on image aspect ratio (bottle is typically taller than wide)
// Default aspect ratio for a bottle: ~0.6 (width/height) - bottle is taller
// This means if height = ENTITY_SIZE, width = ENTITY_SIZE * aspectRatio
const BOTTLE_ASPECT_RATIO = 0.6; // Width/Height ratio (bottle is taller)
export const PLAYER_WIDTH = Math.max(1, Math.floor(ENTITY_SIZE * BOTTLE_ASPECT_RATIO)); // Width in blocks
export const PLAYER_HEIGHT = ENTITY_SIZE; // Height in blocks

const getInitialGameState = (): GameState => {
  // Use responsive map layout based on screen size
  const grid = generateResponsiveMapLayout();
  const cols = grid[0].length;
  const rows = grid.length;
  
  // Find valid positions for player and ghosts
  const findValidPosition = (startX: number, startY: number, width: number, height: number): Position => {
    // Helper to check if position is valid for entity dimensions
    const isValid = (x: number, y: number, w: number, h: number): boolean => {
      if (x < 0 || y < 0 || x + w > cols || y + h > rows) {
        return false;
      }
      // Check all cells in the entity's area
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          if (!grid[y + dy] || grid[y + dy][x + dx] === TileType.WALL) {
            return false;
          }
        }
      }
      return true;
    };
    
    // Try center positions first, then spiral outward
    for (let offset = 0; offset < Math.max(cols, rows); offset++) {
      const positions = [
        { x: startX, y: startY },
        { x: startX + offset, y: startY },
        { x: startX - offset, y: startY },
        { x: startX, y: startY + offset },
        { x: startX, y: startY - offset },
        { x: startX + offset, y: startY + offset },
        { x: startX - offset, y: startY - offset },
        { x: startX + offset, y: startY - offset },
        { x: startX - offset, y: startY + offset },
      ];
      
      for (const pos of positions) {
        if (isValid(pos.x, pos.y, width, height)) {
          return pos;
        }
      }
    }
    // Fallback to a safe position (try bottom center)
    for (let y = rows - 5; y >= rows - 10; y--) {
      for (let x = Math.floor(cols / 2) - 2; x <= Math.floor(cols / 2) + 2; x++) {
        if (isValid(x, y, width, height)) {
          return { x, y };
        }
      }
    }
    // Last resort fallback
    return { x: Math.max(1, Math.floor(cols / 2) - 2), y: Math.max(1, rows - 5) };
  };
  
  // Player position: center bottom
  const playerPos = findValidPosition(
    Math.floor(cols / 2), 
    Math.floor(rows * 0.85), 
    PLAYER_WIDTH, PLAYER_HEIGHT
  );
  
  const ghosts: Ghost[] = [];
  
  // Find ghost house area (look for GHOST_SPAWN tiles)
  const ghostSpawns: Position[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] === TileType.GHOST_SPAWN) {
        ghostSpawns.push({ x, y });
      }
    }
  }
  
  // Get spawn position (center of ghost house or fallback)
  const getSpawnPosition = (): Position => {
    if (ghostSpawns.length > 0) {
      // Use center of spawn area
      const centerIndex = Math.floor(ghostSpawns.length / 2);
      return ghostSpawns[centerIndex];
    } else {
      // Fallback: center top area
      return { x: Math.floor(cols / 2), y: Math.floor(rows * 0.3) };
    }
  };
  
  const spawnPos = getSpawnPosition();
  
  // Create 8 ghosts total, but only activate first 4
  for (let i = 0; i < 8; i++) {
    const isActive = i < 4; // First 4 are active
    const ghostType = GHOST_TYPES[i] || GHOST_TYPES[0]; // Fallback to first type if index out of bounds
    
    // For active ghosts, use spawn positions if available, otherwise use calculated position
    let ghostPos: Position;
    if (isActive && ghostSpawns.length > 0) {
      ghostPos = ghostSpawns[Math.min(i, ghostSpawns.length - 1)];
    } else {
      ghostPos = spawnPos; // Inactive ghosts will spawn here when activated
    }
    
    ghosts.push({
      id: ghostType.id,
      pos: ghostPos,
      dir: Direction.UP,
      nextDir: null,
      color: ghostType.color,
      isActive: isActive,
    });
  }

  return {
    player: { id: 'p1', pos: playerPos, dir: null, nextDir: null, color: 'yellow' },
    ghosts,
    grid,
    score: 0,
    status: GameStatus.IDLE,
    lives: 3,
  };
};

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(getInitialGameState());
  const tickRef = useRef<number | null>(null);

  const setDirection = useCallback((dir: Direction) => {
    if (gameState.status !== GameStatus.PLAYING && gameState.status !== GameStatus.IDLE) return;
    
    if (gameState.status === GameStatus.IDLE) {
        setGameState(prev => ({ ...prev, status: GameStatus.PLAYING, player: { ...prev.player, nextDir: dir } }));
        return;
    }

    setGameState(prev => ({
      ...prev,
      player: { ...prev.player, nextDir: dir },
    }));
  }, [gameState.status]);

  const restartGame = useCallback(() => {
    setGameState(getInitialGameState());
  }, []);

  // Check if an entity can exist at 'pos' (supports rectangular entities for player)
  const isValidMove = (grid: number[][], pos: Position, width: number = ENTITY_SIZE, height: number = ENTITY_SIZE): boolean => {
    // Check boundaries
    if (pos.x < 0 || pos.y < 0) return false;
    if (pos.y + height > grid.length || pos.x + width > grid[0].length) return false;

    // Check all cells occupied by the entity
    for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
            const cell = grid[pos.y + dy]?.[pos.x + dx];
            if (cell === TileType.WALL) return false;
        }
    }
    return true;
  };

  const moveEntity = (entity: Entity, grid: number[][]): Entity => {
    let nextPos = { ...entity.pos };
    let currentDir = entity.dir;

    if (entity.nextDir) {
      const checkVec = MOVEMENT_VECTORS[entity.nextDir];
      const checkPos = { x: entity.pos.x + checkVec.x, y: entity.pos.y + checkVec.y };
      
      // Wrap around logic for turn check (using player dimensions)
      if (checkPos.x < 0) checkPos.x = grid[0].length - PLAYER_WIDTH;
      if (checkPos.x > grid[0].length - PLAYER_WIDTH) checkPos.x = 0;
      if (checkPos.y < 0) checkPos.y = grid.length - PLAYER_HEIGHT;
      if (checkPos.y > grid.length - PLAYER_HEIGHT) checkPos.y = 0;

      if (isValidMove(grid, checkPos, PLAYER_WIDTH, PLAYER_HEIGHT)) {
        currentDir = entity.nextDir;
      }
    }

    if (currentDir) {
      const vec = MOVEMENT_VECTORS[currentDir];
      const targetPos = { x: entity.pos.x + vec.x, y: entity.pos.y + vec.y };
      
      // Wrap around logic for both X and Y (using player dimensions)
      if (targetPos.x < -1) targetPos.x = grid[0].length - PLAYER_WIDTH;
      else if (targetPos.x > grid[0].length - PLAYER_WIDTH + 1) targetPos.x = 0;
      if (targetPos.y < -1) targetPos.y = grid.length - PLAYER_HEIGHT;
      else if (targetPos.y > grid.length - PLAYER_HEIGHT + 1) targetPos.y = 0;

      // Clamp for validation to avoid out of bounds on wrap edge cases during transition
      const validatePos = { 
          x: Math.max(0, Math.min(targetPos.x, grid[0].length - PLAYER_WIDTH)),
          y: Math.max(0, Math.min(targetPos.y, grid.length - PLAYER_HEIGHT))
      };

      if (isValidMove(grid, validatePos, PLAYER_WIDTH, PLAYER_HEIGHT)) {
        nextPos = targetPos;
        // Correct wrap coordinate snap for both axes
        if (targetPos.x < 0) nextPos.x = grid[0].length - PLAYER_WIDTH;
        if (targetPos.x > grid[0].length - PLAYER_WIDTH) nextPos.x = 0;
        if (targetPos.y < 0) nextPos.y = grid.length - PLAYER_HEIGHT;
        if (targetPos.y > grid.length - PLAYER_HEIGHT) nextPos.y = 0;
      }
    }

    return { ...entity, pos: nextPos, dir: currentDir };
  };

  const moveGhost = (ghost: Ghost, grid: number[][], playerPos: Position): Ghost => {
    const possibleDirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    const validMoves: Direction[] = [];

    possibleDirs.forEach(d => {
      const vec = MOVEMENT_VECTORS[d];
      const target = { x: ghost.pos.x + vec.x, y: ghost.pos.y + vec.y };
      if (isValidMove(grid, target, GHOST_SIZE)) {
        validMoves.push(d);
      }
    });

    if (validMoves.length === 0) return ghost;

    let chosenDir = ghost.dir;
    
    // Ghosts try to run away from player (reverse of chasing)
    if (Math.random() > 0.3) {
      let bestDir = validMoves[0];
      let maxDist = -1; // Changed from minDist to maxDist - ghosts want to maximize distance
      
      validMoves.forEach(d => {
         // Prevent immediate reverse
         if (ghost.dir === Direction.UP && d === Direction.DOWN) return;
         if (ghost.dir === Direction.DOWN && d === Direction.UP) return;
         if (ghost.dir === Direction.LEFT && d === Direction.RIGHT) return;
         if (ghost.dir === Direction.RIGHT && d === Direction.LEFT) return;

         const vec = MOVEMENT_VECTORS[d];
         const tx = ghost.pos.x + vec.x;
         const ty = ghost.pos.y + vec.y;
         const dist = Math.abs(tx - playerPos.x) + Math.abs(ty - playerPos.y);
         if (dist > maxDist) { // Changed from < to > - want maximum distance
           maxDist = dist;
           bestDir = d;
         }
      });
      chosenDir = bestDir;
    } else {
      chosenDir = validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    const vec = MOVEMENT_VECTORS[chosenDir as Direction] || {x:0, y:0};
    let nextPos = { x: ghost.pos.x + vec.x, y: ghost.pos.y + vec.y };
    
    // Wrap around logic for ghosts (1x1 entities)
    if (nextPos.x < -1) nextPos.x = grid[0].length - GHOST_SIZE;
    else if (nextPos.x > grid[0].length - GHOST_SIZE + 1) nextPos.x = 0;
    if (nextPos.y < -1) nextPos.y = grid.length - GHOST_SIZE;
    else if (nextPos.y > grid.length - GHOST_SIZE + 1) nextPos.y = 0;
    
    // Clamp for validation
    const validatePos = { 
        x: Math.max(0, Math.min(nextPos.x, grid[0].length - GHOST_SIZE)),
        y: Math.max(0, Math.min(nextPos.y, grid.length - GHOST_SIZE))
    };
    
    if (isValidMove(grid, validatePos, GHOST_SIZE)) {
        // Correct wrap coordinate snap
        if (nextPos.x < 0) nextPos.x = grid[0].length - GHOST_SIZE;
        if (nextPos.x > grid[0].length - GHOST_SIZE) nextPos.x = 0;
        if (nextPos.y < 0) nextPos.y = grid.length - GHOST_SIZE;
        if (nextPos.y > grid.length - GHOST_SIZE) nextPos.y = 0;
    } else {
        // If move is invalid, don't move
        nextPos = { ...ghost.pos };
    }

    return { ...ghost, pos: nextPos, dir: chosenDir };
  };

  useEffect(() => {
    if (gameState.status !== GameStatus.PLAYING) return;

    let lastTime = performance.now();
    let accumulatedTime = 0;

    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      accumulatedTime += deltaTime;

      // Only update game state at the specified interval
      if (accumulatedTime >= GAME_SPEED_MS) {
        accumulatedTime = 0;

        setGameState(prev => {
          if (prev.status !== GameStatus.PLAYING) return prev;

          const newPlayer = moveEntity(prev.player, prev.grid);
          
          let newGrid = prev.grid.map(row => [...row]);
          let newScore = prev.score;
          
          // Eat pellets in any of the cells occupied by player (using player dimensions)
          for(let dy=0; dy<PLAYER_HEIGHT; dy++) {
              for(let dx=0; dx<PLAYER_WIDTH; dx++) {
                  const py = newPlayer.pos.y + dy;
                  const px = newPlayer.pos.x + dx;
                  if(py < newGrid.length && px < newGrid[0].length) {
                      if (newGrid[py][px] === TileType.PELLET) {
                          newGrid[py][px] = TileType.EMPTY;
                          newScore += 10;
                      }
                  }
              }
          }

          // Only move active ghosts
          const newGhosts = prev.ghosts.map(g => {
            if (g.isActive) {
              return moveGhost(g, prev.grid, newPlayer.pos);
            }
            return g; // Keep inactive ghosts as-is
          });

          // Check Collision - Player eats ghosts
          let newStatus = prev.status;
          let updatedGhosts = [...newGhosts];
          let updatedScore = newScore;
          
          // Find spawn position for new ghosts
          const getSpawnPosition = (): Position => {
            for (let y = 0; y < prev.grid.length; y++) {
              for (let x = 0; x < prev.grid[0].length; x++) {
                if (prev.grid[y][x] === TileType.GHOST_SPAWN) {
                  return { x, y };
                }
              }
            }
            // Fallback
            return { x: Math.floor(prev.grid[0].length / 2), y: Math.floor(prev.grid.length * 0.3) };
          };
          
          const spawnPos = getSpawnPosition();
          
          // Check if player collides with any active ghost (player eats ghost)
          let ghostsToActivate: Ghost[] = [];
          
          updatedGhosts = updatedGhosts.map(g => {
            if (!g.isActive) return g; // Skip inactive ghosts
            
            // AABB collision check using player width and height
            const collision = 
                newPlayer.pos.x < g.pos.x + GHOST_SIZE &&
                newPlayer.pos.x + PLAYER_WIDTH > g.pos.x &&
                newPlayer.pos.y < g.pos.y + GHOST_SIZE &&
                newPlayer.pos.y + PLAYER_HEIGHT > g.pos.y;
                
            if (collision) {
              // Player eats the ghost - award points and deactivate
              updatedScore += 200;
              
              // Find next inactive ghost to activate
              const nextInactiveGhost = updatedGhosts.find(ghost => !ghost.isActive);
              if (nextInactiveGhost) {
                // Mark this ghost for activation
                ghostsToActivate.push({
                  ...nextInactiveGhost,
                  isActive: true,
                  pos: spawnPos,
                  dir: Direction.UP,
                  nextDir: null,
                });
              }
              
              // Return deactivated ghost
              return { ...g, isActive: false };
            }
            return g; // Keep ghost
          });
          
          // Activate the next ghost(s) from the queue
          if (ghostsToActivate.length > 0) {
            updatedGhosts = updatedGhosts.map(g => {
              const toActivate = ghostsToActivate.find(ta => ta.id === g.id);
              if (toActivate) {
                return toActivate;
              }
              return g;
            });
          }
          
          // Win condition: all 8 ghosts have been eaten (all are inactive)
          const activeGhosts = updatedGhosts.filter(g => g.isActive);
          if (activeGhosts.length === 0 && updatedGhosts.length === 8) {
              newStatus = GameStatus.WON;
          }

          let hasPellets = false;
          for (let y = 0; y < newGrid.length; y++) {
              for (let x = 0; x < newGrid[y].length; x++) {
                  if (newGrid[y][x] === TileType.PELLET) {
                      hasPellets = true;
                      break;
                  }
              }
          }
          if (!hasPellets) newStatus = GameStatus.WON;

          return {
            ...prev,
            player: newPlayer,
            ghosts: updatedGhosts,
            grid: newGrid,
            score: updatedScore,
            status: newStatus,
          };
        });
      }

      tickRef.current = requestAnimationFrame(gameLoop);
    };

    tickRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (tickRef.current) {
        cancelAnimationFrame(tickRef.current);
      }
    };
  }, [gameState.status]);

  return { gameState, setDirection, restartGame };
};
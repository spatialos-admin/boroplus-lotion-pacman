import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameStatus, Direction, Position, TileType, Entity, Ghost } from '../types';
import { INITIAL_MAP_LAYOUT, MOVEMENT_VECTORS, GAME_SPEED_MS } from '../constants';

const getInitialGameState = (): GameState => {
  // Deep copy map
  const grid = INITIAL_MAP_LAYOUT.map(row => [...row]);
  let playerPos: Position = { x: 1, y: 1 };
  const ghosts: Ghost[] = [];
  const ghostColors = ['red', 'pink', 'cyan', 'orange'];
  
  // Find spawns (simple scan, though we know map)
  // For this simplified version, hardcode spawn points based on the map layout index
  playerPos = { x: 7, y: 9 }; // Center-ish
  
  ghosts.push({ id: 'g1', pos: { x: 7, y: 6 }, dir: Direction.UP, nextDir: null, color: ghostColors[0] });
  ghosts.push({ id: 'g2', pos: { x: 6, y: 7 }, dir: Direction.DOWN, nextDir: null, color: ghostColors[1] });
  ghosts.push({ id: 'g3', pos: { x: 8, y: 7 }, dir: Direction.UP, nextDir: null, color: ghostColors[2] });

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
    
    // Start game on first input if idle
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

  const isValidMove = (grid: number[][], pos: Position): boolean => {
    if (pos.y < 0 || pos.y >= grid.length || pos.x < 0 || pos.x >= grid[0].length) return false;
    return grid[pos.y][pos.x] !== TileType.WALL;
  };

  const moveEntity = (entity: Entity, grid: number[][]): Entity => {
    let nextPos = { ...entity.pos };
    let currentDir = entity.dir;

    // Try to turn if nextDir is set and valid
    if (entity.nextDir) {
      const checkVec = MOVEMENT_VECTORS[entity.nextDir];
      const checkPos = { x: entity.pos.x + checkVec.x, y: entity.pos.y + checkVec.y };
      if (isValidMove(grid, checkPos)) {
        currentDir = entity.nextDir;
      }
    }

    if (currentDir) {
      const vec = MOVEMENT_VECTORS[currentDir];
      const targetPos = { x: entity.pos.x + vec.x, y: entity.pos.y + vec.y };
      
      // Wrap around logic (tunnel)
      if (targetPos.x < 0) targetPos.x = grid[0].length - 1;
      else if (targetPos.x >= grid[0].length) targetPos.x = 0;

      if (isValidMove(grid, targetPos)) {
        nextPos = targetPos;
      } else {
        // Hit wall, stop
        // currentDir = null; // Optional: stop or keep pressing against wall
      }
    }

    return { ...entity, pos: nextPos, dir: currentDir };
  };

  const moveGhost = (ghost: Ghost, grid: number[][], playerPos: Position): Ghost => {
    // Simple AI: 50% chance to track player, 50% random valid move
    // Ghosts prefer not to reverse direction immediately unless dead end
    
    const possibleDirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    const validMoves: Direction[] = [];

    possibleDirs.forEach(d => {
      const vec = MOVEMENT_VECTORS[d];
      const target = { x: ghost.pos.x + vec.x, y: ghost.pos.y + vec.y };
      // Prevent 180 reverse unless stuck? Simplified: just check valid
      if (isValidMove(grid, target)) {
        validMoves.push(d);
      }
    });

    if (validMoves.length === 0) return ghost;

    let chosenDir = ghost.dir;
    
    // Crude chasing logic
    if (Math.random() > 0.4) {
      // Try to minimize distance
      let bestDir = validMoves[0];
      let minDist = 9999;
      
      validMoves.forEach(d => {
         // Don't reverse immediately if possible
         if (ghost.dir === Direction.UP && d === Direction.DOWN) return;
         if (ghost.dir === Direction.DOWN && d === Direction.UP) return;
         if (ghost.dir === Direction.LEFT && d === Direction.RIGHT) return;
         if (ghost.dir === Direction.RIGHT && d === Direction.LEFT) return;

         const vec = MOVEMENT_VECTORS[d];
         const tx = ghost.pos.x + vec.x;
         const ty = ghost.pos.y + vec.y;
         const dist = Math.abs(tx - playerPos.x) + Math.abs(ty - playerPos.y);
         if (dist < minDist) {
           minDist = dist;
           bestDir = d;
         }
      });
      chosenDir = bestDir;
    } else {
      // Random
      chosenDir = validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    const vec = MOVEMENT_VECTORS[chosenDir as Direction] || {x:0, y:0};
    const nextPos = { x: ghost.pos.x + vec.x, y: ghost.pos.y + vec.y };

    return { ...ghost, pos: nextPos, dir: chosenDir };
  };

  useEffect(() => {
    if (gameState.status !== GameStatus.PLAYING) return;

    tickRef.current = window.setInterval(() => {
      setGameState(prev => {
        if (prev.status !== GameStatus.PLAYING) return prev;

        // 1. Move Player
        const newPlayer = moveEntity(prev.player, prev.grid);
        
        // 2. Check Map Collisions (Pellets)
        let newGrid = prev.grid;
        let newScore = prev.score;
        let pelletsLeft = 0;

        // Count pellets to check win condition
        // In a real app we'd cache this count, but for 15x15 it's cheap to scan or just track 'eaten'
        
        const cell = prev.grid[newPlayer.pos.y][newPlayer.pos.x];
        if (cell === TileType.PELLET) {
            newGrid = prev.grid.map(row => [...row]);
            newGrid[newPlayer.pos.y][newPlayer.pos.x] = TileType.EMPTY;
            newScore += 10;
        }

        // 3. Move Ghosts
        const newGhosts = prev.ghosts.map(g => moveGhost(g, prev.grid, newPlayer.pos));

        // 4. Check Entity Collisions (Player vs Ghost)
        let newStatus = prev.status;
        for (const g of newGhosts) {
          if (g.pos.x === newPlayer.pos.x && g.pos.y === newPlayer.pos.y) {
             newStatus = GameStatus.GAME_OVER;
          }
        }

        // Check Win
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
          ghosts: newGhosts,
          grid: newGrid,
          score: newScore,
          status: newStatus,
        };
      });
    }, GAME_SPEED_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [gameState.status]);

  return { gameState, setDirection, restartGame };
};
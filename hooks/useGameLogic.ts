import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameStatus, Direction, Position, TileType, Entity, Ghost } from '../types';
import { INITIAL_MAP_LAYOUT, MOVEMENT_VECTORS, GAME_SPEED_MS } from '../constants';

const ENTITY_SIZE = 2; // Entities are 2x2 blocks

const getInitialGameState = (): GameState => {
  const grid = INITIAL_MAP_LAYOUT.map(row => [...row]);
  let playerPos: Position = { x: 5, y: 15 }; // Adjusted for new map, ensuring 2x2 space is valid
  const ghosts: Ghost[] = [];
  const ghostColors = ['#FF0000', '#FFB8FF', '#A855F7', '#00FFFF'];
  
  // Ghost start in the center box (Row 9/10, Col 4-8)
  // Ensure spawns align with valid 2x2 spaces
  ghosts.push({ id: 'g1', pos: { x: 5, y: 9 }, dir: Direction.UP, nextDir: null, color: ghostColors[0] });   
  ghosts.push({ id: 'g2', pos: { x: 7, y: 9 }, dir: Direction.UP, nextDir: null, color: ghostColors[1] }); 
  ghosts.push({ id: 'g3', pos: { x: 5, y: 10 }, dir: Direction.DOWN, nextDir: null, color: ghostColors[2] });

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

  // Check if a 2x2 entity can exist at 'pos'
  const isValidMove = (grid: number[][], pos: Position): boolean => {
    // Check boundaries
    if (pos.x < 0 || pos.y < 0) return false;
    if (pos.y + ENTITY_SIZE > grid.length || pos.x + ENTITY_SIZE > grid[0].length) return false;

    // Check all cells occupied by the 2x2 entity
    for (let dy = 0; dy < ENTITY_SIZE; dy++) {
        for (let dx = 0; dx < ENTITY_SIZE; dx++) {
            const cell = grid[pos.y + dy][pos.x + dx];
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
      
      // Wrap around logic for turn check (simplified)
      if (checkPos.x < 0) checkPos.x = grid[0].length - ENTITY_SIZE;
      if (checkPos.x > grid[0].length - ENTITY_SIZE) checkPos.x = 0;

      if (isValidMove(grid, checkPos)) {
        currentDir = entity.nextDir;
      }
    }

    if (currentDir) {
      const vec = MOVEMENT_VECTORS[currentDir];
      const targetPos = { x: entity.pos.x + vec.x, y: entity.pos.y + vec.y };
      
      // Wrap around logic
      if (targetPos.x < -1) targetPos.x = grid[0].length - ENTITY_SIZE;
      else if (targetPos.x > grid[0].length - ENTITY_SIZE + 1) targetPos.x = 0;

      // Clamp for validation to avoid out of bounds on wrap edge cases during transition
      const validatePos = { 
          x: Math.max(0, Math.min(targetPos.x, grid[0].length - ENTITY_SIZE)),
          y: Math.max(0, Math.min(targetPos.y, grid.length - ENTITY_SIZE))
      };

      if (isValidMove(grid, validatePos)) {
        nextPos = targetPos;
        // Correct wrap coordinate snap
        if (targetPos.x < 0) nextPos.x = grid[0].length - ENTITY_SIZE;
        if (targetPos.x > grid[0].length - ENTITY_SIZE) nextPos.x = 0;
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
      if (isValidMove(grid, target)) {
        validMoves.push(d);
      }
    });

    if (validMoves.length === 0) return ghost;

    let chosenDir = ghost.dir;
    
    if (Math.random() > 0.4) {
      let bestDir = validMoves[0];
      let minDist = 9999;
      
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
         if (dist < minDist) {
           minDist = dist;
           bestDir = d;
         }
      });
      chosenDir = bestDir;
    } else {
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

        const newPlayer = moveEntity(prev.player, prev.grid);
        
        let newGrid = prev.grid.map(row => [...row]);
        let newScore = prev.score;
        
        // Eat pellets in any of the 4 cells occupied by player
        for(let dy=0; dy<ENTITY_SIZE; dy++) {
            for(let dx=0; dx<ENTITY_SIZE; dx++) {
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

        const newGhosts = prev.ghosts.map(g => moveGhost(g, prev.grid, newPlayer.pos));

        // Check Collision (AABB)
        let newStatus = prev.status;
        for (const g of newGhosts) {
            // Simple AABB collision for 2x2 entities
            // x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2
            const collision = 
                newPlayer.pos.x < g.pos.x + ENTITY_SIZE - 0.5 &&
                newPlayer.pos.x + ENTITY_SIZE - 0.5 > g.pos.x &&
                newPlayer.pos.y < g.pos.y + ENTITY_SIZE - 0.5 &&
                newPlayer.pos.y + ENTITY_SIZE - 0.5 > g.pos.y;
                
            if (collision) {
                newStatus = GameStatus.GAME_OVER;
            }
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
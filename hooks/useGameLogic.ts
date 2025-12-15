import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameStatus, Direction, Position, TileType, Entity, Ghost } from '../types';
import { INITIAL_MAP_LAYOUT, MOVEMENT_VECTORS, GAME_SPEED_MS, generateResponsiveMapLayout } from '../constants';
import { GHOST_TYPES } from '../ghostData';

import { ENTITY_SIZE, GHOST_SIZE, PLAYER_WIDTH, PLAYER_HEIGHT } from '../constants';
import victorySound from '../assets/sounds/Positive-Game-Victory.wav';

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

  // Create 8 ghosts total, but only activate first 2
  for (let i = 0; i < 8; i++) {
    const isActive = i < 2; // First 2 are active
    const ghostType = GHOST_TYPES[i] || GHOST_TYPES[0]; // Fallback to first type if index out of bounds

    // For active ghosts, assign to distributed spawn points
    // We cycle through available spawn points
    let ghostPos: Position;
    if (ghostSpawns.length > 0) {
      // Use modulo to cycle through spawns if we have more ghosts than spawn points
      const spawnIndex = i % ghostSpawns.length;
      ghostPos = ghostSpawns[spawnIndex];
    } else {
      ghostPos = spawnPos; // Fallback
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
    activeMessage: null,
    messageExpireTimestamp: 0,
  };
};

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(getInitialGameState());
  const tickRef = useRef<number | null>(null);
  const winSequenceTriggered = useRef(false);

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
    winSequenceTriggered.current = false;
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

  // Ghost AI Behavior Types - Each ghost has a unique personality
  // g1: Wanderer - Random movement with loose player avoidance
  // g2: Horizontal Patrol - Prefers left/right movement
  // g3: Vertical Patrol - Prefers up/down movement
  // g4: Erratic - Changes direction very frequently
  // g5: Corner Hugger - Tries to stay near map edges
  // g6: Slow Mover - Only moves every other tick (uses moveCounter)
  // g7: Zigzag - Alternates between perpendicular directions
  // g8: Distance Keeper - Tries to maintain specific distance from player

  // Track ghost move counters for special behaviors
  const ghostMoveCounters = useRef<Map<string, number>>(new Map());
  const ghostLastTurnTick = useRef<Map<string, number>>(new Map());
  const gameTick = useRef<number>(0);

  const getGhostBehavior = (ghostId: string): string => {
    switch (ghostId) {
      case 'g1': return 'wanderer';
      case 'g2': return 'horizontal';
      case 'g3': return 'vertical';
      case 'g4': return 'erratic';
      case 'g5': return 'corner';
      case 'g6': return 'slow';
      case 'g7': return 'zigzag';
      case 'g8': return 'distance';
      default: return 'wanderer';
    }
  };

  const moveGhost = (ghost: Ghost, grid: number[][], player: Entity): Ghost => {
    const behavior = getGhostBehavior(ghost.id);
    const possibleDirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    let validMoves: Direction[] = [];

    // Global ghost speed reduction - 20% slower (skip 1 in 5 ticks)
    const globalCounter = ghostMoveCounters.current.get('global_tick') || 0;
    ghostMoveCounters.current.set('global_tick', globalCounter + 1);
    if (globalCounter % 5 === 0) {
      return ghost; // Skip this tick for all ghosts (20% slower)
    }

    // Slow mover - skip every other tick
    if (behavior === 'slow') {
      const counter = ghostMoveCounters.current.get(ghost.id) || 0;
      ghostMoveCounters.current.set(ghost.id, counter + 1);
      if (counter % 2 === 0) {
        return ghost; // Skip this tick
      }
    }

    // Get valid moves (respecting no-reverse rule with exceptions)
    const canReverse = behavior === 'erratic' && Math.random() < 0.3; // Erratic can sometimes reverse

    possibleDirs.forEach(d => {
      // Don't reverse direction (unless allowed)
      if (!canReverse) {
        if (ghost.dir === Direction.UP && d === Direction.DOWN) return;
        if (ghost.dir === Direction.DOWN && d === Direction.UP) return;
        if (ghost.dir === Direction.LEFT && d === Direction.RIGHT) return;
        if (ghost.dir === Direction.RIGHT && d === Direction.LEFT) return;
      }

      const vec = MOVEMENT_VECTORS[d];
      const target = { x: ghost.pos.x + vec.x, y: ghost.pos.y + vec.y };

      // Wrap logic for validation check
      if (target.x < 0) target.x = grid[0].length - GHOST_SIZE;
      if (target.x > grid[0].length - GHOST_SIZE) target.x = 0;

      if (isValidMove(grid, target, GHOST_SIZE, GHOST_SIZE)) {
        validMoves.push(d);
      }
    });

    // If no valid moves (dead end), allow reverse
    if (validMoves.length === 0) {
      possibleDirs.forEach(d => {
        const vec = MOVEMENT_VECTORS[d];
        const target = { x: ghost.pos.x + vec.x, y: ghost.pos.y + vec.y };
        if (isValidMove(grid, target, GHOST_SIZE, GHOST_SIZE)) {
          validMoves.push(d);
        }
      });
    }

    if (validMoves.length === 0) return ghost;

    let chosenDir: Direction | null = ghost.dir;
    const playerPos = player.pos;
    const cols = grid[0].length;
    const rows = grid.length;

    // Apply behavior-specific direction selection
    switch (behavior) {
      case 'wanderer': {
        // 60% chance to flee from player, 40% random
        if (Math.random() < 0.6) {
          // Flee behavior
          let maxDist = -1;
          validMoves.forEach(d => {
            const vec = MOVEMENT_VECTORS[d];
            const dist = Math.pow(ghost.pos.x + vec.x - playerPos.x, 2) +
              Math.pow(ghost.pos.y + vec.y - playerPos.y, 2);
            if (dist > maxDist) {
              maxDist = dist;
              chosenDir = d;
            }
          });
        } else {
          chosenDir = validMoves[Math.floor(Math.random() * validMoves.length)];
        }
        break;
      }

      case 'horizontal': {
        // Strongly prefer left/right movement
        const horizontalMoves = validMoves.filter(d => d === Direction.LEFT || d === Direction.RIGHT);
        if (horizontalMoves.length > 0 && Math.random() < 0.8) {
          // Among horizontal moves, prefer the one away from player
          let bestDir = horizontalMoves[0];
          let maxDist = -1;
          horizontalMoves.forEach(d => {
            const vec = MOVEMENT_VECTORS[d];
            const dist = Math.pow(ghost.pos.x + vec.x - playerPos.x, 2);
            if (dist > maxDist) {
              maxDist = dist;
              bestDir = d;
            }
          });
          chosenDir = bestDir;
        } else if (validMoves.length > 0) {
          // Fall back to any valid move that increases distance
          let maxDist = -1;
          validMoves.forEach(d => {
            const vec = MOVEMENT_VECTORS[d];
            const dist = Math.pow(ghost.pos.x + vec.x - playerPos.x, 2) +
              Math.pow(ghost.pos.y + vec.y - playerPos.y, 2);
            if (dist > maxDist) {
              maxDist = dist;
              chosenDir = d;
            }
          });
        }
        break;
      }

      case 'vertical': {
        // Strongly prefer up/down movement
        const verticalMoves = validMoves.filter(d => d === Direction.UP || d === Direction.DOWN);
        if (verticalMoves.length > 0 && Math.random() < 0.8) {
          // Among vertical moves, prefer the one away from player
          let bestDir = verticalMoves[0];
          let maxDist = -1;
          verticalMoves.forEach(d => {
            const vec = MOVEMENT_VECTORS[d];
            const dist = Math.pow(ghost.pos.y + vec.y - playerPos.y, 2);
            if (dist > maxDist) {
              maxDist = dist;
              bestDir = d;
            }
          });
          chosenDir = bestDir;
        } else if (validMoves.length > 0) {
          // Fall back to any valid move
          let maxDist = -1;
          validMoves.forEach(d => {
            const vec = MOVEMENT_VECTORS[d];
            const dist = Math.pow(ghost.pos.x + vec.x - playerPos.x, 2) +
              Math.pow(ghost.pos.y + vec.y - playerPos.y, 2);
            if (dist > maxDist) {
              maxDist = dist;
              chosenDir = d;
            }
          });
        }
        break;
      }

      case 'erratic': {
        // Very random behavior - changes direction frequently
        const lastTurn = ghostLastTurnTick.current.get(ghost.id) || 0;
        const ticksSinceLastTurn = gameTick.current - lastTurn;

        // Force a direction change every 2-4 ticks
        if (ticksSinceLastTurn > 2 + Math.floor(Math.random() * 3)) {
          // Pick a random different direction
          const otherDirs = validMoves.filter(d => d !== ghost.dir);
          if (otherDirs.length > 0) {
            chosenDir = otherDirs[Math.floor(Math.random() * otherDirs.length)];
            ghostLastTurnTick.current.set(ghost.id, gameTick.current);
          } else {
            chosenDir = validMoves[Math.floor(Math.random() * validMoves.length)];
          }
        } else {
          // Continue current direction if possible
          if (ghost.dir && validMoves.includes(ghost.dir)) {
            chosenDir = ghost.dir;
          } else {
            chosenDir = validMoves[Math.floor(Math.random() * validMoves.length)];
          }
        }
        break;
      }

      case 'corner': {
        // Tries to stay near edges/corners
        const centerX = cols / 2;
        const centerY = rows / 2;

        // Score each direction by how close it gets us to an edge
        let bestDir = validMoves[0];
        let bestEdgeScore = -1;

        validMoves.forEach(d => {
          const vec = MOVEMENT_VECTORS[d];
          const newX = ghost.pos.x + vec.x;
          const newY = ghost.pos.y + vec.y;

          // Calculate distance from edges (lower = better)
          const distFromLeftEdge = newX;
          const distFromRightEdge = cols - newX;
          const distFromTopEdge = newY;
          const distFromBottomEdge = rows - newY;

          // Edge score = how close to nearest edge
          const minEdgeDist = Math.min(distFromLeftEdge, distFromRightEdge, distFromTopEdge, distFromBottomEdge);
          const edgeScore = 100 - minEdgeDist; // Higher = closer to edge

          // Also consider fleeing from player
          const playerDist = Math.pow(newX - playerPos.x, 2) + Math.pow(newY - playerPos.y, 2);
          const totalScore = edgeScore + playerDist * 0.1;

          if (totalScore > bestEdgeScore) {
            bestEdgeScore = totalScore;
            bestDir = d;
          }
        });

        chosenDir = bestDir;
        break;
      }

      case 'slow': {
        // Simple flee behavior (already skips ticks above)
        let maxDist = -1;
        validMoves.forEach(d => {
          const vec = MOVEMENT_VECTORS[d];
          const dist = Math.pow(ghost.pos.x + vec.x - playerPos.x, 2) +
            Math.pow(ghost.pos.y + vec.y - playerPos.y, 2);
          if (dist > maxDist) {
            maxDist = dist;
            chosenDir = d;
          }
        });
        break;
      }

      case 'zigzag': {
        // Alternates between perpendicular directions
        const counter = ghostMoveCounters.current.get(ghost.id) || 0;
        ghostMoveCounters.current.set(ghost.id, counter + 1);

        const preferVertical = counter % 4 < 2;

        if (preferVertical) {
          const vertMoves = validMoves.filter(d => d === Direction.UP || d === Direction.DOWN);
          if (vertMoves.length > 0) {
            // Pick the one that increases distance from player
            let bestDir = vertMoves[0];
            let maxDist = -1;
            vertMoves.forEach(d => {
              const vec = MOVEMENT_VECTORS[d];
              const dist = Math.pow(ghost.pos.y + vec.y - playerPos.y, 2);
              if (dist > maxDist) {
                maxDist = dist;
                bestDir = d;
              }
            });
            chosenDir = bestDir;
          } else {
            chosenDir = validMoves[Math.floor(Math.random() * validMoves.length)];
          }
        } else {
          const horizMoves = validMoves.filter(d => d === Direction.LEFT || d === Direction.RIGHT);
          if (horizMoves.length > 0) {
            let bestDir = horizMoves[0];
            let maxDist = -1;
            horizMoves.forEach(d => {
              const vec = MOVEMENT_VECTORS[d];
              const dist = Math.pow(ghost.pos.x + vec.x - playerPos.x, 2);
              if (dist > maxDist) {
                maxDist = dist;
                bestDir = d;
              }
            });
            chosenDir = bestDir;
          } else {
            chosenDir = validMoves[Math.floor(Math.random() * validMoves.length)];
          }
        }
        break;
      }

      case 'distance': {
        // Tries to maintain a specific distance from player (not too close, not too far)
        const idealDistance = 64; // ~8 tiles away squared
        const currentDist = Math.pow(ghost.pos.x - playerPos.x, 2) + Math.pow(ghost.pos.y - playerPos.y, 2);

        let bestDir = validMoves[0];
        let bestScore = Infinity;

        validMoves.forEach(d => {
          const vec = MOVEMENT_VECTORS[d];
          const newDist = Math.pow(ghost.pos.x + vec.x - playerPos.x, 2) +
            Math.pow(ghost.pos.y + vec.y - playerPos.y, 2);

          // Score = how close to ideal distance
          const score = Math.abs(newDist - idealDistance);

          // If too close to player, heavily penalize getting closer
          if (currentDist < 36 && newDist < currentDist) {
            // Too close! Flee! Skip this direction.
            return;
          }

          if (score < bestScore) {
            bestScore = score;
            bestDir = d;
          }
        });

        // If we're too close, just flee
        if (currentDist < 36) {
          let maxDist = -1;
          validMoves.forEach(d => {
            const vec = MOVEMENT_VECTORS[d];
            const dist = Math.pow(ghost.pos.x + vec.x - playerPos.x, 2) +
              Math.pow(ghost.pos.y + vec.y - playerPos.y, 2);
            if (dist > maxDist) {
              maxDist = dist;
              bestDir = d;
            }
          });
        }

        chosenDir = bestDir;
        break;
      }

      default: {
        // Default flee behavior
        let maxDist = -1;
        validMoves.forEach(d => {
          const vec = MOVEMENT_VECTORS[d];
          const dist = Math.pow(ghost.pos.x + vec.x - playerPos.x, 2) +
            Math.pow(ghost.pos.y + vec.y - playerPos.y, 2);
          if (dist > maxDist) {
            maxDist = dist;
            chosenDir = d;
          }
        });
      }
    }

    // Fallback if no direction chosen
    if (!chosenDir || !validMoves.includes(chosenDir)) {
      chosenDir = validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    const vec = MOVEMENT_VECTORS[chosenDir as Direction] || { x: 0, y: 0 };
    let nextPos = { x: ghost.pos.x + vec.x, y: ghost.pos.y + vec.y };

    // Wrap around logic for ghosts
    if (nextPos.x < -1) nextPos.x = grid[0].length - GHOST_SIZE;
    else if (nextPos.x > grid[0].length - GHOST_SIZE + 1) nextPos.x = 0;
    if (nextPos.y < -1) nextPos.y = grid.length - GHOST_SIZE;
    else if (nextPos.y > grid.length - GHOST_SIZE + 1) nextPos.y = 0;

    // Clamp for validation
    const validatePos = {
      x: Math.max(0, Math.min(nextPos.x, grid[0].length - GHOST_SIZE)),
      y: Math.max(0, Math.min(nextPos.y, grid.length - GHOST_SIZE))
    };

    if (isValidMove(grid, validatePos, GHOST_SIZE, GHOST_SIZE)) {
      // Correct wrap coordinate snap
      if (nextPos.x < 0) nextPos.x = grid[0].length - GHOST_SIZE;
      if (nextPos.x > grid[0].length - GHOST_SIZE) nextPos.x = 0;
      if (nextPos.y < 0) nextPos.y = grid.length - GHOST_SIZE;
      if (nextPos.y > grid.length - GHOST_SIZE) nextPos.y = 0;
    } else {
      nextPos = { ...ghost.pos };
    }

    // Increment game tick counter
    gameTick.current++;

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
          for (let dy = 0; dy < PLAYER_HEIGHT; dy++) {
            for (let dx = 0; dx < PLAYER_WIDTH; dx++) {
              const py = newPlayer.pos.y + dy;
              const px = newPlayer.pos.x + dx;
              if (py < newGrid.length && px < newGrid[0].length) {
                if (newGrid[py][px] === TileType.PELLET) {
                  newGrid[py][px] = TileType.EMPTY;
                  newScore += 10;
                }
              }
            }
          }


          // Only move active ghosts
          const movedGhosts = prev.ghosts.map(g => {
            if (g.isActive) {
              return moveGhost(g, prev.grid, newPlayer);
            }
            return g; // Keep inactive ghosts as-is
          });

          // Check Collision - Player eats ghosts
          let newStatus = prev.status;
          let updatedGhosts = [...movedGhosts];
          let updatedScore = newScore;

          let newMessage = prev.activeMessage;
          let newMessageExpiry = prev.messageExpireTimestamp;

          // Process collisions
          let ghostWasEaten = false;

          updatedGhosts = updatedGhosts.map(g => {
            if (!g.isActive || g.isEaten) return g; // Skip inactive or already eaten ghosts

            // AABB collision check using player width and height
            const collision =
              newPlayer.pos.x < g.pos.x + GHOST_SIZE &&
              newPlayer.pos.x + PLAYER_WIDTH > g.pos.x &&
              newPlayer.pos.y < g.pos.y + GHOST_SIZE &&
              newPlayer.pos.y + PLAYER_HEIGHT > g.pos.y;

            if (collision) {
              ghostWasEaten = true;
              updatedScore += 200;

              // Play victory sound
              const audio = new Audio(victorySound);
              audio.volume = 0.5; // Set volume to 50% so it's not too loud
              audio.play().catch(e => console.log('Audio play failed:', e));

              // Show message
              const ghostType = GHOST_TYPES.find(type => type.id === g.id);
              if (ghostType) {
                newMessage = `${ghostType.name} Gone.`;
                newMessageExpiry = Date.now() + 1000;
              }

              // Mark as eaten and inactive
              return { ...g, isActive: false, isEaten: true };
            }
            return g;
          });

          // If a ghost was eaten, try to activate a pending one
          if (ghostWasEaten) {
            // Find the first ghost that is NOT active and NOT eaten
            const pendingGhostIndex = updatedGhosts.findIndex(g => !g.isActive && !g.isEaten);

            if (pendingGhostIndex !== -1) {
              // Activate it
              const g = updatedGhosts[pendingGhostIndex];

              // Find a spawn point
              const ghostSpawns: Position[] = [];
              for (let y = 0; y < prev.grid.length; y++) {
                for (let x = 0; x < prev.grid[0].length; x++) {
                  if (prev.grid[y][x] === TileType.GHOST_SPAWN) {
                    ghostSpawns.push({ x, y });
                  }
                }
              }

              let spawnPos = { x: Math.floor(prev.grid[0].length / 2), y: Math.floor(prev.grid.length * 0.3) }; // Fallback
              if (ghostSpawns.length > 0) {
                // Find spawn point furthest from player (opposite side)
                let maxDist = -1;
                let furthestSpawn = ghostSpawns[0];

                ghostSpawns.forEach(pos => {
                  const dist = Math.pow(pos.x - newPlayer.pos.x, 2) + Math.pow(pos.y - newPlayer.pos.y, 2);
                  if (dist > maxDist) {
                    maxDist = dist;
                    furthestSpawn = pos;
                  }
                });
                spawnPos = furthestSpawn;
              }

              updatedGhosts[pendingGhostIndex] = {
                ...g,
                isActive: true,
                pos: spawnPos,
                dir: Direction.UP,
                nextDir: null
              };
            }
          }

          // Win condition: All ghosts are eaten
          const allGhostsEaten = updatedGhosts.every(g => g.isEaten);
          if (allGhostsEaten) {
            if (!winSequenceTriggered.current) {
              winSequenceTriggered.current = true;
              // Delay showing win screen by 1 second
              setTimeout(() => {
                setGameState(current => ({ ...current, status: GameStatus.WON }));
              }, 1000);
            }
            // Do not set newStatus = GameStatus.WON directly here anymore
          }

          // Just to be safe, if we ran out of pellets (original logic), we effectively win too, 
          // but the user specified "win when player has eaten all 8 ghosts".
          // We can keep pellet condition or remove it. Let's keep it as secondary or just ignore it implies removing it?
          // The user instruction "game wins when the player has eaten all 8 ghosts" implies this is THE condition.
          // However, typically Pacman ends on pellets. I will keep the check for Pellet completion but prioritize the Ghost Eating as requested.

          let hasPellets = false;
          for (let y = 0; y < newGrid.length; y++) {
            for (let x = 0; x < newGrid[y].length; x++) {
              if (newGrid[y][x] === TileType.PELLET) {
                hasPellets = true;
                break;
              }
            }
          }
          // Override pellet win with ghost win strictly? 
          // "win when the player has eaten all 8 ghosts".
          // If pellets are gone but ghosts remain, what happens? 
          // I'll stick to: Win if all ghosts eaten.
          // If pellets are all eaten, do nothing? Or maybe respawn pellets? 
          // For now, I'll allow "All Pellets Eaten" to ALSO be a win condition for safety, or disable it.
          // I'll disable the Pellet win condition to STRICTLY follow "win when player has eaten all 8 ghosts".
          // However, if the map is empty, it's boring. I'll leave Pellet win as a fallback but the main goal is ghosts.
          // Actually, let's REMOVE the pellet win condition to be precise.

          // if (!hasPellets) {
          //   // Maybe respawn map? Or just do nothing. Let's do nothing for now and rely on ghosts.
          // }

          return {
            ...prev,
            player: newPlayer,
            ghosts: updatedGhosts,
            grid: newGrid,
            score: updatedScore,
            status: newStatus,
            activeMessage: Date.now() > newMessageExpiry ? null : newMessage,
            messageExpireTimestamp: newMessageExpiry,
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
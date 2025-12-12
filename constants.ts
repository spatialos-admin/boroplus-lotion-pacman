import { TileType } from './types';

// Map: 1=Wall, 0=Empty, 2=Pellet, 9=GhostSpawn (treated as empty initially but used for spawn)
// Visual style from screenshot: Walls are chunks.
// 15x15 grid
export const INITIAL_MAP_LAYOUT = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1],
  [1, 2, 1, 1, 2, 1, 2, 2, 2, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 1, 2, 9, 2, 1, 2, 2, 2, 2, 1], // 9 is ghost house area center
  [1, 1, 1, 1, 2, 1, 1, 0, 1, 1, 2, 1, 1, 1, 1],
  [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 1],
  [1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 2, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export const GAME_SPEED_MS = 180; // Milliseconds per tick

export const COLORS = {
  WALL: '#654321', // Dark Brown from screenshot
  WALL_LIGHT: '#8B5A2B', // Lighter brown for detail
  BG: '#87CEEB', // Sky blue/Cyan from screenshot
  PLAYER: '#FFD700', // Gold/Yellow
  PELLET: '#F4A460', // Sandy brown (looks good on blue)
  GHOSTS: ['#FF0000', '#FFB8FF', '#00FFFF', '#FFB852'],
};

export const MOVEMENT_VECTORS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};
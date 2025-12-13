import { TileType } from './types';

// Map: 1=Wall, 0=Empty, 2=Pellet, 9=GhostSpawn
// Layout designed for 2x2 characters (Wider paths)
// 13 columns, 18 rows
export const INITIAL_MAP_LAYOUT = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Walls removed
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Walls removed
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Walls removed
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Walls removed
  [1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 1], // Open area for Text
  [1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 1],
  [1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 1], // 7
  [1, 2, 2, 1, 1, 1, 0, 1, 1, 1, 2, 2, 1],
  [1, 2, 2, 1, 9, 9, 9, 9, 9, 1, 2, 2, 1], // Ghost House
  [1, 2, 2, 1, 9, 9, 9, 9, 9, 1, 2, 2, 1], // 10
  [1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Wide horizontal
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // 13
  [1, 1, 1, 2, 2, 1, 1, 1, 2, 2, 1, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Player Start Area
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // 16
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
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
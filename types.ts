export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export type Position = {
  x: number;
  y: number;
};

export enum TileType {
  EMPTY = 0,
  WALL = 1,
  PELLET = 2,
  POWER_PELLET = 3,
  DOOR = 4,
  GHOST_SPAWN = 9,
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  WON = 'WON',
  GAME_OVER = 'GAME_OVER',
}

export interface Entity {
  id: string;
  pos: Position;
  dir: Direction | null;
  nextDir: Direction | null;
  color: string;
}

export interface Ghost extends Entity {
  isScared?: boolean;
  isActive?: boolean; // Whether the ghost is currently on screen
  isEaten?: boolean; // Whether the ghost has been eliminated
}

export interface GameState {
  player: Entity;
  ghosts: Ghost[];
  grid: number[][]; // 2D array of TileType
  score: number;
  status: GameStatus;
  lives: number;
  activeMessage: string | null;
  messageExpireTimestamp: number;
}
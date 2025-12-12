import React, { useMemo } from 'react';
import { GameState, TileType, GameStatus } from '../types';
import { COLORS } from '../constants';
import { Ghost as GhostIcon } from 'lucide-react'; // Fallback icon if needed, but we'll use CSS shapes

interface GameScreenProps {
  gameState: GameState;
}

const GameScreen: React.FC<GameScreenProps> = ({ gameState }) => {
  const { grid, player, ghosts, status } = gameState;

  // Memoize grid rendering to avoid expensive re-calcs on every tick if possible,
  // but with 15x15 React handles it fine.
  
  return (
    <div className="relative w-full h-full bg-[#87CEEB] overflow-hidden rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
      {/* Grid Layer */}
      <div 
        className="w-full h-full grid"
        style={{
          gridTemplateColumns: `repeat(${grid[0].length}, 1fr)`,
          gridTemplateRows: `repeat(${grid.length}, 1fr)`,
        }}
      >
        {grid.map((row, y) => (
          row.map((cell, x) => (
            <div key={`${x}-${y}`} className="relative flex items-center justify-center">
              {/* Wall */}
              {cell === TileType.WALL && (
                <div 
                    className="w-full h-full rounded-sm"
                    style={{ backgroundColor: COLORS.WALL, border: `2px solid ${COLORS.WALL_LIGHT}` }}
                >
                     {/* Texture detail for wall */}
                    <div className="w-full h-full opacity-20 bg-[radial-gradient(circle,transparent_20%,#000_20%,#000_22%,transparent_22%,transparent)] bg-[length:4px_4px]"></div>
                </div>
              )}
              
              {/* Pellet */}
              {cell === TileType.PELLET && (
                <div 
                    className="w-[25%] h-[25%] rounded-sm shadow-sm"
                    style={{ backgroundColor: COLORS.WALL }} // Use wall color for pellet as per screenshot "brown dots"
                ></div>
              )}
            </div>
          ))
        ))}
      </div>

      {/* Entities Layer - Absolute Positioning for smoother visuals (optional) or just overlay on grid */}
      {/* Since we are using grid tiles, we can just overlay absolutely based on percentage */}
      
      {/* Player */}
      <div
        className="absolute transition-all duration-150 ease-linear z-20"
        style={{
          width: `${100 / grid[0].length}%`,
          height: `${100 / grid.length}%`,
          left: `${(player.pos.x / grid[0].length) * 100}%`,
          top: `${(player.pos.y / grid.length) * 100}%`,
        }}
      >
        <div className="w-full h-full p-1">
             {/* Pacman shape */}
             <div className="w-full h-full bg-yellow-400 rounded-full shadow-md relative animate-pulse">
                {/* Eye */}
                <div className="absolute top-[20%] right-[30%] w-[15%] h-[15%] bg-black rounded-full"></div>
                {/* Mouth approximation using clip-path could be added here, simplified for now */}
             </div>
        </div>
      </div>

      {/* Ghosts */}
      {ghosts.map((ghost) => (
        <div
            key={ghost.id}
            className="absolute transition-all duration-150 ease-linear z-10"
            style={{
                width: `${100 / grid[0].length}%`,
                height: `${100 / grid.length}%`,
                left: `${(ghost.pos.x / grid[0].length) * 100}%`,
                top: `${(ghost.pos.y / grid.length) * 100}%`,
            }}
        >
             <div className="w-full h-full p-1">
                 <div 
                    className="w-full h-full rounded-t-full rounded-b-lg shadow-sm flex items-start justify-center pt-1 gap-1"
                    style={{ backgroundColor: ghost.color }}
                 >
                    <div className="w-1.5 h-1.5 bg-white rounded-full flex items-center justify-center">
                        <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                    </div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full flex items-center justify-center">
                        <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                    </div>
                 </div>
             </div>
        </div>
      ))}

      {/* Overlays */}
      {status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center flex-col z-50 animate-in fade-in">
          <h2 className="text-red-500 font-bold text-2xl mb-2 pixel-font tracking-tighter shadow-black drop-shadow-md">GAME OVER</h2>
        </div>
      )}
      
      {status === GameStatus.WON && (
        <div className="absolute inset-0 bg-yellow-400/80 flex items-center justify-center z-50">
          <h2 className="text-white font-bold text-2xl pixel-font drop-shadow-md">VICTORY!</h2>
        </div>
      )}
      
      {status === GameStatus.IDLE && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
          <p className="text-white font-bold text-sm pixel-font animate-pulse">PRESS START</p>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
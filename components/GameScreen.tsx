import React from 'react';
import { GameState, TileType, GameStatus } from '../types';
import { COLORS } from '../constants';
import { Ghost as GhostIcon, Milk } from 'lucide-react';

interface GameScreenProps {
  gameState: GameState;
}

const GameScreen: React.FC<GameScreenProps> = ({ gameState }) => {
  const { grid, player, ghosts, status } = gameState;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-lg border-2 border-purple-900 flex flex-col">
      
      {/* Header Section */}
      <div className="h-16 w-full flex items-center justify-between px-2 pt-2 bg-black z-20 shrink-0">
        <div className="flex gap-1">
          {['#FF0000', '#FFB8FF', '#A855F7', '#00FFFF'].map((c, i) => (
             <GhostIcon key={i} size={16} fill={c} color={c} className="drop-shadow-sm" />
          ))}
        </div>
        
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 rounded-md border-2 border-red-600 shadow-lg transform -skew-x-6">
          <h1 className="text-black font-extrabold text-xs pixel-font tracking-tighter drop-shadow-sm whitespace-nowrap">SKIN RESCUE</h1>
        </div>

        <div className="relative">
             <Milk size={20} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
        </div>
      </div>

      {/* Game Area */}
      <div className="relative flex-1 w-full bg-black">
         {/* Grid Layer */}
        <div 
          className="w-full h-full grid"
          style={{
            gridTemplateColumns: `repeat(${grid[0].length}, 1fr)`,
            gridTemplateRows: `repeat(${grid.length}, 1fr)`,
          }}
        >
          {grid.map((row, y) => (
            row.map((cell, x) => {
              const isWall = cell === TileType.WALL;
              return (
                <div key={`${x}-${y}`} className="relative flex items-center justify-center">
                  {isWall && (
                    <div className="w-[80%] h-[80%] rounded-md border-2 border-purple-500 shadow-[0_0_6px_#a855f7] bg-transparent"></div>
                  )}
                  
                  {cell === TileType.PELLET && (
                    <div 
                        className="w-[15%] h-[15%] rounded-full bg-white shadow-[0_0_4px_white]"
                    ></div>
                  )}
                </div>
              );
            })
          ))}
        </div>

        {/* Text Overlay - Positioned over the open area (approx Row 5-7) */}
        <div className="absolute top-[28%] left-0 w-full text-center pointer-events-none z-0 opacity-80">
          <h2 className="pixel-font text-yellow-300 text-xl tracking-widest drop-shadow-[0_0_10px_rgba(253,224,71,0.5)] leading-tight">
            Dryness-<br/>Gone.
          </h2>
          <div className="flex justify-center gap-2 mt-2">
             <div className="w-1 h-1 bg-white rounded-full"></div>
             <div className="w-1 h-1 bg-white rounded-full"></div>
             <div className="w-1 h-1 bg-white rounded-full"></div>
             <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
        </div>

        {/* Entities Layer - Sized to 2x2 blocks */}
        
        {/* Player */}
        <div
          className="absolute transition-all duration-150 ease-linear z-20"
          style={{
            width: `${(100 / grid[0].length) * 2}%`,  // 2 Blocks wide
            height: `${(100 / grid.length) * 2}%`,     // 2 Blocks high
            left: `${(player.pos.x / grid[0].length) * 100}%`,
            top: `${(player.pos.y / grid.length) * 100}%`,
          }}
        >
          <div className="w-full h-full p-1.5">
               <div className="w-full h-full bg-yellow-400 rounded-full shadow-[0_0_10px_yellow] relative">
                  <div className="absolute top-[20%] right-[20%] w-[15%] h-[15%] bg-black rounded-full"></div>
               </div>
          </div>
        </div>

        {/* Ghosts */}
        {ghosts.map((ghost) => (
          <div
              key={ghost.id}
              className="absolute transition-all duration-150 ease-linear z-20"
              style={{
                  width: `${(100 / grid[0].length) * 2}%`,
                  height: `${(100 / grid.length) * 2}%`,
                  left: `${(ghost.pos.x / grid[0].length) * 100}%`,
                  top: `${(ghost.pos.y / grid.length) * 100}%`,
              }}
          >
               <div className="w-full h-full p-1">
                   <div 
                      className="w-full h-full rounded-t-full rounded-b-lg shadow-[0_0_8px_currentColor] flex items-start justify-center pt-1 gap-0.5"
                      style={{ color: ghost.color, backgroundColor: ghost.color }}
                   >
                      <div className="w-2 h-2 bg-white rounded-full flex items-center justify-center">
                          <div className="w-1 h-1 bg-blue-900 rounded-full"></div>
                      </div>
                      <div className="w-2 h-2 bg-white rounded-full flex items-center justify-center">
                          <div className="w-1 h-1 bg-blue-900 rounded-full"></div>
                      </div>
                   </div>
               </div>
          </div>
        ))}
      </div>

      {/* Overlays */}
      {status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center flex-col z-50 animate-in fade-in">
          <h2 className="text-red-500 font-bold text-2xl mb-2 pixel-font tracking-tighter shadow-black drop-shadow-md">GAME OVER</h2>
        </div>
      )}
      
      {status === GameStatus.WON && (
        <div className="absolute inset-0 bg-yellow-400/90 flex items-center justify-center z-50">
          <h2 className="text-black font-bold text-2xl pixel-font drop-shadow-md">MOISTURIZED!</h2>
        </div>
      )}
      
      {status === GameStatus.IDLE && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <p className="text-white font-bold text-xs pixel-font animate-pulse text-center leading-loose">
            PRESS START<br/>TO HYDRATE
          </p>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
import React, { useState, useEffect, useRef } from 'react';
import { GameState, TileType, GameStatus } from '../types';
import { COLORS } from '../constants';
import { Ghost as GhostIcon, Milk } from 'lucide-react';
import lotionImage from '../assets/images/BP-lotion.png';
import { ENTITY_SIZE, GHOST_SIZE, PLAYER_WIDTH, PLAYER_HEIGHT } from '../constants';
import { getGhostTypeById } from '../ghostData';
import skinRescueImage from '../assets/images/Skin-Rescue-Image.png';
import boroplusImage from '../assets/images/boroplus.jpeg';

interface GameScreenProps {
  gameState: GameState;
}

const GameScreen: React.FC<GameScreenProps> = ({ gameState }) => {
  const { grid, player, ghosts, status, score } = gameState;
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [blockSize, setBlockSize] = useState(20);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  // Calculate block size based on available container space - maximize space usage
  useEffect(() => {
    const calculateBlockSize = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;

      // Find the header element to get its actual height
      const header = container.querySelector('.h-12') || container.firstElementChild;
      const headerHeight = header ? (header as HTMLElement).offsetHeight : 48;

      // Get available space (accounting for header)
      // Use clientWidth/Height to get inner content dimensions (excluding borders)
      const availableWidth = container.clientWidth;
      const availableHeight = container.clientHeight - headerHeight;

      // Grid dimensions
      const cols = grid[0].length;
      const rows = grid.length;

      // Calculate block size that maximizes space usage
      // Prioritize using the full width to ensure we use all available columns
      const widthBasedSize = availableWidth / cols;
      const heightBasedSize = availableHeight / rows;

      // Set reasonable bounds for block size
      const minSize = 12; // Increased minimum
      const maxSize = 50; // Increased max size for better space usage on larger screens

      // Start with the size that fits both dimensions
      let calculatedSize = Math.min(widthBasedSize, heightBasedSize);
      let finalSize = Math.max(minSize, Math.min(maxSize, calculatedSize));

      // Check utilization
      let usedWidth = cols * finalSize;

      // Prioritize width: if width utilization is low, try to increase block size
      // This ensures we use the full width including those 2 blocks on each side
      if (usedWidth < availableWidth * 0.98 && finalSize < maxSize) {
        // Try to maximize width usage first
        const maxWidthSize = Math.min(availableWidth / cols, maxSize);
        const maxHeightSize = Math.min(availableHeight / rows, maxSize);

        // Use the larger size that still fits both dimensions
        // Use a tiny epsilon subtraction to ensure we don't trigger scrollbars due to float precision
        const optimalSize = Math.min(maxWidthSize, maxHeightSize) - 0.05;

        if (optimalSize > finalSize) {
          finalSize = optimalSize;
        }
      } else {
        // Apply tiny safety margin
        finalSize = finalSize - 0.05;
      }

      setBlockSize(finalSize);
    };

    // Initial calculation
    calculateBlockSize();

    // Recalculate on resize
    window.addEventListener('resize', calculateBlockSize);

    // Use ResizeObserver for more accurate measurements
    const resizeObserver = new ResizeObserver(() => {
      // Small delay to ensure layout is complete
      setTimeout(calculateBlockSize, 0);
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', calculateBlockSize);
      resizeObserver.disconnect();
    };
  }, [grid]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden rounded-lg border-2 border-purple-900 flex flex-col">

      {/* Header Section */}
      <div className="h-12 sm:h-16 w-full flex items-center justify-between px-1 sm:px-2 pt-1 sm:pt-2 bg-black z-20 shrink-0">
        <div className="flex gap-0.5 sm:gap-1">
          {['#FF0000', '#FFB8FF', '#A855F7', '#00FFFF'].map((c, i) => (
            <GhostIcon key={i} size={12} fill={c} color={c} className="sm:w-4 sm:h-4 drop-shadow-sm" />
          ))}
        </div>

        <img src={skinRescueImage} alt="Skin Rescue" className="h-8 sm:h-10 object-contain" />

        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-white font-mono text-[10px] sm:text-xs font-bold">SCORE</span>
          <span className="text-yellow-400 font-mono text-xs sm:text-sm font-bold">{score.toString().padStart(5, '0')}</span>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
        {/* Game Grid Container - relative positioning for entities */}
        <div
          className="relative"
          style={{
            width: `${grid[0].length * blockSize}px`,
            height: `${grid.length * blockSize}px`,
          }}
        >
          {/* Grid Layer */}
          <div
            className="grid absolute inset-0"
            style={{
              gridTemplateColumns: `repeat(${grid[0].length}, ${blockSize}px)`,
              gridTemplateRows: `repeat(${grid.length}, ${blockSize}px)`,
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

          {/* Text Overlay - Positioned over the open area */}
          {gameState.activeMessage && (
            <div className="absolute top-[10%] left-[10%] w-[80%] text-center pointer-events-none z-30 animate-in fade-in zoom-in duration-200">
              <h2 className="pixel-font text-yellow-300 text-xl sm:text-2xl tracking-widest drop-shadow-[0_0_10px_rgba(253,224,71,0.5)] leading-tight shadow-black drop-shadow-md">
                {gameState.activeMessage}
              </h2>
            </div>
          )}

          {/* Entities Layer - Sized to 2x2 blocks */}

          {/* Player */}
          <div
            className="absolute z-20"
            style={{
              width: `${PLAYER_WIDTH * blockSize}px`,  // Player width in blocks
              height: `${PLAYER_HEIGHT * blockSize}px`,     // Player height in blocks
              left: `${player.pos.x * blockSize}px`,
              top: `${player.pos.y * blockSize}px`,
              transition: 'left 180ms linear, top 180ms linear',
              willChange: 'left, top',
            }}
          >
            <div className="w-full h-full p-0 flex items-center justify-center overflow-visible">
              <div className="w-full h-full relative">
                <img
                  ref={imageRef}
                  src={lotionImage}
                  alt="Player"
                  className="w-full h-full object-contain"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      const aspectRatio = img.naturalWidth / img.naturalHeight;
                      setImageAspectRatio(aspectRatio);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Ghosts - Only render active ghosts */}
          {ghosts.filter(g => g.isActive !== false).map((ghost) => {
            const ghostType = getGhostTypeById(ghost.id);
            const ghostImage = ghostType?.image || '';

            return (
              <div
                key={ghost.id}
                className="absolute z-20"
                style={{
                  width: `${GHOST_SIZE * blockSize}px`,  // GHOST_SIZE blocks wide
                  height: `${GHOST_SIZE * blockSize}px`,     // GHOST_SIZE blocks high
                  left: `${ghost.pos.x * blockSize}px`,
                  top: `${ghost.pos.y * blockSize}px`,
                  transition: 'left 180ms linear, top 180ms linear',
                  willChange: 'left, top',
                }}
              >
                <div className="w-full h-full p-0 flex items-center justify-center overflow-visible">
                  <img
                    src={ghostImage}
                    alt={ghostType?.name || 'Ghost'}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overlays */}
      {status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center flex-col z-50 animate-in fade-in">
          <h2 className="text-red-500 font-bold text-2xl mb-2 pixel-font tracking-tighter shadow-black drop-shadow-md">GAME OVER</h2>
        </div>
      )}

      {status === GameStatus.WON && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center flex-col z-50">
          <img src={boroplusImage} alt="BoroPlus" className="max-w-[100%] max-h-[60%] object-contain mb-4 rounded-lg shadow-lg" />
          <h2 className="text-yellow-400 font-bold text-2xl pixel-font drop-shadow-md">MOISTURIZED!</h2>
        </div>
      )}

      {status === GameStatus.IDLE && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <p className="text-white font-bold text-xs pixel-font animate-pulse text-center leading-loose">
            PRESS START<br />TO HYDRATE
          </p>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
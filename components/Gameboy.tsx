import React, { useEffect } from 'react';
import { useGameLogic } from '../hooks/useGameLogic';
import DPad from './DPad';
import GameScreen from './GameScreen';
import { Direction } from '../types';

const Gameboy: React.FC = () => {
  const { gameState, setDirection, restartGame, startGame } = useGameLogic();

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': setDirection(Direction.UP); break;
        case 'ArrowDown': setDirection(Direction.DOWN); break;
        case 'ArrowLeft': setDirection(Direction.LEFT); break;
        case 'ArrowRight': setDirection(Direction.RIGHT); break;
        case 'r': case 'R': restartGame(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setDirection, restartGame]);

  return (
    <div className="relative flex flex-col items-center w-full h-full max-w-[500px] max-h-full sm:aspect-[9/19] sm:h-auto sm:rounded-[3rem] border-0 sm:border-4 p-2 sm:p-4 mx-auto select-none overflow-hidden" style={{
      minHeight: 0,
      backgroundColor: '#0a0a0a',
      borderColor: '#0a0a0a',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    }}>
      {/* Top Detail (Speaker/Sensor) */}
      <div className="w-24 h-3 rounded-full mb-2 sm:mb-3 mt-1 relative overflow-hidden flex-shrink-0" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="absolute top-1/2 left-4 w-2 h-2 rounded-full" style={{ backgroundColor: '#0a0a0a' }}></div>
        <div className="absolute top-1/2 right-4 w-1 h-1 rounded-full" style={{ backgroundColor: '#0a0a0a' }}></div>
      </div>

      {/* Screen Bezel - Maximized for larger display */}
      <div className="w-full flex-1 sm:rounded-2xl p-2 sm:p-3 mb-1 sm:mb-2 flex flex-col flex-shrink-0 min-h-0" style={{
        backgroundColor: '#0a0a0a',
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
      }}>
        {/* The actual Game Screen */}
        <div className="flex-1 w-full sm:rounded-lg overflow-hidden border-2 sm:border-4 bg-black relative" style={{ borderColor: '#0a0a0a' }}>
          <GameScreen gameState={gameState} onStart={startGame} />
          {/* Scanlines overlay */}
          <div className="absolute inset-0 scanlines pointer-events-none opacity-30"></div>
        </div>
      </div>

      {/* Controls Area - D-Pad only */}
      <div className="w-full flex flex-col items-center justify-center pb-4 sm:pb-6 pt-2 sm:pt-4 flex-shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>

        {/* D-Pad - 2x bigger */}
        <div className="scale-[1.3] sm:scale-150 origin-center">
          <DPad onDirectionPress={setDirection} />
        </div>

        {/* Bottom Home Indicator area */}
        <div className="w-32 h-1 rounded-full mt-4 sm:mt-6 opacity-50" style={{ backgroundColor: '#0a0a0a' }}></div>
      </div>

      {/* Side buttons (Volume/Power) - Hidden on mobile */}
      <div className="hidden sm:block absolute -left-[4px] top-40 w-[4px] h-12 rounded-l-md border-l" style={{ backgroundColor: '#0a0a0a', borderColor: '#0a0a0a' }}></div>
      <div className="hidden sm:block absolute -right-[4px] top-40 w-[4px] h-16 rounded-r-md border-r" style={{ backgroundColor: '#0a0a0a', borderColor: '#0a0a0a' }}></div>
    </div>
  );
};

export default Gameboy;
import React, { useEffect } from 'react';
import { useGameLogic } from '../hooks/useGameLogic';
import DPad from './DPad';
import GameScreen from './GameScreen';
import { RotateCcw, Pause } from 'lucide-react';
import { Direction, GameStatus } from '../types';

const Gameboy: React.FC = () => {
  const { gameState, setDirection, restartGame } = useGameLogic();

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
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
    <div className="relative flex flex-col items-center w-full max-w-[400px] h-auto aspect-[9/19] bg-white rounded-[3rem] shadow-2xl border-4 border-gray-300 p-5 mx-auto select-none overflow-hidden">
      {/* Top Detail (Speaker/Sensor) */}
      <div className="w-24 h-4 bg-black rounded-full mb-4 mt-2 relative overflow-hidden flex-shrink-0">
        <div className="absolute top-1/2 left-4 w-2 h-2 rounded-full bg-blue-900/50"></div>
        <div className="absolute top-1/2 right-4 w-1 h-1 rounded-full bg-red-500/50"></div>
      </div>
      
      {/* Screen Bezel - Occupying ~60% of vertical space */}
      <div className="w-full h-[60%] bg-gray-100 rounded-2xl p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] mb-4 flex flex-col flex-shrink-0">
        {/* The actual Game Screen */}
        <div className="flex-1 w-full rounded-lg overflow-hidden border-4 border-gray-200 bg-gray-900 relative">
            <GameScreen gameState={gameState} />
            {/* Scanlines overlay */}
            <div className="absolute inset-0 scanlines pointer-events-none opacity-30"></div>
            {/* Screen Glare */}
            <div className="absolute top-0 right-0 w-[150%] h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none transform -skew-x-12"></div>
        </div>
        
        {/* Score text under screen (LCD style) */}
        <div className="mt-2 flex justify-between items-center px-2 flex-shrink-0">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Score</span>
            <span className="font-mono text-gray-800 font-bold text-lg">{gameState.score.toString().padStart(5, '0')}</span>
        </div>
      </div>

      {/* Controls Area */}
      <div className="flex-1 w-full flex flex-col items-center justify-evenly pb-6 min-h-0">
        
        {/* D-Pad - Scaled to fit comfortably */}
        <div className="scale-90 origin-center">
             <DPad onDirectionPress={setDirection} />
        </div>

        {/* Action Buttons (Start/Select/Reset) */}
        <div className="w-full flex justify-between px-8 mt-2">
            <button 
                onClick={restartGame}
                className="group flex flex-col items-center gap-1 active:opacity-70 transition-opacity"
            >
                <div className="w-12 h-4 bg-gray-200 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] flex items-center justify-center group-active:translate-y-[1px]">
                     <RotateCcw size={10} className="text-gray-400" />
                </div>
                <span className="text-[9px] font-bold text-gray-300 tracking-wider">RESET</span>
            </button>
            
             <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-4 bg-gray-200 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] flex items-center justify-center">
                    {/* Decorative speaker holes */}
                    <div className="flex gap-1">
                        <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                        <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                        <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                    </div>
                </div>
                <span className="text-[9px] font-bold text-gray-300 tracking-wider">AUDIO</span>
            </div>
        </div>

        {/* Bottom Home Indicator area */}
        <div className="w-32 h-1 bg-gray-200 rounded-full mt-auto opacity-50"></div>
      </div>
      
      {/* Side buttons (Volume/Power) - Adjusted position for new height */}
      <div className="absolute -left-[4px] top-48 w-[4px] h-16 bg-gray-300 rounded-l-md border-l border-gray-400"></div>
      <div className="absolute -right-[4px] top-48 w-[4px] h-24 bg-gray-300 rounded-r-md border-r border-gray-400"></div>
    </div>
  );
};

export default Gameboy;
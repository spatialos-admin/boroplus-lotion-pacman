import React from 'react';
import { Direction } from '../types';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DPadProps {
  onDirectionPress: (dir: Direction) => void;
}

const DPad: React.FC<DPadProps> = ({ onDirectionPress }) => {
  // Common button styles simulating the plastic button
  const buttonBaseClass = "absolute flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 active:bg-zinc-900 active:scale-95 transition-transform shadow-[inset_0_-4px_4px_rgba(0,0,0,0.5),0_4px_4px_rgba(0,0,0,0.3)] border-b-4 border-zinc-900 active:border-b-0 active:translate-y-1";
  const iconClass = "text-zinc-500 w-8 h-8 drop-shadow-md";

  // The container shape simulates the cross indentation on the device
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Background Indentation Cross */}
      <div className="absolute w-44 h-16 bg-gray-200/50 rounded-full blur-[1px]"></div>
      <div className="absolute w-16 h-44 bg-gray-200/50 rounded-full blur-[1px]"></div>
      
      {/* Center decoration */}
      <div className="absolute w-6 h-6 rounded-full bg-zinc-300 shadow-inner z-0"></div>

      {/* Buttons */}
      <button
        className={`${buttonBaseClass} -translate-y-14`}
        onPointerDown={(e) => { e.preventDefault(); onDirectionPress(Direction.UP); }}
        aria-label="Up"
      >
        <ChevronUp className={iconClass} fill="currentColor" />
      </button>

      <button
        className={`${buttonBaseClass} translate-y-14`}
        onPointerDown={(e) => { e.preventDefault(); onDirectionPress(Direction.DOWN); }}
        aria-label="Down"
      >
        <ChevronDown className={iconClass} fill="currentColor" />
      </button>

      <button
        className={`${buttonBaseClass} -translate-x-14`}
        onPointerDown={(e) => { e.preventDefault(); onDirectionPress(Direction.LEFT); }}
        aria-label="Left"
      >
        <ChevronLeft className={iconClass} fill="currentColor" />
      </button>

      <button
        className={`${buttonBaseClass} translate-x-14`}
        onPointerDown={(e) => { e.preventDefault(); onDirectionPress(Direction.RIGHT); }}
        aria-label="Right"
      >
        <ChevronRight className={iconClass} fill="currentColor" />
      </button>
    </div>
  );
};

export default DPad;
import React from 'react';
import { Direction } from '../types';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DPadProps {
  onDirectionPress: (dir: Direction) => void;
}

const DPad: React.FC<DPadProps> = ({ onDirectionPress }) => {
  // Base button styles with purple color #61259D
  const buttonBaseClass = "absolute flex items-center justify-center w-10 h-10 rounded-full active:scale-95 transition-all shadow-[inset_0_-4px_4px_rgba(0,0,0,0.5),0_4px_4px_rgba(0,0,0,0.3)] border-b-4 active:border-b-0 touch-none select-none";
  const iconClass = "text-white w-6 h-6 drop-shadow-md pointer-events-none";

  // The container shape simulates the cross indentation on the device
  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      {/* Background Indentation Cross */}
      <div className="absolute w-36 h-14 bg-black/30 rounded-full blur-[1px]"></div>
      <div className="absolute w-14 h-36 bg-black/30 rounded-full blur-[1px]"></div>

      {/* Center decoration */}
      <div className="absolute w-6 h-6 rounded-full bg-black/50 shadow-inner z-0"></div>

      {/* Buttons */}
      <button
        className={`${buttonBaseClass} -translate-y-11`}
        style={{
          backgroundColor: '#61259D',
          borderBottomColor: '#4a1d7a',
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.style.backgroundColor = '#4a1d7a';
          onDirectionPress(Direction.UP);
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          e.currentTarget.style.backgroundColor = '#61259D';
        }}
        aria-label="Up"
      >
        <ChevronUp className={iconClass} fill="currentColor" />
      </button>

      <button
        className={`${buttonBaseClass} translate-y-11`}
        style={{
          backgroundColor: '#61259D',
          borderBottomColor: '#4a1d7a',
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.style.backgroundColor = '#4a1d7a';
          onDirectionPress(Direction.DOWN);
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          e.currentTarget.style.backgroundColor = '#61259D';
        }}
        aria-label="Down"
      >
        <ChevronDown className={iconClass} fill="currentColor" />
      </button>

      <button
        className={`${buttonBaseClass} -translate-x-11`}
        style={{
          backgroundColor: '#61259D',
          borderBottomColor: '#4a1d7a',
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.style.backgroundColor = '#4a1d7a';
          onDirectionPress(Direction.LEFT);
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          e.currentTarget.style.backgroundColor = '#61259D';
        }}
        aria-label="Left"
      >
        <ChevronLeft className={iconClass} fill="currentColor" />
      </button>

      <button
        className={`${buttonBaseClass} translate-x-11`}
        style={{
          backgroundColor: '#61259D',
          borderBottomColor: '#4a1d7a',
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.style.backgroundColor = '#4a1d7a';
          onDirectionPress(Direction.RIGHT);
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          e.currentTarget.style.backgroundColor = '#61259D';
        }}
        aria-label="Right"
      >
        <ChevronRight className={iconClass} fill="currentColor" />
      </button>
    </div>
  );
};

export default DPad;
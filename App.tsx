import React from 'react';
import Gameboy from './components/Gameboy';

function App() {
  return (
    <div className="h-full w-full bg-white flex items-center justify-center p-0 sm:p-4 overflow-hidden" style={{ height: '100dvh', minHeight: '100%' }}>
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[20%] w-[70%] h-[70%] bg-purple-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[20%] -right-[20%] w-[70%] h-[70%] bg-blue-900/20 rounded-full blur-[120px]"></div>
      </div>

      <Gameboy />
    </div>
  );
}

export default App;
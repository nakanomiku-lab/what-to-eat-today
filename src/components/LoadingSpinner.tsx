
import React from 'react';
import { ChefHat, Sparkles } from 'lucide-react';

interface LoadingSpinnerProps {
  message: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center animate-fadeIn min-h-[300px]">
      <div className="relative mb-8">
        {/* Background Aura */}
        <div className="absolute inset-0 bg-orange-200 rounded-full blur-2xl opacity-50 animate-pulse"></div>
        
        {/* Bouncing Chef Hat */}
        <div className="relative z-10 animate-bounce">
            <ChefHat size={80} className="text-orange-500 drop-shadow-lg" />
        </div>
        
        {/* Decorative Sparkles */}
        <div className="absolute -top-4 -right-6 animate-pulse">
            <Sparkles size={24} className="text-yellow-400" />
        </div>
        <div className="absolute top-12 -left-8 animate-ping delay-300">
            <Sparkles size={16} className="text-yellow-400" />
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-gray-800 font-serif tracking-wide mb-3">
        美食正在飞速加载...
      </h3>
      <div className="bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-orange-100 shadow-sm">
        <p className="text-orange-600 font-medium flex items-center justify-center">
          <span className="mr-2 animate-spin">🥘</span>
          {message || "大厨正在为您配菜..."}
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;

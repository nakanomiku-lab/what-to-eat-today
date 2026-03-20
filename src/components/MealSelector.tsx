import React from 'react';
import { MealType } from '../types';
import { Sun, CloudSun, Moon } from 'lucide-react';

interface MealSelectorProps {
  onSelect: (meal: MealType) => void;
  disabled: boolean;
}

const MealSelector: React.FC<MealSelectorProps> = ({ onSelect, disabled }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-4">
      <button
        onClick={() => onSelect(MealType.BREAKFAST)}
        disabled={disabled}
        className="group relative overflow-hidden bg-orange-100 hover:bg-orange-200 transition-all duration-300 rounded-3xl p-8 flex flex-col items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-1"
      >
        <div className="bg-orange-500 text-white p-4 rounded-full mb-4 shadow-md group-hover:scale-110 transition-transform">
          <Sun size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">早餐</h2>
        <p className="text-gray-600 text-sm">开启元气满满的一天</p>
      </button>

      <button
        onClick={() => onSelect(MealType.LUNCH)}
        disabled={disabled}
        className="group relative overflow-hidden bg-green-100 hover:bg-green-200 transition-all duration-300 rounded-3xl p-8 flex flex-col items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-1"
      >
        <div className="bg-green-600 text-white p-4 rounded-full mb-4 shadow-md group-hover:scale-110 transition-transform">
          <CloudSun size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">午餐</h2>
        <p className="text-gray-600 text-sm">补充能量，享受美味</p>
      </button>

      <button
        onClick={() => onSelect(MealType.DINNER)}
        disabled={disabled}
        className="group relative overflow-hidden bg-indigo-100 hover:bg-indigo-200 transition-all duration-300 rounded-3xl p-8 flex flex-col items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-1"
      >
        <div className="bg-indigo-600 text-white p-4 rounded-full mb-4 shadow-md group-hover:scale-110 transition-transform">
          <Moon size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">晚餐</h2>
        <p className="text-gray-600 text-sm">犒劳自己，放松心情</p>
      </button>
    </div>
  );
};

export default MealSelector;

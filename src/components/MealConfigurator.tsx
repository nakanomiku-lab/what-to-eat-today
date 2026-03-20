
import React from 'react';
import { MealConfig, MealType } from '../types';
import { Minus, Plus, Utensils } from 'lucide-react';

interface MealConfiguratorProps {
  mealType: MealType;
  config: MealConfig;
  setConfig: React.Dispatch<React.SetStateAction<MealConfig>>;
  onConfirm: () => void;
  onCancel: () => void;
}

const MealConfigurator: React.FC<MealConfiguratorProps> = ({ mealType, config, setConfig, onConfirm, onCancel }) => {
  const updateCount = (type: keyof MealConfig, delta: number) => {
    setConfig(prev => ({
      ...prev,
      [type]: Math.max(0, Math.min(5, prev[type] + delta))
    }));
  };

  const Counter = ({ label, value, type }: { label: string, value: number, type: keyof MealConfig }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <span className="text-gray-700 font-medium">{label}</span>
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => updateCount(type, -1)}
          disabled={value === 0}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Minus size={16} />
        </button>
        <span className="w-6 text-center font-bold text-lg text-gray-800">{value}</span>
        <button 
          onClick={() => updateCount(type, 1)}
          disabled={value >= 5}
          className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={onCancel}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative animate-scaleIn z-10">
        <div className="text-center mb-6">
          <Utensils size={48} className="mx-auto text-orange-500 mb-2" />
          <h2 className="text-2xl font-bold text-gray-800">定制您的{mealType}</h2>
          <p className="text-gray-500 text-sm">想吃几菜几汤？由您决定</p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 mb-8">
          <Counter label="🥩 荤菜 (硬菜)" value={config.meatCount} type="meatCount" />
          <Counter label="🥬 素菜 (时蔬)" value={config.vegCount} type="vegCount" />
          <Counter label="🍲 汤品" value={config.soupCount} type="soupCount" />
        </div>

        <div className="flex space-x-4">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all active:scale-95"
          >
            开始生成
          </button>
        </div>
      </div>
    </div>
  );
};

export default MealConfigurator;

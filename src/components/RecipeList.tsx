import React from 'react';
import { Recipe } from '../types';
import { ArrowLeft, ChevronRight, ChefHat } from 'lucide-react';

interface RecipeListProps {
  results: Recipe[];
  onSelect: (recipe: Recipe) => void;
  onBack: () => void;
  query: string;
}

const RecipeList: React.FC<RecipeListProps> = ({ results, onSelect, onBack, query }) => {
  return (
    <div className="w-full max-w-4xl px-4 animate-fadeIn flex flex-col flex-1">
      <div className="flex items-center mb-6">
        <button 
          onClick={onBack}
          className="mr-4 p-2 bg-white rounded-full shadow hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">
          "{query}" 的搜索结果 ({results.length})
        </h2>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 bg-white/60 backdrop-blur rounded-3xl shadow-sm border border-white">
          <ChefHat size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700">没有找到相关菜品</h3>
          <p className="text-gray-500 mt-2">试试搜索"鸡蛋"、"猪肉"或其他常见食材？</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
          {results.map((recipe, index) => (
            <button
              key={index}
              onClick={() => onSelect(recipe)}
              className="flex items-center justify-between p-5 bg-white/90 backdrop-blur rounded-2xl shadow-sm hover:shadow-md border border-white hover:border-orange-200 transition-all hover:-translate-y-0.5 text-left group"
            >
              <div className="flex-1 pr-4">
                <h3 className="font-bold text-gray-800 text-lg group-hover:text-orange-600 transition-colors">{recipe.dishName}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{recipe.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                    {recipe.ingredients.slice(0, 3).map((ing, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded-md">{ing.split(' ')[0]}</span>
                    ))}
                    {recipe.ingredients.length > 3 && <span className="text-xs px-2 py-0.5 text-gray-400">...</span>}
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-orange-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipeList;
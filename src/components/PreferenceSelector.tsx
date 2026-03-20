
import React, { useState, useEffect } from 'react';
import { COMMON_INGREDIENTS } from '../services/geminiService';
import { ThumbsUp, ThumbsDown, RefreshCw, Heart, Ban, RotateCcw } from 'lucide-react';
import { UserPreferences } from '../types';

interface PreferenceSelectorProps {
  onChange: (prefs: UserPreferences) => void;
  preferences: UserPreferences;
}

const PreferenceSelector: React.FC<PreferenceSelectorProps> = ({ onChange, preferences }) => {
  // Destructure for easier access
  const { likes, dislikes } = preferences;

  // Store currently displayed options (Random pool)
  const [currentLikeOptions, setCurrentLikeOptions] = useState<string[]>([]);
  const [currentDislikeOptions, setCurrentDislikeOptions] = useState<string[]>([]);

  // Helper to get random ingredients
  const getRandomIngredients = (count: number, exclude: string[] = []) => {
    const pool = COMMON_INGREDIENTS.filter(i => !exclude.includes(i));
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Logic to refresh options
  const refreshLikes = () => {
    setCurrentLikeOptions(getRandomIngredients(6, [...dislikes, ...likes])); 
  };

  const refreshDislikes = () => {
    setCurrentDislikeOptions(getRandomIngredients(6, [...likes, ...dislikes]));
  };

  // Initialize options ONLY on mount
  useEffect(() => {
    // We use a local variable for the initial exclusion based on props at mount time
    const initialExclude = [...preferences.likes, ...preferences.dislikes];
    
    // Generate initial options
    const pool = COMMON_INGREDIENTS.filter(i => !initialExclude.includes(i));
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    
    // Split pool for likes/dislikes display to avoid duplicates between them initially
    const splitIndex = Math.floor(shuffled.length / 2);
    setCurrentLikeOptions(shuffled.slice(0, 6));
    setCurrentDislikeOptions(shuffled.slice(6, 12));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const toggleLike = (item: string) => {
    let newLikes: string[];
    let newDislikes = [...dislikes];

    if (likes.includes(item)) {
      newLikes = likes.filter(i => i !== item);
    } else {
      newLikes = [...likes, item];
      // If it was in dislikes, remove it
      if (dislikes.includes(item)) {
          newDislikes = dislikes.filter(i => i !== item);
      }
    }
    onChange({ likes: newLikes, dislikes: newDislikes });
  };

  const toggleDislike = (item: string) => {
    let newDislikes: string[];
    let newLikes = [...likes];

    if (dislikes.includes(item)) {
      newDislikes = dislikes.filter(i => i !== item);
    } else {
      newDislikes = [...dislikes, item];
      // If it was in likes, remove it
      if (likes.includes(item)) {
          newLikes = likes.filter(i => i !== item);
      }
    }
    onChange({ likes: newLikes, dislikes: newDislikes });
  };

  const handleReset = () => {
      onChange({ likes: [], dislikes: [] });
  };

  return (
    <div className="w-full max-w-4xl px-4 animate-fadeIn mb-8">
      <div className="bg-white/80 backdrop-blur rounded-3xl shadow-lg p-6 border border-white/50 relative">
        
        {/* Reset Button (Top Right) */}
        <button 
            onClick={handleReset}
            className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors flex items-center space-x-1 text-sm"
            title="重置所有偏好"
        >
            <RotateCcw size={14} />
            <span>重置</span>
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">口味偏好 (可选)</h2>
          <p className="text-gray-500 text-sm">先选好想吃什么，再点击上方按钮生成</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
            {/* Section: Love to eat */}
            <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2 text-green-600 font-bold">
                        <Heart className="fill-current" size={20} />
                        <span>爱吃</span>
                    </div>
                    <button 
                        onClick={refreshLikes}
                        className="flex items-center text-xs text-gray-500 hover:text-orange-600 transition-colors"
                    >
                        <RefreshCw size={14} className="mr-1" />
                        换一批
                    </button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                    {currentLikeOptions.map((item) => (
                        <button
                            key={item}
                            onClick={() => toggleLike(item)}
                            className={`py-2 px-1 rounded-lg text-xs md:text-sm font-medium transition-all ${
                                likes.includes(item)
                                ? 'bg-green-100 text-green-700 ring-2 ring-green-500 shadow-sm'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {item}
                            {likes.includes(item) && <ThumbsUp size={12} className="inline ml-1 mb-0.5" />}
                        </button>
                    ))}
                </div>
                
                {/* Selected Tags Display */}
                {likes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 min-h-[24px]">
                        {likes.map(item => (
                            <span key={item} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 animate-scaleIn">
                                {item}
                                <button onClick={() => toggleLike(item)} className="ml-1 text-green-600 hover:text-green-800">×</button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="hidden md:block w-px bg-gray-200"></div>

            {/* Section: Hate to eat */}
            <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2 text-red-500 font-bold">
                        <Ban size={20} />
                        <span>不爱吃</span>
                    </div>
                    <button 
                        onClick={refreshDislikes}
                        className="flex items-center text-xs text-gray-500 hover:text-orange-600 transition-colors"
                    >
                        <RefreshCw size={14} className="mr-1" />
                        换一批
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {currentDislikeOptions.map((item) => (
                        <button
                            key={item}
                            onClick={() => toggleDislike(item)}
                            className={`py-2 px-1 rounded-lg text-xs md:text-sm font-medium transition-all ${
                                dislikes.includes(item)
                                ? 'bg-red-100 text-red-700 ring-2 ring-red-500 shadow-sm'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {item}
                            {dislikes.includes(item) && <ThumbsDown size={12} className="inline ml-1 mb-0.5" />}
                        </button>
                    ))}
                </div>

                 {/* Selected Tags Display */}
                 {dislikes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 min-h-[24px]">
                        {dislikes.map(item => (
                            <span key={item} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 animate-scaleIn">
                                {item}
                                <button onClick={() => toggleDislike(item)} className="ml-1 text-red-600 hover:text-red-800">×</button>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default PreferenceSelector;

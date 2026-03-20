
import React, { useState, useEffect } from 'react';
import { MealType, AppState, GeneratedDish, Recipe, UserPreferences, HistoryItem, MealConfig } from './types';
import MealSelector from './components/MealSelector';
import DishDisplay from './components/DishDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import SearchBar from './components/SearchBar';
import RecipeList from './components/RecipeList';
import PreferenceSelector from './components/PreferenceSelector';
import MealConfigurator from './components/MealConfigurator';
import { generateRecipe, generateSingleSideDish, searchRecipes } from './services/geminiService';
import { UtensilsCrossed, History, X, Clock, Trash2 } from 'lucide-react';
import { triggerHaptic } from './utils/sound';

const App: React.FC = () => {
  // 1. Initial state
  const [appState, setAppState] = useState<AppState>('SELECTION');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(MealType.LUNCH);
  const [currentDishes, setCurrentDishes] = useState<GeneratedDish[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Track if the current meal is a standard generated meal (supports replacement) 
  const [isGeneratedMeal, setIsGeneratedMeal] = useState(false);

  // Anti-repetition buffer: Stores the names of the last ~12 dishes shown
  const [seenDishes, setSeenDishes] = useState<string[]>([]);
  
  // Config state
  const [showConfig, setShowConfig] = useState(false);
  const [mealConfig, setMealConfig] = useState<MealConfig>({
      meatCount: 1,
      vegCount: 1,
      soupCount: 1
  });

  // State with LocalStorage
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
      const saved = localStorage.getItem('wte_preferences');
      try {
        return saved ? JSON.parse(saved) : { likes: [], dislikes: [] };
      } catch (e) {
        return { likes: [], dislikes: [] };
      }
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
      const saved = localStorage.getItem('wte_history');
      try {
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
  });

  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  // Persistence Effects
  useEffect(() => {
      localStorage.setItem('wte_preferences', JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
      localStorage.setItem('wte_history', JSON.stringify(history));
  }, [history]);

  const handlePreferenceChange = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
  };

  const handleMealSelect = (meal: MealType) => {
    setSelectedMeal(meal);
    triggerHaptic();
    
    // 清除搜索相关状态，确保返回逻辑正确
    setSearchResults([]);
    setSearchQuery('');

    if (meal === MealType.BREAKFAST) {
        setAppState('LOADING');
        fetchDish(meal, preferences);
    } else {
        setShowConfig(true);
    }
  };

  const handleConfigConfirm = () => {
      triggerHaptic();
      setShowConfig(false);
      setAppState('LOADING');
      fetchDish(selectedMeal, preferences, mealConfig);
  };

  const addToHistory = (meal: MealType, dishes: GeneratedDish[], configUsed?: MealConfig) => {
      const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          mealType: meal,
          dishes: dishes,
          config: configUsed
      };
      setHistory(prev => {
          const newHistory = [newItem, ...prev].slice(0, 15);
          return newHistory;
      });
  };

  const updateSeenDishes = (newDishes: Recipe[]) => {
      setSeenDishes(prev => {
          const newNames = newDishes.map(d => d.dishName);
          const combined = [...prev, ...newNames];
          return combined.slice(-12); 
      });
  };

  const fetchDish = async (
      meal: MealType, 
      activePreferences?: UserPreferences, 
      config?: MealConfig,
      excludedNames: string[] = [] 
  ) => {
    try {
      if (meal === MealType.LUNCH) {
         setLoadingMessage('正在为您搭配营养午餐...');
      } else if (meal === MealType.DINNER) {
         setLoadingMessage('正在为您策划丰盛晚餐...');
      } else {
         setLoadingMessage('正在翻阅美味食谱...');
      }
      
      const prefsToUse = activePreferences || preferences;
      const allExclusions = Array.from(new Set([...seenDishes, ...excludedNames]));

      const recipes = await generateRecipe(meal, prefsToUse, config, allExclusions);
      
      if (recipes.length === 0) {
          throw new Error("No recipes generated");
      }

      const dishesWithImages = prepareDishes(recipes);

      setCurrentDishes(dishesWithImages);
      setIsGeneratedMeal(true); 
      updateSeenDishes(recipes);
      setAppState('RESULT');
      addToHistory(meal, dishesWithImages, config);

    } catch (error) {
      console.error(error);
      alert("抱歉，大厨有点忙，请稍后再试。");
      setAppState('SELECTION');
    }
  };

  const prepareDishes = (recipes: Recipe[]): GeneratedDish[] => {
    return recipes.map(recipe => {
        const encodedName = encodeURIComponent(recipe.dishName);
        const imageUrl = `https://tse2.mm.bing.net/th?q=${encodedName} 高清美食摄影&w=800&h=600&c=7&rs=1&p=0`;
        return {
            ...recipe,
            imageUrl,
        };
    });
  };

  const handleReplaceSingleDish = async (index: number) => {
     let category: 'meat' | 'veg' | 'soup' | 'breakfast';
     if (selectedMeal === MealType.BREAKFAST) {
         category = 'breakfast';
     } else {
        if (index < mealConfig.meatCount) category = 'meat';
        else if (index < mealConfig.meatCount + mealConfig.vegCount) category = 'veg';
        else category = 'soup';
     }

     try {
         setReplacingIndex(index); 
         const currentNames = currentDishes.map(d => d.dishName);
         const allExclusions = Array.from(new Set([...seenDishes, ...currentNames]));
         const newRecipe = await generateSingleSideDish(category, preferences, allExclusions);
         
         if (!newRecipe) {
             throw new Error("No more dishes available");
         }

         const newPreparedDish = prepareDishes([newRecipe])[0];
         const updatedDishes = [...currentDishes];
         updatedDishes[index] = newPreparedDish;
         updateSeenDishes([newRecipe]);

         setTimeout(() => {
            setCurrentDishes(updatedDishes);
            setReplacingIndex(null); 
         }, 300);
         
     } catch (e) {
         console.error("Failed to replace dish", e);
         setReplacingIndex(null);
         alert("哎呀，这个分类下暂时没有更多符合您口味的推荐了。");
     }
  };

  const handleSearch = (query: string) => {
    // 强制立即重置 mealType，确保在渲染搜索结果页之前，上下文已变为 SEARCH
    setSelectedMeal(MealType.SEARCH);
    const results = searchRecipes(query);
    setSearchResults(results);
    setSearchQuery(query);
    setAppState('SEARCH');
  };

  const handleSelectFromResult = (recipe: Recipe) => {
    // 立即执行状态切换和类型重置
    setSelectedMeal(MealType.SEARCH);
    setLoadingMessage('正在准备菜品详情...');
    setAppState('LOADING');
    
    // 延迟是为了给 Loading 动画一个展示机会，并在此时再次确保 selectedMeal 的正确性
    setTimeout(() => {
        setSelectedMeal(MealType.SEARCH); // 再次加固
        const dishes = prepareDishes([recipe]);
        setCurrentDishes(dishes);
        setIsGeneratedMeal(false); 
        updateSeenDishes([recipe]);
        setAppState('RESULT');
        addToHistory(MealType.SEARCH, dishes); 
    }, 400);
  };

  const handleBack = () => {
    setAppState('SELECTION');
    setCurrentDishes([]);
    setSearchQuery(''); 
    setSearchResults([]); 
    setSelectedMeal(MealType.LUNCH);
  };

  const handleRestart = () => {
    setAppState('SELECTION');
    setCurrentDishes([]);
    setSeenDishes([]); 
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMeal(MealType.LUNCH);
  }

  const handleBackToSearch = () => {
    setSelectedMeal(MealType.SEARCH); 
    setAppState('SEARCH');
    setCurrentDishes([]);
  };

  const handleRegenerate = () => {
    setAppState('LOADING');
    const currentNames = currentDishes.map(d => d.dishName);
    fetchDish(selectedMeal, preferences, mealConfig, currentNames);
  };

  const restoreHistory = (item: HistoryItem) => {
      setSelectedMeal(item.mealType);
      setCurrentDishes(item.dishes);
      if (item.config) setMealConfig(item.config);
      setIsGeneratedMeal(!!item.config || item.mealType === MealType.BREAKFAST); 
      setAppState('RESULT');
      setShowHistory(false);
      triggerHaptic();
  };

  const handleClearHistory = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      if (!confirmClearHistory) {
          setConfirmClearHistory(true);
          setTimeout(() => setConfirmClearHistory(false), 3000);
      } else {
          setHistory([]);
          setSeenDishes([]);
          setConfirmClearHistory(false);
          triggerHaptic();
      }
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center py-10 px-4 md:px-8 bg-orange-50 relative overflow-x-hidden"
      style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}
    >
      
      {showConfig && (
          <MealConfigurator 
            mealType={selectedMeal} 
            config={mealConfig} 
            setConfig={setMealConfig} 
            onConfirm={handleConfigConfirm}
            onCancel={() => setShowConfig(false)}
          />
      )}

      <button 
        onClick={() => {
            setShowHistory(true);
            setConfirmClearHistory(false);
        }}
        className="fixed top-6 right-6 z-40 bg-white p-3 rounded-full shadow-lg text-gray-600 hover:text-orange-600 hover:scale-110 transition-all"
        title="历史足迹"
      >
          <Clock size={24} />
      </button>

      {showHistory && (
          <div className="fixed inset-0 z-50 flex justify-end">
              <div 
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
                  onClick={() => setShowHistory(false)}
              ></div>
              
              <div className="relative w-full max-sm:w-full max-w-sm bg-white h-full shadow-2xl p-6 overflow-y-auto animate-slideInRight flex flex-col">
                  <div className="flex items-center justify-between mb-8 flex-shrink-0">
                      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                          <History className="mr-2 text-orange-500" />
                          历史足迹
                      </h2>
                      <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-100 rounded-full">
                          <X size={24} className="text-gray-500" />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {history.length === 0 ? (
                        <div className="text-center text-gray-400 mt-20">
                            <Clock size={48} className="mx-auto mb-4 opacity-30" />
                            <p>暂无记录，快去生成美食吧！</p>
                        </div>
                    ) : (
                        <div className="space-y-4 pb-4">
                            {history.map((item) => (
                                <div 
                                    key={item.id}
                                    onClick={() => restoreHistory(item)}
                                    className="bg-orange-50 p-4 rounded-2xl cursor-pointer hover:bg-orange-100 hover:shadow-md transition-all border border-orange-100 group relative"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                            item.mealType === MealType.BREAKFAST ? 'bg-yellow-100 text-yellow-700' :
                                            item.mealType === MealType.LUNCH ? 'bg-green-100 text-green-700' :
                                            item.mealType === MealType.SEARCH ? 'bg-orange-100 text-orange-700' :
                                            'bg-indigo-100 text-indigo-700'
                                        }`}>
                                            {item.mealType}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <div className="text-gray-800 font-medium text-sm line-clamp-2">
                                        {item.dishes.map(d => d.dishName).join(' + ')}
                                    </div>
                                    {item.config && (
                                        <div className="mt-2 flex gap-2 text-xs text-gray-500">
                                            {item.config.meatCount > 0 && <span>🥩{item.config.meatCount}</span>}
                                            {item.config.vegCount > 0 && <span>🥬{item.config.vegCount}</span>}
                                            {item.config.soupCount > 0 && <span>🍲{item.config.soupCount}</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                  </div>
                  
                  {history.length > 0 && (
                      <div className="pt-4 mt-auto border-t border-gray-100">
                          <button 
                            onClick={handleClearHistory}
                            className={`w-full py-3 rounded-xl transition-all font-medium text-sm flex items-center justify-center ${
                                confirmClearHistory 
                                ? 'bg-red-500 text-white hover:bg-red-600 shadow-md scale-105' 
                                : 'text-red-500 bg-red-50 hover:bg-red-100'
                            }`}
                          >
                              {confirmClearHistory ? (
                                  <>确定清空？(点击确认)</>
                              ) : (
                                  <><Trash2 size={16} className="mr-1" /> 清空历史</>
                              )}
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      <header className={`mb-8 text-center animate-slideDown transition-all ${appState !== 'SELECTION' ? 'scale-90' : ''}`}>
        <div 
            className="inline-flex items-center justify-center p-3 bg-orange-500 rounded-2xl shadow-lg mb-4 text-white rotate-3 cursor-pointer hover:rotate-6 transition-transform"
            onClick={handleRestart}
        >
          <UtensilsCrossed size={32} />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-2">
          今天吃什么
        </h1>
        {appState === 'SELECTION' && (
          <p className="text-gray-600 text-lg">
             先设置偏好，再选择时段，为您生成专属美味
          </p>
        )}
      </header>

      <main className="w-full flex flex-col items-center justify-start flex-1">
        
        {appState === 'SELECTION' && (
          <>
            <SearchBar 
                onSearch={handleSearch} 
                onSuggestionSelect={handleSelectFromResult}
                initialValue=""
            />
            <div className="mb-10 w-full flex justify-center">
                <MealSelector onSelect={handleMealSelect} disabled={false} />
            </div>
            <PreferenceSelector 
                onChange={handlePreferenceChange} 
                preferences={preferences} 
            />
          </>
        )}

        {appState === 'SEARCH' && (
          <>
            <SearchBar 
                onSearch={handleSearch} 
                onSuggestionSelect={handleSelectFromResult} 
                initialValue={searchQuery}
            />
            <RecipeList 
                results={searchResults} 
                onSelect={handleSelectFromResult} 
                onBack={handleBack} 
                query={searchQuery}
            />
          </>
        )}

        {appState === 'LOADING' && (
          <LoadingSpinner message={loadingMessage} />
        )}

        {appState === 'RESULT' && currentDishes.length > 0 && (
          <DishDisplay 
            dish={currentDishes} 
            mealType={selectedMeal} 
            onBack={searchResults.length > 0 ? handleBackToSearch : handleBack}
            onRegenerate={handleRegenerate}
            onReplaceDish={isGeneratedMeal ? handleReplaceSingleDish : undefined}
            replacingIndex={replacingIndex}
          />
        )}
      </main>

      <footer className="mt-12 text-gray-400 text-sm pb-4">
        精选美味推荐
      </footer>
    </div>
  );
};

export default App;

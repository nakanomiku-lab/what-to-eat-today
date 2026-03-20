
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChefHat, ChevronRight } from 'lucide-react';
import { Recipe } from '../types';
import { searchRecipes } from '../services/geminiService';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onSuggestionSelect?: (recipe: Recipe) => void;
  initialValue?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onSuggestionSelect, initialValue = '' }) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal state if initialValue changes (e.g., when navigating back)
  useEffect(() => {
      setQuery(initialValue);
  }, [initialValue]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (val.trim().length > 0) {
      const results = searchRecipes(val);
      setSuggestions(results.slice(0, 6)); // Limit to 6 suggestions for cleaner UI
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (recipe: Recipe) => {
    setQuery(recipe.dishName);
    setShowSuggestions(false);
    if (onSuggestionSelect) {
      onSuggestionSelect(recipe);
    } else {
      // Fallback if no select handler is provided
      onSearch(recipe.dishName);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    // If clearing in a search results view, user might expect to stay there or reset.
    // For now, we just clear the input.
  };

  return (
    <div ref={wrapperRef} className="w-full max-w-md mx-auto mb-10 relative z-20">
      <form onSubmit={handleSubmit} className="relative group">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (query.trim().length > 0) setShowSuggestions(true);
          }}
          placeholder="搜索食材（如：鸡蛋、土豆）或菜名..."
          className="w-full pl-12 pr-12 py-4 rounded-full border-2 border-orange-200 focus:border-orange-500 focus:outline-none shadow-md hover:shadow-lg transition-all bg-white/90 backdrop-blur-sm text-lg placeholder-gray-400"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={22} />
        
        {query && (
            <button 
                type="button"
                onClick={clearSearch}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 p-1 transition-colors"
                title="清除"
            >
                <X size={18} />
            </button>
        )}

        <button 
          type="submit"
          disabled={!query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Search size={18} />
        </button>
      </form>

      {/* Autocomplete Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-orange-100 animate-slideDown origin-top">
            <ul className="divide-y divide-gray-50">
                {suggestions.map((recipe, index) => (
                    <li key={index}>
                        <button
                            onClick={() => handleSuggestionClick(recipe)}
                            className="w-full text-left px-5 py-3 hover:bg-orange-50 transition-colors flex items-center justify-between group"
                        >
                            <div className="flex items-center overflow-hidden">
                                <div className="bg-orange-100 p-1.5 rounded-full mr-3 text-orange-500 group-hover:bg-orange-200 transition-colors shrink-0">
                                    <ChefHat size={16} />
                                </div>
                                <div className="truncate">
                                    <p className="font-bold text-gray-800 text-sm md:text-base group-hover:text-orange-700 transition-colors truncate">
                                        {recipe.dishName}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                        {recipe.ingredients.slice(0, 3).join(' ')}...
                                    </p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-400 transform group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                        </button>
                    </li>
                ))}
            </ul>
        </div>
      )}
    </div>
  );
};

export default SearchBar;


import React, { useState } from 'react';
import { GeneratedDish, MealType } from '../types';
import { ArrowLeft, ChefHat, Utensils, List, ChevronDown, ChevronUp, RefreshCw, Sparkles, Check, Copy, ClipboardList } from 'lucide-react';
import { triggerHaptic } from '../utils/sound';

interface DishDisplayProps {
  dish: GeneratedDish | GeneratedDish[]; // Support single or array
  mealType: MealType;
  onBack: () => void;
  onRegenerate: () => void;
  onReplaceDish?: (index: number) => void;
  replacingIndex?: number | null;
}

// Helper component for interactive list items (Ingredients/Steps)
const InteractiveItem: React.FC<{ text: string; index: number; type: 'ingredient' | 'step' }> = ({ text, index, type }) => {
    const [checked, setChecked] = useState(false);

    const handleToggle = () => {
        setChecked(!checked);
        triggerHaptic();
    };

    return (
        <li 
            onClick={handleToggle}
            className={`flex items-start p-2 rounded-lg cursor-pointer transition-all select-none group ${
                checked ? 'bg-gray-50' : 'hover:bg-orange-50/50'
            }`}
        >
            <div className={`mt-1.5 mr-3 flex-shrink-0 transition-all ${
                checked ? 'text-gray-300' : type === 'ingredient' ? 'text-orange-400' : 'text-orange-500'
            }`}>
                {type === 'ingredient' ? (
                    <div className={`w-2 h-2 rounded-full ${checked ? 'bg-gray-300' : 'bg-orange-400'}`} />
                ) : (
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
                        checked ? 'bg-gray-200 text-white' : 'bg-orange-100 text-orange-600'
                    }`}>
                        {checked ? <Check size={12} /> : index + 1}
                    </span>
                )}
            </div>
            <span className={`text-sm md:text-base transition-colors ${
                checked ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-700'
            }`}>
                {text}
            </span>
        </li>
    );
};

const SingleDishCard: React.FC<{ 
    dish: GeneratedDish, 
    expanded?: boolean, 
    toggleExpand?: () => void,
    onReplace?: () => void,
    isReplacing?: boolean
}> = ({ dish, expanded, toggleExpand, onReplace, isReplacing }) => {
    const [activeTab, setActiveTab] = useState<'ingredients' | 'steps'>('ingredients');
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        const text = `🍳 ${dish.dishName}\n\n📝 ${dish.description}\n\n🥕 食材：\n${dish.ingredients.join('\n')}\n\n👨‍🍳 步骤：\n${dish.steps.join('\n')}\n\n(来自：今天吃什么 App)`;
        
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            triggerHaptic();
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <div className={`bg-white rounded-3xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 relative ${expanded ? 'ring-2 ring-orange-400 transform scale-[1.02] z-10' : 'z-0'}`}>
            
            {/* Loading Overlay */}
            {isReplacing && (
                <div className="absolute inset-0 z-50 bg-orange-50/95 backdrop-blur-sm flex flex-col items-center justify-center animate-fadeIn cursor-wait">
                    <div className="relative mb-4">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-orange-200 rounded-full blur-xl opacity-60 animate-pulse"></div>
                        <div className="relative z-10 animate-bounce">
                             <ChefHat size={56} className="text-orange-500 drop-shadow-md" />
                        </div>
                        <div className="absolute -top-2 -right-4 animate-ping duration-1000">
                            <Sparkles size={20} className="text-yellow-400" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-orange-600 mb-2 font-serif tracking-wide animate-pulse">
                        美食正在飞速加载...
                    </h3>
                </div>
            )}

            {/* Action Buttons (Absolute) - Copy & Replace */}
            <div className="absolute top-3 right-3 z-20 flex gap-2">
                <button 
                    onClick={handleCopy}
                    className="bg-white/90 backdrop-blur p-2 rounded-full shadow-md text-gray-600 hover:text-orange-600 hover:bg-white transition-all hover:scale-110"
                    title="复制这道菜的做法"
                >
                    {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>

                {onReplace && !isReplacing && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic();
                            onReplace();
                        }}
                        className="bg-white/90 backdrop-blur p-2 rounded-full shadow-md text-gray-600 hover:text-orange-600 hover:bg-white transition-all hover:scale-110"
                        title="换这道菜"
                    >
                        <RefreshCw size={18} />
                    </button>
                )}
            </div>

            {/* Image Area */}
            <div className="relative h-48 md:h-56 bg-gray-200 overflow-hidden cursor-pointer group" onClick={toggleExpand}>
                {dish.imageUrl ? (
                    <img
                        src={dish.imageUrl}
                        alt={dish.dishName}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Utensils size={48} />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 p-5 w-full">
                    <h2 className="text-2xl font-bold text-white mb-1 shadow-sm leading-tight">{dish.dishName}</h2>
                    <p className="text-white/90 text-sm line-clamp-1">{dish.description}</p>
                </div>

                {toggleExpand && (
                    <div className="absolute bottom-4 right-4 text-white/80 animate-bounce">
                        {expanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                )}
            </div>

            {/* Content Area */}
            {expanded && (
                <div className="p-5 animate-slideDown flex-1 flex flex-col">
                    {/* Tabs */}
                    <div className="flex space-x-2 mb-4 bg-gray-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('ingredients')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ingredients' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Utensils size={14} className="inline mr-1" /> 食材
                        </button>
                        <button 
                            onClick={() => setActiveTab('steps')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'steps' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <List size={14} className="inline mr-1" /> 步骤
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        {activeTab === 'ingredients' ? (
                            <ul className="space-y-1">
                                {dish.ingredients.map((ing, i) => (
                                    <InteractiveItem key={i} text={ing} index={i} type="ingredient" />
                                ))}
                            </ul>
                        ) : (
                            <ul className="space-y-2">
                                {dish.steps.map((step, i) => (
                                    <InteractiveItem key={i} text={step} index={i} type="step" />
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const DishDisplay: React.FC<DishDisplayProps> = ({ 
    dish, 
    mealType, 
    onBack, 
    onRegenerate, 
    onReplaceDish,
    replacingIndex 
}) => {
    const dishes = Array.isArray(dish) ? dish : [dish];
    const [expandedIndex, setExpandedIndex] = useState<number | null>(dishes.length === 1 ? 0 : null);
    const [menuCopied, setMenuCopied] = useState(false);
    
    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
        triggerHaptic();
    };

    const handleCopyMenu = async () => {
        const dishList = dishes.map((d, i) => `${i + 1}. ${d.dishName} - ${d.description}`).join('\n');
        const text = `📅 今日${mealType}菜单：\n\n${dishList}\n\n(来自：今天吃什么 App)`;

        try {
            await navigator.clipboard.writeText(text);
            setMenuCopied(true);
            triggerHaptic();
            setTimeout(() => setMenuCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy menu', err);
        }
    };

    return (
        <div className="w-full max-w-6xl animate-fadeIn flex flex-col flex-1 pb-20 relative">
            
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 px-4 gap-4">
                <button 
                    onClick={() => {
                        triggerHaptic();
                        onBack();
                    }}
                    className="self-start md:self-auto flex items-center text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm hover:bg-gray-50 transition-all"
                >
                    <ArrowLeft size={18} className="mr-1" />
                    返回
                </button>
                
                <div className="flex items-center justify-end space-x-2 md:space-x-3 w-full md:w-auto">
                    <span className="text-gray-500 text-sm font-medium bg-orange-50 px-3 py-1 rounded-full border border-orange-100 whitespace-nowrap hidden sm:inline-block">
                        {mealType}
                    </span>

                    {/* Copy Menu Button */}
                    <button 
                        onClick={handleCopyMenu}
                        className={`flex items-center px-4 py-2 rounded-full shadow-sm border transition-all active:scale-95 ${
                            menuCopied 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'
                        }`}
                    >
                        {menuCopied ? <Check size={18} className="mr-1" /> : <ClipboardList size={18} className="mr-1" />}
                        <span className="text-sm font-bold">{menuCopied ? '已复制' : '复制菜单'}</span>
                    </button>

                    {/* Regenerate Button */}
                    <button 
                        onClick={() => {
                            triggerHaptic();
                            onRegenerate();
                        }}
                        className="flex items-center bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-orange-600 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <RefreshCw size={18} className="mr-1" />
                        <span className="hidden sm:inline">整桌重开</span>
                        <span className="sm:hidden">换一桌</span>
                    </button>
                </div>
            </div>

            {/* Grid Layout - Added items-start to prevent stretching */}
            <div className={`grid gap-6 px-4 ${
                dishes.length === 1 
                ? 'grid-cols-1 max-w-2xl mx-auto w-full' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start'
            }`}>
                {dishes.map((d, index) => (
                    <SingleDishCard 
                        key={`${d.dishName}-${index}`} // Use index to force re-render if dish changes
                        dish={d} 
                        expanded={dishes.length === 1 || expandedIndex === index}
                        toggleExpand={() => toggleExpand(index)}
                        onReplace={onReplaceDish ? () => onReplaceDish(index) : undefined}
                        isReplacing={replacingIndex === index}
                    />
                ))}
            </div>
        </div>
    );
};

export default DishDisplay;

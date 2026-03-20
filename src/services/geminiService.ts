
import { Recipe, MealType, UserPreferences, MealConfig } from "../types";
import { 
  BREAKFAST_RECIPES, 
  MEAT_RECIPES, 
  VEG_RECIPES, 
  SOUP_RECIPES,
  COMMON_INGREDIENTS 
} from "../data/recipes";

export { COMMON_INGREDIENTS };

const calculateScore = (recipe: Recipe, preferences: UserPreferences, searchTerm?: string): number => {
    // 1. 禁忌一票否决
    const hasDisliked = preferences.dislikes.some(dislike => 
        recipe.ingredients.some(i => i.includes(dislike)) || recipe.dishName.includes(dislike)
    );
    if (hasDisliked) return -Infinity; 

    let score = 0;

    // 2. 搜索精确度提升
    if (searchTerm) {
        const matchName = recipe.dishName.includes(searchTerm);
        if (matchName) score += 200;
    }

    // 3. 核心加权：适度提高权重至 250
    // 之前的 100 分在 50 分的随机扰动面前不够强势，250 分可以确保偏好更明显
    if (preferences.likes.length > 0) {
        preferences.likes.forEach(like => {
            if (recipe.ingredients.some(i => i.includes(like)) || recipe.dishName.includes(like)) {
                score += 250; 
            }
        });
    }

    // 4. 拟人化随机扰动 (0-50分)
    score += Math.random() * 50; 
    
    return score;
};

const smartRecommendMultipleLocal = (
    recipes: Recipe[], 
    preferences: UserPreferences, 
    count: number, 
    excludedNames: string[] = []
): Recipe[] => {
    if (count <= 0) return [];
    
    // 1. 排除最近看过的菜品
    let candidates = recipes.filter(r => !excludedNames.includes(r.dishName));

    if (candidates.length < count) {
        const missingCount = count - candidates.length;
        const oldItems = recipes.filter(r => excludedNames.includes(r.dishName)).sort(() => 0.5 - Math.random());
        candidates = [...candidates, ...oldItems.slice(0, missingCount)];
    }

    // 2. 打分
    let scoredRecipes = candidates.map(r => ({
        recipe: r,
        score: calculateScore(r, preferences)
    })).filter(item => item.score > -100);

    // 3. 排序
    scoredRecipes.sort((a, b) => b.score - a.score);

    // 4. 维持策略：从前 50% 的高分菜品中进行随机抽取
    const poolSize = Math.max(count, Math.floor(scoredRecipes.length * 0.5));
    const pool = scoredRecipes.slice(0, poolSize);
    
    const finalSelection = pool.sort(() => 0.5 - Math.random()).slice(0, count).map(i => i.recipe);
    
    return finalSelection;
};

export const generateRecipe = async (
    mealType: MealType, 
    preferences: UserPreferences, 
    config?: MealConfig,
    excludedNames: string[] = []
): Promise<Recipe[]> => {
    
    await new Promise(resolve => setTimeout(resolve, 600));

    if (mealType === MealType.BREAKFAST) {
        return smartRecommendMultipleLocal(BREAKFAST_RECIPES, preferences, 1, excludedNames);
    } else {
        const meatCount = config?.meatCount ?? 1;
        const vegCount = config?.vegCount ?? 1;
        const soupCount = config?.soupCount ?? 1;

        const meats = smartRecommendMultipleLocal(MEAT_RECIPES, preferences, meatCount, excludedNames);
        const vegs = smartRecommendMultipleLocal(VEG_RECIPES, preferences, vegCount, excludedNames);
        const soups = smartRecommendMultipleLocal(SOUP_RECIPES, preferences, soupCount, excludedNames);

        return [...meats, ...vegs, ...soups];
    }
};

export const generateSingleSideDish = async (
    category: 'meat' | 'veg' | 'soup' | 'breakfast', 
    preferences: UserPreferences,
    excludedNames: string[] = []
): Promise<Recipe> => {
    
    await new Promise(resolve => setTimeout(resolve, 400));

    let sourceList: Recipe[] = [];
    if (category === 'meat') sourceList = MEAT_RECIPES;
    else if (category === 'veg') sourceList = VEG_RECIPES;
    else if (category === 'soup') sourceList = SOUP_RECIPES;
    else if (category === 'breakfast') sourceList = BREAKFAST_RECIPES;

    const results = smartRecommendMultipleLocal(sourceList, preferences, 1, excludedNames);
    return results[0];
};

export const searchRecipes = (query: string): Recipe[] => {
    const allRecipes = [...BREAKFAST_RECIPES, ...MEAT_RECIPES, ...VEG_RECIPES, ...SOUP_RECIPES];
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.trim().length > 0);
    if (terms.length === 0) return [];

    return allRecipes.filter(r => {
        return terms.every(term => 
            r.dishName.includes(term) || r.ingredients.some(i => i.includes(term))
        );
    });
};

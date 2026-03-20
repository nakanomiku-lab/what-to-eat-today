
export enum MealType {
  BREAKFAST = '早餐',
  LUNCH = '午餐',
  DINNER = '晚餐',
  SEARCH = '搜索推荐',
}

export interface Recipe {
  dishName: string;
  description: string;
  ingredients: string[];
  steps: string[];
}

export interface GeneratedDish extends Recipe {
  imageUrl?: string;
}

export interface UserPreferences {
  likes: string[];
  dislikes: string[];
}

export interface MealConfig {
  meatCount: number;
  vegCount: number;
  soupCount: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  mealType: MealType;
  dishes: GeneratedDish[];
  config?: MealConfig;
}

export type AppState = 'SELECTION' | 'LOADING' | 'RESULT' | 'SEARCH';

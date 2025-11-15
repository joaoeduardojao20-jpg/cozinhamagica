
export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients: string;
  preparation: string;
  notes?: string;
  prepTime?: string;
  difficulty?: string;
  extraSuggestions?: string;
  isAiGenerated: boolean;
  createdAt: string;
}

export interface ShoppingList {
  id: string;
  recipeId: string;
  recipeTitle: string;
  market?: string;
  store?: string;
  date?: string;
  time?: string;
  extraItems?: string;
  ingredients: string;
  createdAt: string;
}

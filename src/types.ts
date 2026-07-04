export interface Ingredient {
  name: string;
  qty: string;
  estimatedCost: number; // in USD
  category: 'Produce' | 'Pantry' | 'Dairy & Eggs' | 'Meat & Seafood' | 'Bakery' | 'Other';
  checked?: boolean;
}

export interface Meal {
  name: string;
  ingredients: Ingredient[];
  instructions: string[];
  substitutions: { [ingredientName: string]: string };
}

export interface MealPlan {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  theme: string;
  maxBudget: number;
}

export interface BudgetAnalysis {
  status: 'under' | 'equal' | 'over';
  difference: number;
  message: string;
  suggestions: string[];
}

export interface SubstitutionQueryResponse {
  ingredient: string;
  alternatives: {
    name: string;
    ratio: string;
    notes: string;
    estimatedCostImpact: 'cheaper' | 'similar' | 'more expensive';
  }[];
}

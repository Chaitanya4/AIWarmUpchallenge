import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChefHat, 
  ShoppingCart, 
  DollarSign, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  Search, 
  Copy, 
  FileCode, 
  Terminal, 
  ArrowRight,
  Plus,
  Trash2,
  ListOrdered,
  HelpCircle,
  TrendingDown,
  ThumbsUp,
  Info
} from "lucide-react";
import { Ingredient, Meal, MealPlan, BudgetAnalysis, SubstitutionQueryResponse } from "./types";

// Prerecorded local default plan to display immediately
const INITIAL_PLAN: MealPlan = {
  theme: "Healthy & Wholesome",
  maxBudget: 15,
  breakfast: {
    name: "Avocado Toast with Poached Eggs",
    ingredients: [
      { name: "Sourdough Bread", qty: "2 slices", estimatedCost: 1.20, category: "Bakery", checked: false },
      { name: "Avocado", qty: "1 whole", estimatedCost: 1.50, category: "Produce", checked: false },
      { name: "Eggs", qty: "2 large", estimatedCost: 0.60, category: "Dairy & Eggs", checked: false },
      { name: "Cherry Tomatoes", qty: "50g", estimatedCost: 0.80, category: "Produce", checked: false }
    ],
    instructions: [
      "Toast the sourdough bread slices until golden brown and crisp.",
      "Mash the avocado with salt, pepper, and a tiny squeeze of lemon juice.",
      "Poach the eggs in simmering water with a splash of vinegar for exactly 3 minutes.",
      "Spread mashed avocado over toast, top with poached eggs, and add halved cherry tomatoes."
    ],
    substitutions: {
      "Sourdough Bread": "Gluten-free bread, rye, or whole-wheat toast",
      "Eggs": "Silken tofu scramble or sliced smoked salmon"
    }
  },
  lunch: {
    name: "Mediterranean Quinoa Salad",
    ingredients: [
      { name: "Quinoa", qty: "100g", estimatedCost: 1.00, category: "Pantry", checked: false },
      { name: "Cucumber", qty: "1/2 piece", estimatedCost: 0.50, category: "Produce", checked: false },
      { name: "Feta Cheese", qty: "50g", estimatedCost: 1.20, category: "Dairy & Eggs", checked: false },
      { name: "Olive Oil", qty: "2 tbsp", estimatedCost: 0.40, category: "Pantry", checked: false },
      { name: "Chickpeas", qty: "1/2 can", estimatedCost: 0.60, category: "Pantry", checked: false }
    ],
    instructions: [
      "Rinse and boil quinoa in salted water for 12-15 minutes, then drain and cool.",
      "Finely dice the cucumber and crumble the feta cheese.",
      "Drain and rinse the canned chickpeas.",
      "Toss cooled quinoa, cucumber, chickpeas, and feta with olive oil, salt, pepper, and lemon juice."
    ],
    substitutions: {
      "Quinoa": "Couscous, brown rice, farro, or bulgur wheat",
      "Feta Cheese": "Goat cheese, olives, vegan feta, or salted tofu cubes"
    }
  },
  dinner: {
    name: "Lemon Herb Baked Salmon",
    ingredients: [
      { name: "Salmon Fillet", qty: "200g", estimatedCost: 5.50, category: "Meat & Seafood", checked: false },
      { name: "Asparagus", qty: "1 bunch", estimatedCost: 2.00, category: "Produce", checked: false },
      { name: "Lemon", qty: "1 whole", estimatedCost: 0.50, category: "Produce", checked: false },
      { name: "Garlic", qty: "2 cloves", estimatedCost: 0.20, category: "Produce", checked: false }
    ],
    instructions: [
      "Preheat your oven to 400°F (200°C).",
      "Place the salmon fillet and trimmed asparagus spears on a parchment-lined baking sheet.",
      "Drizzle with olive oil, minced garlic, lemon juice, and season with sea salt and cracked pepper.",
      "Bake for 12-15 minutes until salmon flakes easily with a fork."
    ],
    substitutions: {
      "Salmon Fillet": "Chicken breast, trout, firm block tofu, or pork chop",
      "Asparagus": "Broccoli florets, fresh green beans, or sliced zucchini"
    }
  }
};

const STREAMLIT_CODE = `import streamlit as st
import json
import os

st.set_page_config(page_title="Cooking Planner & Budget Feasibility", page_icon="🍳", layout="wide")

# (Full Streamlit application is available in the root app.py file)
# Paste this file or check out the repository to run!
`;

export default function App() {
  const [activeTab, setActiveTab] = useState<'planner' | 'code'>('planner');
  const [theme, setTheme] = useState<string>('healthy');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [maxBudget, setMaxBudget] = useState<number>(15);
  const [mealPlan, setMealPlan] = useState<MealPlan>(INITIAL_PLAN);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingPhrase, setLoadingPhrase] = useState<string>("Simmering ideas...");
  const [copied, setCopied] = useState<boolean>(false);

  // Substitutions widget states
  const [subSearch, setSubSearch] = useState<string>('');
  const [subResponse, setSubResponse] = useState<SubstitutionQueryResponse | null>(null);
  const [subLoading, setSubLoading] = useState<boolean>(false);

  // Budget Analysis state
  const [budgetAnalysis, setBudgetAnalysis] = useState<BudgetAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);

  // Active cooking plan checkboxes (meal instruction checkboxes)
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  // Aggregated grocery list checkbox tracker
  const [groceryChecks, setGroceryChecks] = useState<Record<string, boolean>>({});

  // Dynamic loading phrases
  const phrases = [
    "Simmering delicious ideas...",
    "Slicing seasonal onions...",
    "Estimating ingredient pricing...",
    "Balancing the budget books...",
    "Plating a perfect experience...",
    "Sourcing local alternatives..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      let index = 0;
      interval = setInterval(() => {
        index = (index + 1) % phrases.length;
        setLoadingPhrase(phrases[index]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Recalculate feasibility when plan or budget changes
  useEffect(() => {
    analyzeBudget();
  }, [mealPlan, maxBudget]);

  const handleGeneratePlan = async () => {
    setLoading(true);
    setGroceryChecks({});
    setCompletedSteps({});
    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, customPrompt, maxBudget }),
      });
      const data = await response.json();
      if (data && (data.breakfast || data.lunch || data.dinner)) {
        // Adapt standard substitutions array if returned by Gemini, into type Record<string, string>
        const adaptMeal = (meal: any) => {
          if (!meal) return meal;
          const adaptedSubs: Record<string, string> = {};
          if (Array.isArray(meal.substitutions)) {
            meal.substitutions.forEach((item: any) => {
              if (item.ingredient && item.replacement) {
                adaptedSubs[item.ingredient] = item.replacement;
              }
            });
            meal.substitutions = adaptedSubs;
          }
          return meal;
        };

        const adaptedPlan: MealPlan = {
          theme: data.theme || theme,
          maxBudget,
          breakfast: adaptMeal(data.breakfast),
          lunch: adaptMeal(data.lunch),
          dinner: adaptMeal(data.dinner),
        };
        setMealPlan(adaptedPlan);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubstitution = async () => {
    if (!subSearch.trim()) return;
    setSubLoading(true);
    try {
      const response = await fetch("/api/suggest-substitution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredient: subSearch }),
      });
      const data = await response.json();
      setSubResponse(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubLoading(false);
    }
  };

  const analyzeBudget = async () => {
    setAnalysisLoading(true);
    const allIngredients = [
      ...(mealPlan.breakfast?.ingredients || []),
      ...(mealPlan.lunch?.ingredients || []),
      ...(mealPlan.dinner?.ingredients || [])
    ];
    // Calculate total cost based only on items NOT checked off (assumed already in pantry)
    const activeIngredients = allIngredients.filter(item => {
      const key = `${item.name}-${item.qty}`;
      return !groceryChecks[key];
    });
    const totalCost = activeIngredients.reduce((sum, item) => sum + item.estimatedCost, 0);

    try {
      const response = await fetch("/api/analyze-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          totalCost, 
          maxBudget, 
          items: activeIngredients.map(i => i.name) 
        }),
      });
      const data = await response.json();
      setBudgetAnalysis(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const toggleGrocery = (item: Ingredient) => {
    const key = `${item.name}-${item.qty}`;
    setGroceryChecks(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      // Budget re-analysis runs automatically due to useEffect on groceryChecks changes
      return updated;
    });
  };

  // Aggregated Ingredients calculation
  const allIngredients = [
    ...(mealPlan.breakfast?.ingredients || []).map(i => ({...i, meal: 'breakfast'})),
    ...(mealPlan.lunch?.ingredients || []).map(i => ({...i, meal: 'lunch'})),
    ...(mealPlan.dinner?.ingredients || []).map(i => ({...i, meal: 'dinner'}))
  ];

  const totalPlanCost = allIngredients.reduce((sum, item) => sum + item.estimatedCost, 0);
  const activeCost = allIngredients
    .filter(item => !groceryChecks[`${item.name}-${item.qty}`])
    .reduce((sum, item) => sum + item.estimatedCost, 0);

  const budgetDifference = maxBudget - activeCost;
  const isOverBudget = budgetDifference < 0;

  // Group by food category
  const groupedGrocery = allIngredients.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof allIngredients>);

  const handleCopyCode = async () => {
    try {
      // Fetch the full content of app.py to copy! This is incredible.
      const response = await fetch("/app.py");
      const fullText = await response.text();
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
      await navigator.clipboard.writeText(STREAMLIT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#1e293b] font-sans antialiased">
      {/* Premium Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0f172a] text-white rounded-xl shadow-sm">
              <ChefHat className="h-6 w-6" id="logo-icon" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#0f172a]" id="app-title">
                Sauté & Save
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Cooking Planner & Budget Feasibility Engine
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('planner')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'planner'
                  ? 'bg-white text-[#0f172a] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Interactive Planner
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'code'
                  ? 'bg-white text-[#0f172a] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileCode className="h-4 w-4 text-emerald-600" />
              Python / Streamlit Export
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'planner' ? (
            <motion.div
              key="planner"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Plan Control & Curated Dishes */}
              <div className="lg:col-span-7 space-y-8">
                {/* Master Config Panel */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <h2 className="font-semibold text-gray-950 text-base">Plan Your Ideal Culinary Day</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Budget Setting Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <label className="font-medium text-gray-700">Daily Target Budget</label>
                        <span className="font-bold text-[#0f172a] bg-slate-100 px-2 py-0.5 rounded-md">${maxBudget}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={maxBudget}
                        onChange={(e) => setMaxBudget(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0f172a]"
                      />
                      <p className="text-[11px] text-gray-400">Total recipe costs will adjust to this threshold.</p>
                    </div>

                    {/* Pre-defined Preset Themes */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Preset Theme</label>
                      <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#0f172a] shadow-xs focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a]"
                      >
                        <option value="healthy">🥗 Healthy & Wholesome</option>
                        <option value="quick">⚡ Quick & Easy (Under 20 Mins)</option>
                        <option value="budget">💰 Budget Friendly / Student Pack</option>
                      </select>
                    </div>
                  </div>

                  {/* AI Craving Generator Box */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">AI Prompt Adjustments (Optional)</label>
                    <textarea
                      placeholder="e.g. 'Low carb keto diet, dairy-free options, high-protein recipes'"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-[#0f172a] shadow-xs focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] min-h-[70px] resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleGeneratePlan}
                    disabled={loading}
                    className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>{loadingPhrase}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span>Curate Custom Recipes & Budget Plan</span>
                      </>
                    )}
                  </button>
                </div>

                {/* The Meal Plan Cards */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-950 flex items-center gap-2">
                      <ListOrdered className="h-5 w-5 text-[#0f172a]" />
                      Your Culinary Blueprint: <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{mealPlan.theme}</span>
                    </h3>
                  </div>

                  {(['breakfast', 'lunch', 'dinner'] as const).map((period) => {
                    const meal = mealPlan[period];
                    if (!meal) return null;

                    const tagColors = {
                      breakfast: "bg-amber-50 text-amber-700 border-amber-100",
                      lunch: "bg-blue-50 text-blue-700 border-blue-100",
                      dinner: "bg-pink-50 text-pink-700 border-pink-100"
                    };

                    return (
                      <motion.div
                        key={period}
                        layout
                        className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden"
                      >
                        {/* Meal Title Bar */}
                        <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-md border ${tagColors[period]}`}>
                              {period}
                            </span>
                            <h4 className="font-bold text-gray-900 text-base">{meal.name}</h4>
                          </div>
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                            Est. Ingredients: {meal.ingredients.length}
                          </span>
                        </div>

                        {/* Content Grid */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                          {/* Left: Ingredient Preview */}
                          <div className="md:col-span-5 space-y-3">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">Recipe Ingredients</h5>
                            <ul className="space-y-2">
                              {meal.ingredients.map((ing, i) => {
                                const isChecked = groceryChecks[`${ing.name}-${ing.qty}`];
                                return (
                                  <li 
                                    key={i} 
                                    onClick={() => toggleGrocery(ing)}
                                    className="flex items-center justify-between text-xs cursor-pointer group hover:bg-slate-50 p-1.5 rounded-lg transition-all"
                                  >
                                    <span className={`flex items-center gap-2 font-medium ${isChecked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${isChecked ? 'bg-gray-300' : 'bg-slate-600'}`} />
                                      {ing.qty} {ing.name}
                                    </span>
                                    <span className="font-mono text-[11px] text-gray-400 font-bold group-hover:text-gray-900">
                                      ${ing.estimatedCost.toFixed(2)}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>

                          {/* Right: Step Checklists */}
                          <div className="md:col-span-7 space-y-3 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">Preparation Steps</h5>
                            <ol className="space-y-3">
                              {meal.instructions.map((step, idx) => {
                                const stepKey = `${period}-${idx}`;
                                const isStepDone = !!completedSteps[stepKey];
                                return (
                                  <li 
                                    key={idx}
                                    onClick={() => setCompletedSteps(prev => ({...prev, [stepKey]: !isStepDone}))}
                                    className={`text-xs flex items-start gap-2.5 cursor-pointer select-none p-1 rounded-lg transition-all ${
                                      isStepDone ? 'opacity-55 text-gray-400 line-through bg-slate-50' : 'hover:bg-slate-50 text-gray-700'
                                    }`}
                                  >
                                    <span className={`mt-0.5 flex-shrink-0 h-4.5 w-4.5 flex items-center justify-center rounded-md border text-[10px] font-bold ${
                                      isStepDone ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-300 text-gray-500'
                                    }`}>
                                      {isStepDone ? "✓" : idx + 1}
                                    </span>
                                    <span className="leading-relaxed font-medium">{step}</span>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                        </div>

                        {/* Substitutions quicktip */}
                        {meal.substitutions && Object.keys(meal.substitutions).length > 0 && (
                          <div className="bg-slate-50 px-6 py-4 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-500">
                            <Info className="h-4 w-4 text-[#0f172a] mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-bold text-[#0f172a]">Smart substitutions available: </span>
                              {Object.entries(meal.substitutions).map(([ing, rep], i) => (
                                <span key={ing}>
                                  {i > 0 && " • "}
                                  <span className="font-semibold text-slate-700">{ing}</span> &rarr; <span className="text-gray-600 italic">{rep}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Dynamic Shopping list, Substitutions finder, Budget analytics */}
              <div className="lg:col-span-5 space-y-8">
                {/* Budget Feasibility Dashboard Card */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#0f172a] text-base">Feasibility Engine</h3>
                    <span className="text-xs bg-slate-100 font-semibold text-gray-500 px-2 py-1 rounded-md">Real-Time</span>
                  </div>

                  {/* Pricing Comparison Stats */}
                  <div className="grid grid-cols-2 gap-4 border-b border-gray-50 pb-5">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-gray-400">Total Plan Value</span>
                      <p className="text-xl font-black text-gray-400 line-through">${totalPlanCost.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1 bg-emerald-50/50 p-2 rounded-xl">
                      <span className="text-xs font-bold text-emerald-700">Actual Cost (Needed)</span>
                      <p className="text-2xl font-black text-emerald-600">${activeCost.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Budget comparison progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-500">Shopping Expense</span>
                      <span className={isOverBudget ? "text-red-600" : "text-emerald-600"}>
                        {((activeCost / maxBudget) * 100).toFixed(0)}% of limit
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min((activeCost / maxBudget) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Feasibility Summary Feedback Panel */}
                  <div className="pt-2">
                    {isOverBudget ? (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 text-xs text-red-700">
                        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        <div className="space-y-1.5">
                          <p className="font-bold">Over Target Budget limit by ${Math.abs(budgetDifference).toFixed(2)}</p>
                          <p className="leading-relaxed">Check off items you already have in your pantry to decrease checkout expenses, or click below for optimization ideas.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3 text-xs text-emerald-700">
                        <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        <div className="space-y-1.5">
                          <p className="font-bold">Under Budget! Feasibility is Excellent</p>
                          <p className="leading-relaxed">You saved ${budgetDifference.toFixed(2)}! Your current plan fits your wallet parameters perfectly.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom AI optimization tips block */}
                  {budgetAnalysis && (
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <TrendingDown className="h-4 w-4 text-[#0f172a]" />
                        <span className="text-xs font-bold text-[#0f172a]">Smart Optimization Suggestions</span>
                      </div>
                      <p className="text-xs text-slate-600 italic leading-relaxed">{budgetAnalysis.message}</p>
                      <ul className="space-y-2 pt-1">
                        {budgetAnalysis.suggestions.slice(0, 3).map((tip, idx) => (
                          <li key={idx} className="text-xs text-slate-500 flex items-start gap-1.5 leading-relaxed">
                            <span className="text-[#0f172a] font-bold mt-0.5">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Master Interactive Grocery Checklist */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-emerald-600" />
                      <h3 className="font-bold text-gray-950 text-base">Department Grocery List</h3>
                    </div>
                    {allIngredients.length > 0 && (
                      <button 
                        onClick={() => setGroceryChecks({})}
                        className="text-xs text-gray-400 hover:text-gray-900 font-semibold"
                      >
                        Reset Checks
                      </button>
                    )}
                  </div>

                  {allIngredients.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No ingredients in current plan.</p>
                  ) : (
                    <div className="space-y-5 max-h-[360px] overflow-y-auto pr-1">
                      {(Object.entries(groupedGrocery) as [string, any][]).map(([category, items]) => (
                        <div key={category} className="space-y-2.5">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            {category}
                          </span>
                          <div className="space-y-1.5">
                            {items.map((item, idx) => {
                              const key = `${item.name}-${item.qty}`;
                              const isChecked = !!groceryChecks[key];
                              return (
                                <label 
                                  key={idx}
                                  className={`flex items-center justify-between text-xs p-2 rounded-lg border border-transparent transition-all cursor-pointer ${
                                    isChecked 
                                      ? 'bg-slate-50 border-gray-100 text-gray-400 line-through' 
                                      : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleGrocery(item)}
                                      className="h-4 w-4 rounded-md border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                                    />
                                    <span className="font-semibold">{item.qty} {item.name}</span>
                                  </div>
                                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-500">
                                    ${item.estimatedCost.toFixed(2)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-emerald-50/40 p-3.5 rounded-xl text-center text-[11px] text-emerald-800 leading-relaxed font-semibold">
                    💡 Checking items removes them from the cart total. Perfect to filter things you already own!
                  </div>
                </div>

                {/* Intelligent Substitution Hub */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-bold text-gray-950 text-base">Interactive Substitution Finder</h3>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Out of eggs, butter, or buttermilk? Enter any ingredient below to source optimal budget-friendly alternatives instantly.
                  </p>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="e.g., buttermilk, eggs, heavy cream"
                        value={subSearch}
                        onChange={(e) => setSubSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchSubstitution()}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-xs text-[#0f172a] shadow-xs focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a]"
                      />
                    </div>
                    <button
                      onClick={handleSearchSubstitution}
                      disabled={subLoading}
                      className="bg-[#0f172a] hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-80"
                    >
                      {subLoading ? "Searching..." : "Search"}
                    </button>
                  </div>

                  {subResponse && (
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3.5 border border-gray-100 max-h-[300px] overflow-y-auto">
                      <div className="text-xs">
                        <span className="font-bold text-slate-500">Alternatives for: </span>
                        <span className="font-extrabold text-[#0f172a] bg-slate-200 px-2 py-0.5 rounded-md">{subResponse.ingredient}</span>
                      </div>
                      <div className="space-y-3">
                        {subResponse.alternatives.map((alt, idx) => (
                          <div key={idx} className="text-xs border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">{alt.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                alt.estimatedCostImpact === 'cheaper' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : alt.estimatedCostImpact === 'similar' 
                                    ? 'bg-slate-200 text-slate-800' 
                                    : 'bg-amber-100 text-amber-800'
                              }`}>
                                {alt.estimatedCostImpact}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 font-semibold">Ratio: {alt.ratio}</div>
                            <p className="text-[11px] text-gray-600 leading-relaxed italic">{alt.notes}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            /* Streamlit / Python Code Presentation tab */
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-8 max-w-4xl mx-auto"
            >
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-emerald-600" />
                    <h2 className="font-bold text-gray-950 text-base">Python & Streamlit Source Code</h2>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied!" : "Copy Code"}
                  </button>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Below is the complete, production-ready python source code utilizing the latest unified <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-emerald-600">google-genai</code> SDK and Streamlit components. You can find this identical script inside the root directory file <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-[#0f172a]">/app.py</code> as well.
                </p>

                {/* Code Window */}
                <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                  <div className="bg-slate-800/80 px-4 py-2 flex items-center justify-between border-b border-slate-700/50">
                    <span className="text-[11px] font-mono font-bold text-gray-400">app.py</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                  <pre className="p-4 overflow-x-auto text-xs text-emerald-400 font-mono leading-relaxed max-h-[400px]">
                    <code>{`import streamlit as st
import json
import os

# Custom styles, responsive grid-layout, integrated Gemini logic
# (Double click app.py in file system to view or download full 400 lines!)
# Complete logic with recipes, checklist category grouping, and budget sliders!

st.title("🍳 Cooking Planner & Budget Feasibility")
st.markdown("Produce healthy meal plans, substitutions, and target budget logic...")
`}</code>
                  </pre>
                </div>
              </div>

              {/* Step-by-Step setup guide */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-6">
                <h3 className="font-bold text-gray-950 text-base">Deployment and Execution Blueprint</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="h-8 w-8 rounded-full bg-slate-100 text-[#0f172a] font-bold flex items-center justify-center text-sm border border-slate-200">1</div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#0f172a]">Setup Local Workspace</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Download the <code className="bg-slate-100 px-1 rounded font-mono">app.py</code> file. Install requirements in your terminal:
                      <br />
                      <code className="block bg-slate-900 text-slate-100 p-2 rounded-lg mt-2 font-mono text-[10px]">pip install streamlit google-genai</code>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="h-8 w-8 rounded-full bg-slate-100 text-[#0f172a] font-bold flex items-center justify-center text-sm border border-slate-200">2</div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#0f172a]">Link to GitHub Repo</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Initialize git, add your files, and push to a remote repository on GitHub:
                      <br />
                      <code className="block bg-slate-900 text-slate-100 p-2 rounded-lg mt-2 font-mono text-[10px]">git init && git add .<br />git commit -m "initial commit"</code>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="h-8 w-8 rounded-full bg-slate-100 text-[#0f172a] font-bold flex items-center justify-center text-sm border border-slate-200">3</div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#0f172a]">Deploy Streamlit Cloud</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Log into <span className="font-semibold text-[#0f172a]">share.streamlit.io</span>, click 'New App', and connect your GitHub repo. Paste your <code className="bg-slate-100 px-1 rounded font-mono">GEMINI_API_KEY</code> in advanced settings. Done!
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                  <HelpCircle className="h-4.5 w-4.5 text-[#0f172a] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0f172a]">Note regarding Vercel deployment:</span> While Vercel is outstanding for Next.js/React websites (such as this web client), Streamlit requires stateful Python sockets that work best natively on Streamlit Community Cloud (completely free) or Heroku/Render container instances.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. Using mock fallback mode.");
      throw new Error("GEMINI_API_KEY_MISSING");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// -------------------------------------------------------------
// Fallback / Pre-cooked Mock Data for graceful degraded service
// -------------------------------------------------------------
const MOCK_PLANS: Record<string, any> = {
  healthy: {
    theme: "Healthy & Wholesome",
    breakfast: {
      name: "Avocado Toast with Poached Eggs",
      ingredients: [
        { name: "Sourdough Bread", qty: "2 slices", estimatedCost: 1.2, category: "Bakery" },
        { name: "Avocado", qty: "1 whole", estimatedCost: 1.5, category: "Produce" },
        { name: "Eggs", qty: "2 large", estimatedCost: 0.6, category: "Dairy & Eggs" },
        { name: "Cherry Tomatoes", qty: "50g", estimatedCost: 0.8, category: "Produce" }
      ],
      instructions: [
        "Toast the sourdough bread slices until golden brown.",
        "Mash the avocado with salt, pepper, and a squeeze of lemon juice.",
        "Poach the eggs in simmering water with a splash of vinegar for 3 minutes.",
        "Spread mashed avocado over toast, top with poached eggs and halved cherry tomatoes."
      ],
      substitutions: [
        { ingredient: "Sourdough Bread", replacement: "Gluten-free bread or whole-wheat toast" },
        { ingredient: "Eggs", replacement: "Silken tofu scramble or sliced smoked salmon" }
      ]
    },
    lunch: {
      name: "Mediterranean Quinoa Salad",
      ingredients: [
        { name: "Quinoa", qty: "100g", estimatedCost: 1.0, category: "Pantry" },
        { name: "Cucumber", qty: "1/2 piece", estimatedCost: 0.5, category: "Produce" },
        { name: "Feta Cheese", qty: "50g", estimatedCost: 1.2, category: "Dairy & Eggs" },
        { name: "Olive Oil", qty: "2 tbsp", estimatedCost: 0.4, category: "Pantry" },
        { name: "Chickpeas", qty: "1/2 can", estimatedCost: 0.6, category: "Pantry" }
      ],
      instructions: [
        "Rinse and boil quinoa in salted water for 12-15 minutes, then let cool.",
        "Dice the cucumber and crumble the feta cheese.",
        "Drain and rinse the canned chickpeas.",
        "Toss quinoa, cucumber, chickpeas, and feta with olive oil, salt, and pepper."
      ],
      substitutions: [
        { ingredient: "Quinoa", replacement: "Couscous, brown rice, or bulgur wheat" },
        { ingredient: "Feta Cheese", replacement: "Goat cheese, olives, or vegan feta" }
      ]
    },
    dinner: {
      name: "Lemon Herb Baked Salmon",
      ingredients: [
        { name: "Salmon Fillet", qty: "200g", estimatedCost: 5.5, category: "Meat & Seafood" },
        { name: "Asparagus", qty: "1 bunch", estimatedCost: 2.0, category: "Produce" },
        { name: "Lemon", qty: "1 whole", estimatedCost: 0.5, category: "Produce" },
        { name: "Garlic", qty: "2 cloves", estimatedCost: 0.2, category: "Produce" }
      ],
      instructions: [
        "Preheat oven to 400°F (200°C).",
        "Place salmon fillet and trimmed asparagus on a baking sheet.",
        "Drizzle with olive oil, minced garlic, lemon juice, and season with salt and pepper.",
        "Bake for 12-15 minutes until salmon flakes easily with a fork."
      ],
      substitutions: [
        { ingredient: "Salmon Fillet", replacement: "Chicken breast, trout, or firm block tofu" },
        { ingredient: "Asparagus", replacement: "Broccoli florets, green beans, or zucchini slices" }
      ]
    }
  },
  quick: {
    theme: "Quick & Easy (Under 20 Mins)",
    breakfast: {
      name: "Banana Peanut Butter Oatmeal",
      ingredients: [
        { name: "Rolled Oats", qty: "1 cup", estimatedCost: 0.5, category: "Pantry" },
        { name: "Banana", qty: "1 whole", estimatedCost: 0.3, category: "Produce" },
        { name: "Peanut Butter", qty: "2 tbsp", estimatedCost: 0.4, category: "Pantry" },
        { name: "Milk", qty: "1 cup", estimatedCost: 0.5, category: "Dairy & Eggs" }
      ],
      instructions: [
        "In a microwave-safe bowl, combine oats and milk.",
        "Microwave on high for 2 minutes, stirring halfway.",
        "Slice the banana and stir peanut butter into the hot oatmeal.",
        "Top with banana slices and a pinch of cinnamon."
      ],
      substitutions: [
        { ingredient: "Peanut Butter", replacement: "Almond butter, sunflower seed butter, or tahini" },
        { ingredient: "Milk", replacement: "Almond milk, soy milk, oat milk, or water" }
      ]
    },
    lunch: {
      name: "Toasted Caprese Panini",
      ingredients: [
        { name: "Ciabatta Roll", qty: "1 piece", estimatedCost: 1.0, category: "Bakery" },
        { name: "Mozzarella Cheese", qty: "60g", estimatedCost: 1.2, category: "Dairy & Eggs" },
        { name: "Tomato", qty: "1 slice", estimatedCost: 0.4, category: "Produce" },
        { name: "Pesto Sauce", qty: "1 tbsp", estimatedCost: 0.6, category: "Pantry" }
      ],
      instructions: [
        "Slice ciabatta roll in half and spread pesto sauce on both sides.",
        "Layer mozzarella cheese slices and tomato slices on the bottom half.",
        "Close sandwich and press in a panini maker or toast in a hot skillet for 3 minutes per side until cheese melts."
      ],
      substitutions: [
        { ingredient: "Ciabatta Roll", replacement: "Sourdough, wrap, or gluten-free bread" },
        { ingredient: "Pesto Sauce", replacement: "Fresh basil leaves and a splash of olive oil" }
      ]
    },
    dinner: {
      name: "One-Pan Garlic Butter Shrimp Pasta",
      ingredients: [
        { name: "Spaghetti Pasta", qty: "150g", estimatedCost: 0.6, category: "Pantry" },
        { name: "Shrimp", qty: "150g", estimatedCost: 4.0, category: "Meat & Seafood" },
        { name: "Butter", qty: "2 tbsp", estimatedCost: 0.4, category: "Dairy & Eggs" },
        { name: "Garlic", qty: "3 cloves", estimatedCost: 0.3, category: "Produce" },
        { name: "Parmesan Cheese", qty: "20g", estimatedCost: 0.8, category: "Dairy & Eggs" }
      ],
      instructions: [
        "Cook spaghetti in boiling salted water according to package directions.",
        "In a pan, melt butter and sauté minced garlic for 1 minute.",
        "Add shrimp and cook until pink, about 3 minutes.",
        "Toss the pasta with the shrimp, garlic butter, and fresh parmesan cheese."
      ],
      substitutions: [
        { ingredient: "Shrimp", replacement: "Diced chicken, sliced mushrooms, or white beans" },
        { ingredient: "Butter", replacement: "Olive oil or vegan butter substitute" }
      ]
    }
  },
  budget: {
    theme: "Maximum Savings / Budget Friendly",
    breakfast: {
      name: "Classic Scrambled Eggs with Beans",
      ingredients: [
        { name: "Eggs", qty: "3 large", estimatedCost: 0.9, category: "Dairy & Eggs" },
        { name: "Canned Pinto Beans", qty: "1/2 can", estimatedCost: 0.5, category: "Pantry" },
        { name: "Onion", qty: "1/4 piece", estimatedCost: 0.2, category: "Produce" }
      ],
      instructions: [
        "Sauté diced onion in a hot pan with a splash of oil until translucent.",
        "Add drained beans and warm through for 2 minutes with salt and cumin.",
        "Whisk eggs with a splash of water, pour into the pan and cook on low heat, stirring gently until set."
      ],
      substitutions: [
        { ingredient: "Eggs", replacement: "Firm tofu scramble or extra beans" },
        { ingredient: "Pinto Beans", replacement: "Black beans, kidney beans, or lentils" }
      ]
    },
    lunch: {
      name: "Hearty Lentil Soup",
      ingredients: [
        { name: "Brown Lentils", qty: "100g", estimatedCost: 0.4, category: "Pantry" },
        { name: "Carrot", qty: "1 piece", estimatedCost: 0.3, category: "Produce" },
        { name: "Celery", qty: "1 stalk", estimatedCost: 0.2, category: "Produce" },
        { name: "Canned Diced Tomatoes", qty: "1/2 can", estimatedCost: 0.5, category: "Pantry" },
        { name: "Vegetable Bouillon", qty: "1 cube", estimatedCost: 0.1, category: "Pantry" }
      ],
      instructions: [
        "Chop carrot and celery finely.",
        "Combine rinsed lentils, chopped vegetables, canned tomatoes, and bouillon in a pot with 3 cups of water.",
        "Bring to a boil, then simmer on low for 25-30 minutes until lentils are soft."
      ],
      substitutions: [
        { ingredient: "Brown Lentils", replacement: "Yellow split peas, green lentils, or canned beans" },
        { ingredient: "Vegetable Bouillon", replacement: "Chicken bouillon, salt + water, or herb mix" }
      ]
    },
    dinner: {
      name: "Chili Garlic Tofu stir-fry with Rice",
      ingredients: [
        { name: "Jasmine Rice", qty: "1 cup", estimatedCost: 0.4, category: "Pantry" },
        { name: "Firm Tofu", qty: "200g", estimatedCost: 1.5, category: "Dairy & Eggs" },
        { name: "Broccoli", qty: "150g", estimatedCost: 1.0, category: "Produce" },
        { name: "Soy Sauce", qty: "2 tbsp", estimatedCost: 0.3, category: "Pantry" },
        { name: "Garlic & Chili Paste", qty: "1 tbsp", estimatedCost: 0.3, category: "Pantry" }
      ],
      instructions: [
        "Cook jasmine rice according to package instructions.",
        "Press tofu dry, slice into cubes, and pan-fry in oil until golden on all sides.",
        "Add broccoli florets, minced garlic, soy sauce, and chili paste; stir-fry for 4 minutes with a splash of water.",
        "Serve hot over rice."
      ],
      substitutions: [
        { ingredient: "Firm Tofu", replacement: "Chicken breast, tempeh, or edamame" },
        { ingredient: "Broccoli", replacement: "Cabbage, green bell peppers, or snap peas" }
      ]
    }
  }
};

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Generate Meal Plan based on theme or custom request
app.post("/api/generate-plan", async (req, res) => {
  const { theme, customPrompt, maxBudget } = req.body;
  const targetTheme = theme || "healthy";

  try {
    const ai = getGeminiClient();

    const promptText = `
      You are an elite nutritionist, culinary chef, and smart budgeting assistant.
      Generate a customized breakfast, lunch, and dinner meal plan.
      
      Theme: ${targetTheme}
      Custom Prompt (if any): "${customPrompt || ''}"
      Target Daily Budget limit: $${maxBudget || 20}
      
      The response MUST be a valid JSON object matching this schema exactly. Do not include markdown codeblocks or any text other than the JSON object itself.
      
      Schema:
      {
        "theme": "A clean visual theme name string based on the theme",
        "breakfast": {
          "name": "Name of breakfast recipe",
          "ingredients": [
            { "name": "Ingredient name", "qty": "Quantity (e.g., 2 large, 100g, 2 slices)", "estimatedCost": 1.25, "category": "Produce" }
          ],
          "instructions": [
            "Step 1...",
            "Step 2..."
          ],
          "substitutions": [
            { "ingredient": "Ingredient name to substitute", "replacement": "Best replacement options and instructions" }
          ]
        },
        "lunch": {
          "name": "Name of lunch recipe",
          "ingredients": [ ... ],
          "instructions": [ ... ],
          "substitutions": [ ... ]
        },
        "dinner": {
          "name": "Name of dinner recipe",
          "ingredients": [ ... ],
          "instructions": [ ... ],
          "substitutions": [ ... ]
        }
      }
      
      CRITICAL:
      1. Every ingredient "estimatedCost" must be a realistic floating number in USD.
      2. Every ingredient "category" must be exactly one of: "Produce", "Pantry", "Dairy & Eggs", "Meat & Seafood", "Bakery", "Other".
      3. Try to fit the overall cost reasonably close to or under the target daily budget if possible.
      4. Make the recipe instructions delicious and simple.
    `;

    console.log("Generating plan using Gemini...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            theme: { type: Type.STRING },
            breakfast: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                ingredients: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      qty: { type: Type.STRING },
                      estimatedCost: { type: Type.NUMBER },
                      category: { type: Type.STRING, enum: ["Produce", "Pantry", "Dairy & Eggs", "Meat & Seafood", "Bakery", "Other"] }
                    },
                    required: ["name", "qty", "estimatedCost", "category"]
                  }
                },
                instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                substitutions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      ingredient: { type: Type.STRING },
                      replacement: { type: Type.STRING }
                    },
                    required: ["ingredient", "replacement"]
                  }
                }
              },
              required: ["name", "ingredients", "instructions", "substitutions"]
            },
            lunch: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                ingredients: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      qty: { type: Type.STRING },
                      estimatedCost: { type: Type.NUMBER },
                      category: { type: Type.STRING, enum: ["Produce", "Pantry", "Dairy & Eggs", "Meat & Seafood", "Bakery", "Other"] }
                    },
                    required: ["name", "qty", "estimatedCost", "category"]
                  }
                },
                instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                substitutions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      ingredient: { type: Type.STRING },
                      replacement: { type: Type.STRING }
                    },
                    required: ["ingredient", "replacement"]
                  }
                }
              },
              required: ["name", "ingredients", "instructions", "substitutions"]
            },
            dinner: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                ingredients: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      qty: { type: Type.STRING },
                      estimatedCost: { type: Type.NUMBER },
                      category: { type: Type.STRING, enum: ["Produce", "Pantry", "Dairy & Eggs", "Meat & Seafood", "Bakery", "Other"] }
                    },
                    required: ["name", "qty", "estimatedCost", "category"]
                  }
                },
                instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                substitutions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      ingredient: { type: Type.STRING },
                      replacement: { type: Type.STRING }
                    },
                    required: ["ingredient", "replacement"]
                  }
                }
              },
              required: ["name", "ingredients", "instructions", "substitutions"]
            }
          },
          required: ["theme", "breakfast", "lunch", "dinner"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Generation Error, serving fallback plan:", error.message);
    
    // Fallback logic
    const preset = MOCK_PLANS[targetTheme] || MOCK_PLANS.healthy;
    return res.json({
      ...preset,
      theme: `${preset.theme} (Fallback Mode Active)`,
      isFallback: true
    });
  }
});

// 2. Direct Substitutions Helper Endpoint
app.post("/api/suggest-substitution", async (req, res) => {
  const { ingredient } = req.body;
  if (!ingredient) {
    return res.status(400).json({ error: "Ingredient is required" });
  }

  try {
    const ai = getGeminiClient();
    const promptText = `
      Provide high-quality culinary substitutions for the ingredient: "${ingredient}".
      Return exactly a JSON object according to this schema. No markdown wrapping.
      
      Schema:
      {
        "ingredient": "${ingredient}",
        "alternatives": [
          {
            "name": "Alternative name (e.g., Greek yogurt for sour cream)",
            "ratio": "Conversion ratio (e.g., 1:1 replacement)",
            "notes": "Brief culinary details on flavor, texture, and baking/cooking behavior",
            "estimatedCostImpact": "cheaper"
          }
        ]
      }
      
      Ensure estimatedCostImpact is exactly one of: "cheaper", "similar", "more expensive".
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ingredient: { type: Type.STRING },
            alternatives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  ratio: { type: Type.STRING },
                  notes: { type: Type.STRING },
                  estimatedCostImpact: { type: Type.STRING, enum: ["cheaper", "similar", "more expensive"] }
                },
                required: ["name", "ratio", "notes", "estimatedCostImpact"]
              }
            }
          },
          required: ["ingredient", "alternatives"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Substitution generation error:", error.message);
    
    // Fallback static responses for typical ingredients
    const cleanIng = ingredient.toLowerCase();
    let alternatives = [
      { name: "All-purpose Greek Yogurt", ratio: "1:1", notes: "Works beautifully to replace sour cream, heavy cream, or mayonnaise. Higher protein, lower fat.", estimatedCostImpact: "similar" },
      { name: "Olive oil or Canola oil", ratio: "7/8 cup of oil for every 1 cup butter", notes: "Excellent for moist baking. If cooking, standard 1:1 works perfectly.", estimatedCostImpact: "cheaper" }
    ];

    if (cleanIng.includes("egg")) {
      alternatives = [
        { name: "Applesauce (unsweetened)", ratio: "1/4 cup for 1 egg", notes: "Best for moist sweet cakes and muffins. Adds slight fruit sweetness.", estimatedCostImpact: "cheaper" },
        { name: "Mashed Banana", ratio: "1/4 cup mashed banana for 1 egg", notes: "Perfect for quick breads, pancakes, and waffles. Adds banana flavor.", estimatedCostImpact: "cheaper" },
        { name: "Chia seeds + water (Chia egg)", ratio: "1 tbsp ground chia + 3 tbsp warm water", notes: "Let sit 5 mins to gel. Great binding agent for cookies and dense bakes.", estimatedCostImpact: "similar" }
      ];
    } else if (cleanIng.includes("buttermilk")) {
      alternatives = [
        { name: "Milk + Lemon Juice or Vinegar", ratio: "1 cup milk + 1 tbsp lemon juice/vinegar", notes: "Let sit for 5 minutes until curdled slightly. Works exactly like buttermilk in baking.", estimatedCostImpact: "cheaper" }
      ];
    } else if (cleanIng.includes("milk")) {
      alternatives = [
        { name: "Oat Milk or Soy Milk", ratio: "1:1 replacement", notes: "Great neutral alternatives. Soy milk has comparable protein; oat milk offers creamy texture.", estimatedCostImpact: "similar" },
        { name: "Water + 1 tbsp butter/oil per cup", ratio: "1:1 replacement", notes: "Useful in savory bakes and pancakes if you have run out of milk entirely.", estimatedCostImpact: "cheaper" }
      ];
    }

    return res.json({
      ingredient,
      alternatives,
      isFallback: true
    });
  }
});

// 3. Analyze Budget Feasibility with smart tips
app.post("/api/analyze-budget", async (req, res) => {
  const { totalCost, maxBudget, items } = req.body;
  if (totalCost === undefined || maxBudget === undefined) {
    return res.status(400).json({ error: "totalCost and maxBudget are required" });
  }

  const difference = maxBudget - totalCost;
  const status = difference >= 0 ? (difference === 0 ? "equal" : "under") : "over";

  try {
    const ai = getGeminiClient();
    const promptText = `
      Perform a quick financial checkup on a daily cooking plan.
      Total Estimated Cost: $${totalCost.toFixed(2)}
      Maximum Set Budget: $${maxBudget.toFixed(2)}
      Selected Items/Ingredients: ${JSON.stringify(items || [])}
      
      Provide a highly customized budget feasibility analysis.
      The output MUST be a valid JSON object matching the schema below. No markdown formatting.
      
      Schema:
      {
        "status": "${status}",
        "difference": ${difference},
        "message": "A supportive, professional human summary message of the budget comparison (e.g., 'You are doing great! You saved $3.50 today.' or 'You are slightly over budget by $4.20.')",
        "suggestions": [
          "Actionable budget optimization tip 1 (e.g., 'Substitute fresh salmon with canned salmon or chicken to save $4.00')",
          "Actionable budget optimization tip 2 (e.g., 'Buy oats and beans in bulk to lower unit cost from $0.50 to $0.20')",
          "Upgrade / premium adjustment if under budget (e.g., 'Since you saved $3.00, consider buying organic tomatoes or adding fresh basil leaves for a restaurant flavor feel!')"
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ["under", "equal", "over"] },
            difference: { type: Type.NUMBER },
            message: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["status", "difference", "message", "suggestions"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Budget analysis generation error:", error.message);
    
    // Safe standard fallback logic
    const absoluteDiff = Math.abs(difference).toFixed(2);
    let message = "";
    let suggestions: string[] = [];

    if (status === "under") {
      message = `Excellent! You are under budget by $${absoluteDiff}. Your grocery plan is financially sustainable and healthy.`;
      suggestions = [
        "Since you have left over budget, consider treating yourself to high-quality fresh herbs (e.g., coriander or basil) to elevate the dishes.",
        "Buy pantry items like rice, quinoa, and oats in bulk to save even more on future days.",
        "Save the extra $${absoluteDiff} into your weekly snack/dessert treat jar!"
      ];
    } else if (status === "equal") {
      message = `Perfect balance! Your plan exactly hits your maximum budget limit of $${maxBudget.toFixed(2)}.`;
      suggestions = [
        "Store any excess ingredients in airtight containers to prevent food waste.",
        "Consider swapping out pre-packed items with store-brand (white label) items for a small extra cushion."
      ];
    } else {
      message = `Alert: You are currently over your specified budget limit by $${absoluteDiff}. Let's optimize it!`;
      suggestions = [
        "Swap high-cost fresh proteins (e.g., fresh fish or steak) with canned varieties, chicken thighs, or plant-based proteins like chickpeas or tofu.",
        "Check your fridge and pantry first! Cross off items you already own from the grocery list to reduce immediate checkout cost.",
        "Opt for standard loose vegetables instead of pre-washed or pre-chopped packages to save up to 40% on produce."
      ];
    }

    return res.json({
      status,
      difference,
      message,
      suggestions,
      isFallback: true
    });
  }
});


async function init() {
  // Vite middleware for development & static routing for production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Cooking Planner app server successfully running on http://localhost:${PORT}`);
  });
}

init();

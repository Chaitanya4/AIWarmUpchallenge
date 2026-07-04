import streamlit as st
import json
import os

# Set page styling and configuration
st.set_page_config(
    page_title="Cooking Planner & Budget Feasibility",
    page_icon="🍳",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom styling to make the Streamlit app look gorgeous
st.markdown("""
    <style>
    .main {
        background-color: #fcfcfd;
    }
    .stButton>button {
        background-color: #0f172a;
        color: white;
        border-radius: 8px;
        border: none;
        padding: 0.5rem 1rem;
        font-weight: 500;
        transition: background-color 0.2s;
    }
    .stButton>button:hover {
        background-color: #1e293b;
        color: white;
    }
    .meal-card {
        padding: 1.5rem;
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        margin-bottom: 1.5rem;
        border-left: 5px solid #0f172a;
    }
    .meal-header {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 0.75rem;
    }
    .tag {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        font-weight: 500;
    }
    .tag-breakfast { background-color: #fef3c7; color: #d97706; }
    .tag-lunch { background-color: #dbeafe; color: #2563eb; }
    .tag-dinner { background-color: #fce7f3; color: #db2777; }
    </style>
""", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Standard Mock Fallbacks for Local Offline Mode
# -----------------------------------------------------------------------------
OFFLINE_PLANS = {
    "Healthy & Wholesome": {
        "breakfast": {
            "name": "Avocado Sourdough Toast & Poached Egg",
            "ingredients": [
                {"name": "Sourdough bread", "qty": "2 slices", "estimatedCost": 1.20, "category": "Bakery"},
                {"name": "Fresh avocado", "qty": "1 whole", "estimatedCost": 1.50, "category": "Produce"},
                {"name": "Free-range eggs", "qty": "2 large", "estimatedCost": 0.60, "category": "Dairy & Eggs"},
                {"name": "Cherry tomatoes", "qty": "50g", "estimatedCost": 0.80, "category": "Produce"}
            ],
            "instructions": [
                "Toast bread slices until crispy and golden.",
                "Mash avocado with lemon juice, salt, and black pepper.",
                "Poach eggs in simmering water with vinegar for 3 minutes.",
                "Layer mashed avocado on toast, top with eggs and tomatoes."
            ],
            "substitutions": [
                {"ingredient": "Sourdough bread", "replacement": "Whole wheat toast or gluten-free bread"},
                {"ingredient": "Eggs", "replacement": "Tofu scramble or sliced vegan cheese"}
            ]
        },
        "lunch": {
            "name": "Mediterranean Chickpea & Feta Salad",
            "ingredients": [
                {"name": "Canned chickpeas", "qty": "1 can", "estimatedCost": 0.90, "category": "Pantry"},
                {"name": "English cucumber", "qty": "1/2 piece", "estimatedCost": 0.60, "category": "Produce"},
                {"name": "Feta cheese", "qty": "60g", "estimatedCost": 1.30, "category": "Dairy & Eggs"},
                {"name": "Extra virgin olive oil", "qty": "2 tbsp", "estimatedCost": 0.40, "category": "Pantry"},
                {"name": "Kalamata olives", "qty": "30g", "estimatedCost": 0.90, "category": "Produce"}
            ],
            "instructions": [
                "Rinse and drain chickpeas thoroughly.",
                "Dice the cucumber and chop olives.",
                "Toss chickpeas, cucumber, olives, and crumbled feta cheese in a serving bowl.",
                "Drizzle with olive oil, salt, pepper, and dried oregano."
            ],
            "substitutions": [
                {"ingredient": "Feta cheese", "replacement": "Goat cheese, cubed tofu, or olives for saltiness"},
                {"ingredient": "Chickpeas", "replacement": "Cannellini beans or black-eyed peas"}
            ]
        },
        "dinner": {
            "name": "Lemon Baked Salmon with Asparagus",
            "ingredients": [
                {"name": "Fresh salmon fillet", "qty": "180g", "estimatedCost": 5.50, "category": "Meat & Seafood"},
                {"name": "Fresh asparagus", "qty": "1 bunch", "estimatedCost": 2.20, "category": "Produce"},
                {"name": "Lemon", "qty": "1 whole", "estimatedCost": 0.40, "category": "Produce"},
                {"name": "Garlic cloves", "qty": "2 pieces", "estimatedCost": 0.20, "category": "Produce"}
            ],
            "instructions": [
                "Preheat oven to 400°F (200°C).",
                "Place salmon and asparagus side-by-side on a baking sheet lined with foil.",
                "Drizzle both with olive oil, minced garlic, lemon juice, salt, and pepper.",
                "Bake for 12-14 minutes until salmon flakes easily."
            ],
            "substitutions": [
                {"ingredient": "Salmon fillet", "replacement": "Chicken breast, trout, or thick-sliced firm tofu"},
                {"ingredient": "Asparagus", "replacement": "Broccoli florets, green beans, or zucchini slices"}
            ]
        }
    },
    "Quick & Easy (Under 20 Mins)": {
        "breakfast": {
            "name": "Creamy Banana Peanut Butter Oatmeal",
            "ingredients": [
                {"name": "Rolled oats", "qty": "1 cup", "estimatedCost": 0.40, "category": "Pantry"},
                {"name": "Banana", "qty": "1 whole", "estimatedCost": 0.30, "category": "Produce"},
                {"name": "Creamy peanut butter", "qty": "2 tbsp", "estimatedCost": 0.50, "category": "Pantry"},
                {"name": "Whole milk", "qty": "1 cup", "estimatedCost": 0.40, "category": "Dairy & Eggs"}
            ],
            "instructions": [
                "Combine oats and milk in a microwaveable bowl.",
                "Microwave for 2 minutes, stirring once halfway.",
                "Mix in peanut butter until creaminess is uniform.",
                "Slice banana and arrange nicely on top with a sprinkle of sugar/cinnamon."
            ],
            "substitutions": [
                {"ingredient": "Peanut butter", "replacement": "Almond butter, soy nut butter, or nut-free butter"},
                {"ingredient": "Whole milk", "replacement": "Almond milk, oat milk, or water for ultimate savings"}
            ]
        },
        "lunch": {
            "name": "Toasted Pesto Caprese Sandwich",
            "ingredients": [
                {"name": "Ciabatta roll", "qty": "1 piece", "estimatedCost": 0.90, "category": "Bakery"},
                {"name": "Fresh Mozzarella", "qty": "60g", "estimatedCost": 1.20, "category": "Dairy & Eggs"},
                {"name": "Tomato", "qty": "2 thick slices", "estimatedCost": 0.40, "category": "Produce"},
                {"name": "Basil pesto", "qty": "1.5 tbsp", "estimatedCost": 0.60, "category": "Pantry"}
            ],
            "instructions": [
                "Slice the ciabatta roll horizontally.",
                "Spread basil pesto evenly on the inside of both halves.",
                "Arrange mozzarella slices and tomato slices inside.",
                "Toast in a skillet or sandwich press for 3 minutes per side until bread is golden and cheese is melting."
            ],
            "substitutions": [
                {"ingredient": "Ciabatta roll", "replacement": "Whole wheat bread, pita bread, or tortilla wrap"},
                {"ingredient": "Mozzarella", "replacement": "Provolone, Swiss, or vegan cheese slices"}
            ]
        },
        "dinner": {
            "name": "Garlic Butter Shrimp Pasta",
            "ingredients": [
                {"name": "Spaghetti pasta", "qty": "150g", "estimatedCost": 0.50, "category": "Pantry"},
                {"name": "Peeled raw shrimp", "qty": "150g", "estimatedCost": 3.80, "category": "Meat & Seafood"},
                {"name": "Unsalted butter", "qty": "2 tbsp", "estimatedCost": 0.30, "category": "Dairy & Eggs"},
                {"name": "Minced garlic", "qty": "3 cloves", "estimatedCost": 0.20, "category": "Produce"},
                {"name": "Grated parmesan", "qty": "15g", "estimatedCost": 0.70, "category": "Dairy & Eggs"}
            ],
            "instructions": [
                "Boil spaghetti in plenty of salted water according to instructions.",
                "Melt butter in a pan over medium heat and sauté garlic for 1 minute.",
                "Add shrimp and cook until pink and opaque (about 3 minutes).",
                "Toss drained pasta directly into the garlic butter pan. Stir in parmesan."
            ],
            "substitutions": [
                {"ingredient": "Raw shrimp", "replacement": "Chicken breast strips, scallops, or king oyster mushrooms"},
                {"ingredient": "Butter", "replacement": "Extra virgin olive oil or vegan butter spread"}
            ]
        }
    },
    "Budget Friendly / Student Pack": {
        "breakfast": {
            "name": "Pinto Bean Scramble with Tortillas",
            "ingredients": [
                {"name": "Eggs", "qty": "2 large", "estimatedCost": 0.40, "category": "Dairy & Eggs"},
                {"name": "Canned pinto beans", "qty": "1/2 can", "estimatedCost": 0.45, "category": "Pantry"},
                {"name": "Yellow onion", "qty": "1/4 piece", "estimatedCost": 0.15, "category": "Produce"},
                {"name": "Flour tortillas", "qty": "2 pieces", "estimatedCost": 0.50, "category": "Bakery"}
            ],
            "instructions": [
                "Sauté finely diced onion in 1 tsp oil until translucent.",
                "Add beans and heat for 2 minutes with salt and a pinch of cumin.",
                "Pour in beaten eggs and scramble on low heat until cooked but soft.",
                "Warm tortillas and serve with the scramble folded inside."
            ],
            "substitutions": [
                {"ingredient": "Flour tortillas", "replacement": "Corn tortillas or standard bread toast"},
                {"ingredient": "Pinto beans", "replacement": "Black beans, red kidney beans, or lentils"}
            ]
        },
        "lunch": {
            "name": "Golden Carrot & Lentil Soup",
            "ingredients": [
                {"name": "Dry red lentils", "qty": "100g", "estimatedCost": 0.35, "category": "Pantry"},
                {"name": "Carrots", "qty": "2 medium", "estimatedCost": 0.40, "category": "Produce"},
                {"name": "Canned diced tomato", "qty": "1/2 can", "estimatedCost": 0.45, "category": "Pantry"},
                {"name": "Vegetable stock cube", "qty": "1 piece", "estimatedCost": 0.15, "category": "Pantry"}
            ],
            "instructions": [
                "Peel and finely slice carrots.",
                "Rinse red lentils. Place lentils, carrots, stock cube, and tomatoes in a pot with 3 cups water.",
                "Bring to boil, then cover and simmer on low-medium for 20 minutes until ingredients are tender.",
                "Season with salt, pepper, and garlic powder to taste."
            ],
            "substitutions": [
                {"ingredient": "Red lentils", "replacement": "Brown lentils, split peas, or canned white beans"},
                {"ingredient": "Vegetable stock cube", "replacement": "Chicken stock, water + salt, or garlic herb seasoning"}
            ]
        },
        "dinner": {
            "name": "Sweet Soy Garlic Tofu Stir-Fry",
            "ingredients": [
                {"name": "Firm block tofu", "qty": "200g", "estimatedCost": 1.40, "category": "Dairy & Eggs"},
                {"name": "Broccoli head", "qty": "1/2 piece", "estimatedCost": 0.80, "category": "Produce"},
                {"name": "White long-grain rice", "qty": "1 cup", "estimatedCost": 0.30, "category": "Pantry"},
                {"name": "Soy sauce", "qty": "2 tbsp", "estimatedCost": 0.25, "category": "Pantry"}
            ],
            "instructions": [
                "Cook rice according to normal stovetop directions.",
                "Drain tofu, press dry with a paper towel, and cut into cubes.",
                "Pan-fry tofu in oil until crispy on all sides.",
                "Add broccoli florets and soy sauce with 1 tbsp water. Stir-fry for 4 minutes until tender."
            ],
            "substitutions": [
                {"ingredient": "Firm block tofu", "replacement": "Chicken thighs, tempeh, or boiled eggs"},
                {"ingredient": "Broccoli", "replacement": "Cabbage slices, green bell pepper, or green beans"}
            ]
        }
    }
}

# -----------------------------------------------------------------------------
# AI/Gemini Call helper using new google-genai SDK if key present
# -----------------------------------------------------------------------------
def call_gemini_api(prompt, schema_type=None):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        
        config = types.GenerateContentConfig()
        if schema_type == "meal_plan":
            config.response_mime_type = "application/json"
            # Return json string from gemini
            response = client.models.generate_content(
                model='gemini-3.5-flash',
                contents=prompt,
                config=config
            )
            return json.loads(response.text)
        elif schema_type == "substitution":
            config.response_mime_type = "application/json"
            response = client.models.generate_content(
                model='gemini-3.5-flash',
                contents=prompt,
                config=config
            )
            return json.loads(response.text)
        else:
            response = client.models.generate_content(
                model='gemini-3.5-flash',
                contents=prompt
            )
            return response.text
    except Exception as e:
        st.sidebar.error(f"Gemini API Error: {str(e)}")
        return None


# -----------------------------------------------------------------------------
# App Layout & State Initialization
# -----------------------------------------------------------------------------
st.title("🍳 Cooking Planner & Budget Feasibility")
st.markdown("Produce customized healthy breakfast, lunch, and dinner plans, manage checklists, identify ingredient substitutions, and track financial feasibility!")

# Sidebar Config
st.sidebar.header("⚙️ Configuration")
budget_limit = st.sidebar.number_input("Daily Target Budget ($)", min_value=5.0, max_value=100.0, value=15.0, step=1.0)

plan_source = st.sidebar.selectbox("Meal Plan Source", ["Prerecorded Themes", "AI Generated Plan (Requires API Key)"])

# Initialize session state for meal plan
if "meal_plan" not in st.session_state:
    st.session_state.meal_plan = OFFLINE_PLANS["Healthy & Wholesome"]
if "checked_ingredients" not in st.session_state:
    st.session_state.checked_ingredients = set()

# Load Plan controls
if plan_source == "Prerecorded Themes":
    selected_theme = st.sidebar.selectbox("Choose a Theme Preset", list(OFFLINE_PLANS.keys()))
    if st.sidebar.button("Load Selected Theme"):
        st.session_state.meal_plan = OFFLINE_PLANS[selected_theme]
        st.session_state.checked_ingredients = set()
        st.success(f"Loaded '{selected_theme}' Plan!")
else:
    api_key_check = os.environ.get("GEMINI_API_KEY")
    if not api_key_check:
        st.sidebar.info("💡 Add a `GEMINI_API_KEY` to your environment variables to unlock instant AI generation!")
    ai_prompt = st.sidebar.text_area("What are you craving? (e.g., 'Low-carb vegetarian', 'Cozy rainy day food', 'High protein Keto')")
    if st.sidebar.button("Generate AI Plan 🪄"):
        if not api_key_check:
            st.sidebar.error("Please configure GEMINI_API_KEY first!")
        else:
            with st.spinner("Gemini is curating your personalized recipes..."):
                prompt_text = f"""
                  Act as an expert culinary chef and nutritionist.
                  Generate a delicious breakfast, lunch, and dinner plan.
                  Theme/Craving constraint: "{ai_prompt}"
                  Target budget limit: ${budget_limit}
                  
                  Return a JSON object with this exact schema structure:
                  {{
                    "breakfast": {{
                      "name": "Recipe name",
                      "ingredients": [
                        {{"name": "Ingredient name", "qty": "quantity", "estimatedCost": 1.20, "category": "Produce"}}
                      ],
                      "instructions": ["Step 1", "Step 2"],
                      "substitutions": [
                        {{"ingredient": "Name", "replacement": "Description"}}
                      ]
                    }},
                    "lunch": {{ ... }},
                    "dinner": {{ ... }}
                  }}
                  Ensure ingredient categories are one of: "Produce", "Pantry", "Dairy & Eggs", "Meat & Seafood", "Bakery", "Other".
                """
                res_json = call_gemini_api(prompt_text, "meal_plan")
                if res_json:
                    st.session_state.meal_plan = res_json
                    st.session_state.checked_ingredients = set()
                    st.success("Successfully generated custom AI Meal Plan!")
                else:
                    st.sidebar.error("Failed to generate with AI. Try using offline themes!")

# -----------------------------------------------------------------------------
# Main Visual Screen
# -----------------------------------------------------------------------------
col1, col2 = st.columns([3, 2])

with col1:
    st.header("📝 Today's Meal & To-Do List")
    
    # Meal Cards Loop
    for period in ["breakfast", "lunch", "dinner"]:
        meal = st.session_state.meal_plan.get(period, {})
        if not meal:
            continue
        
        st.markdown(f"""
            <div class="meal-card">
                <span class="tag tag-{period}">{period.upper()}</span>
                <div class="meal-header">{meal.get('name', 'N/A')}</div>
            </div>
        """, unsafe_allow_html=True)
        
        # Ingredients & Steps Accordion
        with st.expander(f"See Recipe Details for {meal.get('name')}"):
            sub_col1, sub_col2 = st.columns(2)
            with sub_col1:
                st.markdown("**Ingredients Needed:**")
                for ing in meal.get('ingredients', []):
                    st.markdown(f"- **{ing.get('qty')}** {ing.get('name')} _(est. ${ing.get('estimatedCost'):.2f})_")
            with sub_col2:
                st.markdown("**Cooking Steps:**")
                for idx, step in enumerate(meal.get('instructions', [])):
                    st.markdown(f"{idx+1}. {step}")

# -----------------------------------------------------------------------------
# Shopping & Feasibility Block (Right Column)
# -----------------------------------------------------------------------------
with col2:
    st.header("🛒 Interactive Shopping List")
    
    # Calculate costs
    all_ingredients = []
    for p in ["breakfast", "lunch", "dinner"]:
        all_ingredients.extend(st.session_state.meal_plan.get(p, {}).get("ingredients", []))
    
    total_cost = sum(item.get("estimatedCost", 0.0) for item in all_ingredients)
    
    # Categorize items for shopping checklist
    categorized = {}
    for item in all_ingredients:
        cat = item.get("category", "Other")
        if cat not in categorized:
            categorized[cat] = []
        categorized[cat].append(item)
    
    # Render Checkboxes
    for cat, items in categorized.items():
        st.subheader(f"📍 {cat}")
        for item in items:
            item_id = f"{item.get('name')}_{item.get('qty')}"
            is_checked = item_id in st.session_state.checked_ingredients
            checked = st.checkbox(f"{item.get('qty')} {item.get('name')} (${item.get('estimatedCost'):.2f})", value=is_checked, key=item_id)
            if checked:
                st.session_state.checked_ingredients.add(item_id)
            else:
                st.session_state.checked_ingredients.discard(item_id)
                
    st.divider()
    
    st.header("⚖️ Budget Feasibility Engine")
    
    # Dynamic budget feedback
    diff = budget_limit - total_cost
    st.metric(label="Total Plan Cost", value=f"${total_cost:.2f}", delta=f"${diff:.2f} remaining" if diff >= 0 else f"${abs(diff):.2f} over budget", delta_color="normal" if diff >= 0 else "inverse")
    
    if diff >= 0:
        st.success(f"🥳 **Under Budget!** Excellent curation. You have saved **${diff:.2f}** today.")
        st.markdown("**Suggestions to maximize value:**")
        st.markdown("- Add chopped fresh parsley or green onions for visual/flavor freshness.")
        st.markdown("- Invest the extra cushion into premium sea salt or freshly cracked peppercorn.")
    else:
        st.warning(f"⚠️ **Over Budget** by **${abs(diff):.2f}**. Let's optimize!")
        st.markdown("**Cost Optimization Strategies:**")
        st.markdown("- **Cross off owned pantry items:** Don't purchase spices, oils, or butter if you already have them.")
        st.markdown("- **Sub proteins:** Swap expensive fish/seafood for block tofu or local poultry to save $3-$5.")
        st.markdown("- **Buy bulk:** Opt for regular loose produce instead of washed, pre-cut packs.")

# -----------------------------------------------------------------------------
# Substitutions Search Hub
# -----------------------------------------------------------------------------
st.divider()
st.header("🔄 Substitution Finder")
st.markdown("Missing a key ingredient? Discover high-performance swaps that protect your pocket and preserve recipe integrity.")

sub_search = st.text_input("Enter ingredient you want to substitute (e.g. buttermilk, eggs, heavy cream):", "")
if sub_search:
    api_key_check = os.environ.get("GEMINI_API_KEY")
    if api_key_check:
        with st.spinner("Sourcing smart substitutions with Gemini..."):
            sub_prompt = f"""
                Provide cooking substitutions for: "{sub_search}".
                Output must be a JSON object with this structure:
                {{
                  "alternatives": [
                    {{"name": "Alternative name", "ratio": "Ratio", "notes": "Usage notes", "impact": "cheaper"}}
                  ]
                }}
                impact must be "cheaper", "similar", or "more expensive".
            """
            res_sub = call_gemini_api(sub_prompt, "substitution")
            if res_sub:
                for alt in res_sub.get("alternatives", []):
                    st.markdown(f"🔹 **{alt.get('name')}** (Ratio: {alt.get('ratio')})")
                    st.markdown(f"  _Notes: {alt.get('notes')}_ | **Cost Impact: {alt.get('impact').capitalize()}**")
            else:
                st.info("Substitutions query failed. Try looking up buttermilk or eggs!")
    else:
        # Static Lookup falling back cleanly
        clean_search = sub_search.lower()
        if "buttermilk" in clean_search:
            st.markdown("🔹 **Milk + Vinegar or Lemon Juice** (Ratio: 1 cup milk + 1 tbsp acid)")
            st.markdown("  _Notes: Let stand for 5 mins to curdle slightly. Performs identical rising reactions in pancakes & baking._ | **Cost Impact: Cheaper**")
        elif "egg" in clean_search:
            st.markdown("🔹 **Unsweetened Applesauce** (Ratio: 1/4 cup for 1 egg)")
            st.markdown("  _Notes: Best for moist baking like brownies and cakes. Reduces fat content._ | **Cost Impact: Cheaper**")
            st.markdown("🔹 **Ground Flaxseed + Water** (Ratio: 1 tbsp flax + 3 tbsp warm water)")
            st.markdown("  _Notes: Great binding action in dense cookies and breads. Nutty flavor profile._ | **Cost Impact: Similar**")
        elif "heavy cream" in clean_search:
            st.markdown("🔹 **Milk + Butter** (Ratio: 3/4 cup milk + 1/4 cup melted butter)")
            st.markdown("  _Notes: Great for savory cooking, cream soups, and general baking. Will not whip into whipped cream._ | **Cost Impact: Cheaper**")
        else:
            st.markdown("🔹 **Greek Yogurt** (Ratio: 1:1 replacement)")
            st.markdown("  _Notes: Perfect for replacement of mayonnaise, sour cream, and heavy fats in dressings or sauces._ | **Cost Impact: Similar**")

# -----------------------------------------------------------------------------
# Deployment Guide Panel
# -----------------------------------------------------------------------------
with st.expander("🚀 Instructions: Deploy this Streamlit App to GitHub & Vercel / Community Cloud"):
    st.markdown("""
    ### 💻 1. Run and Test Locally
    1. Create a local folder and save this file as `app.py`.
    2. Open your terminal and run:
       ```bash
       pip install streamlit google-genai
       streamlit run app.py
       ```
    
    ### 📤 2. Push Your Code to GitHub
    1. Initialize git and commit your files:
       ```bash
       git init
       git add app.py
       git commit -m "Initial commit of cooking planner"
       ```
    2. Create a new repository on GitHub and link it:
       ```bash
       git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
       git branch -M main
       git push -u origin main
       ```
    
    ### ☁️ 3. Deploy for Free! (Highly Recommended: Streamlit Community Cloud)
    Streamlit Community Cloud is the standard, optimized host for Streamlit apps and supports background re-runs natively.
    1. Go to [share.streamlit.io](https://share.streamlit.io).
    2. Sign in with your GitHub account.
    3. Click **'New app'**, select your repository (`YOUR_REPO_NAME`), branch (`main`), and file path (`app.py`).
    4. Paste your `GEMINI_API_KEY` in the **Advanced Settings > Secrets** section.
    5. Click **'Deploy!'** - Your app is live!

    ### ⚡ 4. Deploying on Vercel
    Since Vercel is primarily a serverless platform, running full interactive Python apps (like Streamlit) requires custom routing.
    1. Create a `requirements.txt` file:
       ```text
       streamlit
       google-genai
       ```
    2. Create a `vercel.json` file to route requests to WSGI/Serverless python wrappers, or use a setup like `streamlit-on-vercel`. Note that Streamlit Community Cloud (above) is much simpler and free of serverless timeouts!
    """)

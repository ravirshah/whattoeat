import { IngredientIntelligence } from '@/types/weekly-planner';

// Comprehensive ingredient intelligence database
export const INGREDIENT_DATABASE: Record<string, IngredientIntelligence> = {
  // Proteins
  'chicken': {
    baseIngredient: 'chicken',
    aliases: ['chicken breast', 'chicken thigh', 'chicken leg', 'poultry', 'rotisserie chicken'],
    category: 'Meat & Poultry',
    subCategory: 'Poultry',
    standardUnit: 'lb',
    conversionRates: { 'oz': 16, 'g': 453.592, 'kg': 0.453592 },
    averageCost: 8.99,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 3,
    storageType: 'fridge',
    nutritionalProfile: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
    commonPreparations: ['diced', 'sliced', 'grilled', 'baked', 'roasted'],
    substitutes: ['turkey', 'tofu', 'tempeh'],
    pairings: ['garlic', 'onion', 'herbs', 'lemon', 'vegetables']
  },
  'beef': {
    baseIngredient: 'beef',
    aliases: ['ground beef', 'beef chuck', 'steak', 'ribeye', 'sirloin', 'beef roast'],
    category: 'Meat & Poultry',
    subCategory: 'Beef',
    standardUnit: 'lb',
    conversionRates: { 'oz': 16, 'g': 453.592, 'kg': 0.453592 },
    averageCost: 12.99,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 4,
    storageType: 'fridge',
    nutritionalProfile: { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0 },
    commonPreparations: ['ground', 'grilled', 'roasted', 'braised'],
    substitutes: ['turkey', 'lamb', 'plant-based meat'],
    pairings: ['onion', 'garlic', 'mushrooms', 'potatoes']
  },
  'salmon': {
    baseIngredient: 'salmon',
    aliases: ['salmon fillet', 'atlantic salmon', 'pacific salmon', 'smoked salmon'],
    category: 'Seafood',
    standardUnit: 'lb',
    conversionRates: { 'oz': 16, 'g': 453.592, 'fillet': 6 },
    averageCost: 14.99,
    seasonality: { peak: ['May', 'June', 'July', 'August'], available: ['year-round'] },
    shelfLife: 2,
    storageType: 'fridge',
    nutritionalProfile: { calories: 208, protein: 22, carbs: 0, fat: 13, fiber: 0 },
    commonPreparations: ['grilled', 'baked', 'pan-seared', 'smoked'],
    substitutes: ['tuna', 'cod', 'mackerel'],
    pairings: ['lemon', 'dill', 'capers', 'asparagus']
  },
  'eggs': {
    baseIngredient: 'eggs',
    aliases: ['large eggs', 'egg whites', 'whole eggs', 'organic eggs'],
    category: 'Dairy & Eggs',
    standardUnit: 'dozen',
    conversionRates: { 'piece': 12, 'individual': 12 },
    averageCost: 3.99,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 21,
    storageType: 'fridge',
    nutritionalProfile: { calories: 70, protein: 6, carbs: 1, fat: 5, fiber: 0 },
    commonPreparations: ['scrambled', 'boiled', 'poached', 'fried'],
    substitutes: ['egg substitute', 'flax eggs', 'chia eggs'],
    pairings: ['cheese', 'vegetables', 'herbs', 'toast']
  },

  // Produce
  'onion': {
    baseIngredient: 'onion',
    aliases: ['yellow onion', 'red onion', 'white onion', 'sweet onion', 'onions'],
    category: 'Produce',
    subCategory: 'Vegetables',
    standardUnit: 'lb',
    conversionRates: { 'medium': 4, 'large': 3, 'small': 6, 'piece': 4 },
    averageCost: 1.99,
    seasonality: { peak: ['August', 'September', 'October'], available: ['year-round'] },
    shelfLife: 14,
    storageType: 'pantry',
    nutritionalProfile: { calories: 40, protein: 1, carbs: 9, fat: 0, fiber: 2 },
    commonPreparations: ['diced', 'sliced', 'chopped', 'caramelized'],
    substitutes: ['shallots', 'leeks', 'green onions'],
    pairings: ['garlic', 'herbs', 'meat', 'vegetables']
  },
  'garlic': {
    baseIngredient: 'garlic',
    aliases: ['garlic cloves', 'fresh garlic', 'garlic bulb', 'minced garlic'],
    category: 'Produce',
    subCategory: 'Aromatics',
    standardUnit: 'head',
    conversionRates: { 'clove': 8, 'tsp': 24, 'tbsp': 8 },
    averageCost: 0.99,
    seasonality: { peak: ['July', 'August'], available: ['year-round'] },
    shelfLife: 30,
    storageType: 'pantry',
    nutritionalProfile: { calories: 4, protein: 0.2, carbs: 1, fat: 0, fiber: 0.1 },
    commonPreparations: ['minced', 'crushed', 'roasted', 'sautéed'],
    substitutes: ['garlic powder', 'shallots'],
    pairings: ['onion', 'herbs', 'olive oil', 'everything']
  },
  'tomato': {
    baseIngredient: 'tomato',
    aliases: ['roma tomatoes', 'cherry tomatoes', 'beefsteak tomatoes', 'grape tomatoes'],
    category: 'Produce',
    subCategory: 'Vegetables',
    standardUnit: 'lb',
    conversionRates: { 'medium': 4, 'large': 3, 'cup': 5 },
    averageCost: 2.99,
    seasonality: { peak: ['June', 'July', 'August', 'September'], available: ['year-round'] },
    shelfLife: 7,
    storageType: 'room-temp',
    nutritionalProfile: { calories: 18, protein: 1, carbs: 4, fat: 0, fiber: 1 },
    commonPreparations: ['diced', 'sliced', 'crushed', 'roasted'],
    substitutes: ['canned tomatoes', 'tomato paste'],
    pairings: ['basil', 'mozzarella', 'olive oil', 'garlic']
  },
  'spinach': {
    baseIngredient: 'spinach',
    aliases: ['baby spinach', 'fresh spinach', 'spinach leaves'],
    category: 'Produce',
    subCategory: 'Leafy Greens',
    standardUnit: 'bag',
    conversionRates: { 'cup': 16, 'oz': 5, 'handful': 12 },
    averageCost: 2.49,
    seasonality: { peak: ['March', 'April', 'May', 'September', 'October'], available: ['year-round'] },
    shelfLife: 5,
    storageType: 'fridge',
    nutritionalProfile: { calories: 7, protein: 1, carbs: 1, fat: 0, fiber: 1 },
    commonPreparations: ['raw', 'sautéed', 'steamed', 'wilted'],
    substitutes: ['kale', 'arugula', 'swiss chard'],
    pairings: ['garlic', 'lemon', 'olive oil', 'cheese']
  },

  // Dairy
  'milk': {
    baseIngredient: 'milk',
    aliases: ['whole milk', '2% milk', 'skim milk', 'dairy milk'],
    category: 'Dairy & Eggs',
    standardUnit: 'gallon',
    conversionRates: { 'cup': 16, 'oz': 128, 'quart': 4 },
    averageCost: 3.49,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 7,
    storageType: 'fridge',
    nutritionalProfile: { calories: 150, protein: 8, carbs: 12, fat: 8, fiber: 0 },
    commonPreparations: ['drinking', 'cooking', 'baking'],
    substitutes: ['almond milk', 'soy milk', 'oat milk'],
    pairings: ['cereal', 'coffee', 'baking ingredients']
  },
  'greek yogurt': {
    baseIngredient: 'greek yogurt',
    aliases: ['plain greek yogurt', 'non-fat greek yogurt', 'low-fat greek yogurt', 'greek style yogurt'],
    category: 'Dairy & Eggs',
    standardUnit: 'container',
    conversionRates: { 'cup': 4, 'tbsp': 32, 'oz': 32 },
    averageCost: 2.99,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 14,
    storageType: 'fridge',
    nutritionalProfile: { calories: 100, protein: 15, carbs: 6, fat: 0, fiber: 0 },
    commonPreparations: ['eating', 'cooking', 'smoothies'],
    substitutes: ['regular yogurt', 'sour cream'],
    pairings: ['fruit', 'honey', 'granola', 'berries']
  },
  'feta cheese': {
    baseIngredient: 'feta cheese',
    aliases: ['crumbled feta cheese', 'reduced fat feta cheese', 'feta cheese crumbled'],
    category: 'Dairy & Eggs',
    standardUnit: 'package',
    conversionRates: { 'cup': 4, 'oz': 8, 'tbsp': 16 },
    averageCost: 4.99,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 21,
    storageType: 'fridge',
    nutritionalProfile: { calories: 75, protein: 4, carbs: 1, fat: 6, fiber: 0 },
    commonPreparations: ['crumbled', 'cubed', 'melted'],
    substitutes: ['goat cheese', 'ricotta', 'cottage cheese'],
    pairings: ['olives', 'tomatoes', 'spinach', 'mediterranean dishes']
  },
  'cheese': {
    baseIngredient: 'cheese',
    aliases: ['cheddar cheese', 'mozzarella', 'parmesan', 'swiss cheese'],
    category: 'Dairy & Eggs',
    standardUnit: 'package',
    conversionRates: { 'cup': 4, 'oz': 8, 'slice': 12 },
    averageCost: 4.99,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 14,
    storageType: 'fridge',
    nutritionalProfile: { calories: 113, protein: 7, carbs: 1, fat: 9, fiber: 0 },
    commonPreparations: ['grated', 'sliced', 'melted', 'cubed'],
    substitutes: ['nutritional yeast', 'vegan cheese'],
    pairings: ['crackers', 'wine', 'bread', 'fruit']
  },

  // Grains & Pantry
  'rice': {
    baseIngredient: 'rice',
    aliases: ['white rice', 'brown rice', 'jasmine rice', 'basmati rice'],
    category: 'Grains & Pasta',
    standardUnit: 'bag',
    conversionRates: { 'cup': 8, 'serving': 16 },
    averageCost: 2.99,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 365,
    storageType: 'pantry',
    nutritionalProfile: { calories: 130, protein: 3, carbs: 28, fat: 0, fiber: 0 },
    commonPreparations: ['steamed', 'boiled', 'fried', 'pilaf'],
    substitutes: ['quinoa', 'cauliflower rice', 'pasta'],
    pairings: ['vegetables', 'protein', 'sauces', 'herbs']
  },
  'pasta': {
    baseIngredient: 'pasta',
    aliases: ['spaghetti', 'penne', 'rigatoni', 'linguine', 'fettuccine'],
    category: 'Grains & Pasta',
    standardUnit: 'box',
    conversionRates: { 'cup': 8, 'serving': 8, 'oz': 16 },
    averageCost: 1.99,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 365,
    storageType: 'pantry',
    nutritionalProfile: { calories: 220, protein: 8, carbs: 44, fat: 1, fiber: 2 },
    commonPreparations: ['boiled', 'al dente', 'baked'],
    substitutes: ['rice', 'zucchini noodles', 'shirataki noodles'],
    pairings: ['sauce', 'cheese', 'vegetables', 'herbs']
  },
  'olive oil': {
    baseIngredient: 'olive oil',
    aliases: ['extra virgin olive oil', 'EVOO', 'cooking oil'],
    category: 'Condiments & Oils',
    standardUnit: 'bottle',
    conversionRates: { 'tbsp': 32, 'cup': 2, 'oz': 16 },
    averageCost: 7.99,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 365,
    storageType: 'pantry',
    nutritionalProfile: { calories: 120, protein: 0, carbs: 0, fat: 14, fiber: 0 },
    commonPreparations: ['cooking', 'dressing', 'drizzling'],
    substitutes: ['vegetable oil', 'avocado oil', 'butter'],
    pairings: ['garlic', 'herbs', 'vinegar', 'vegetables']
  },

  // Additional ingredients from screenshot
  'avocado': {
    baseIngredient: 'avocado',
    aliases: ['ripe avocado', 'fresh avocado', 'hass avocado'],
    category: 'Produce',
    standardUnit: 'piece',
    conversionRates: { 'piece': 1, 'cup': 2 },
    averageCost: 1.50,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 3,
    storageType: 'room-temp',
    nutritionalProfile: { calories: 234, protein: 3, carbs: 12, fat: 21, fiber: 10 },
    commonPreparations: ['sliced', 'mashed', 'diced'],
    substitutes: ['none'],
    pairings: ['toast', 'salads', 'mexican dishes']
  },
  'chickpeas': {
    baseIngredient: 'chickpeas',
    aliases: ['canned chickpeas', 'garbanzo beans', 'chickpeas rinsed and drained'],
    category: 'Grains & Pasta',
    standardUnit: 'can',
    conversionRates: { 'can': 1, 'cup': 2 },
    averageCost: 1.29,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 730,
    storageType: 'pantry',
    nutritionalProfile: { calories: 210, protein: 12, carbs: 35, fat: 3, fiber: 10 },
    commonPreparations: ['rinsed', 'roasted', 'mashed'],
    substitutes: ['white beans', 'lentils'],
    pairings: ['mediterranean dishes', 'salads', 'hummus']
  },
  'olives': {
    baseIngredient: 'olives',
    aliases: ['kalamata olives', 'black olives', 'green olives', 'pitted olives'],
    category: 'Condiments & Oils',
    standardUnit: 'jar',
    conversionRates: { 'jar': 1, 'cup': 3 },
    averageCost: 3.49,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 365,
    storageType: 'pantry',
    nutritionalProfile: { calories: 25, protein: 0, carbs: 1, fat: 2, fiber: 1 },
    commonPreparations: ['whole', 'sliced', 'chopped'],
    substitutes: ['capers', 'sun-dried tomatoes'],
    pairings: ['cheese', 'mediterranean dishes', 'salads']
  },
  'oregano': {
    baseIngredient: 'oregano',
    aliases: ['dried oregano', 'fresh oregano', 'oregano leaves'],
    category: 'Condiments & Oils',
    standardUnit: 'container',
    conversionRates: { 'tsp': 24, 'tbsp': 8 },
    averageCost: 2.99,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 365,
    storageType: 'pantry',
    nutritionalProfile: { calories: 3, protein: 0, carbs: 1, fat: 0, fiber: 0 },
    commonPreparations: ['dried', 'fresh', 'ground'],
    substitutes: ['basil', 'thyme', 'marjoram'],
    pairings: ['tomatoes', 'cheese', 'mediterranean dishes']
  },
  'black pepper': {
    baseIngredient: 'black pepper',
    aliases: ['ground black pepper', 'pinch of black pepper', 'fresh black pepper'],
    category: 'Condiments & Oils',
    standardUnit: 'container',
    conversionRates: { 'tsp': 48, 'pinch': 192 },
    averageCost: 1.99,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 730,
    storageType: 'pantry',
    nutritionalProfile: { calories: 6, protein: 0, carbs: 1, fat: 0, fiber: 1 },
    commonPreparations: ['ground', 'whole', 'cracked'],
    substitutes: ['white pepper', 'cayenne'],
    pairings: ['everything', 'salt', 'meat', 'vegetables']
  },
  'ginger': {
    baseIngredient: 'ginger',
    aliases: ['fresh ginger', 'ginger root', 'inch ginger', 'grated ginger'],
    category: 'Produce',
    standardUnit: 'piece',
    conversionRates: { 'piece': 1, 'tsp': 24 },
    averageCost: 2.49,
    seasonality: { peak: ['year-round'], available: ['year-round'] },
    shelfLife: 21,
    storageType: 'fridge',
    nutritionalProfile: { calories: 4, protein: 0, carbs: 1, fat: 0, fiber: 0 },
    commonPreparations: ['grated', 'minced', 'sliced'],
    substitutes: ['ground ginger', 'galangal'],
    pairings: ['asian dishes', 'tea', 'garlic', 'citrus']
  }
};

// Enhanced intelligent ingredient matching
export class IngredientMatcher {
  // Advanced ingredient name consolidation database
  private static readonly CONSOLIDATION_RULES = {
    // Yogurt variations
    'greek yogurt': ['plain greek yogurt', 'greek yogurt plain', 'non-fat greek yogurt', 'low-fat greek yogurt', 'greek style yogurt'],
    'yogurt': ['plain yogurt', 'regular yogurt', 'vanilla yogurt', 'natural yogurt'],
    
    // Cheese variations
    'feta cheese': ['crumbled feta cheese', 'feta cheese crumbled', 'reduced fat feta cheese', 'low fat feta'],
    'parmesan cheese': ['grated parmesan', 'parmesan grated', 'parmigiano reggiano'],
    'mozzarella cheese': ['fresh mozzarella', 'mozzarella fresh', 'part skim mozzarella'],
    
    // Produce variations
    'avocado': ['ripe avocado', 'fresh avocado', 'hass avocado'],
    'tomato': ['fresh tomato', 'ripe tomato', 'roma tomato', 'vine tomato'],
    'onion': ['yellow onion', 'white onion', 'sweet onion', 'red onion'],
    'garlic': ['fresh garlic', 'garlic cloves', 'minced garlic'],
    'ginger': ['fresh ginger', 'ginger root', 'inch ginger'],
    
    // Herbs and spices
    'oregano': ['dried oregano', 'fresh oregano', 'oregano leaves'],
    'basil': ['fresh basil', 'dried basil', 'basil leaves'],
    'black pepper': ['pinch of black pepper', 'ground black pepper', 'fresh black pepper'],
    'salt': ['sea salt', 'table salt', 'kosher salt', 'pinch of salt'],
    
    // Pantry items
    'olive oil': ['extra virgin olive oil', 'virgin olive oil', 'light olive oil'],
    'chickpeas': ['canned chickpeas', 'chickpeas canned', 'garbanzo beans', 'chickpeas rinsed and drained'],
    'olives': ['kalamata olives', 'black olives', 'green olives', 'olives pitted', 'pitted olives']
  };

  // Find the best match with intelligent consolidation
  static findBestMatch(ingredientText: string): IngredientIntelligence | null {
    const cleanedText = this.advancedCleanIngredient(ingredientText);
    
    // First, try to find a consolidation rule match
    const consolidatedName = this.findConsolidationMatch(cleanedText);
    if (consolidatedName) {
      // Look up the consolidated name in the database
      for (const [key, info] of Object.entries(INGREDIENT_DATABASE)) {
        if (key === consolidatedName || consolidatedName.includes(key)) {
          return info;
        }
      }
    }
    
    // Direct base ingredient match
    for (const [key, info] of Object.entries(INGREDIENT_DATABASE)) {
      if (cleanedText.includes(key)) {
        return info;
      }
    }
    
    // Alias matching
    for (const [key, info] of Object.entries(INGREDIENT_DATABASE)) {
      for (const alias of info.aliases) {
        if (cleanedText.includes(alias.toLowerCase())) {
          return info;
        }
      }
    }
    
    // Fuzzy matching for common variations
    for (const [key, info] of Object.entries(INGREDIENT_DATABASE)) {
      const similarity = this.calculateSimilarity(cleanedText, key);
      if (similarity > 0.75) {
        return info;
      }
    }
    
    return null;
  }

  // Advanced consolidation matching
  private static findConsolidationMatch(ingredientText: string): string | null {
    const text = ingredientText.toLowerCase().trim();
    
    for (const [baseIngredient, variations] of Object.entries(this.CONSOLIDATION_RULES)) {
      // Check if the text matches any variation
      for (const variation of variations) {
        if (text.includes(variation) || this.calculateSimilarity(text, variation) > 0.8) {
          return baseIngredient;
        }
      }
      
      // Also check if it directly matches the base ingredient
      if (text.includes(baseIngredient) || this.calculateSimilarity(text, baseIngredient) > 0.8) {
        return baseIngredient;
      }
    }
    
    return null;
  }

  // Advanced ingredient cleaning with intelligent simplification
  private static advancedCleanIngredient(ingredient: string): string {
    return ingredient
      // Remove parenthetical content first
      .replace(/\([^)]*\)/g, '')
      // Remove quantity information that might be embedded
      .replace(/^\d+(\.\d+)?\s*(\/\d+)?\s*(cups?|tbsp|tsp|lbs?|oz|pieces?|cloves?|cans?|packages?)\s*/i, '')
      // Remove descriptive qualifiers - be more aggressive
      .replace(/\b(plain|fresh|organic|natural|raw|cooked|dried|frozen|canned|bottled|extra virgin|virgin|reduced fat|low fat|non-fat|fat-free|whole|skim|2%|1%)\b/gi, '')
      // Remove preparation descriptions
      .replace(/\b(chopped|diced|minced|sliced|grated|shredded|crumbled|pitted|halved|quartered|rinsed|drained|peeled)\b/gi, '')
      // Remove size descriptors
      .replace(/\b(large|medium|small|extra|jumbo|baby|mini)\b/gi, '')
      // Remove packaging descriptors
      .replace(/\b(can|jar|bottle|package|bag|box|container|bunch|head|clove|piece|inch|pinch)\b/gi, '')
      // Remove "and" connectors and extra descriptors
      .replace(/\band\s+\w+$/gi, '')
      // Clean up commas and connectors
      .replace(/,\s*\w+\s*(and|or)\s*\w+/gi, '')
      .replace(/,.*$/, '') // Remove everything after first comma
      // Multiple space cleanup
      .replace(/\s+/g, ' ')
      .trim()
      // Remove articles
      .replace(/^(a|an|the)\s+/i, '')
      .trim();
  }
  
  // Calculate string similarity (Levenshtein distance based)
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  // Enhanced quantity extraction with better handling
  static extractQuantityAndUnit(ingredientText: string): {
    quantity: number;
    unit: string;
    cleanedIngredient: string;
  } {
    const text = ingredientText.trim();
    
    // Enhanced regex patterns for quantity extraction
    const patterns = [
      // Fractions with units: "1/2 cup", "2 1/4 cups"
      /^(\d+(?:\s+\d+\/\d+)?|\d+\/\d+)\s+(cups?|tbsp|tablespoons?|tsp|teaspoons?|lbs?|pounds?|oz|ounces?|pieces?|cloves?|heads?|cans?|packages?|medium|large|small)\s+(.+)/i,
      // Decimals with units: "1.5 cups", "0.25 tsp"
      /^(\d+\.?\d*)\s+(cups?|tbsp|tablespoons?|tsp|teaspoons?|lbs?|pounds?|oz|ounces?|pieces?|cloves?|heads?|cans?|packages?|medium|large|small)\s+(.+)/i,
      // Simple numbers with units: "2 chicken breasts", "3 eggs"
      /^(\d+)\s+(.+)/i,
      // Special cases like "Pinch of"
      /^(pinch|dash)\s+of\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let quantity = 1;
        let unit = 'piece';
        let cleanedIngredient = text;
        
        if (match.length >= 4) {
          // Has explicit unit
          const [, quantityStr, unitStr, ingredient] = match;
          quantity = this.parseQuantity(quantityStr);
          unit = this.normalizeUnit(unitStr);
          cleanedIngredient = this.intelligentCleanIngredientName(ingredient.trim());
        } else if (match.length === 3) {
          // Could be number + ingredient or special case like "pinch of"
          const [, first, second] = match;
          if (first.toLowerCase() === 'pinch' || first.toLowerCase() === 'dash') {
            quantity = 0.125; // 1/8 tsp
            unit = 'tsp';
            cleanedIngredient = this.intelligentCleanIngredientName(second.trim());
          } else {
            quantity = this.parseQuantity(first);
            unit = 'piece';
            cleanedIngredient = this.intelligentCleanIngredientName(second.trim());
          }
        }
        
        return { quantity, unit, cleanedIngredient };
      }
    }
    
    // No quantity found, return ingredient as-is with default quantity
    return {
      quantity: 1,
      unit: 'piece',
      cleanedIngredient: this.intelligentCleanIngredientName(text)
    };
  }

  // Intelligent ingredient name cleaning with consolidation
  private static intelligentCleanIngredientName(ingredient: string): string {
    // First, try advanced cleaning
    const cleaned = this.advancedCleanIngredient(ingredient);
    
    // Then try to find a consolidation match
    const consolidated = this.findConsolidationMatch(cleaned);
    if (consolidated) {
      return this.capitalizeFirst(consolidated);
    }
    
    // Fallback to cleaned version
    const final = cleaned
      .split(' ')
      .filter(word => word.length > 1 || ['a', 'i'].includes(word.toLowerCase()))
      .join(' ')
      .trim();
      
    return this.capitalizeFirst(final);
  }

  private static parseQuantity(quantityStr: string): number {
    // Handle fractions and mixed numbers
    if (quantityStr.includes('/')) {
      const parts = quantityStr.trim().split(/\s+/);
      let total = 0;
      
      for (const part of parts) {
        if (part.includes('/')) {
          const [num, den] = part.split('/').map(Number);
          total += num / den;
        } else {
          total += parseFloat(part);
        }
      }
      
      return total;
    }
    
    return parseFloat(quantityStr) || 1;
  }
  
  private static normalizeUnit(unit: string): string {
    const unitMap: Record<string, string> = {
      'cups': 'cup', 'cup': 'cup',
      'tablespoons': 'tbsp', 'tbsp': 'tbsp',
      'teaspoons': 'tsp', 'tsp': 'tsp',
      'pounds': 'lb', 'lbs': 'lb', 'lb': 'lb',
      'ounces': 'oz', 'oz': 'oz',
      'pieces': 'piece', 'piece': 'piece',
      'cloves': 'clove', 'clove': 'clove',
      'heads': 'head', 'head': 'head',
      'cans': 'can', 'can': 'can',
      'packages': 'package', 'package': 'package',
      'medium': 'piece', 'large': 'piece', 'small': 'piece'
    };
    
    return unitMap[unit.toLowerCase()] || unit.toLowerCase();
  }

  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Quantity consolidation logic
export class QuantityConsolidator {
  static consolidateIngredients(ingredients: Array<{
    baseIngredient: string;
    quantity: number;
    unit: string;
    fromRecipe: string;
    originalText: string;
  }>): Array<{
    baseIngredient: string;
    totalQuantity: number;
    unit: string;
    fromRecipes: Array<{
      recipeName: string;
      quantity: number;
      unit: string;
      originalText: string;
    }>;
  }> {
    const consolidatedMap = new Map<string, {
      baseIngredient: string;
      totalQuantity: number;
      unit: string;
      fromRecipes: Array<{
        recipeName: string;
        quantity: number;
        unit: string;
        originalText: string;
      }>;
    }>();
    
    ingredients.forEach(ingredient => {
      const key = ingredient.baseIngredient.toLowerCase();
      const ingredientInfo = INGREDIENT_DATABASE[key];
      
      if (consolidatedMap.has(key)) {
        const existing = consolidatedMap.get(key)!;
        
        // Convert to standard unit for consolidation
        const convertedQuantity = this.convertToStandardUnit(
          ingredient.quantity,
          ingredient.unit,
          ingredientInfo
        );
        
        existing.totalQuantity += convertedQuantity;
        existing.fromRecipes.push({
          recipeName: ingredient.fromRecipe,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          originalText: ingredient.originalText
        });
      } else {
        const standardQuantity = this.convertToStandardUnit(
          ingredient.quantity,
          ingredient.unit,
          ingredientInfo
        );
        
        consolidatedMap.set(key, {
          baseIngredient: ingredient.baseIngredient,
          totalQuantity: standardQuantity,
          unit: ingredientInfo?.standardUnit || ingredient.unit,
          fromRecipes: [{
            recipeName: ingredient.fromRecipe,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            originalText: ingredient.originalText
          }]
        });
      }
    });
    
    return Array.from(consolidatedMap.values());
  }
  
  private static convertToStandardUnit(
    quantity: number,
    unit: string,
    ingredientInfo?: IngredientIntelligence
  ): number {
    if (!ingredientInfo) return quantity;
    
    const conversionRate = ingredientInfo.conversionRates[unit];
    if (conversionRate) {
      return quantity / conversionRate;
    }
    
    return quantity;
  }
}

// Smart categorization
export class SmartCategorizer {
  static categorizeIngredient(ingredientText: string): string {
    const ingredientInfo = IngredientMatcher.findBestMatch(ingredientText);
    
    if (ingredientInfo) {
      return ingredientInfo.category;
    }
    
    // Fallback categorization
    const text = ingredientText.toLowerCase();
    
    const categoryKeywords = {
      'Meat & Poultry': ['meat', 'chicken', 'beef', 'pork', 'turkey', 'bacon', 'sausage'],
      'Seafood': ['fish', 'salmon', 'tuna', 'shrimp', 'crab', 'seafood'],
      'Dairy & Eggs': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs'],
      'Produce': ['vegetables', 'fruits', 'onion', 'garlic', 'tomato', 'lettuce', 'spinach'],
      'Grains & Pasta': ['rice', 'pasta', 'bread', 'flour', 'oats', 'quinoa'],
      'Condiments & Oils': ['oil', 'vinegar', 'sauce', 'dressing', 'spices'],
      'Frozen': ['frozen'],
      'Beverages': ['juice', 'soda', 'water', 'coffee', 'tea'],
      'Snacks': ['chips', 'crackers', 'nuts', 'cookies']
    };
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }
    
    return 'General';
  }
} 
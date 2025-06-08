'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { getUserPreferences, updateUserPreferences } from '@/lib/db';
import { signOut } from '@/lib/auth';
import MainLayout from '@/components/layout/MainLayout';
import AuthWrapper from '@/components/auth/AuthWrapper';
import HealthDocuments from '@/components/profile/HealthDocuments';
import { HealthDocument } from '@/types/weekly-planner';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Button, 
  Input, 
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Alert,
  AlertDescription
} from '@/components/ui';
import { toast } from 'sonner';
import { 
  Save, 
  Plus, 
  X, 
  User, 
  RefreshCw, 
  LogOut, 
  Info,
  Edit,
  Trash2,
  FileText,
  Heart
} from 'lucide-react';

export default function ProfilePage() {
  return (
    <AuthWrapper>
      <MainLayout>
        <Profile />
      </MainLayout>
    </AuthWrapper>
  );
}

function Profile() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [displayName, setDisplayName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [newEquipment, setNewEquipment] = useState('');
  const [staples, setStaples] = useState<string[]>([]);
  const [newStaple, setNewStaple] = useState('');
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [newDietaryPref, setNewDietaryPref] = useState('');
  const [cuisinePrefs, setCuisinePrefs] = useState<string[]>([]);
  const [newCuisinePref, setNewCuisinePref] = useState('');
  const [cookTimePreference, setCookTimePreference] = useState<string>('');
  const [difficultyPreference, setDifficultyPreference] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  // New state for health documents
  const [healthDocuments, setHealthDocuments] = useState<HealthDocument[]>([]);
  const [healthDataConsent, setHealthDataConsent] = useState(false);
  
  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (currentUser) {
        try {
          const prefs = await getUserPreferences(currentUser.uid);
          if (prefs) {
            setIngredients(prefs.ingredients || []);
            setEquipment(prefs.equipment || []);
            setStaples(prefs.staples || []);
            setDietaryPrefs(prefs.dietaryPrefs || []);
            setCuisinePrefs(prefs.cuisinePrefs || []);
            setCookTimePreference(prefs.cookTimePreference || '');
            setDifficultyPreference(prefs.difficultyPreference || '');
          }
          
          // Set display name from user profile
          setDisplayName(currentUser.displayName || currentUser.email?.split('@')[0] || 'User');
        } catch (error) {
          console.error('Error loading preferences:', error);
          toast.error('Failed to load your preferences');
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadUserPreferences();
  }, [currentUser]);
  
  // Add/remove handlers for ingredients
  const addIngredient = () => {
    if (newIngredient.trim() !== '' && !ingredients.includes(newIngredient.trim())) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };
  
  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };
  
  // Add/remove handlers for equipment
  const addEquipment = () => {
    if (newEquipment.trim() !== '' && !equipment.includes(newEquipment.trim())) {
      setEquipment([...equipment, newEquipment.trim()]);
      setNewEquipment('');
    }
  };
  
  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };
  
  // Add/remove handlers for staples
  const addStaple = () => {
    if (newStaple.trim() !== '' && !staples.includes(newStaple.trim())) {
      setStaples([...staples, newStaple.trim()]);
      setNewStaple('');
    }
  };
  
  const removeStaple = (index: number) => {
    setStaples(staples.filter((_, i) => i !== index));
  };
  
  // Add/remove handlers for dietary preferences
  const addDietaryPref = () => {
    if (newDietaryPref.trim() !== '' && !dietaryPrefs.includes(newDietaryPref.trim())) {
      setDietaryPrefs([...dietaryPrefs, newDietaryPref.trim()]);
      setNewDietaryPref('');
    }
  };
  
  const removeDietaryPref = (index: number) => {
    setDietaryPrefs(dietaryPrefs.filter((_, i) => i !== index));
  };
  
  // Add/remove handlers for cuisine preferences
  const addCuisinePref = () => {
    if (newCuisinePref.trim() !== '' && !cuisinePrefs.includes(newCuisinePref.trim())) {
      setCuisinePrefs([...cuisinePrefs, newCuisinePref.trim()]);
      setNewCuisinePref('');
    }
  };
  
  const removeCuisinePref = (index: number) => {
    setCuisinePrefs(cuisinePrefs.filter((_, i) => i !== index));
  };
  
  // Save all preferences
  const savePreferences = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    
    try {
      await updateUserPreferences(currentUser.uid, {
        ingredients,
        equipment,
        staples,
        dietaryPrefs,
        cuisinePrefs,
        cookTimePreference,
        difficultyPreference
      });
      
      toast.success('Preferences saved', {
        description: 'Your cooking preferences have been updated.'
      });
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      
      toast.error('Failed to save preferences', {
        description: 'Please try again later.'
      });
      
    } finally {
      setSaving(false);
    }
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };
  
  // Common preset options
  const commonIngredients = ['Chicken', 'Rice', 'Pasta', 'Potatoes', 'Onions', 'Garlic', 'Tomatoes', 'Eggs', 'Beef', 'Pork'];
  const commonEquipment = ['Oven', 'Stovetop', 'Microwave', 'Blender', 'Slow Cooker', 'Air Fryer', 'Pressure Cooker', 'Grill'];
  const commonStaples = ['Salt', 'Pepper', 'Olive Oil', 'Flour', 'Sugar', 'Butter', 'Soy Sauce', 'Vinegar', 'Spices'];
  const commonDietaryPrefs = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Low-Carb', 'Keto', 'Paleo', 'Nut-Free'];
  const commonCuisinePrefs = ['American', 'Italian', 'Chinese', 'Thai', 'Indian', 'Japanese', 'Mexican', 'Mediterranean', 'French', 'Korean'];
  const cookTimeOptions = ['Under 30 minutes', 'Under 1 hour', 'Longer dish'];
  const difficultyOptions = ['Easy', 'Medium', 'Hard'];
  
  // Add a preset item
  const addPresetItem = (item: string, listType: 'ingredients' | 'equipment' | 'staples' | 'dietary' | 'cuisine') => {
    switch (listType) {
      case 'ingredients':
        if (!ingredients.includes(item)) {
          setIngredients([...ingredients, item]);
        }
        break;
      case 'equipment':
        if (!equipment.includes(item)) {
          setEquipment([...equipment, item]);
        }
        break;
      case 'staples':
        if (!staples.includes(item)) {
          setStaples([...staples, item]);
        }
        break;
      case 'dietary':
        if (!dietaryPrefs.includes(item)) {
          setDietaryPrefs([...dietaryPrefs, item]);
        }
        break;
      case 'cuisine':
        if (!cuisinePrefs.includes(item)) {
          setCuisinePrefs([...cuisinePrefs, item]);
        }
        break;
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Profile Settings</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Manage your personal account details</CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Display Name</h3>
                  {editingName ? (
                    <div className="mt-1 flex items-center">
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="max-w-xs"
                      />
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setEditingName(false)}
                        className="ml-2"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center">
                      <p className="text-base">{displayName}</p>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setEditingName(true)}
                        className="ml-2 text-gray-500"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <User className="h-6 w-6" />
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium">Email Address</h3>
                <p className="mt-1 text-base">{currentUser?.email}</p>
              </div>
              
              <Separator />
              
              <div>
                <Button variant="outline" onClick={handleSignOut} className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950 dark:text-red-400">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Cooking Preferences</CardTitle>
            <CardDescription>Customize your cooking profile to get better recipe recommendations</CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="ingredients">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="ingredients" className="flex-1">Ingredients</TabsTrigger>
                <TabsTrigger value="equipment" className="flex-1">Equipment</TabsTrigger>
                <TabsTrigger value="staples" className="flex-1">Staples</TabsTrigger>
                <TabsTrigger value="dietary" className="flex-1">Dietary</TabsTrigger>
                <TabsTrigger value="cuisine" className="flex-1">Cuisine</TabsTrigger>
                <TabsTrigger value="cooktime" className="flex-1">Cook Time</TabsTrigger>
                <TabsTrigger value="difficulty" className="flex-1">Difficulty</TabsTrigger>
                <TabsTrigger value="health" className="flex-1">Health Documents</TabsTrigger>
              </TabsList>
              
              {/* Ingredients Tab */}
              <TabsContent value="ingredients">
                <div className="space-y-4">
                  <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                    <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                      Add ingredients you commonly have available in your kitchen
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newIngredient}
                      onChange={(e) => setNewIngredient(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
                      placeholder="Add an ingredient..."
                      className="flex-1"
                    />
                    <Button onClick={addIngredient}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Common Ingredients</h4>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {commonIngredients.map((item) => (
                        <Button
                          key={item}
                          size="sm"
                          variant="outline"
                          className={ingredients.includes(item) ? "bg-gray-200 dark:bg-gray-800" : ""}
                          onClick={() => addPresetItem(item, 'ingredients')}
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Your Ingredients ({ingredients.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {ingredients.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No ingredients added yet</p>
                      ) : (
                        ingredients.map((item, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => removeIngredient(index)}
                              className="ml-1 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-full p-1"
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">Remove {item}</span>
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Equipment Tab */}
              <TabsContent value="equipment">
                <div className="space-y-4">
                  <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-800 dark:text-blue-300">
                      Add cooking equipment you have available in your kitchen
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newEquipment}
                      onChange={(e) => setNewEquipment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addEquipment()}
                      placeholder="Add equipment..."
                      className="flex-1"
                    />
                    <Button onClick={addEquipment}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Common Equipment</h4>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {commonEquipment.map((item) => (
                        <Button
                          key={item}
                          size="sm"
                          variant="outline"
                          className={equipment.includes(item) ? "bg-gray-200 dark:bg-gray-800" : ""}
                          onClick={() => addPresetItem(item, 'equipment')}
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Your Equipment ({equipment.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {equipment.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No equipment added yet</p>
                      ) : (
                        equipment.map((item, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => removeEquipment(index)}
                              className="ml-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full p-1"
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">Remove {item}</span>
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Staples Tab */}
              <TabsContent value="staples">
                <div className="space-y-4">
                  <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-800 dark:text-amber-300">
                      Add staple items you typically keep in your pantry
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newStaple}
                      onChange={(e) => setNewStaple(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addStaple()}
                      placeholder="Add a staple..."
                      className="flex-1"
                    />
                    <Button onClick={addStaple}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Common Staples</h4>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {commonStaples.map((item) => (
                        <Button
                          key={item}
                          size="sm"
                          variant="outline"
                          className={staples.includes(item) ? "bg-gray-200 dark:bg-gray-800" : ""}
                          onClick={() => addPresetItem(item, 'staples')}
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Your Staples ({staples.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {staples.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No staples added yet</p>
                      ) : (
                        staples.map((item, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => removeStaple(index)}
                              className="ml-1 hover:bg-amber-100 dark:hover:bg-amber-800 rounded-full p-1"
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">Remove {item}</span>
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Dietary Tab */}
              <TabsContent value="dietary">
                <div className="space-y-4">
                  <Alert className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                    <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <AlertDescription className="text-purple-800 dark:text-purple-300">
                      Add any dietary preferences or restrictions
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newDietaryPref}
                      onChange={(e) => setNewDietaryPref(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addDietaryPref()}
                      placeholder="Add a dietary preference..."
                      className="flex-1"
                    />
                    <Button onClick={addDietaryPref}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Common Dietary Preferences</h4>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {commonDietaryPrefs.map((item) => (
                        <Button
                          key={item}
                          size="sm"
                          variant="outline"
                          className={dietaryPrefs.includes(item) ? "bg-gray-200 dark:bg-gray-800" : ""}
                          onClick={() => addPresetItem(item, 'dietary')}
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Your Dietary Preferences ({dietaryPrefs.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {dietaryPrefs.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No dietary preferences added yet</p>
                      ) : (
                        dietaryPrefs.map((item, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => removeDietaryPref(index)}
                              className="ml-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-full p-1"
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">Remove {item}</span>
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Cuisine Tab */}
              <TabsContent value="cuisine">
                <div className="space-y-4">
                  <Alert className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                    <Info className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <AlertDescription className="text-orange-800 dark:text-orange-300">
                      Add cuisine types you enjoy or want to explore
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newCuisinePref}
                      onChange={(e) => setNewCuisinePref(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCuisinePref()}
                      placeholder="Add a cuisine preference..."
                      className="flex-1"
                    />
                    <Button onClick={addCuisinePref}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Popular Cuisines</h4>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {commonCuisinePrefs.map((item) => (
                        <Button
                          key={item}
                          size="sm"
                          variant="outline"
                          className={cuisinePrefs.includes(item) ? "bg-gray-200 dark:bg-gray-800" : ""}
                          onClick={() => addPresetItem(item, 'cuisine')}
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Your Cuisine Preferences ({cuisinePrefs.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {cuisinePrefs.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No cuisine preferences added yet</p>
                      ) : (
                        cuisinePrefs.map((item, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => removeCuisinePref(index)}
                              className="ml-1 hover:bg-orange-100 dark:hover:bg-orange-800 rounded-full p-1"
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">Remove {item}</span>
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Cook Time Tab */}
              <TabsContent value="cooktime">
                <div className="space-y-4">
                  <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                    <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                      Set your default cook time preference for recipe generation
                    </AlertDescription>
                  </Alert>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">How much time do you typically want to spend cooking?</h4>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {cookTimeOptions.map((option) => (
                        <Button
                          key={option}
                          size="sm"
                          variant="outline"
                          className={cookTimePreference === option ? "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 font-medium text-emerald-600 dark:text-emerald-400" : ""}
                          onClick={() => setCookTimePreference(option)}
                        >
                          {option}
                          {cookTimePreference === option && (
                            <span className="ml-1">✓</span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Current Preference</h4>
                    <div className="flex flex-wrap gap-2">
                      {cookTimePreference ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                        >
                          {cookTimePreference}
                          <button
                            type="button"
                            onClick={() => setCookTimePreference('')}
                            className="ml-1 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Clear preference</span>
                          </button>
                        </Badge>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No cook time preference set</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Difficulty Tab */}
              <TabsContent value="difficulty">
                <div className="space-y-4">
                  <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                    <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                      Set your default difficulty preference for recipe generation
                    </AlertDescription>
                  </Alert>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">How difficult do you typically want your recipes to be?</h4>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {difficultyOptions.map((option) => (
                        <Button
                          key={option}
                          size="sm"
                          variant="outline"
                          className={difficultyPreference === option ? "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 font-medium text-emerald-600 dark:text-emerald-400" : ""}
                          onClick={() => setDifficultyPreference(option)}
                        >
                          {option}
                          {difficultyPreference === option && (
                            <span className="ml-1">✓</span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Current Preference</h4>
                    <div className="flex flex-wrap gap-2">
                      {difficultyPreference ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                        >
                          {difficultyPreference}
                          <button
                            type="button"
                            onClick={() => setDifficultyPreference('')}
                            className="ml-1 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Clear preference</span>
                          </button>
                        </Badge>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No difficulty preference set</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Health Documents Tab */}
              <TabsContent value="health">
                <HealthDocuments userId={currentUser?.uid || ''} />
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter>
            <Button 
              onClick={savePreferences} 
              disabled={saving}
              className="ml-auto"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
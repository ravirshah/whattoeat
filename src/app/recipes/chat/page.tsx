'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import axios from 'axios';
import MainLayout from '@/components/layout/MainLayout';
import AuthWrapper from '@/components/auth/AuthWrapper';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
  Button, 
  Input, 
  Separator,
  ScrollArea,
  Alert,
  AlertDescription
} from '@/components/ui';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  Send, 
  Bot, 
  User,
  RefreshCw,
  Save,
  ChefHat,
  Timer,
  Users,
  ArrowLeft,
  Expand,
  Minimize
} from 'lucide-react';

// Types for chat messages
type MessageRole = 'user' | 'assistant';

interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export default function RecipeChatPage() {
  return (
    <AuthWrapper>
      <MainLayout>
        <RecipeChat />
      </MainLayout>
    </AuthWrapper>
  );
}

function RecipeChat() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [recipe, setRecipe] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [expandedRecipe, setExpandedRecipe] = useState(true);
  const [isFromGenerated, setIsFromGenerated] = useState(false);
  
  // Load recipe data on mount
  useEffect(() => {
    // Check if we came from generated recipes
    const generatedRecipes = sessionStorage.getItem('generatedRecipes');
    if (generatedRecipes) {
      setIsFromGenerated(true);
    }
    
    const storedRecipe = sessionStorage.getItem('recipeToChat') || sessionStorage.getItem('recipeToView');
    if (storedRecipe) {
      try {
        const parsedRecipe = JSON.parse(storedRecipe);
        setRecipe(parsedRecipe);
        
        // Create a welcome message from the assistant
        const initialMessage: ChatMessage = {
          role: 'assistant',
          content: `I'm your recipe assistant for "${parsedRecipe.name}". You can ask me to modify ingredients, adjust portions, make it spicier, suggest substitutions, or answer any questions about this recipe!`,
          timestamp: new Date()
        };
        setMessages([initialMessage]);
        setInitializing(false);
      } catch (error) {
        console.error('Error parsing recipe:', error);
        router.push('/recipes');
      }
    } else {
      router.push('/recipes');
    }
  }, [router]);
  
  // Scroll to bottom of messages when they change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!input.trim() || !recipe || loading) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Prepare the context for Gemini API
      const recipeContext = `
Recipe: ${recipe.name}

Ingredients:
${recipe.ingredients.join('\n')}

Instructions:
${recipe.instructions.join('\n')}

Nutritional Facts: ${recipe.nutritionalFacts}

Servings: ${recipe.servings}

Prep/Cook Times: ${recipe.times}
      `;
      
      // Get conversation history for context
      const conversationHistory = messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      
      // Get user token for authentication
      const token = await currentUser.getIdToken();
      
      // Call API endpoint
      const response = await axios.post('/api/chat-with-recipe', {
        message: input,
        recipeContext,
        conversationHistory
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Add assistant response to messages
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.reply,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      toast.error('Failed to get a response', {
        description: 'Please try again or refresh the page.'
      });
      
    } finally {
      setLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleReset = () => {
    if (recipe) {
      const initialMessage: ChatMessage = {
        role: 'assistant',
        content: `I'm your recipe assistant for "${recipe.name}". You can ask me to modify ingredients, adjust portions, make it spicier, suggest substitutions, or answer any questions about this recipe!`,
        timestamp: new Date()
      };
      
      setMessages([initialMessage]);
      
      toast.success('Conversation reset', {
        description: 'Starting a new conversation about this recipe.'
      });
    }
  };
  
  const handleBackToRecipes = () => {
    // If we came from generated recipes, go back to results
    if (isFromGenerated) {
      router.push('/recipes/results');
    } else {
      // Otherwise go to saved recipes
      router.push('/recipes');
    }
  };
  
  const handleSaveModifiedRecipe = () => {
    // This would typically analyze the conversation to extract modifications
    // Then save a new version of the recipe
    toast.success('Coming Soon', {
      description: 'The ability to save modified recipes will be available soon!'
    });
  };
  
  const toggleRecipeExpansion = () => {
    setExpandedRecipe(!expandedRecipe);
  };
  
  if (initializing || !recipe) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="sm" onClick={handleBackToRecipes}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {isFromGenerated ? 'Back to Generated Recipes' : 'Back to Saved Recipes'}
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset Chat
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleSaveModifiedRecipe}>
              <Save className="h-4 w-4 mr-1" />
              Save Modified Recipe
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recipe Details Panel - Collapsible on mobile */}
          <div className={`${expandedRecipe ? 'block' : 'hidden lg:block'} lg:col-span-1`}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ChefHat className="h-5 w-5 mr-2 text-emerald-600" />
                    <CardTitle>Original Recipe</CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="lg:hidden" 
                    onClick={toggleRecipeExpansion}
                  >
                    <Minimize className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Reference the original recipe while chatting</CardDescription>
              </CardHeader>
              
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-350px)] min-h-[400px]">
                  <div className="p-4 space-y-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {recipe.name}
                      </h2>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{recipe.servings}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Timer className="h-4 w-4 mr-1" />
                          <span>{recipe.times}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-md font-semibold mb-2">Ingredients</h3>
                      <ul className="space-y-1 text-sm">
                        {recipe.ingredients.map((ingredient: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600 mt-2 mr-2"></span>
                            <span className="text-gray-700 dark:text-gray-300">{ingredient}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-md font-semibold mb-2">Instructions</h3>
                      <ol className="space-y-2 text-sm">
                        {recipe.instructions.map((instruction: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-800 text-xs font-medium text-gray-800 dark:text-gray-200 mr-2 flex-shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300">{instruction}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-md font-semibold mb-1">Nutritional Facts</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {recipe.nutritionalFacts}
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          
          {/* Chat Interface */}
          <div className={`${expandedRecipe ? 'col-span-1 lg:col-span-2' : 'col-span-1 lg:col-span-2'}`}>
            {/* Mobile-only collapsible toggle for recipe */}
            {!expandedRecipe && (
              <Button 
                variant="outline" 
                className="mb-4 w-full flex items-center justify-center lg:hidden" 
                onClick={toggleRecipeExpansion}
              >
                <Expand className="h-4 w-4 mr-2" />
                Show Original Recipe
              </Button>
            )}
            
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle>Chat with Recipe Assistant</CardTitle>
                <CardDescription>
                  Ask questions or request modifications to "{recipe.name}"
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-350px)] min-h-[400px] w-full p-4">
                  <div className="space-y-4 py-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            message.role === 'user'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          <div className="flex items-start mb-1">
                            {message.role === 'assistant' ? (
                              <Bot className="h-5 w-5 mr-2 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            ) : (
                              <User className="h-5 w-5 mr-2 text-white flex-shrink-0" />
                            )}
                            <span className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="whitespace-pre-line">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question or suggest a modification..."
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={loading || !input.trim()}>
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <Alert className="mt-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                Try asking: "Can I make this recipe vegetarian?", "How do I adjust this for 8 people?", or "What can I substitute for [ingredient]?"
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  );
}
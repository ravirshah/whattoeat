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
  ScrollArea
} from '@/components/ui';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  Send, 
  Bot, 
  User,
  RefreshCw,
  Save
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
  
  // Load recipe data on mount
  useEffect(() => {
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
  
  const handleSaveModifiedRecipe = () => {
    // This would typically analyze the conversation to extract modifications
    // Then save a new version of the recipe
    toast.success('Coming Soon', {
      description: 'The ability to save modified recipes will be available soon!'
    });
  };
  
  if (initializing || !recipe) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <p>Loading recipe chat...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => router.push('/recipes')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Recipes
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
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{recipe.name}</CardTitle>
            <CardDescription>
              Chat with an AI assistant about this recipe to make modifications or ask questions
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="mb-4">
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-350px)] min-h-[400px] w-full rounded-md p-4">
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
      </div>
    </div>
  );
}
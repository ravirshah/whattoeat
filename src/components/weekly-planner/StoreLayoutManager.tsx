'use client';

import React, { useState, useEffect } from 'react';
import { SmartStoreLayout, SmartStoreSection, GroceryItem } from '@/types/weekly-planner';
import { Button, Badge } from '@/components/ui';
import { 
  Store, MapPin, Clock, BarChart3, Settings, Target, Zap, Trophy,
  X, ArrowRight, CheckCircle2, Timer, TrendingUp, Navigation
} from 'lucide-react';
import { toast } from 'sonner';

interface StoreLayoutManagerProps {
  groceryItems: GroceryItem[];
  onClose: () => void;
  onOptimize: (optimizedItems: GroceryItem[], estimatedTime?: number) => void;
}

interface OptimizedRoute {
  sections: Array<{
    section: SmartStoreSection;
    items: GroceryItem[];
    estimatedTime: number;
  }>;
  totalTime: number;
  efficiency: number;
}

// Improved default store layout without aisle numbers and logical flow
const DEFAULT_STORE_LAYOUT: Omit<SmartStoreLayout, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  storeName: 'Smart Shopping Route',
  storeChain: 'Optimized Layout',
  location: 'Your Local Store',
  isDefault: true,
  sections: [
    {
      id: 'entrance',
      name: 'entrance',
      displayName: 'Store Entrance',
      order: 1,
      categories: ['General'],
      estimatedTime: 2,
      tipForShopping: 'Grab a cart or basket based on your list size',
      alternativeNames: ['front', 'entry', 'carts']
    },
    {
      id: 'produce',
      name: 'produce',
      displayName: 'Fresh Produce',
      order: 2,
      categories: ['Produce'],
      estimatedTime: 8,
      tipForShopping: 'Shop produce early for best selection and freshness',
      alternativeNames: ['fruits', 'vegetables', 'fresh']
    },
    {
      id: 'deli-bakery',
      name: 'deli-bakery',
      displayName: 'Deli & Bakery',
      order: 3,
      categories: ['Meat & Poultry'],
      estimatedTime: 6,
      tipForShopping: 'Take a number if busy, great for fresh items',
      alternativeNames: ['deli', 'bakery', 'fresh bread', 'counter service']
    },
    {
      id: 'meat-seafood',
      name: 'meat-seafood',
      displayName: 'Meat & Seafood',
      order: 4,
      categories: ['Meat & Poultry', 'Seafood'],
      estimatedTime: 7,
      tipForShopping: 'Check dates and ask for assistance with special cuts',
      alternativeNames: ['butcher', 'fish counter', 'fresh meat']
    },
    {
      id: 'pantry',
      name: 'pantry',
      displayName: 'Pantry & Dry Goods',
      order: 5,
      categories: ['Grains & Pasta', 'Condiments & Oils', 'Snacks'],
      estimatedTime: 10,
      tipForShopping: 'Compare unit prices for best deals on bulk items',
      alternativeNames: ['canned goods', 'pasta', 'rice', 'oils', 'center store']
    },
    {
      id: 'beverages',
      name: 'beverages',
      displayName: 'Beverages',
      order: 6,
      categories: ['Beverages'],
      estimatedTime: 4,
      tipForShopping: 'Heavy items - consider cart logistics',
      alternativeNames: ['drinks', 'soda', 'juice', 'water']
    },
    {
      id: 'frozen',
      name: 'frozen',
      displayName: 'Frozen Foods',
      order: 7,
      categories: ['Frozen'],
      estimatedTime: 5,
      tipForShopping: 'Shop frozen items toward the end to maintain temperature',
      alternativeNames: ['freezer', 'ice cream', 'frozen meals']
    },
    {
      id: 'dairy',
      name: 'dairy',
      displayName: 'Dairy & Refrigerated',
      order: 8,
      categories: ['Dairy & Eggs'],
      estimatedTime: 4,
      tipForShopping: 'Final cold items - check expiration dates carefully',
      alternativeNames: ['milk', 'eggs', 'refrigerated', 'cold', 'back wall']
    }
  ],
  averageShoppingTime: 42,
  efficiency: 88,
  lastOptimized: new Date() as any,
  crowdedTimes: ['5:00 PM - 7:00 PM', 'Saturday 12:00 PM - 3:00 PM'],
  bestTimes: ['7:00 AM - 9:00 AM', 'Tuesday - Thursday 10:00 AM - 2:00 PM']
};

export default function StoreLayoutManager({ 
  groceryItems, 
  onClose, 
  onOptimize 
}: StoreLayoutManagerProps) {
  const [storeLayout, setStoreLayout] = useState<SmartStoreLayout | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [selectedOptimizations, setSelectedOptimizations] = useState({
    routeOptimization: true,
    timeOptimization: true,
    efficiencyOptimization: true
  });

  useEffect(() => {
    initializeStoreLayout();
  }, []);

  useEffect(() => {
    if (storeLayout && groceryItems.length > 0) {
      generateOptimizedRoute();
    }
  }, [storeLayout, groceryItems, selectedOptimizations]);

  const initializeStoreLayout = async () => {
    setIsLoading(true);
    try {
      const layout: SmartStoreLayout = {
        id: 'optimized',
        userId: 'current-user',
        ...DEFAULT_STORE_LAYOUT,
        createdAt: new Date() as any,
        updatedAt: new Date() as any
      };
      setStoreLayout(layout);
    } catch (error) {
      console.error('Error loading store layout:', error);
      toast.error('Failed to load store layout');
    } finally {
      setIsLoading(false);
    }
  };

  const generateOptimizedRoute = () => {
    if (!storeLayout) return;

    const itemsBySection = new Map<string, GroceryItem[]>();
    
    groceryItems.forEach(item => {
      const section = findBestSection(item, storeLayout.sections);
      if (section) {
        if (!itemsBySection.has(section.id)) {
          itemsBySection.set(section.id, []);
        }
        itemsBySection.get(section.id)!.push(item);
      }
    });

    // Create optimized route
    const route: OptimizedRoute = {
      sections: storeLayout.sections
        .filter(section => itemsBySection.has(section.id))
        .sort((a, b) => a.order - b.order)
        .map(section => ({
          section,
          items: itemsBySection.get(section.id) || [],
                     estimatedTime: (section.estimatedTime || 5) + (itemsBySection.get(section.id)?.length || 0) * 0.5
        })),
      totalTime: 0,
      efficiency: 0
    };

    route.totalTime = route.sections.reduce((sum, section) => sum + section.estimatedTime, 0);
    route.efficiency = Math.max(50, Math.min(100, 100 - (route.totalTime - 30) * 2));

    setOptimizedRoute(route);
  };

  const findBestSection = (item: GroceryItem, sections: SmartStoreSection[]): SmartStoreSection | null => {
    return sections.find(section => 
      section.categories.includes(item.category)
    ) || sections.find(section => section.name === 'pantry') || sections[0];
  };

  const handleOptimize = () => {
    if (!optimizedRoute) return;

    const optimizedItems = groceryItems.map(item => {
      const section = optimizedRoute.sections.find(s => 
        s.items.some(sItem => sItem.id === item.id)
      );
      
      return {
        ...item,
        storeSection: section?.section.displayName || item.storeSection
      };
    });

    onOptimize(optimizedItems, optimizedRoute.totalTime);
    toast.success(`Shopping route optimized! Estimated time: ${optimizedRoute.totalTime} minutes`);
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 85) return 'text-green-600 bg-green-100';
    if (efficiency >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getEfficiencyIcon = (efficiency: number) => {
    if (efficiency >= 85) return Trophy;
    if (efficiency >= 70) return Target;
    return Timer;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Navigation className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Smart Shopping Route</h3>
                <p className="text-blue-100 text-sm">Optimize your grocery shopping experience</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose} 
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Route Summary */}
          {optimizedRoute && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">Total Time</p>
                    <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                      {optimizedRoute.totalTime} min
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Sections</p>
                    <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                      {optimizedRoute.sections.length} stops
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${getEfficiencyColor(optimizedRoute.efficiency)}`}>
                <div className="flex items-center space-x-2">
                  {React.createElement(getEfficiencyIcon(optimizedRoute.efficiency), { 
                    className: "h-5 w-5" 
                  })}
                  <div>
                    <p className="text-sm">Efficiency</p>
                    <p className="text-lg font-semibold">
                      {optimizedRoute.efficiency}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optimized Route */}
          {optimizedRoute && (
            <div className="space-y-4 mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <ArrowRight className="h-5 w-5 text-blue-600" />
                <span>Optimized Shopping Route</span>
              </h4>
              
              <div className="space-y-3">
                {optimizedRoute.sections.map((routeSection, index) => (
                  <div 
                    key={routeSection.section.id}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {routeSection.section.displayName}
                          </h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {routeSection.items.length} item{routeSection.items.length !== 1 ? 's' : ''} • 
                            ~{Math.ceil(routeSection.estimatedTime)} min
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {routeSection.section.categories.join(', ')}
                      </Badge>
                    </div>
                    
                    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center space-x-1">
                        <Target className="h-3 w-3" />
                        <span>{routeSection.section.tipForShopping}</span>
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {routeSection.items.map(item => (
                        <div 
                          key={item.id}
                          className="inline-flex items-center space-x-1 bg-white dark:bg-gray-700 px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-600"
                        >
                          <span className="text-gray-900 dark:text-white">{item.name}</span>
                          <span className="text-gray-500 dark:text-gray-400">({item.quantity})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shopping Tips */}
          {storeLayout && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h5 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2 flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Smart Shopping Tips</span>
              </h5>
                             <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                 <li>• Best shopping times: {storeLayout.bestTimes?.join(', ') || 'Weekday mornings'}</li>
                 <li>• Avoid peak hours: {storeLayout.crowdedTimes?.join(', ') || 'Evenings and weekends'}</li>
                 <li>• Follow the route order to minimize backtracking</li>
                 <li>• Keep cold items until the end of your trip</li>
               </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {optimizedRoute && (
                <span>
                  Route optimized for {groceryItems.length} items across {optimizedRoute.sections.length} sections
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleOptimize}
                disabled={!optimizedRoute}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply Route
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
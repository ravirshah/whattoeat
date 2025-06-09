'use client';

import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui';
import { 
  ChefHat, 
  LayoutList, 
  Settings, 
  SparkleIcon, 
  ChevronRight, 
  LucideIcon,
  Calendar,
  Bot,
  Heart,
  ShoppingCart,
  Target,
  BarChart3,
  Clock,
  Brain,
  FileText,
  Star
} from 'lucide-react';
import { getBasePath } from '@/lib/utils';

// Feature component
interface FeatureProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
}

function Feature({ icon: Icon, title, description, badge }: FeatureProps) {
  return (
    <div className="group rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-full w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Icon className="h-6 w-6" />
        </div>
        {badge && (
          <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/50 px-2 py-1 text-xs font-medium text-blue-800 dark:text-blue-300">
            {badge}
          </span>
        )}
      </div>
      <h3 className="mb-2 text-xl font-medium text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

// Testimonial component
interface TestimonialProps {
  content: string;
  author: string;
  role: string;
}

function Testimonial({ content, author, role }: TestimonialProps) {
  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="mb-4 flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <SparkleIcon key={star} className="h-5 w-5 text-yellow-500" />
        ))}
      </div>
      <blockquote className="mb-4 italic text-gray-700 dark:text-gray-300">
        "{content}"
      </blockquote>
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">{author}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{role}</p>
      </div>
    </div>
  );
}

export default function Home() {
  // Get base path from utils function instead of using useRouter
  const basePath = getBasePath();
  
  return (
    <MainLayout>
      {/* Hero section */}
      <section className="relative overflow-hidden bg-white dark:bg-gray-950 py-16 md:py-24">
        <div 
          className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,#e4f3ec,transparent),radial-gradient(circle_at_bottom_left,#e9f5ee,transparent)]"
          aria-hidden="true"
        />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col space-y-8">
              <div>
                <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  <SparkleIcon className="mr-1 h-4 w-4" />
                  AI-Powered Meal Planning
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
                Complete meal planning with <span className="text-emerald-600 dark:text-emerald-500">intelligent nutrition</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-xl">
                Transform your kitchen with AI-powered recipe generation, comprehensive meal planning, smart nutrition tracking, and automated grocery lists. Your complete dietary management solution.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link href="/weekly-planner">
                    Start Meal Planning
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/generate">
                    Generate Recipes
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 opacity-30 blur-xl" />
              <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <Image 
                  src="/whattoeat/landingpage.png"
                  alt="WhatToEat App Interface"
                  width={800}
                  height={600}                
                  className="w-full h-auto rounded-lg shadow-xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features section */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Complete Meal Management System
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Everything you need to plan, track, and optimize your meals with intelligent AI assistance
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Feature 
              icon={Calendar}
              title="Weekly Meal Planning"
              description="Interactive 7-day calendar with drag-and-drop meal planning, recipe copying, and flexible customization options."
            />
            <Feature 
              icon={Bot}
              title="AI Chat Input"
              badge="Latest"
              description="Natural language nutrition parsing and file upload support. Just describe your meal or upload recipes - AI handles the rest."
            />
            <Feature 
              icon={Heart}
              title="Recipe Favorites & History"
              description="Advanced recipe management with ratings, cooking frequency tracking, and smart sorting by nutritional content."
            />
            <Feature 
              icon={ShoppingCart}
              title="Smart Grocery Lists"
              description="Auto-generated lists organized by store layout with aisle numbers, category grouping, and inventory management."
            />
            <Feature 
              icon={Target}
              title="Personalized Goals"
              badge="AI-Powered"
              description="Health document analysis with intelligent goal recommendations and evidence-based macro calculations."
            />
            <Feature 
              icon={BarChart3}
              title="Advanced Nutrition Tracking"
              description="Comprehensive macro tracking with goal alignment, visual progress indicators, and weekly analytics."
            />
            <Feature 
              icon={Clock}
              title="Intelligent Meal Prep"
              description="Optimized prep scheduling with time estimation, storage instructions, and shelf life tracking."
            />
            <Feature 
              icon={Brain}
              title="Smart Recipe Generation"
              description="AI-powered recipe creation aligned with your dietary goals, restrictions, and available ingredients."
            />
            <Feature 
              icon={FileText}
              title="Health Integration"
              badge="New"
              description="Upload health documents for AI analysis and personalized dietary recommendations based on your health markers."
            />
          </div>
        </div>
      </section>

      {/* How It Works section */}
      <section className="py-16 md:py-24 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              How WhatToEat Works
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              From planning to plate - your complete meal management workflow
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Target className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">Set Your Goals</h3>
              <p className="text-gray-600 dark:text-gray-400">Define dietary preferences and upload health documents for personalized recommendations.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Calendar className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">Plan Your Week</h3>
              <p className="text-gray-600 dark:text-gray-400">Use our interactive calendar to plan meals with AI-generated recipes or your favorites.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShoppingCart className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">Shop Smart</h3>
              <p className="text-gray-600 dark:text-gray-400">Get organized grocery lists with store layouts and automatic ingredient consolidation.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">Track Progress</h3>
              <p className="text-gray-600 dark:text-gray-400">Monitor nutrition goals with comprehensive tracking and visual progress indicators.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* AI Features Highlight */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-4 py-2 text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-6">
              <Bot className="mr-2 h-4 w-4" />
              Powered by Advanced AI
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Intelligence That Understands Your Health
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Our AI analyzes your health documents, understands natural language meal descriptions, and provides evidence-based nutritional recommendations tailored to your unique health profile.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
                <FileText className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-3" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Health Document Analysis</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upload blood panels and health reports for personalized dietary recommendations.</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
                <Bot className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-3" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Natural Language Input</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Describe meals naturally: "2 eggs, toast, coffee" - AI handles the nutrition parsing.</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
                <Brain className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-3" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Smart Recommendations</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Evidence-based suggestions for ingredients and meal modifications based on health goals.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              What Our Users Say
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Join thousands of users who are transforming their meal planning experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Testimonial 
              content="The AI chat feature is incredible! I can just say 'chicken salad with avocado' and it automatically tracks all my macros. The weekly planner has completely changed how I approach meal prep."
              author="Sarah J."
              role="Fitness Enthusiast"
            />
            <Testimonial 
              content="As someone with diabetes, the health document analysis feature gave me personalized meal recommendations based on my blood work. The grocery lists organized by store layout save me so much time!"
              author="Michael T."
              role="Health-Conscious Cook"
            />
            <Testimonial 
              content="The meal prep planner is genius! It tells me exactly when to prep what, how to store everything, and tracks freshness. I've never been more organized with my cooking."
              author="Priya K."
              role="Busy Professional"
            />
          </div>
        </div>
      </section>
      
      {/* CTA section */}
      <section className="py-16 md:py-24 bg-emerald-600 dark:bg-emerald-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to revolutionize your meal planning?
          </h2>
          <p className="text-emerald-100 text-lg max-w-2xl mx-auto mb-8">
            Join thousands of users who are already experiencing smarter meal planning with AI-powered nutrition insights and comprehensive dietary management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/weekly-planner" className="inline-flex items-center">
                Start Weekly Planner
                <Calendar className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="!border-white !text-white !bg-transparent hover:!bg-white hover:!text-emerald-600" asChild>
              <Link href="/generate" className="inline-flex items-center">
                Generate Recipes
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
'use client';

import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui';
import { ChefHat, LayoutList, Settings, SparkleIcon, ChevronRight, LucideIcon } from 'lucide-react';
import { getBasePath } from '@/lib/utils';

// Feature component
interface FeatureProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

function Feature({ icon: Icon, title, description }: FeatureProps) {
  return (
    <div className="group rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 transition-all hover:shadow-md">
      <div className="mb-4 rounded-full w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
        <Icon className="h-6 w-6" />
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
                  Smart Recipe Generation
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
                Generate recipes with <span className="text-emerald-600 dark:text-emerald-500">ingredients you have</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-xl">
                Turn your available ingredients into delicious meals. No more wasting food or wondering what to cook!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link href="/generate">
                    Get Started
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/register">
                    Create account
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
      
      {/* Features section */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              How WhatToEat Works
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Transform your kitchen ingredients into amazing meals in just a few simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Feature 
              icon={LayoutList}
              title="Enter Your Ingredients"
              description="Tell us what ingredients you have in your kitchen, and we'll work with what you've got."
            />
            <Feature 
              icon={Settings}
              title="Customize Preferences"
              description="Set dietary requirements, cooking equipment, and preferences for personalized results."
            />
            <Feature 
              icon={ChefHat}
              title="Get Custom Recipes"
              description="Receive tailor-made recipes that use your available ingredients and meet your needs."
            />
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
              Join thousands of home cooks who are already loving WhatToEat
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Testimonial 
              content="I used to throw away so many ingredients, but now I'm able to use everything in my fridge. It's saved me money and reduced my food waste!"
              author="Sarah J."
              role="Home Cook"
            />
            <Testimonial 
              content="As a busy parent, I don't have time to plan elaborate meals. This app helps me whip up quick, tasty dishes with whatever I have on hand."
              author="Michael T."
              role="Busy Parent"
            />
            <Testimonial 
              content="The dietary preference options have been a game changer for me. Finally, recipes that accommodate my allergies without sacrificing flavor!"
              author="Priya K."
              role="Food Enthusiast"
            />
          </div>
        </div>
      </section>
      
      {/* CTA section */}
      <section className="py-16 md:py-24 bg-emerald-600 dark:bg-emerald-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to stop wasting food?
          </h2>
          <p className="text-emerald-100 text-lg max-w-2xl mx-auto mb-8">
            Join thousands of home cooks who are making delicious meals with what they already have.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/generate" className="inline-flex items-center">
              Start Cooking Now
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </MainLayout>
  );
}
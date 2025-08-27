"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

const motivationalQuotes = [
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs"
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill"
  },
  {
    text: "The future depends on what you do today.",
    author: "Mahatma Gandhi"
  },
  {
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson"
  },
  {
    text: "The only limit to our realization of tomorrow is our doubts of today.",
    author: "Franklin D. Roosevelt"
  },
  {
    text: "Focus is not about saying yes to the things you've got to focus on, but saying no to the hundred other good ideas.",
    author: "Steve Jobs"
  },
  {
    text: "Time is what we want most, but what we use worst.",
    author: "William Penn"
  },
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain"
  }
];

export default function HomePage() {
  const [currentQuote, setCurrentQuote] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % motivationalQuotes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      {/* Hero Section */}
      <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="mb-8">
          <div className="inline-block p-4 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 mb-6">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 to-brand-600 bg-clip-text text-transparent dark:from-white dark:to-brand-400 mb-4">
            BlitzitApp
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
            Transform your productivity with Focus + To‑Do + Pomodoro + Forest Gamification
          </p>
        </div>

        {/* Motivational Quote */}
        <div className="mb-12 max-w-3xl">
          <blockquote className="text-2xl md:text-3xl font-medium text-gray-800 dark:text-gray-200 mb-4 italic">
            &ldquo;{motivationalQuotes[currentQuote].text}&rdquo;
          </blockquote>
          <cite className="text-lg text-brand-600 dark:text-brand-400 font-medium">
            — {motivationalQuotes[currentQuote].author}
          </cite>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 max-w-4xl">
          {[
            { icon: "🎯", title: "Smart Focus", desc: "Pomodoro timer with custom presets" },
            { icon: "📝", title: "Quick Add", desc: "Natural language task creation" },
            { icon: "🌳", title: "Forest Growth", desc: "Gamify your productivity" },
            { icon: "📊", title: "Analytics", desc: "Track your progress & insights" }
          ].map((feature, index) => (
            <div key={index} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="space-y-4">
          <Link 
            href="/today" 
            className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
          >
            🚀 Start Your Journey
          </Link>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/focus" 
              className="inline-block bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium px-6 py-3 rounded-lg transition-all duration-300 hover:shadow-md"
            >
              ⏱️ Focus Timer
            </Link>
            <Link 
              href="/analytics" 
              className="inline-block bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium px-6 py-3 rounded-lg transition-all duration-300 hover:shadow-md"
            >
              📊 View Analytics
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div>
          <div className="text-3xl font-bold text-brand-500 mb-2">25</div>
          <div className="text-gray-600 dark:text-gray-400">Minutes Focus</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-brand-500 mb-2">∞</div>
          <div className="text-gray-600 dark:text-gray-400">Productivity</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-brand-500 mb-2">100%</div>
          <div className="text-gray-600 dark:text-gray-400">Your Potential</div>
        </div>
      </div>
    </div>
  );
}



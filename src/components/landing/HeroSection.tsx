"use client";

import AIPerformanceConsole from "./AIPerformanceConsole";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 pt-20 lg:pt-32 pb-16 lg:pb-24 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/20 to-orange-600/40"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left space-y-6 lg:space-y-8">
            {/* Badge */}
            <div className="inline-block">
              <span className="bg-white/20 text-white text-xs lg:text-sm px-4 py-2 rounded-full backdrop-blur-sm border border-white/30">
                Operational Intelligence Engine
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight">
              A single AI engine powering every function across your enterprise
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl lg:text-2xl text-white/90 max-w-2xl mx-auto lg:mx-0">
              Deploy AI agents, automate decisions, and connect every tool into one unified operating system for your business
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="bg-white text-orange-600 px-8 py-4 rounded-full font-semibold text-base lg:text-lg hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                Start with AI Core
              </button>
              <button className="bg-transparent text-white px-8 py-4 rounded-full font-semibold text-base lg:text-lg border-2 border-white/30 hover:bg-white/10 backdrop-blur-sm transition-all">
                Explore Platform
              </button>
            </div>
          </div>

          {/* Right Content - AI Performance Console */}
          <div className="flex justify-center lg:justify-end mt-8 lg:mt-0">
            <AIPerformanceConsole />
          </div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-orange-50 to-transparent"></div>
    </section>
  );
}

"use client";

export default function AIPerformanceConsole() {
  return (
    <div className="relative w-full max-w-sm lg:max-w-md mx-auto lg:mx-0">
      <div className="bg-gradient-to-br from-orange-400/40 to-orange-500/40 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-2xl border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span className="text-white text-sm lg:text-base font-medium">
              AI Performance Console
            </span>
          </div>
          <button className="text-white/80 hover:text-white text-xs lg:text-sm px-3 py-1 bg-white/10 rounded-full">
            Details
          </button>
        </div>

        {/* Active Automations */}
        <div className="mb-6">
          <div className="text-white text-4xl lg:text-5xl font-bold mb-1">12+</div>
          <div className="text-white/90 text-sm lg:text-base">Active Automations</div>
        </div>

        {/* Agent Avatars */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-white"></div>
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white"></div>
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-white"></div>
          </div>
          <span className="text-white/90 text-xs lg:text-sm ml-2">28 agents deployed</span>
        </div>

        {/* Chart Bars */}
        <div className="flex items-end justify-between gap-2 lg:gap-3 h-32 lg:h-40">
          <div className="flex-1 bg-white/30 rounded-t-lg" style={{ height: '60%' }}></div>
          <div className="flex-1 bg-white/40 rounded-t-lg" style={{ height: '75%' }}></div>
          <div className="flex-1 bg-white/50 rounded-t-lg" style={{ height: '85%' }}></div>
          <div className="flex-1 bg-white/60 rounded-t-lg" style={{ height: '95%' }}></div>
          <div className="flex-1 bg-white/70 rounded-t-lg" style={{ height: '70%' }}></div>
        </div>
      </div>
    </div>
  );
}

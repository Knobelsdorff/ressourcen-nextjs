"use client";

export default function UnifiedLayerSection() {
  return (
    <section className="relative bg-gradient-to-b from-orange-50 via-white to-orange-50 py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16 space-y-4">
          <div className="inline-block">
            <span className="bg-orange-100 text-orange-700 text-xs lg:text-sm px-4 py-2 rounded-full font-medium">
              Decision Automation
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight max-w-4xl mx-auto">
            Your unified layer for enterprise wide automation
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            AI Core syncs your tools, workflows, teams, and data into one autonomous AI engine that executes decisions at scale.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Side - Text Content */}
          <div className="space-y-6 lg:space-y-8">
            <div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Automate decisions across every team
              </h3>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                AI Core analyzes real-time data across departments, identifies actions, and executes work autonomously from operations to finance to customer service.
              </p>
            </div>
          </div>

          {/* Right Side - Decision Log Card */}
          <div className="relative">
            <div className="bg-gradient-to-br from-orange-100 via-orange-50 to-amber-100 rounded-3xl p-6 lg:p-8 shadow-2xl border border-orange-200">
              {/* Card Header */}
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl lg:text-2xl font-bold text-gray-900">
                  AI Decision Log
                </h4>
                <span className="text-xs lg:text-sm text-orange-600 bg-white px-3 py-1 rounded-full font-medium">
                  Recent Actions (485)
                </span>
              </div>

              {/* Decision Items */}
              <div className="space-y-4">
                {/* Item 1 */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 text-sm lg:text-base">
                          Riley Chen
                        </span>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Action executed
                        </span>
                      </div>
                      <p className="text-xs lg:text-sm text-gray-600">Invoice material</p>
                    </div>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 text-sm lg:text-base">
                          Anna Patel
                        </span>
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                          Flagged for review
                        </span>
                      </div>
                      <p className="text-xs lg:text-sm text-gray-600">Customer request #</p>
                    </div>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 text-sm lg:text-base">
                          Jonah Mills
                        </span>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Action executed
                        </span>
                      </div>
                      <p className="text-xs lg:text-sm text-gray-600">Supplier/Material</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { SECTIONS } from "../../lib/examData";
import StatCards from "../../components/dashboard/StatCards";
import ReviewQueue from "../../components/dashboard/ReviewQueue";
import WeakTopics from "../../components/dashboard/WeakTopics";
import RecentResults from "../../components/dashboard/RecentResults";

export default function DashboardPage() {
  const router = useRouter();
  const {
    displayName,
    stats,
    recommendation,
    missedQuestionIds,
    flaggedQuestionIds,
    topicStats,
    recentResults,
    reviewSession,
    applyRecommendation,
    setSelectedMode,
  } = useApp();

  const handleRecommendedAction = () => {
    applyRecommendation();
    router.push("/practice");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {displayName} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {stats.questionsCompleted > 0
            ? `You've answered ${stats.questionsCompleted} questions so far. Keep building momentum.`
            : "Start practicing to track your MCAT preparation progress."}
        </p>
      </div>

      {/* Stats */}
      <StatCards stats={stats} />

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recommended */}
          <div className="bg-gradient-to-br from-blue-800 to-cyan-600 rounded-xl p-6 text-white shadow-md">
            <div className="text-xs font-medium text-blue-200 uppercase tracking-wider mb-1">
              Recommended
            </div>
            <h3 className="text-lg font-bold mb-2">{recommendation.title}</h3>
            <p className="text-sm text-blue-100 leading-relaxed max-w-lg">
              {recommendation.text}
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleRecommendedAction}
                className="px-4 py-2 bg-white text-blue-800 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
              >
                {recommendation.action === "review"
                  ? "Reattempt Missed"
                  : "Start Practice"}
              </button>
              {missedQuestionIds.size > 0 && recommendation.action !== "review" && (
                <button
                  onClick={() => {
                    setSelectedMode("review");
                    router.push("/practice");
                  }}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                >
                  Reattempt Missed ({missedQuestionIds.size})
                </button>
              )}
            </div>
          </div>

          {/* Recent Results */}
          <RecentResults
            results={recentResults}
            onReview={reviewSession}
            sections={SECTIONS}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ReviewQueue
            missedCount={missedQuestionIds.size}
            flaggedCount={flaggedQuestionIds.size}
            onReviewMissed={() => router.push("/review")}
          />
          <WeakTopics topics={topicStats} sections={SECTIONS} />
        </div>
      </div>
    </div>
  );
}

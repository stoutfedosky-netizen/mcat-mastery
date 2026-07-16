"use client";
import { useRouter } from "next/navigation";
import { useApp } from "../../../context/AppContext";
import { SECTIONS } from "../../../lib/examData";
import RecentResults from "../../../components/dashboard/RecentResults";

export default function ReviewPage() {
  const router = useRouter();
  const {
    missedQuestionIds,
    flaggedQuestionIds,
    recentResults,
    reviewSession,
    startReattemptMissed,
    setSelectedSections,
    setStatusFilter,
    setSelectedMode,
  } = useApp();

  const practiceFlagged = () => {
    setSelectedSections(SECTIONS.map((s) => s.id));
    setStatusFilter("flagged");
    setSelectedMode("practice");
    router.push("/practice");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Review</h1>
        <p className="text-gray-500 mt-1">
          Revisit missed questions and flagged items to reinforce weak areas.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {/* Missed */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Missed Questions</h3>
              <p className="text-xs text-gray-500">
                {missedQuestionIds.size} to review
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Questions you answered incorrectly on your most recent attempt.
          </p>
          <button
            onClick={startReattemptMissed}
            disabled={missedQuestionIds.size === 0}
            className="w-full py-2.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "#1a3a5c" }}
          >
            {missedQuestionIds.size === 0
              ? "Nothing to Reattempt"
              : `Reattempt Missed (${missedQuestionIds.size})`}
          </button>
        </div>

        {/* Flagged */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Flagged Questions</h3>
              <p className="text-xs text-gray-500">
                {flaggedQuestionIds.size} flagged
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Questions you flagged during practice sessions for a second look.
          </p>
          <button
            onClick={practiceFlagged}
            disabled={flaggedQuestionIds.size === 0}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all border-2 border-[#1a3a5c] text-[#1a3a5c] hover:bg-[#e8eef6] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            {flaggedQuestionIds.size === 0
              ? "No Flagged Questions"
              : "Practice Flagged"}
          </button>
        </div>
      </div>

      {/* Past sessions */}
      <RecentResults
        results={recentResults}
        onReview={reviewSession}
        sections={SECTIONS}
      />
    </div>
  );
}

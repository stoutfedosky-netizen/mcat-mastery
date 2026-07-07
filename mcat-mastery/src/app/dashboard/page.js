"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import ExamInterface from "../../components/ExamInterface";

/* 
  For initial development, this loads questions from local JSON.
  Once Supabase is connected, replace with API calls.
*/

const SECTIONS = [
  { id: "cp", name: "Chemical & Physical Foundations", abbr: "C/P", color: "#0891b2" },
  { id: "cars", name: "Critical Analysis & Reasoning", abbr: "CARS", color: "#7c3aed" },
  { id: "bb", name: "Biological & Biochemical Foundations", abbr: "B/B", color: "#059669" },
  { id: "ps", name: "Psychological, Social & Bio Foundations", abbr: "P/S", color: "#e11d48" },
];

export default function Dashboard() {
  const [activeExam, setActiveExam] = useState(null);
  const [questions, setQuestions] = useState({});

  // TODO: Replace with Supabase fetch
  // For now, questions are loaded via the import script into the database

  const startExam = (sectionId) => {
    const sectionQs = questions[sectionId] || [];
    if (sectionQs.length === 0) {
      alert("No questions loaded for this section yet. Run the import script first.");
      return;
    }
    const section = SECTIONS.find((s) => s.id === sectionId);
    setActiveExam({
      questions: sectionQs,
      sectionName: section.name,
      sectionAbbr: section.abbr,
      sectionColor: section.color,
      timeLimit: sectionQs.length * 95,
    });
  };

  if (activeExam) {
    return (
      <ExamInterface
        questions={activeExam.questions}
        sectionName={activeExam.sectionName}
        sectionAbbr={activeExam.sectionAbbr}
        sectionColor={activeExam.sectionColor}
        timeLimit={activeExam.timeLimit}
        onComplete={(results) => {
          console.log("Exam completed:", results);
          // TODO: Save results to Supabase
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-exam">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-[#1a3a5c]">The 528</span> <span className="text-[#1a3a5c]">Academy</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Welcome back</span>
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
            U
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Question Bank</h1>
        <p className="text-gray-500 mb-8">Select a section to begin a practice session.</p>

        <div className="grid md:grid-cols-2 gap-4">
          {SECTIONS.map((sec) => {
            const count = (questions[sec.id] || []).length;
            return (
              <button key={sec.id} onClick={() => startExam(sec.id)}
                className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-md hover:border-gray-300 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold tracking-widest uppercase" style={{ color: sec.color }}>{sec.abbr}</span>
                  <span className="text-xs text-gray-400">{count} questions</span>
                </div>
                <div className="font-semibold text-gray-900 mb-1 group-hover:text-gray-700">{sec.name}</div>
                <div className="text-xs text-gray-400">Timed practice · Review mode · Full explanations</div>
              </button>
            );
          })}
        </div>

        <div className="mt-10 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Getting Started</h2>
          <div className="text-sm text-gray-500 space-y-2">
            <p>1. Run <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">npm run import-questions</code> to load your question bank JSON files into Supabase.</p>
            <p>2. Select a section above to start a timed practice session.</p>
            <p>3. After completing a session, review your answers with detailed explanations for every choice.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

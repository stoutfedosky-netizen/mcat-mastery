"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";
import ExamInterface from "../components/ExamInterface";

const SECTIONS = [
  { id: "cp", name: "Chemical & Physical Foundations", abbr: "C/P", color: "#0891b2" },
  { id: "cars", name: "Critical Analysis & Reasoning", abbr: "CARS", color: "#7c3aed" },
  { id: "bb", name: "Biological & Biochemical Foundations", abbr: "B/B", color: "#059669" },
  { id: "ps", name: "Psychological, Social & Bio Foundations", abbr: "P/S", color: "#e11d48" },
];

export default function Dashboard() {
  const [activeExam, setActiveExam] = useState(null);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchCounts() {
      const { data, error } = await supabase
        .from("questions")
        .select("section_id");
      
      if (!error && data) {
        const c = {};
        data.forEach((q) => {
          c[q.section_id] = (c[q.section_id] || 0) + 1;
        });
        setCounts(c);
      }
      setLoading(false);
    }
    fetchCounts();
  }, []);

  const startExam = async (sectionId) => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("section_id", sectionId)
      .order("batch", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      alert("No questions found for this section.");
      return;
    }

    const questions = data.map((q) => ({
      id: q.id,
      passage: q.passage,
      usePrevPassage: q.use_prev_passage,
      stem: q.stem,
      choices: q.choices,
      correct: q.correct_answer,
      explanations: q.explanations,
      topic: q.topic,
      difficulty: q.difficulty,
    }));

    const section = SECTIONS.find((s) => s.id === sectionId);
    setActiveExam({
      questions,
      sectionName: section.name,
      sectionAbbr: section.abbr,
      sectionColor: section.color,
      timeLimit: questions.length * 95,
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
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-exam">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          MCAT <span className="text-cyan-600">Mastery</span>
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
            const count = counts[sec.id] || 0;
            return (
              <button key={sec.id} onClick={() => startExam(sec.id)}
                className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-md hover:border-gray-300 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold tracking-widest uppercase" style={{ color: sec.color }}>{sec.abbr}</span>
                  <span className="text-xs text-gray-400">
                    {loading ? "..." : `${count} questions`}
                  </span>
                </div>
                <div className="font-semibold text-gray-900 mb-1 group-hover:text-gray-700">{sec.name}</div>
                <div className="text-xs text-gray-400">Timed practice · Review mode · Full explanations</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

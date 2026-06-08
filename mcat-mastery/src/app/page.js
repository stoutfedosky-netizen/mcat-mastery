"use client";
import { useState } from "react";
import Link from "next/link";

const SECTIONS = [
  { id: "cp", name: "Chem/Phys", abbr: "C/P", color: "#0891b2", questions: 0 },
  { id: "cars", name: "CARS", abbr: "CARS", color: "#7c3aed", questions: 0 },
  { id: "bb", name: "Bio/Biochem", abbr: "B/B", color: "#059669", questions: 0 },
  { id: "ps", name: "Psych/Soc", abbr: "P/S", color: "#e11d48", questions: 0 },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1120] to-[#131c33] text-gray-200 font-exam">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="text-xl font-bold tracking-tight text-white">MCAT <span className="text-cyan-400">Mastery</span></div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Log In</Link>
          <Link href="/signup" className="text-sm px-4 py-2 bg-cyan-600 text-white rounded-md font-medium hover:bg-cyan-500 transition-colors">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
        <div className="inline-block mb-5 text-xs font-semibold tracking-widest uppercase text-cyan-400 bg-cyan-400/10 px-4 py-1.5 rounded-full border border-cyan-400/20">
          Question Bank
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-5 tracking-tight">
          MCAT practice that<br />explains <span className="text-cyan-400">every</span> answer.
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          AAMC-style questions with detailed rationales for every choice — right and wrong.
          Built by subject matter experts. Reviewed by 528 scorers.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup" className="px-8 py-3 bg-cyan-500 text-white rounded-lg font-semibold text-lg hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20">
            Start Practicing — Free
          </Link>
          <Link href="/dashboard" className="px-8 py-3 bg-white/5 text-gray-300 rounded-lg font-medium text-lg hover:bg-white/10 border border-white/10 transition-colors">
            View Question Bank
          </Link>
        </div>
      </div>

      {/* Section Cards */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SECTIONS.map((sec) => (
            <div key={sec.id} className="bg-white/5 rounded-xl border border-white/10 p-6 text-center hover:border-white/20 transition-colors">
              <div className="text-2xl font-bold mb-1" style={{ color: sec.color }}>{sec.abbr}</div>
              <div className="text-sm text-gray-400">{sec.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Every Choice Explained", desc: "Not just the right answer — every distractor gets a full rationale explaining why it's wrong and what error leads to it." },
            { title: "Real Exam Interface", desc: "Practice in a Pearson VUE-style split-panel layout with timer, flagging, and passage tools — exactly like test day." },
            { title: "Track Your Weaknesses", desc: "Performance analytics by section, topic, and difficulty level so you know exactly where to focus." },
          ].map((f, i) => (
            <div key={i} className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-gray-500">
        © 2026 MCAT Mastery. Not affiliated with AAMC or Pearson VUE.
      </footer>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Calendar,
  Award,
  Users,
  Compass,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';

export const About: React.FC = () => {
  const milestones = [
    { year: '2017', title: 'The Founding Bond', description: 'Established by an initial group of classmates and friends in Dhaka with the motto of mutual brotherhood and trust.' },
    { year: '2019', title: 'First Annual Reunion & Welfare Fund', description: 'Formalized monthly membership contributions and launched the first emergency community support fund.' },
    { year: '2021', title: 'Relief Drives & Social Impact', description: 'Organized emergency flood aid and winter blanket distributions in rural districts of Bangladesh.' },
    { year: '2024', title: 'Digital Governance Initiative', description: 'Transitioned from manual spreadsheets to a fully digital ledger and transparent club management system.' },
    { year: '2026', title: 'Decade Milestone & Full-Stack Platform', description: 'Celebrating a decade of brotherhood with automated dues tracking, RLS database security, and dedicated member portals.' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16 animate-in fade-in duration-200">
      {/* Intro Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Established 2017 · Dhaka, Bangladesh</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          About Bondhon 2017
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Bondhon 2017 (বন্ধন ২০১৭) is a community of lifelong friends rooted in friendship, service, and mutual accountability.
        </p>
      </div>

      {/* Crest & Story Split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs">
        <div className="md:col-span-4 flex justify-center">
          <img
            src={crestImage}
            alt="Bondhon 2017 Emblem"
            className="w-48 h-48 rounded-full object-cover shadow-md border-4 border-emerald-600/20"
          />
        </div>
        <div className="md:col-span-8 space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Our Origin & Philosophy
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            What started as casual gatherings among friends quickly blossomed into a structured brotherhood. In 2017, the founding members made a pact: no matter where careers, families, or migrations took them, their bond would remain unbreakable.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            The club operates with fixed monthly contributions in Bangladeshi Taka (৳). Every taka collected is strictly accounted for, funding community reunions, emergency member loans, educational gifts, and benevolent social welfare programs.
          </p>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Our Mission</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            To provide an enduring network of mutual support, emotional solidarity, and collaborative philanthropy for all members, ensuring nobody walks alone through life’s triumphs or trials.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Our Vision</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            To be recognized as a premier benchmark of community fraternity in Bangladesh, demonstrating how transparent financial stewardship and genuine friendship create multi-generational impact.
          </p>
        </div>
      </div>

      {/* Historical Milestones */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center">
          Key Milestones (2017 – Present)
        </h2>

        <div className="space-y-4">
          {milestones.map((m) => (
            <div
              key={m.year}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs"
            >
              <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 shrink-0 sm:w-20">
                {m.year}
              </span>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {m.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {m.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call to action */}
      <div className="text-center p-8 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Want to browse our members?
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Visit the public directory to view our full roster of active members.
        </p>
        <Link
          to="/members"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-2xs"
        >
          <span>Open Public Member Directory</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

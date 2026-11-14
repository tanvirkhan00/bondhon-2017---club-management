import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  HandHeart,
  ShieldCheck,
  Compass,
  Award,
  Sparkles,
  ArrowRight,
  FileText,
  MapPin,
  Calendar,
  Users,
} from 'lucide-react';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';

export const About: React.FC = () => {
  const committee = [
    { role: 'সভাপতি (President)', name: 'সৈকত ঢালী (Shaikot Dhali)', img: '/assets/aistudio/Soykot_f8261d98.jpg', note: 'প্রধান নির্বাহী' },
    { role: 'সহ-সভাপতি (Vice President)', name: 'মুশফিকুর সালেহীন (Musfiqur Salehin)', img: '/assets/aistudio/Tanjim_8e20d7a3.jpg', note: 'নির্বাহী সমন্বয়ক' },
    { role: 'সাধারণ সম্পাদক (General Secretary)', name: 'জাফর মোল্লা (Jafor Molla)', img: '/assets/aistudio/Jafor_a1548d21.jpg', note: 'রেকর্ড ও প্রশাসন' },
    { role: 'কোষাধ্যক্ষ (Treasurer)', name: 'তানভীর খান (Tanvir Khan)', img: '/assets/aistudio/Tanvir_Khan_db922a3d.jpg', note: 'অর্থ ও হিসাব' },
    { role: 'সহ-কোষাধ্যক্ষ (Assistant Treasurer)', name: 'অমিত ঘোষ (Amit Ghosh)', img: '/assets/aistudio/Amit_f054cc9a.jpg', note: 'আর্থিক নিরীক্ষা' },
    { role: 'সাংগঠনিক সম্পাদক (Organizing Secretary)', name: 'তানভীর আহমেদ (Tanvir Ahmed)', img: '/assets/aistudio/Tanbeer_Ahmed_6333333c.jpg', note: 'সাংগঠনিক দায়িত্ব' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16 animate-in fade-in duration-200">
      {/* Intro Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>বন্ধুত্ব সমবায় সমিতি · এস.এস.সি ব্যাচ ২০১৭</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          About Bondhon 2017
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          <strong>বন্ধুত্ব সমবায় সমিতি</strong> (Bondhon 2017) – চরচান্দা খাসমহল বাজার। স্থাপিত: ০১/০৪/২০২৪ ইং। পারস্পরিক সঞ্চয়, আর্থিক স্বচ্ছতা এবং অটুট বন্ধুত্বের প্রতীক।
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/constitution"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>অফিসিয়াল গঠনতন্ত্র ও নীতিমালা পড়ুন</span>
          </Link>
          <Link
            to="/members"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>সদস্য তালিকা</span>
          </Link>
        </div>
      </div>

      {/* Crest & Story Split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs">
        <div className="md:col-span-4 flex justify-center">
          <img
            src={crestImage}
            alt="Bondhon 2017 Official Emblem"
            className="w-48 h-48 rounded-full object-cover shadow-md border-4 border-emerald-600/20"
          />
        </div>
        <div className="md:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pb-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              স্থাপিত: ০১/০৪/২০২৪ ইং
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              চরচান্দা খাসমহল বাজার
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            আমাদের পটভূমি ও আদর্শ
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            ২০১৭ সালের এস.এস.সি ব্যাচের বন্ধুদের আন্তরিক প্রচেষ্টায় গঠিত এই সমবায় সমিতি পারস্পরিক সঞ্চয় ও সৌহার্দ্য বৃদ্ধির এক নির্ভরযোগ্য প্ল্যাটফর্ম। ০১ এপ্রিল ২০২৪ তারিখে আনুষ্ঠানিকভাবে যাত্রা শুরু করে সমিতিটি একটি সুসংগঠিত নিয়মতান্ত্রিক কাঠামোর রূপ নেয়।
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            সমিতির সকল ২১ জন সদস্য প্রতি মাসের <strong>১২ তারিখের মধ্যে</strong> নিয়মিত সঞ্চয় কিস্তি (৫০০ ৳) জমা দেন। নির্দিষ্ট সময়ের পরে জমা দিলে গঠনতন্ত্র অনুযায়ী ৫০ টাকা বিলম্ব জরিমানা কার্যকর হয়, যা প্রতিটি সদস্যের জবাবদিহিতা ও সমিতির আর্থিক শৃঙ্খলা বজায় রাখে।
          </p>
        </div>
      </div>

      {/* Executive Committee Section */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            বর্তমান ব্যবস্থাপনা কমিটি (Management Committee)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            গঠনতন্ত্রের ধারা ৩.১ অনুসারে নির্বাচিত বর্তমান কার্যনির্বাহী পরিষদ
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {committee.map((c) => (
            <div
              key={c.role}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3.5 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <img
                src={c.img}
                alt={c.name}
                className="w-12 h-12 rounded-full object-cover border border-emerald-600/30 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block leading-tight">
                  {c.role}
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {c.name}
                </h3>
                <span className="text-[10px] text-slate-400 block">
                  {c.note}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">আমাদের লক্ষ্য (Mission)</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            সদস্যদের আর্থিক উন্নয়ন সাধন করা, সঞ্চয় প্রথা গড়ে তোলা এবং প্রতিটি সদস্যের ভবিষ্যৎ আর্থিক নিরাপত্তা ও সৌহার্দ্যপূর্ণ সম্পর্ক সুদৃঢ় করা।
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">আমাদের দর্শন (Vision)</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            শতভাগ আর্থিক স্বচ্ছতা ও ডিজিটাল হিসাবরক্ষণের মাধ্যমে সদস্যদের পারস্পরিক আস্থা অর্জন এবং একটি আদর্শ সমবায় সমিতির দৃষ্টান্ত স্থাপন করা।
          </p>
        </div>
      </div>

      {/* Call to action */}
      <div className="text-center p-8 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          সমিতির গঠনতন্ত্র ও পূর্ণাঙ্গ বিধিমালা দেখতে চান?
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          সদস্যপদ যোগ্যতা, ভর্তি নিয়মাবলী, ভোটদান অধিকার ও আর্থিক বিধিমালা বিস্তারিত পড়ুন।
        </p>
        <Link
          to="/constitution"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-2xs"
        >
          <span>পূর্ণাঙ্গ গঠনতন্ত্র পড়ুন</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

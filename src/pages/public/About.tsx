import React from 'react';
import { Link } from 'react-router-dom';
import { PageTransition, RevealSection } from '../../components/ui/MotionPrimitives';
import {
  Compass,
  Award,
  ArrowRight,
  FileText,
  MapPin,
  Calendar,
  Users,
  HeartHandshake,
  Snowflake,
  GraduationCap,
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

  const milestones = [
    {
      period: '২০১৭ · এস.এস.সি ব্যাচ',
      title: 'বন্ধুত্বের সূচনা ও একতা',
      desc: 'এস.এস.সি ২০১৭ ব্যাচের সহপাঠীদের দীর্ঘদিনের বন্ধুত্ব ও পারস্পরিক ভ্রাতৃত্ববোধ থেকে একটি যৌথ উদ্যোগ গ্রহণের স্বপ্ন তৈরি হয়।',
    },
    {
      period: '০১ এপ্রিল ২০২৪ · প্রতিষ্ঠা',
      title: 'বন্ধুত্ব সমবায় সমিতির আনুষ্ঠানিক যাত্রা',
      desc: 'চরচান্দা খাসমহল বাজারে ২১ জন সদস্য ও ৩৪টি সঞ্চয় শেয়ার নিয়ে সুনির্দিষ্ট গঠনতন্ত্রের অধীনে সমিতির কার্যক্রম শুরু হয়।',
    },
    {
      period: 'চলমান · সামাজিক ও ডিজিটাল রূপান্তর',
      title: 'স্বচ্ছ ডিজিটাল হিসাব ও সামাজিক কল্যাণ',
      desc: 'সোনালী ব্যাংক পিএলসি অ্যাকাউন্ট ও ডিজিটাল পোর্টালের মাধ্যমে শতভাগ স্বচ্ছতা নিশ্চিত করার পাশাপাশি মানবিক কল্যাণমূলক কাজে অংশগ্রহণ।',
    },
  ];

  const welfareInitiatives = [
    {
      icon: HeartHandshake,
      title: 'বন্যা ও দুর্যোগে ত্রাণ সহায়তা',
      desc: 'জরুরি প্রাকৃতিক দুর্যোগ ও বন্যার সময়ে দুর্গত পরিবারগুলোর পাশে দাঁড়িয়ে খাদ্য ও প্রয়োজনীয় সামগ্রী পৌঁছে দেওয়া।',
    },
    {
      icon: Snowflake,
      title: 'শীতবস্ত্র বিতরণ কর্মসূচি',
      desc: 'প্রতি শীত মৌসুমে এলাকার অসহায় ও দরিদ্র মানুষের মাঝে কম্বল ও শীতবস্ত্র বিতরণ উদ্যোগ।',
    },
    {
      icon: GraduationCap,
      title: 'শিক্ষা সহায়তা ও সামাজিক কল্যাণ',
      desc: 'অসচ্ছল শিক্ষার্থীদের শিক্ষাসামগ্রী প্রদান ও সামাজিক উন্নয়নমূলক যৌথ কল্যাণ তহবিল পরিচালনা।',
    },
  ];

  return (
    <PageTransition className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
      {/* Intro Header */}
      <div className="text-center space-y-4">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1D4ED8] dark:text-[#60A5FA]">
          বন্ধুত্ব সমবায় সমিতি · এস.এস.সি ব্যাচ ২০১৭
        </span>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0F1B33] dark:text-white">
          About Bondhon 2017
        </h1>

        <p className="text-base sm:text-lg text-[#4E5E78] dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          <strong className="text-[#0F1B33] dark:text-white">বন্ধুত্ব সমবায় সমিতি</strong> (Bondhon 2017) – চরচান্দা খাসমহল বাজার। স্থাপিত: ০১/০৪/২০২৪ ইং। পারস্পরিক সঞ্চয়, আর্থিক স্বচ্ছতা এবং অটুট বন্ধুত্বের প্রতীক।
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/constitution"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>অফিসিয়াল গঠনতন্ত্র ও নীতিমালা পড়ুন</span>
          </Link>
          <Link
            to="/members"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] hover:border-[#1D4ED8] text-[#0F1B2E] dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            <Users className="w-4 h-4 text-[#1D4ED8] dark:text-[#60A5FA]" />
            <span>সদস্য তালিকা</span>
          </Link>
        </div>
      </div>

      {/* Crest & Story Split */}
      <RevealSection className="surface-card grid grid-cols-1 md:grid-cols-12 gap-8 items-center rounded-3xl p-6 sm:p-10">
        <div className="md:col-span-4 flex justify-center">
          <div className="w-48 h-48 rounded-full p-1.5 bg-gradient-to-br from-[#0F1B33] to-[#1D4ED8] ring-4 ring-[#D6AC62]/30 shadow-lg">
            <img
              src={crestImage}
              alt="Bondhon 2017 Official Emblem"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>
        <div className="md:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-[#4E5E78]">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
              স্থাপিত: ০১/০৪/২০২৪ ইং
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
              চরচান্দা খাসমহল বাজার
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-[#0F1B33] dark:text-white">
            আমাদের পটভূমি ও আদর্শ
          </h2>
          <p className="text-sm text-[#4E5E78] dark:text-slate-300 leading-relaxed">
            ২০১৭ সালের এস.এস.সি ব্যাচের বন্ধুদের আন্তরিক প্রচেষ্টায় গঠিত এই সমবায় সমিতি পারস্পরিক সঞ্চয় ও সৌহার্দ্য বৃদ্ধির এক নির্ভরযোগ্য প্ল্যাটফর্ম। ০১ এপ্রিল ২০২৪ তারিখে আনুষ্ঠানিকভাবে যাত্রা শুরু করে সমিতিটি একটি সুসংগঠিত নিয়মতান্ত্রিক কাঠামোর রূপ নেয়।
          </p>
          <p className="text-sm text-[#4E5E78] dark:text-slate-300 leading-relaxed">
            সমিতির সকল ২১ জন সদস্য প্রতি মাসের <strong className="text-[#0F1B2E] dark:text-white">১২ তারিখের মধ্যে</strong> নিয়মিত সঞ্চয় কিস্তি (৫০০ ৳) জমা দেন। নির্দিষ্ট সময়ের পরে জমা দিলে গঠনতন্ত্র অনুযায়ী ৫০ টাকা বিলম্ব জরিমানা কার্যকর হয়, যা প্রতিটি সদস্যের জবাবদিহিতা ও সমিতির আর্থিক শৃঙ্খলা বজায় রাখে।
          </p>
        </div>
      </RevealSection>

      {/* Structured Milestones Timeline */}
      <RevealSection className="space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#92600A] dark:text-[#F0C56E]">
            যাত্রাপথ · Milestones
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F1B33] dark:text-white">
            সমিতির অগ্রগতি ও ইতিহাস
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {milestones.map((m, idx) => (
            <div key={m.period} className="surface-card rounded-2xl p-6 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA]">
                  {m.period}
                </span>
                <span className="w-7 h-7 rounded-lg bg-[#0F1B33] text-[#D6AC62] font-mono text-xs font-bold flex items-center justify-center">
                  0{idx + 1}
                </span>
              </div>
              <h3 className="text-base font-bold text-[#0F1B33] dark:text-white">{m.title}</h3>
              <p className="text-xs text-[#4E5E78] dark:text-slate-400 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </RevealSection>

      {/* Community Welfare Initiatives */}
      <RevealSection className="space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1D4ED8] dark:text-[#60A5FA]">
            সামাজিক দায়বদ্ধতা
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F1B33] dark:text-white">
            সামাজিক ও মানবিক কার্যক্রম
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {welfareInitiatives.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="surface-card surface-card-hover rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#0F1B33] dark:text-white">{item.title}</h3>
                <p className="text-xs text-[#4E5E78] dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </RevealSection>

      {/* Executive Committee Section */}
      <RevealSection className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-[#0F1B33] dark:text-white">
            বর্তমান ব্যবস্থাপনা কমিটি
          </h2>
          <p className="text-xs sm:text-sm text-[#4E5E78]">
            গঠনতন্ত্রের ধারা ৩.১ অনুসারে নির্বাচিত কার্যনির্বাহী পরিষদ
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {committee.map((c) => (
            <div
              key={c.role}
              className="surface-card surface-card-hover p-4 rounded-2xl flex items-center gap-3.5"
            >
              <img
                src={c.img}
                alt={c.name}
                className="w-13 h-13 rounded-full object-cover ring-2 ring-[#D6AC62] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-[#92600A] dark:text-[#F0C56E] block leading-tight truncate">
                  {c.role}
                </span>
                <h3 className="text-sm font-bold text-[#0F1B33] dark:text-white truncate mt-0.5">
                  {c.name}
                </h3>
                <span className="text-[11px] text-[#4E5E78] block">
                  {c.note}
                </span>
              </div>
            </div>
          ))}
        </div>
      </RevealSection>

      {/* Mission & Vision */}
      <RevealSection className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="surface-card p-8 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-[#0F1B33] dark:text-white">আমাদের লক্ষ্য</h3>
          <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-slate-300 leading-relaxed">
            সদস্যদের আর্থিক উন্নয়ন সাধন করা, সঞ্চয় প্রথা গড়ে তোলা এবং প্রতিটি সদস্যের ভবিষ্যৎ আর্থিক নিরাপত্তা ও সৌহার্দ্যপূর্ণ সম্পর্ক সুদৃঢ় করা।
          </p>
        </div>

        <div className="surface-card p-8 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#D6AC62]/15 text-[#92600A] dark:text-[#F0C56E] flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-[#0F1B33] dark:text-white">আমাদের দর্শন</h3>
          <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-slate-300 leading-relaxed">
            শতভাগ আর্থিক স্বচ্ছতা ও ডিজিটাল হিসাবরক্ষণের মাধ্যমে সদস্যদের পারস্পরিক আস্থা অর্জন এবং একটি আদর্শ সমবায় সমিতির দৃষ্টান্ত স্থাপন করা।
          </p>
        </div>
      </RevealSection>

      {/* Call to action */}
      <RevealSection className="text-center p-8 sm:p-10 bg-[#0F1B33] text-white rounded-3xl border border-[#18294A] space-y-4">
        <h3 className="text-xl font-bold">
          সমিতির গঠনতন্ত্র ও পূর্ণাঙ্গ বিধিমালা দেখতে চান?
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          সদস্যপদ যোগ্যতা, ভর্তি নিয়মাবলী, ভোটদান অধিকার ও আর্থিক বিধিমালা বিস্তারিত পড়ুন।
        </p>
        <Link
          to="/constitution"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-xs transition-colors shadow-sm"
        >
          <span>পূর্ণাঙ্গ গঠনতন্ত্র পড়ুন</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </RevealSection>
    </PageTransition>
  );
};

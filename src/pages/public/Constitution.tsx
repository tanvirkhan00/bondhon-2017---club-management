import React from 'react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import {
  Printer,
  ShieldCheck,
  Calendar,
  MapPin,
  Users,
  AlertTriangle,
  Award,
  DollarSign,
  Scale,
  CheckCircle2,
} from 'lucide-react';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';

export const Constitution: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <PageTransition className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Header Card */}
      <div className="surface-card rounded-3xl p-6 sm:p-10 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-[#DFE6F0] dark:border-[#233452]">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-2 ring-[#D6AC62] shadow-md shrink-0 bg-[#0F1B33]">
              <img
                src={crestImage}
                alt="Bondhon 2017 Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[#1D4ED8] dark:text-[#60A5FA] text-xs font-mono font-bold uppercase tracking-wider mb-1">
                <Scale className="w-3.5 h-3.5" />
                <span>অফিসিয়াল নীতি ও গঠনতন্ত্র</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1B33] dark:text-white">
                গঠনতন্ত্র ও নীতিমালা
              </h1>
              <p className="text-sm font-semibold text-[#1D4ED8] dark:text-[#60A5FA] mt-0.5">
                বন্ধুত্ব সমবায় সমিতি · এস.এস.সি ব্যাচ ২০১৭ (Bondhon 2017)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 print:hidden shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#EFF3F9] hover:bg-slate-200/80 dark:bg-[#17243C] dark:hover:bg-[#18294A] text-[#0F1B2E] dark:text-slate-200 border border-[#DFE6F0] dark:border-[#233452] rounded-xl transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / PDF ডাউনলোড</span>
            </button>
            <Link
              to="/members"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-xl transition-colors shadow-xs"
            >
              <Users className="w-4 h-4" />
              <span>সদস্য তালিকা</span>
            </Link>
          </div>
        </div>

        {/* Quick Facts Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 bg-[#EFF3F9] dark:bg-[#17243C] rounded-2xl border border-[#DFE6F0] dark:border-[#233452] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-[#4E5E78] block">সমিতি স্থাপনের তারিখ</span>
              <span className="text-xs font-bold text-[#0F1B33] dark:text-white font-mono">০১/০৪/২০২৪ ইং</span>
            </div>
          </div>

          <div className="p-4 bg-[#EFF3F9] dark:bg-[#17243C] rounded-2xl border border-[#DFE6F0] dark:border-[#233452] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-[#4E5E78] block">সমিতির কার্যালয় / ঠিকানা</span>
              <span className="text-xs font-bold text-[#0F1B33] dark:text-white">চরচান্দা খাসমহল বাজার</span>
            </div>
          </div>

          <div className="p-4 bg-[#EFF3F9] dark:bg-[#17243C] rounded-2xl border border-[#DFE6F0] dark:border-[#233452] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D6AC62]/15 text-[#92600A] dark:text-[#F0C56E] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-[#4E5E78] block">মাসিক কিস্তি জমাদানের শেষ সময়</span>
              <span className="text-xs font-bold text-[#0F1B33] dark:text-white">প্রতি মাসের ১২ তারিখ (বিলম্ব ফি ৫০৳)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Official Constitution Clauses (4 Chapters) */}
      <div className="space-y-6">
        {/* CHAPTER 1 */}
        <section className="surface-card rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#DFE6F0] dark:border-[#233452] text-[#1D4ED8] dark:text-[#60A5FA]">
            <Award className="w-5 h-5 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-[#0F1B33] dark:text-white">
              প্রথম অধ্যায়: নাম, ঠিকানা এবং উদ্দেশ্য
            </h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[#0F1B2E]/90 dark:text-slate-300 leading-relaxed">
            <div className="p-3.5 bg-[#EFF3F9] dark:bg-[#17243C] rounded-xl border border-[#DFE6F0] dark:border-[#233452]">
              <strong className="text-[#0F1B33] dark:text-white block mb-0.5">১.১ নাম:</strong>
              এই সমিতির নাম হবে <strong>"বন্ধুত্ব সমবায় সমিতি"</strong> (এস.এস.সি ব্যাচ ২০১৭ / Bondhon 2017)।
            </div>

            <div className="p-3.5 bg-[#EFF3F9] dark:bg-[#17243C] rounded-xl border border-[#DFE6F0] dark:border-[#233452]">
              <strong className="text-[#0F1B33] dark:text-white block mb-0.5">১.২ ঠিকানা:</strong>
              চরচান্দা খাসমহল বাজার।
            </div>

            <div className="space-y-2">
              <strong className="text-[#0F1B33] dark:text-white block">১.৩ উদ্দেশ্য:</strong>
              <ul className="space-y-2 pl-2">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">১.৩.১</span>
                  <span>সদস্যদের আর্থিক উন্নয়ন সাধন করা।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">১.৩.২</span>
                  <span>সদস্যদের মধ্যে সঞ্চয় প্রথা গড়ে তোলা।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">১.৩.৩</span>
                  <span>সদস্যদের মধ্যে পারস্পরিক সৌহার্দ্য ও সহযোগিতা বৃদ্ধি করা।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">১.৩.৪</span>
                  <span>সদস্যদের ভবিষ্যৎ আর্থিক নিরাপত্তা ও যৌথ কল্যাণ নিশ্চিত করা।</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CHAPTER 2 */}
        <section className="surface-card rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#DFE6F0] dark:border-[#233452] text-[#1D4ED8] dark:text-[#60A5FA]">
            <Users className="w-5 h-5 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-[#0F1B33] dark:text-white">
              দ্বিতীয় অধ্যায়: সদস্যপদ
            </h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[#0F1B2E]/90 dark:text-slate-300 leading-relaxed">
            <div>
              <strong className="text-[#0F1B33] dark:text-white block mb-1.5">২.১ যোগ্যতা:</strong>
              <ul className="space-y-2 pl-2">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">২.১.১</span>
                  <span>সমিতির সদস্য হতে হলে আবেদনকারীকে ন্যূনতম ১৮ বছর বয়সী হতে হবে।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">২.১.২</span>
                  <span>আবেদনকারীকে সৎ, দায়িত্বশীল এবং সমিতির লক্ষ্য ও উদ্দেশ্য পূরণে আগ্রহী হতে হবে।</span>
                </li>
              </ul>
            </div>

            <div>
              <strong className="text-[#0F1B33] dark:text-white block mb-1.5">২.২ নতুন সদস্য ভর্তি:</strong>
              <ul className="space-y-2 pl-2">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">২.২.১</span>
                  <span>আবেদনকারীকে সমিতির নির্ধারিত ফরম পূরণ করে জমা দিতে হবে।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">২.২.২</span>
                  <span>ব্যবস্থাপনা কমিটির অনুমোদনের মাধ্যমে নতুন সদস্য ভর্তির প্রক্রিয়া সম্পন্ন হবে।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">২.২.৩</span>
                  <span>বকেয়া সকল কিস্তি জরিমানা সহ পরিশোধ করিতে হবে।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">২.২.৪</span>
                  <span>ভর্তির তারিখের আগে বিনিয়োগ করা খাতের লাভ পাবে না।</span>
                </li>
              </ul>
            </div>

            <div>
              <strong className="text-[#0F1B33] dark:text-white block mb-1.5">২.৩ সদস্যদের অধিকার ও দায়িত্ব:</strong>
              <ul className="space-y-2 pl-2">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">২.৩.১</span>
                  <span>সদস্যরা সমিতির নীতি নির্ধারণী সভায় সরাসরি ভোট দিতে পারবেন।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">২.৩.২</span>
                  <span>সদস্যদের সমিতির কার্যক্রমে সক্রিয় অংশগ্রহণ এবং নিয়মিত কিস্তি পরিশোধ করার দায়িত্ব থাকবে।</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CHAPTER 3 */}
        <section className="surface-card rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#DFE6F0] dark:border-[#233452] text-[#1D4ED8] dark:text-[#60A5FA]">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-[#0F1B33] dark:text-white">
              তৃতীয় অধ্যায়: ব্যবস্থাপনা কমিটি
            </h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[#0F1B2E]/90 dark:text-slate-300 leading-relaxed">
            <div>
              <strong className="text-[#0F1B33] dark:text-white block mb-2">৩.১ কমিটির গঠন:</strong>
              <p className="mb-3">ব্যবস্থাপনা কমিটি নিম্নোক্ত দায়িত্বশীল সদস্যদের নিয়ে গঠিত:</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { title: 'সভাপতি', name: 'সৈকত ঢালী (Shaikot Dhali)', desc: 'প্রধান নির্বাহী কর্মকর্তা', key: true },
                  { title: 'সহ-সভাপতি', name: 'মুশফিকুর সালেহীন (Musfiqur Salehin)', desc: 'নির্বাহী সমন্বয়ক', key: false },
                  { title: 'সাধারণ সম্পাদক', name: 'জাফর মোল্লা (Jafor Molla)', desc: 'রেকর্ড ও নথি রক্ষণাবেক্ষণ', key: false },
                  { title: 'কোষাধ্যক্ষ', name: 'তানভীর খান (Tanvir Khan)', desc: 'অর্থনৈতিক কার্যক্রম ও ব্যাংক হিসাব', key: true },
                  { title: 'সহ-কোষাধ্যক্ষ', name: 'অমিত ঘোষ (Amit Ghosh)', desc: 'আর্থিক নিরীক্ষা ও সহায়তা', key: false },
                  { title: 'সাংগঠনিক সম্পাদক', name: 'তানভীর আহমেদ (Tanvir Ahmed)', desc: 'সাংগঠনিক সমন্বয় ও মিটিং', key: false },
                ].map((role) => (
                  <div
                    key={role.title}
                    className={`p-3.5 rounded-xl border ${
                      role.key
                        ? 'bg-[#1D4ED8]/8 dark:bg-[#60A5FA]/12 border-[#1D4ED8]/25 dark:border-[#60A5FA]/30'
                        : 'bg-[#EFF3F9] dark:bg-[#17243C] border-[#DFE6F0] dark:border-[#233452]'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-bold uppercase ${
                        role.key ? 'text-[#1D4ED8] dark:text-[#60A5FA]' : 'text-[#92600A] dark:text-[#F0C56E]'
                      }`}
                    >
                      {role.title}
                    </span>
                    <div className="text-sm font-bold text-[#0F1B33] dark:text-white mt-0.5">{role.name}</div>
                    <span className="text-[11px] text-[#4E5E78]">{role.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <strong className="text-[#0F1B33] dark:text-white block mb-1.5">৩.২ নির্বাচন প্রক্রিয়া:</strong>
              <ul className="space-y-2 pl-2">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">৩.২.১</span>
                  <span>ব্যবস্থাপনা কমিটির সদস্যরা এক বছরের জন্য নির্বাচিত হবেন।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">৩.২.২</span>
                  <span>সমিতির বার্ষিক সাধারণ সভায় সরাসরি ভোটের মাধ্যমে কমিটি নির্বাচিত হবে।</span>
                </li>
              </ul>
            </div>

            <div>
              <strong className="text-[#0F1B33] dark:text-white block mb-1.5">৩.৩ দায়িত্ব ও ক্ষমতা:</strong>
              <ul className="space-y-2 pl-2">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">৩.৩.১</span>
                  <span>সভাপতি সমিতির প্রধান নির্বাহী হিসেবে সকল কার্যক্রম পরিচালনা করবেন।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">৩.৩.২</span>
                  <span>সাধারণ সম্পাদক সমিতির সকল কাগজপত্র, রেজুলেশন ও অফিসিয়াল রেকর্ড রক্ষণাবেক্ষণের দায়িত্ব পালন করবেন।</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">৩.৩.৩</span>
                  <span>কোষাধ্যক্ষ সমিতির অর্থনৈতিক কার্যক্রম, মাসিক কিস্তি আদায় এবং ব্যাংক হিসাব পরিচালনা করবেন।</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CHAPTER 4 */}
        <section className="surface-card rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#DFE6F0] dark:border-[#233452] text-[#1D4ED8] dark:text-[#60A5FA]">
            <DollarSign className="w-5 h-5 shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-[#0F1B33] dark:text-white">
              চতুর্থ অধ্যায়: আর্থিক ব্যবস্থাপনা
            </h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[#0F1B2E]/90 dark:text-slate-300 leading-relaxed">
            <strong className="text-[#0F1B33] dark:text-white block">৪.১ সঞ্চয় ও মূলধন:</strong>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#1D4ED8]/8 dark:bg-[#60A5FA]/12 border border-[#1D4ED8]/25 dark:border-[#60A5FA]/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#1D4ED8] dark:text-[#60A5FA] shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] text-xs">
                    ধারা ৪.১.১ (মাসিক সময়সীমা)
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-[#0F1B33] dark:text-white mt-1">
                    সদস্যরা প্রতি মাসে ১২ তারিখের মধ্যে সঞ্চয় কিস্তি জমা দেবেন।
                  </p>
                  <p className="text-[11px] text-[#4E5E78] mt-1">
                    বর্তমান নির্ধারিত মাসিক সঞ্চয়: ৫০০/- (পাঁচশত টাকা)।
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono font-bold text-rose-800 dark:text-rose-300 text-xs">
                    ধারা ৪.১.২ (বিলম্ব জরিমানা)
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-rose-950 dark:text-rose-100 mt-1">
                    সদস্যরা প্রতি মাসে ১২ তারিখের মধ্যে সঞ্চয় জমা না দিলে ৫০ টাকা জরিমানা দিতে হবে।
                  </p>
                  <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-1">
                    বিলম্বিত কিস্তি জমাদানের ক্ষেত্রে মূল কিস্তির সাথে অতিরিক্ত ৫০৳ জরিমানা যুক্ত হইবে।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Banner */}
      <div className="p-6 sm:p-8 bg-[#0F1B33] text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div>
          <h3 className="font-bold text-base">সদস্য ডিরেক্টরি ও আর্থিক হিসাব বিবরণী</h3>
          <p className="text-xs text-slate-300 mt-0.5">
            সমিতির সকল ২১ জন সদস্যের প্রোফাইল ও আর্থিক বিবরণী দেখার জন্য ডিরেক্টরিতে যান।
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/members"
            className="px-4 py-2 text-xs font-semibold bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-xl transition-colors"
          >
            সদস্য ডিরেক্টরি
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
          >
            সদস্য লগইন
          </Link>
        </div>
      </div>
    </PageTransition>
  );
};

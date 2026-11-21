import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useClubData } from '../hooks/useClubData';
import { useAuth } from '../hooks/useAuth';
import { ClubAnnouncement, ClubNotification } from '../types';
import { Modal } from './ui/Modal';
import {
  Bell,
  CheckCheck,
  RefreshCw,
  Trash2,
  Megaphone,
  Receipt,
  Cake,
  LogIn,
  LogOut,
  KeyRound,
  Send,
  Phone,
  Sparkles,
} from 'lucide-react';

type FilterTab = 'all' | 'announcements' | 'payments' | 'birthdays';

export const NotificationCenter: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    notifications,
    announcements,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    refreshNotifications,
  } = useClubData();

  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<{
    title: string;
    body: string;
    category: string;
    authorName: string;
    createdAt: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === 'announcements') return n.event_type === 'announcement';
      if (activeTab === 'payments') {
        return n.event_type === 'payment_recorded' || n.event_type === 'payment_notice';
      }
      if (activeTab === 'birthdays') return n.event_type === 'birthday_reminder';
      return true;
    });
  }, [notifications, activeTab]);

  const handleNotificationClick = async (n: ClubNotification) => {
    if (!n.is_read) {
      await markNotificationAsRead(n.id);
    }

    if (n.event_type === 'announcement') {
      const linked: ClubAnnouncement | undefined = announcements.find(
        (a) => a.id === n.announcement_id
      );
      const meta = n.metadata || {};
      const fullBody =
        linked?.body ||
        (typeof meta.body === 'string' ? meta.body : '') ||
        n.message;
      const category =
        linked?.category ||
        (typeof meta.category === 'string' ? meta.category : 'general');
      const authorName = linked?.author_name || n.member_name || 'Club Admin';

      setSelectedAnnouncement({
        title: linked?.title || n.title,
        body: fullBody,
        category,
        authorName,
        createdAt: linked?.created_at || n.created_at,
      });
      setOpen(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'announcement':
        return <Megaphone className="w-3.5 h-3.5 text-[#92600A] dark:text-[#F0C56E]" />;
      case 'payment_recorded':
        return <Receipt className="w-3.5 h-3.5 text-[#0369A1] dark:text-[#38BDF8]" />;
      case 'birthday_reminder':
        return <Cake className="w-3.5 h-3.5 text-[#D6AC62]" />;
      case 'member_login':
        return <LogIn className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />;
      case 'member_logout':
        return <LogOut className="w-3.5 h-3.5 text-rose-500" />;
      case 'password_changed':
        return <KeyRound className="w-3.5 h-3.5 text-[#92600A] dark:text-[#F0C56E]" />;
      case 'payment_notice':
        return <Send className="w-3.5 h-3.5 text-[#0369A1] dark:text-[#38BDF8]" />;
      default:
        return <Phone className="w-3.5 h-3.5 text-[#18294A] dark:text-slate-300" />;
    }
  };

  const formatTimeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  return (
    <>
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) handleRefresh();
          }}
          className="relative p-2 rounded-xl text-[#0F1B2E] dark:text-slate-200 hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] border border-transparent hover:border-[#DFE6F0] dark:hover:border-[#233452] transition-colors cursor-pointer"
          aria-label="Notifications"
          title="Notifications & Announcements"
        >
          <motion.div
            animate={
              unreadNotificationCount > 0
                ? { rotate: [0, -14, 12, -8, 6, 0] }
                : { rotate: 0 }
            }
            transition={{
              duration: 0.7,
              repeat: unreadNotificationCount > 0 ? Infinity : 0,
              repeatDelay: 4.5,
            }}
          >
            <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </motion.div>

          {unreadNotificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs tabular-nums">
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 mt-2 w-[320px] sm:w-[400px] bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-[#DFE6F0] dark:border-[#233452] flex items-center justify-between bg-[#EFF3F9]/80 dark:bg-[#0F1B33]/75">
                <div>
                  <h3 className="text-xs font-bold text-[#0F1B2E] dark:text-[#F3F6FC] tabular-nums">
                    Notifications ({unreadNotificationCount} unread)
                  </h3>
                  <p className="text-[10px] text-[#4E5E78] dark:text-[#9BB0CD]">
                    Announcements, payments &amp; birthday reminders
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="p-1.5 rounded-lg text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] hover:bg-white dark:hover:bg-[#18294A] cursor-pointer"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  {unreadNotificationCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsAsRead}
                      className="p-1.5 rounded-lg text-[#1D4ED8] dark:text-[#60A5FA] hover:bg-[#1D4ED8]/10 cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isAdmin && notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearNotifications}
                      className="p-1.5 rounded-lg text-[#4E5E78] dark:text-[#9BB0CD] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      title="Clear all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-3 py-2 border-b border-[#DFE6F0] dark:border-[#233452] flex items-center gap-1 overflow-x-auto bg-[#F6F7FB] dark:bg-[#0D172B]">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'announcements', label: 'Notices' },
                    { id: 'payments', label: 'Payments' },
                    { id: 'birthdays', label: 'Birthdays' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-[#1D4ED8] text-white'
                        : 'text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B2E] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#DFE6F0] dark:divide-[#233452]">
                {filteredNotifications.length === 0 ? (
                  <div className="py-10 px-4 text-center space-y-1.5">
                    <Bell className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-xs font-medium text-[#4E5E78] dark:text-[#9BB0CD]">
                      No notifications in this category yet.
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left p-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] ${
                        !n.is_read ? 'bg-[#1D4ED8]/6 dark:bg-[#1D4ED8]/14' : ''
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-white dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] flex items-center justify-center shrink-0 mt-0.5">
                        {getEventIcon(n.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#0F1B2E] dark:text-[#F3F6FC] truncate">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-[#4E5E78] dark:text-[#9BB0CD] shrink-0 tabular-nums">
                            {formatTimeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#4E5E78] dark:text-slate-300 mt-0.5 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                        {n.event_type === 'announcement' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#1D4ED8] dark:text-[#60A5FA] mt-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Tap to read full announcement</span>
                          </span>
                        )}
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#1D4ED8] dark:bg-[#60A5FA] shrink-0 mt-1.5" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full Announcement Detail Modal */}
      <Modal
        isOpen={Boolean(selectedAnnouncement)}
        onClose={() => setSelectedAnnouncement(null)}
        title={selectedAnnouncement?.title || 'Club Announcement'}
        subtitle={
          selectedAnnouncement
            ? `${selectedAnnouncement.category.toUpperCase()} · By ${selectedAnnouncement.authorName}`
            : ''
        }
        icon={<Megaphone className="w-4 h-4" />}
        maxWidthClass="max-w-lg"
      >
        {selectedAnnouncement && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] text-sm text-[#0F1B2E] dark:text-[#F3F6FC] leading-relaxed whitespace-pre-wrap">
              {selectedAnnouncement.body}
            </div>
            <div className="flex items-center justify-between text-xs text-[#4E5E78] dark:text-[#9BB0CD] font-mono">
              <span>Posted by {selectedAnnouncement.authorName}</span>
              <span>
                {new Date(selectedAnnouncement.createdAt).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

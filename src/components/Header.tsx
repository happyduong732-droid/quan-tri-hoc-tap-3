import React, { useState } from 'react';
import {
  Calendar,
  Search,
  Database,
  Volume2,
  VolumeX,
  Menu,
  BookMarked,
  Cloud,
  UserPlus,
  User,
  ChevronDown,
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { AppData } from '../types';
import { SupabaseStatusResult } from '../services/supabase';
import { UserAccount } from '../services/auth';

interface HeaderProps {
  data: AppData;
  currentUser: UserAccount | null;
  onOpenSearch: () => void;
  onOpenDataModal: () => void;
  onOpenSupabaseModal: () => void;
  onOpenAuthModal: (tab?: 'register' | 'login' | 'profile') => void;
  onLogout: () => void;
  supabaseStatus: SupabaseStatusResult;
  onToggleSound: () => void;
  onToggleMobileSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  data,
  currentUser,
  onOpenSearch,
  onOpenDataModal,
  onOpenSupabaseModal,
  onOpenAuthModal,
  onLogout,
  supabaseStatus,
  onToggleSound,
  onToggleMobileSidebar,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Format Vietnamese date: e.g. "Thứ Sáu, ngày 18 tháng 09, 2026"
  const now = new Date();
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = dayNames[now.getDay()];
  const formattedDate = `${dayName}, ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  // Close dropdown on outside click helper
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#header-user-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [isUserMenuOpen]);

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Left: Branding & Teacher Info */}
          <div className="flex items-center gap-3.5">
            <button
              id="toggle-sidebar-mobile-btn"
              type="button"
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Mở bảng điều hướng"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-linear-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <BookMarked className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  TRỢ LÝ QUẢN TRỊ HỌC TẬP
                </h1>
                <p className="text-xs sm:text-sm font-medium text-blue-700 leading-tight mt-0.5">
                  {currentUser ? currentUser.fullName : 'Thầy Dương Thành Tín'}{' '}
                  <span className="text-slate-300 font-normal">|</span>{' '}
                  {currentUser?.subject || 'Ngữ văn'}{' '}
                  <span className="text-slate-300 font-normal">|</span>{' '}
                  {currentUser?.school || 'THCS Phan Bội Châu'}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Quick Search + Date + Tool Actions + Auth */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick Search Bar trigger */}
            <button
              id="quick-search-trigger"
              type="button"
              onClick={onOpenSearch}
              className="hidden xl:flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 text-sm border border-slate-200/80 transition-all w-48"
              title="Tìm kiếm nhanh (Ctrl + K)"
            >
              <Search className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="flex-1 text-left text-xs truncate">Tìm kiếm nhanh...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white rounded-md border border-slate-300 shadow-2xs">
                Ctrl+K
              </kbd>
            </button>

            <button
              type="button"
              onClick={onOpenSearch}
              className="xl:hidden p-2.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
              title="Tìm kiếm nhanh"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Date Display Pill */}
            <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{formattedDate}</span>
            </div>

            {/* Supabase Cloud Sync Status Button */}
            <button
              id="header-supabase-btn"
              type="button"
              onClick={onOpenSupabaseModal}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border shadow-2xs active:scale-95 ${
                supabaseStatus.status === 'ready'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : supabaseStatus.status === 'need_schema'
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Cấu hình & Đồng bộ Đám mây Supabase"
            >
              <Cloud
                className={`w-4 h-4 ${
                  supabaseStatus.status === 'ready' ? 'text-emerald-600' : 'text-teal-600'
                }`}
              />
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline font-bold">Supabase</span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    supabaseStatus.status === 'ready'
                      ? 'bg-emerald-500 animate-pulse'
                      : supabaseStatus.status === 'need_schema'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
              </div>
            </button>

            {/* Sound Toggle */}
            <button
              id="header-sound-toggle-btn"
              type="button"
              onClick={onToggleSound}
              className={`p-2.5 rounded-xl border transition-all ${
                data.soundEnabled
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-50'
              }`}
              title={data.soundEnabled ? 'Âm thanh: Đang Bật (Bấm để tắt)' : 'Âm thanh: Đang Tắt (Bấm để bật)'}
            >
              {data.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Backup / Restore Data Button */}
            <button
              id="header-data-manager-btn"
              type="button"
              onClick={onOpenDataModal}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all hover:border-slate-300 active:scale-95"
              title="Quản lý sao lưu tệp JSON & Dữ liệu mẫu"
            >
              <Database className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="hidden lg:inline">Sao lưu tệp</span>
            </button>

            {/* Direct REGISTER Button - Prominent for User Convenience */}
            <button
              id="header-register-direct-btn"
              type="button"
              onClick={() => onOpenAuthModal('register')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-blue-500/20 transition-all active:scale-95"
              title="Đăng ký tài khoản giáo viên mới"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden xs:inline">Đăng ký</span>
            </button>

            {/* User Account Dropdown / Login trigger */}
            <div id="header-user-menu-container" className="relative">
              {currentUser ? (
                <button
                  id="header-user-menu-btn"
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-2xs"
                  title="Tài khoản hiện tại"
                >
                  <div
                    className={`w-7 h-7 rounded-lg bg-linear-to-br ${
                      currentUser.avatarColor || 'from-blue-600 to-indigo-700'
                    } text-white font-bold text-xs flex items-center justify-center shrink-0`}
                  >
                    {currentUser.fullName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[110px]">
                      {currentUser.fullName}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">
                      @{currentUser.username}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('login')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold transition-all"
                >
                  <LogIn className="w-4 h-4 text-blue-600" />
                  <span>Đăng nhập</span>
                </button>
              )}

              {/* User Dropdown Menu */}
              {isUserMenuOpen && currentUser && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser.fullName}</p>
                    <p className="text-[11px] text-blue-600 font-medium truncate">@{currentUser.username}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {currentUser.subject} • {currentUser.school}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAuthModal('profile');
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Thông tin tài khoản & Đổi MK</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAuthModal('register');
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                    >
                      <UserPlus className="w-4 h-4 text-indigo-600" />
                      <span>Đăng ký thêm tài khoản mới</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAuthModal('login');
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                    >
                      <User className="w-4 h-4 text-emerald-600" />
                      <span>Chuyển tài khoản đăng nhập</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};


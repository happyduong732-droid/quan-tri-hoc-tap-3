import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  LogIn,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  School,
  BookOpen,
  KeyRound,
  ShieldCheck,
  Users,
  LogOut,
  Sparkles,
} from 'lucide-react';
import {
  UserAccount,
  registerUser,
  loginUser,
  getRegisteredUsers,
  changePassword,
  logoutUser,
  setCurrentUser,
} from '../services/auth';

export type AuthModalTab = 'register' | 'login' | 'profile';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: AuthModalTab;
  currentUser: UserAccount | null;
  onUserChange: (user: UserAccount | null) => void;
  notify: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'register',
  currentUser,
  onUserChange,
  notify,
}) => {
  const [activeTab, setActiveTab] = useState<AuthModalTab>(defaultTab);

  // Form states for Register
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSubject, setRegSubject] = useState('Ngữ văn');
  const [regSchool, setRegSchool] = useState('THCS Phan Bội Châu');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Login
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Form states for Change Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changePassSuccess, setChangePassSuccess] = useState('');
  const [changePassError, setChangePassError] = useState('');

  // List of all registered users
  const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>([]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setRegError('');
      setLoginError('');
      setChangePassError('');
      setChangePassSuccess('');
      setRegisteredUsers(getRegisteredUsers());
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  // Handle registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regUsername.trim()) {
      setRegError('Vui lòng nhập tên đăng nhập!');
      return;
    }
    if (!regFullName.trim()) {
      setRegError('Vui lòng nhập họ và tên hiển thị!');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Mật khẩu phải có tối thiểu 6 ký tự!');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Mật khẩu xác nhận không trùng khớp!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerUser({
        username: regUsername,
        fullName: regFullName,
        password: regPassword,
        confirmPassword: regConfirmPassword,
        subject: regSubject,
        school: regSchool,
        role: 'teacher',
      });

      if (!res.success || !res.user) {
        setRegError(res.message);
        notify('error', 'Đăng ký thất bại', res.message);
      } else {
        notify('success', 'Đăng ký thành công', res.message);
        onUserChange(res.user);
        // Clear fields
        setRegUsername('');
        setRegFullName('');
        setRegPassword('');
        setRegConfirmPassword('');
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi hệ thống khi đăng ký';
      setRegError(msg);
      notify('error', 'Đăng ký thất bại', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginUsername.trim() || !loginPassword) {
      setLoginError('Vui lòng điền đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginUser(loginUsername, loginPassword);
      if (!res.success || !res.user) {
        setLoginError(res.message);
        notify('error', 'Đăng nhập không thành công', res.message);
      } else {
        notify('success', 'Đăng nhập thành công', res.message);
        onUserChange(res.user);
        setLoginUsername('');
        setLoginPassword('');
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi hệ thống khi đăng nhập';
      setLoginError(msg);
      notify('error', 'Đăng nhập lỗi', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick login with teacher sample account
  const handleQuickLoginTeacher = async () => {
    setIsSubmitting(true);
    try {
      const res = await loginUser('thaytin', '123456');
      if (res.success && res.user) {
        notify('success', 'Đăng nhập thành công', 'Đã chuyển sang tài khoản Thầy Dương Thành Tín.');
        onUserChange(res.user);
        onClose();
      } else {
        // In case not seeded, populate default
        const users = getRegisteredUsers();
        if (users.length > 0) {
          setCurrentUser(users[0]);
          onUserChange(users[0]);
          notify('success', 'Đã chuyển tài khoản', `Đăng nhập vào ${users[0].fullName}`);
          onClose();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Switch to another existing registered account
  const handleSwitchAccount = (user: UserAccount) => {
    setCurrentUser(user);
    onUserChange(user);
    notify('success', 'Chuyển tài khoản thành công', `Hiện đang làm việc với tư cách: ${user.fullName}`);
    onClose();
  };

  // Handle Logout
  const handleLogout = () => {
    logoutUser();
    onUserChange(null);
    notify('info', 'Đã đăng xuất', 'Thầy/Cô đã đăng xuất khỏi phiên làm việc hiện tại.');
    setActiveTab('login');
  };

  // Handle Change Password
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError('');
    setChangePassSuccess('');

    if (!currentUser) return;
    if (!oldPassword) {
      setChangePassError('Vui lòng nhập mật khẩu hiện tại!');
      return;
    }
    if (newPassword.length < 6) {
      setChangePassError('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setChangePassError('Mật khẩu mới xác nhận không khớp!');
      return;
    }

    const res = await changePassword(currentUser.id, oldPassword, newPassword);
    if (!res.success) {
      setChangePassError(res.message);
      notify('error', 'Đổi mật khẩu thất bại', res.message);
    } else {
      setChangePassSuccess(res.message);
      notify('success', 'Thành công', res.message);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  };

  // Helper check for username validity in real time
  const isUsernameValid = /^[a-z0-9_]{3,30}$/.test(regUsername.trim().toLowerCase());
  const doPasswordsMatch = regPassword.length > 0 && regPassword === regConfirmPassword;

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="auth-modal-dialog"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Close Button */}
        <div className="relative bg-linear-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 sm:p-6 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              {activeTab === 'register' ? (
                <UserPlus className="w-6 h-6 text-white" />
              ) : activeTab === 'login' ? (
                <LogIn className="w-6 h-6 text-white" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {activeTab === 'register' && 'Đăng Ký Tài Khoản'}
                {activeTab === 'login' && 'Đăng Nhập Hệ Thống'}
                {activeTab === 'profile' && 'Thông Tin Tài Khoản'}
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                {activeTab === 'register' && 'Tạo tài khoản quản trị học tập cá nhân bằng tên đăng nhập & mật khẩu'}
                {activeTab === 'login' && 'Đăng nhập để đồng bộ và quản lý học sinh, bài giảng, điểm số'}
                {activeTab === 'profile' && 'Xem thông tin tài khoản, danh sách giáo viên và đổi mật khẩu'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs inside Modal Header */}
          <div className="flex items-center gap-1 mt-5 bg-black/20 p-1 rounded-xl">
            <button
              id="tab-btn-register"
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-blue-800 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Đăng Ký</span>
            </button>
            <button
              id="tab-btn-login"
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-blue-800 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập</span>
            </button>
            {currentUser && (
              <button
                id="tab-btn-profile"
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'profile'
                    ? 'bg-white text-blue-800 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Tài Khoản ({currentUser.username})</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body / Tab Contents */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* TAB 1: ĐĂNG KÝ TÀI KHOẢN (REGISTER) */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {regError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              {/* Tên đăng nhập (Username) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên đăng nhập (Username) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-input-username"
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="ví dụ: thaynguyen, colan_van, thay_tin"
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-hidden focus:ring-2 transition-all ${
                      regUsername && !isUsernameValid
                        ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/30'
                        : regUsername && isUsernameValid
                        ? 'border-emerald-300 focus:ring-emerald-400 bg-emerald-50/20'
                        : 'border-slate-300 focus:ring-blue-500 bg-white'
                    }`}
                  />
                  {regUsername && (
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      {isUsernameValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Từ 3–30 ký tự, viết liền không dấu, chỉ gồm chữ thường, số hoặc gạch dưới (_).
                </p>
              </div>

              {/* Họ và tên hiển thị / Danh xưng giáo viên */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Họ và tên hiển thị / Danh xưng giáo viên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-input-fullname"
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="ví dụ: Thầy Dương Thành Tín, Cô Nguyễn Thị Mai"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Môn giảng dạy & Trường */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Môn giảng dạy
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-input-subject"
                      type="text"
                      value={regSubject}
                      onChange={(e) => setRegSubject(e.target.value)}
                      placeholder="Ngữ văn, Toán, v.v."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Đơn vị trường học
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <School className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-input-school"
                      type="text"
                      value={regSchool}
                      onChange={(e) => setRegSchool(e.target.value)}
                      placeholder="THCS Phan Bội Châu"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Mật khẩu */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-input-password"
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    title={showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Xác nhận lại mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-input-confirm-password"
                    type={showRegConfirm ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại chính xác mật khẩu ở trên"
                    className={`w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm focus:outline-hidden focus:ring-2 transition-all ${
                      regConfirmPassword && !doPasswordsMatch
                        ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/30'
                        : regConfirmPassword && doPasswordsMatch
                        ? 'border-emerald-300 focus:ring-emerald-400 bg-emerald-50/20'
                        : 'border-slate-300 focus:ring-blue-500 bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirm(!showRegConfirm)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    title={showRegConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showRegConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {regConfirmPassword && (
                  <p className={`text-[11px] mt-1 ${doPasswordsMatch ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {doPasswordsMatch ? '✓ Mật khẩu khớp nhau!' : '✗ Mật khẩu xác nhận chưa khớp!'}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button
                  id="btn-submit-register"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Đang tạo tài khoản...' : 'Hoàn tất Đăng Ký Tài Khoản'}</span>
                </button>
              </div>

              {/* Switch to login prompt */}
              <div className="text-center pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">Đã có tài khoản? </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Đăng nhập tại đây
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ĐĂNG NHẬP (LOGIN) */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Tên đăng nhập */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên đăng nhập <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="login-input-username"
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value.toLowerCase().trim())}
                    placeholder="Nhập tên đăng nhập của Thầy/Cô"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Mật khẩu */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-input-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    title={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button
                  id="btn-submit-login"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
                </button>
              </div>

              {/* Quick Login button for default Teacher */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-blue-950">Tài khoản mặc định:</p>
                    <p className="text-[11px] text-blue-700">
                      Tên: <code className="bg-blue-100 px-1 py-0.5 rounded font-bold">thaytin</code> | MK:{' '}
                      <code className="bg-blue-100 px-1 py-0.5 rounded font-bold">123456</code>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickLoginTeacher}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all shrink-0"
                  >
                    Vào nhanh
                  </button>
                </div>
              </div>

              {/* Switch to register prompt */}
              <div className="text-center pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">Chưa có tài khoản? </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Đăng ký tài khoản mới ngay
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: THÔNG TIN TÀI KHOẢN (PROFILE & ACCOUNTS) */}
          {activeTab === 'profile' && currentUser && (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="p-4 bg-linear-to-br from-slate-50 to-blue-50/50 border border-slate-200 rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl bg-linear-to-br ${
                        currentUser.avatarColor || 'from-blue-600 to-indigo-700'
                      } text-white font-bold text-lg flex items-center justify-center shadow-md`}
                    >
                      {currentUser.fullName
                        .split(' ')
                        .filter(Boolean)
                        .slice(-2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase() || 'GV'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{currentUser.fullName}</h4>
                      <p className="text-xs text-blue-700 font-semibold">@{currentUser.username}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {currentUser.subject} • {currentUser.school}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                    title="Đăng xuất tài khoản này"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>

              {/* List of Registered Accounts on this machine */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Các tài khoản đã đăng ký trên máy ({registeredUsers.length})</span>
                  </h5>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Thêm tài khoản mới</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {registeredUsers.map((u) => {
                    const isCurrent = u.id === currentUser.id;
                    return (
                      <div
                        key={u.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-blue-50/80 border-blue-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg bg-linear-to-br ${
                              u.avatarColor || 'from-blue-600 to-indigo-700'
                            } text-white font-bold text-xs flex items-center justify-center shrink-0`}
                          >
                            {u.fullName.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                              {u.fullName}
                              {isCurrent && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-blue-200 text-blue-800 rounded">
                                  Đang chọn
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              @{u.username} • {u.subject}
                            </p>
                          </div>
                        </div>

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleSwitchAccount(u)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold transition-all shrink-0"
                          >
                            Chuyển sang
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Change Password Section */}
              <div className="pt-2 border-t border-slate-200">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-3">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  <span>Đổi mật khẩu</span>
                </h5>

                <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
                  {changePassError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{changePassError}</span>
                    </div>
                  )}
                  {changePassSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{changePassSuccess}</span>
                    </div>
                  )}

                  <div>
                    <input
                      type={showOldPass ? 'text' : 'password'}
                      placeholder="Mật khẩu hiện tại"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOldPass(!showOldPass);
                        setShowNewPass(!showNewPass);
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showNewPass ? 'Ẩn ký tự' : 'Hiện ký tự'}</span>
                    </button>

                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs"
                    >
                      Lưu mật khẩu mới
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

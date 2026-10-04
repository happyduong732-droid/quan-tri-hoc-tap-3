import React, { useState } from 'react';
import {
  BookMarked,
  LogIn,
  UserPlus,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  School,
  BookOpen,
  KeyRound,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Award,
  CheckSquare,
} from 'lucide-react';
import {
  UserAccount,
  registerUser,
  loginUser,
  getRegisteredUsers,
  setCurrentUser,
} from '../services/auth';

interface AuthScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
  notify: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, notify }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSubject, setRegSubject] = useState('Ngữ văn');
  const [regSchool, setRegSchool] = useState('THCS Phan Bội Châu');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regError, setRegError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Validation helpers for Register
  const isUsernameValid = /^[a-z0-9_]{3,30}$/.test(regUsername.trim().toLowerCase());
  const doPasswordsMatch = regPassword.length > 0 && regPassword === regConfirmPassword;

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginUsername.trim() || !loginPassword) {
      setLoginError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await loginUser(loginUsername, loginPassword);
      if (!res.success || !res.user) {
        setLoginError(res.message);
        notify('error', 'Đăng nhập không thành công', res.message);
      } else {
        notify('success', 'Đăng nhập thành công', res.message);
        onLoginSuccess(res.user);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi hệ thống';
      setLoginError(msg);
      notify('error', 'Lỗi đăng nhập', msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Quick Login using default Teacher account (thaytin / 123456)
  const handleQuickLoginTeacher = async () => {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await loginUser('thaytin', '123456');
      if (res.success && res.user) {
        notify('success', 'Đăng nhập thành công', 'Chào mừng Thầy Dương Thành Tín.');
        onLoginSuccess(res.user);
      } else {
        // Fallback: Check if any registered user exists
        const users = getRegisteredUsers();
        if (users.length > 0) {
          setCurrentUser(users[0]);
          notify('success', 'Đăng nhập thành công', `Chào mừng ${users[0].fullName}.`);
          onLoginSuccess(users[0]);
        } else {
          setLoginError('Không thể đăng nhập tài khoản mặc định. Thầy/Cô vui lòng đăng ký tài khoản mới.');
        }
      }
    } catch {
      setLoginError('Lỗi khi đăng nhập tài khoản mặc định.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regUsername.trim()) {
      setRegError('Vui lòng nhập tên đăng nhập!');
      return;
    }
    if (!isUsernameValid) {
      setRegError('Tên đăng nhập không đúng định dạng (3-30 ký tự, viết liền không dấu)!');
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

    setIsRegistering(true);
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
        onLoginSuccess(res.user);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi hệ thống khi đăng ký';
      setRegError(msg);
      notify('error', 'Đăng ký lỗi', msg);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div
      id="auth-gateway-screen"
      className="min-h-screen bg-slate-900 flex flex-col justify-between relative overflow-hidden"
    >
      {/* Decorative Background Lighting Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Branding Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 border border-blue-400/20">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-lg sm:text-xl tracking-tight leading-tight">
              TRỢ LÝ QUẢN TRỊ HỌC TẬP
            </h1>
            <p className="text-xs sm:text-sm text-blue-300 font-medium">
              Môn Ngữ văn THCS • Thầy Dương Thành Tín • THCS Phan Bội Châu
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-blue-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Hệ thống bảo mật giáo dục</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
        {/* Left Side: Overview & Value Highlights (Desktop) */}
        <div className="w-full lg:w-1/2 text-white space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Phần mềm quản trị học tập dành cho Giáo viên</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Quản trị học tập <br className="hidden sm:inline" />
            <span className="bg-linear-to-r from-blue-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
              Hiện đại & Hiệu quả
            </span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg">
            Hỗ trợ Thầy/Cô quản lý toàn diện lớp học, học sinh, giáo án, nhiệm vụ và sổ điểm học tập môn Ngữ văn
            ngay trên trình duyệt hoặc đám mây Supabase.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">Quản lý Học sinh & Lớp</p>
                <p className="text-[11px] text-slate-400">Theo dõi thông tin, chú ý riêng</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">Kế hoạch Bài học</p>
                <p className="text-[11px] text-slate-400">Lịch dạy, tiến độ chương trình</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">Giao Nhiệm vụ Học tập</p>
                <p className="text-[11px] text-slate-400">Theo dõi nộp bài & tiến độ</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">Sổ Điểm & Nhận xét</p>
                <p className="text-[11px] text-slate-400">Đánh giá 4 kỹ năng Ngữ văn</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Box (Login / Register Card) */}
        <div className="w-full lg:w-1/2 max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl shadow-black/40 border border-slate-100 overflow-hidden">
            {/* Tab Navigation: Đăng Nhập / Đăng Ký */}
            <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5">
              <button
                id="auth-screen-tab-login"
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setLoginError('');
                }}
                className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'login'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập</span>
              </button>

              <button
                id="auth-screen-tab-register"
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setRegError('');
                }}
                className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'register'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Đăng Ký Tài Khoản</span>
              </button>
            </div>

            {/* TAB CONTENT: LOGIN */}
            {activeTab === 'login' && (
              <div className="p-6 sm:p-7 space-y-5 animate-fadeIn">
                <div className="text-left">
                  <h3 className="text-xl font-bold text-slate-900">Chào mừng Thầy/Cô!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Nhập tên đăng nhập và mật khẩu để bắt đầu phiên làm việc.
                  </p>
                </div>

                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                        id="auth-login-username"
                        type="text"
                        required
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value.toLowerCase().trim())}
                        placeholder="Nhập tên đăng nhập (vd: thaytin)"
                        className="w-full pl-10 pr-3.5 py-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
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
                        id="auth-login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Nhập mật khẩu"
                        className="w-full pl-10 pr-10 py-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
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

                  <button
                    id="auth-login-submit-btn"
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3.5 px-4 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isLoggingIn ? 'Đang xác thực...' : 'Đăng Nhập Vào Hệ Thống'}</span>
                  </button>
                </form>

                {/* Quick login box with default teacher account */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-blue-950">Tài khoản mặc định:</p>
                      <p className="text-[11px] text-blue-700 truncate mt-0.5">
                        Tên: <code className="bg-blue-100/80 font-bold px-1 py-0.5 rounded">thaytin</code> | MK:{' '}
                        <code className="bg-blue-100/80 font-bold px-1 py-0.5 rounded">123456</code>
                      </p>
                    </div>
                    <button
                      id="auth-quick-login-btn"
                      type="button"
                      onClick={handleQuickLoginTeacher}
                      disabled={isLoggingIn}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all shrink-0 active:scale-95"
                    >
                      Vào nhanh
                    </button>
                  </div>
                </div>

                {/* Switch to register prompt */}
                <div className="text-center pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Thầy/Cô chưa có tài khoản? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setRegError('');
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Bấm vào đây để Đăng ký ngay
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: REGISTER */}
            {activeTab === 'register' && (
              <div className="p-6 sm:p-7 space-y-4 animate-fadeIn">
                <div className="text-left">
                  <h3 className="text-xl font-bold text-slate-900">Đăng Ký Tài Khoản Mới</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Tạo tài khoản quản trị học tập bằng tên đăng nhập và mật khẩu riêng.
                  </p>
                </div>

                {regError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* Tên đăng nhập */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Tên đăng nhập <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="auth-register-username"
                        type="text"
                        required
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        placeholder="vd: colan_van, thay_nam, thaytin2"
                        className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border rounded-xl text-sm focus:outline-hidden focus:ring-2 transition-all ${
                          regUsername && !isUsernameValid
                            ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/20'
                            : regUsername && isUsernameValid
                            ? 'border-emerald-300 focus:ring-emerald-400 bg-emerald-50/20'
                            : 'border-slate-300 focus:ring-blue-500'
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
                    <p className="text-[10px] text-slate-500 mt-1">
                      3-30 ký tự, viết liền không dấu, chỉ gồm chữ thường, số hoặc gạch dưới (_).
                    </p>
                  </div>

                  {/* Họ và tên hiển thị */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Họ và tên hiển thị / Danh xưng <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <input
                        id="auth-register-fullname"
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="vd: Thầy Dương Thành Tín, Cô Mai Lan"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Môn & Trường */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Môn giảng dạy
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <input
                          id="auth-register-subject"
                          type="text"
                          value={regSubject}
                          onChange={(e) => setRegSubject(e.target.value)}
                          placeholder="Ngữ văn"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Trường học
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <School className="w-3.5 h-3.5" />
                        </div>
                        <input
                          id="auth-register-school"
                          type="text"
                          value={regSchool}
                          onChange={(e) => setRegSchool(e.target.value)}
                          placeholder="THCS Phan Bội Châu"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mật khẩu */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="auth-register-password"
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Xác nhận mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        id="auth-register-confirm-password"
                        type={showRegConfirm ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Nhập lại chính xác mật khẩu"
                        className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border rounded-xl text-sm focus:outline-hidden focus:ring-2 transition-all ${
                          regConfirmPassword && !doPasswordsMatch
                            ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/20'
                            : regConfirmPassword && doPasswordsMatch
                            ? 'border-emerald-300 focus:ring-emerald-400 bg-emerald-50/20'
                            : 'border-slate-300 focus:ring-blue-500'
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
                      <p className={`text-[10px] mt-1 ${doPasswordsMatch ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {doPasswordsMatch ? '✓ Mật khẩu khớp nhau' : '✗ Mật khẩu xác nhận chưa khớp'}
                      </p>
                    )}
                  </div>

                  <button
                    id="auth-register-submit-btn"
                    type="submit"
                    disabled={isRegistering}
                    className="w-full py-3.5 px-4 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isRegistering ? 'Đang tạo tài khoản...' : 'Hoàn Tất Đăng Ký & Vào Hệ Thống'}</span>
                  </button>
                </form>

                {/* Switch to login prompt */}
                <div className="text-center pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Đã có tài khoản? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setLoginError('');
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Quay lại Đăng nhập
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-4 text-xs text-slate-500">
        © 2026 Trợ Lý Quản Trị Học Tập Ngữ Văn THCS • Thầy Dương Thành Tín • THCS Phan Bội Châu
      </footer>
    </div>
  );
};

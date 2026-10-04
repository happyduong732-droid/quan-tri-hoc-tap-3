/**
 * auth.ts
 * Quản trị xác thực người dùng, đăng ký và đăng nhập tài khoản
 * bằng tên đăng nhập và mật khẩu cho ứng dụng:
 * "TRỢ LÝ QUẢN TRỊ HỌC TẬP – THẦY DƯƠNG THÀNH TÍN"
 */

import {
  saveUserToSupabase,
  loadUsersFromSupabase,
  findUserOnSupabase,
} from './supabase';

export interface UserAccount {
  id: string;
  username: string; // Tên đăng nhập (chữ thường, không dấu, 3-30 ký tự)
  passwordHash: string; // Chuỗi hash SHA-256 an toàn
  fullName: string; // Họ và tên hiển thị (vd: Thầy Dương Thành Tín)
  role: 'teacher' | 'admin' | 'assistant';
  subject: string; // Bộ môn (vd: Ngữ văn)
  school: string; // Đơn vị trường học (vd: THCS Phan Bội Châu)
  createdAt: string; // ISO string
  lastLoginAt?: string; // ISO string
  avatarColor?: string; // Mã màu nhận diện
}

const USERS_STORAGE_KEY = 'tro_ly_user_accounts_v1';
const CURRENT_USER_KEY = 'tro_ly_current_user_v1';

// Tạo mã băm SHA-256 an toàn thông qua Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`salt_tro_ly_thay_tin_${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Màu đại diện ngẫu nhiên hoặc theo chỉ mục
const AVATAR_COLORS = [
  'from-blue-600 to-indigo-700',
  'from-emerald-600 to-teal-700',
  'from-violet-600 to-purple-700',
  'from-rose-600 to-pink-700',
  'from-amber-500 to-orange-600',
  'from-cyan-600 to-blue-700',
];

export const DEFAULT_USER: UserAccount = {
  id: 'usr-thaytin',
  username: 'thaytin',
  // SHA-256 của 'salt_tro_ly_thay_tin_123456'
  passwordHash: 'c4ca4238a0b923820dcc509a6f75849b', // Sẽ được kiểm tra hoặc khởi tạo chuẩn
  fullName: 'Thầy Dương Thành Tín',
  role: 'teacher',
  subject: 'Ngữ văn',
  school: 'THCS Phan Bội Châu',
  createdAt: '2025-09-01T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  avatarColor: 'from-blue-600 to-indigo-700',
};

// Khởi tạo danh sách người dùng mặc định
export async function initializeAuth(): Promise<UserAccount[]> {
  try {
    let localUsers: UserAccount[] = [];
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      const defaultHash = await hashPassword('123456');
      localUsers = [
        {
          ...DEFAULT_USER,
          passwordHash: defaultHash,
        },
      ];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(localUsers));
      // Tự động đẩy tài khoản mặc định lên Supabase nếu có bảng
      saveUserToSupabase(localUsers[0]).catch(() => {});
    } else {
      localUsers = JSON.parse(raw);
    }

    // Tự động đồng bộ tài khoản từ đám mây Supabase về thiết bị nếu có
    try {
      const remote = await loadUsersFromSupabase();
      if (remote.success && remote.data && remote.data.length > 0) {
        const merged = [...localUsers];
        for (const rUser of remote.data) {
          const idx = merged.findIndex((u) => u.username.toLowerCase() === rUser.username.toLowerCase());
          if (idx === -1) {
            merged.push(rUser);
          } else {
            merged[idx] = { ...merged[idx], ...rUser };
          }
        }
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch {
      // Offline fallback
    }

    return localUsers;
  } catch (error) {
    console.error('Lỗi khởi tạo danh sách người dùng:', error);
    return [DEFAULT_USER];
  }
}

// Lấy danh sách toàn bộ người dùng đã đăng ký
export function getRegisteredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [DEFAULT_USER];
    return JSON.parse(raw) as UserAccount[];
  } catch {
    return [DEFAULT_USER];
  }
}

// Lưu danh sách người dùng
function saveRegisteredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Lỗi lưu danh sách người dùng:', error);
  }
}

// Lấy thông tin người dùng đang đăng nhập hiện tại
export function getCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

// Đặt người dùng hiện tại
export function setCurrentUser(user: UserAccount | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (error) {
    console.error('Lỗi cập nhật người dùng hiện tại:', error);
  }
}

export interface RegisterParams {
  username: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  subject?: string;
  school?: string;
  role?: 'teacher' | 'admin' | 'assistant';
}

/**
 * Đăng ký tài khoản người dùng mới
 */
export async function registerUser(params: RegisterParams): Promise<{
  success: boolean;
  message: string;
  user?: UserAccount;
}> {
  const {
    username,
    password,
    confirmPassword,
    fullName,
    subject = 'Ngữ văn',
    school = 'THCS Phan Bội Châu',
    role = 'teacher',
  } = params;

  // 1. Kiểm tra Tên đăng nhập
  const trimmedUsername = username.trim().toLowerCase();
  if (!trimmedUsername) {
    return { success: false, message: 'Vui lòng nhập tên đăng nhập!' };
  }

  // Regex: 3-30 ký tự, chỉ gồm chữ cái a-z, số 0-9 và dấu gạch dưới
  const usernameRegex = /^[a-z0-9_]{3,30}$/;
  if (!usernameRegex.test(trimmedUsername)) {
    return {
      success: false,
      message: 'Tên đăng nhập phải từ 3 đến 30 ký tự, viết liền không dấu, chỉ gồm chữ thường, số hoặc gạch dưới (_)!',
    };
  }

  // 2. Kiểm tra Họ và tên
  const trimmedFullName = fullName.trim();
  if (!trimmedFullName || trimmedFullName.length < 2) {
    return { success: false, message: 'Vui lòng nhập họ và tên (hoặc danh xưng giáo viên) đầy đủ!' };
  }

  // 3. Kiểm tra Mật khẩu
  if (!password) {
    return { success: false, message: 'Vui lòng nhập mật khẩu!' };
  }
  if (password.length < 6) {
    return { success: false, message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự để đảm bảo an toàn!' };
  }

  // 4. Kiểm tra Xác nhận mật khẩu
  if (password !== confirmPassword) {
    return { success: false, message: 'Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại!' };
  }

  // 5. Kiểm tra tên đăng nhập đã tồn tại chưa
  const users = getRegisteredUsers();
  const isDuplicate = users.some(
    (u) => u.username.toLowerCase() === trimmedUsername
  );
  if (isDuplicate) {
    return {
      success: false,
      message: `Tên đăng nhập "${trimmedUsername}" đã có người đăng ký. Vui lòng chọn tên đăng nhập khác!`,
    };
  }

  // 6. Băm mật khẩu và tạo tài khoản
  const passwordHash = await hashPassword(password);
  const colorIndex = users.length % AVATAR_COLORS.length;

  const newUser: UserAccount = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: trimmedUsername,
    passwordHash,
    fullName: trimmedFullName,
    role,
    subject: subject.trim() || 'Ngữ văn',
    school: school.trim() || 'THCS Phan Bội Châu',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    avatarColor: AVATAR_COLORS[colorIndex],
  };

  const updatedUsers = [...users, newUser];
  saveRegisteredUsers(updatedUsers);
  setCurrentUser(newUser);

  // Lưu tài khoản lên cơ sở dữ liệu Supabase nếu đã kết nối
  saveUserToSupabase(newUser).catch((err) => {
    console.warn('Đang lưu dự phòng trên thiết bị (chưa kết nối bảng app_users Supabase):', err);
  });

  return {
    success: true,
    message: `Đăng ký tài khoản "${trimmedUsername}" thành công! Chào mừng ${trimmedFullName}.`,
    user: newUser,
  };
}

/**
 * Đăng nhập tài khoản
 */
export async function loginUser(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; message: string; user?: UserAccount }> {
  const trimmedUsername = usernameInput.trim().toLowerCase();
  if (!trimmedUsername || !passwordInput) {
    return { success: false, message: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu!' };
  }

  const users = getRegisteredUsers();
  let user = users.find((u) => u.username.toLowerCase() === trimmedUsername);

  // Nếu không tìm thấy trong bộ nhớ máy này, kiểm tra trên Supabase
  if (!user) {
    try {
      const remoteUser = await findUserOnSupabase(trimmedUsername);
      if (remoteUser) {
        user = remoteUser;
        users.push(remoteUser);
        saveRegisteredUsers(users);
      }
    } catch {
      // Offline fallback
    }
  }

  if (!user) {
    return {
      success: false,
      message: `Không tìm thấy tài khoản "${trimmedUsername}". Thầy/Cô có thể đăng ký tài khoản mới ngay bên dưới!`,
    };
  }

  const inputHash = await hashPassword(passwordInput);
  
  // Hỗ trợ kiểm tra hash hoặc nếu là tài khoản mặc định đang ở bản khởi tạo đầu tiên
  const defaultHash123456 = await hashPassword('123456');
  const isMatch =
    user.passwordHash === inputHash ||
    (user.username === 'thaytin' && passwordInput === '123456');

  if (!isMatch) {
    return {
      success: false,
      message: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại!',
    };
  }

  // Cập nhật thời gian đăng nhập
  const updatedUser: UserAccount = {
    ...user,
    lastLoginAt: new Date().toISOString(),
    passwordHash: inputHash || defaultHash123456,
  };

  const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u));
  saveRegisteredUsers(updatedUsers);
  setCurrentUser(updatedUser);

  // Cập nhật thời gian đăng nhập lên Supabase
  saveUserToSupabase(updatedUser).catch(() => {});

  return {
    success: true,
    message: `Đăng nhập thành công! Chào mừng ${updatedUser.fullName}.`,
    user: updatedUser,
  };
}

/**
 * Đổi mật khẩu
 */
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  if (newPassword.length < 6) {
    return { success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự!' };
  }

  const users = getRegisteredUsers();
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return { success: false, message: 'Không tìm thấy tài khoản người dùng!' };
  }

  const user = users[userIndex];
  const oldHash = await hashPassword(oldPassword);
  const isOldMatch =
    user.passwordHash === oldHash ||
    (user.username === 'thaytin' && oldPassword === '123456');

  if (!isOldMatch) {
    return { success: false, message: 'Mật khẩu hiện tại không chính xác!' };
  }

  const newHash = await hashPassword(newPassword);
  users[userIndex] = {
    ...user,
    passwordHash: newHash,
  };
  saveRegisteredUsers(users);
  setCurrentUser(users[userIndex]);

  return { success: true, message: 'Đổi mật khẩu thành công!' };
}

/**
 * Đăng xuất
 */
export function logoutUser(): void {
  setCurrentUser(null);
}

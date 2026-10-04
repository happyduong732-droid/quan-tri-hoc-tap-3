/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AppData,
  NavTab,
  ClassItem,
  Student,
  Lesson,
  LearningTask,
  GradeEntry,
  StudentComment,
  ActivityLog
} from './types';
import {
  loadAppData,
  saveAppData,
  resetAppData,
  clearAppData,
  playChime
} from './services/storage';
import {
  checkSupabaseStatus,
  syncAppDataToSupabase,
  loadAppDataFromSupabase,
  deleteClassFromSupabase,
  deleteStudentFromSupabase,
  SupabaseStatusResult,
} from './services/supabase';

// Modals & Layout
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { DataManagementModal } from './components/DataManagementModal';
import { QuickSearchModal } from './components/QuickSearchModal';
import { SupabaseModal } from './components/SupabaseModal';
import { AuthModal, AuthModalTab } from './components/AuthModal';
import { AuthScreen } from './components/AuthScreen';
import { getCurrentUser, initializeAuth, UserAccount } from './services/auth';

// Views
import { OverviewView } from './components/OverviewView';
import { ClassesView } from './components/ClassesView';
import { StudentsView } from './components/StudentsView';
import { LessonsView } from './components/LessonsView';
import { TasksView } from './components/TasksView';
import { GradesView } from './components/GradesView';
import { ProgressView } from './components/ProgressView';
import { CommentsView } from './components/CommentsView';
import { StatsView } from './components/StatsView';

export default function App() {
  // Central Application State
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Transient drill-down filters (e.g. filtering students when jumping from classes/overview)
  const [subFilter, setSubFilter] = useState<string | undefined>(undefined);

  // Toast Notifications List
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
  });

  // Global Dialogs
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Authentication & User Accounts State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    defaultTab: AuthModalTab;
  }>({
    isOpen: false,
    defaultTab: 'register',
  });

  // Khởi tạo tài khoản hệ thống khi mở app lần đầu
  useEffect(() => {
    initializeAuth().then(() => {
      const active = getCurrentUser();
      if (active) setCurrentUser(active);
    });
  }, []);

  const handleOpenAuthModal = (tab: AuthModalTab = 'register') => {
    setAuthModalState({
      isOpen: true,
      defaultTab: tab,
    });
  };

  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('supabase_autosync_enabled') !== 'false';
  });
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatusResult>({
    status: 'checking',
    message: 'Đang kiểm tra kết nối...',
    hasWorkspaceTable: false,
    hasRelationalTables: false,
    hasUsersTable: false,
  });

  const hasInitializedFromSupabase = React.useRef(false);

  // Check Supabase status on load and sync if available
  const refreshSupabaseStatus = useCallback(async () => {
    try {
      const res = await checkSupabaseStatus();
      setSupabaseStatus(res);
      if (res.status === 'ready' && !hasInitializedFromSupabase.current) {
        hasInitializedFromSupabase.current = true;
        const remote = await loadAppDataFromSupabase();
        if (remote.success && remote.data && remote.data.classes.length > 0) {
          setData(remote.data);
          saveAppData(remote.data);
        } else {
          // Supabase đã sẵn sàng nhưng chưa có dữ liệu, tự động đẩy dữ liệu sạch hiện tại lên
          setData((current) => {
            syncAppDataToSupabase(current);
            return current;
          });
        }
      }
    } catch {
      setSupabaseStatus({
        status: 'error',
        message: 'Lỗi mạng khi kết nối Supabase',
        hasWorkspaceTable: false,
        hasRelationalTables: false,
        hasUsersTable: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshSupabaseStatus();
  }, [refreshSupabaseStatus]);

  // Debounced auto-sync to Supabase if enabled and ready
  useEffect(() => {
    if (!autoSyncEnabled || supabaseStatus.status !== 'ready') return;
    const timer = setTimeout(async () => {
      await syncAppDataToSupabase(data);
    }, 2000);
    return () => clearTimeout(timer);
  }, [data, autoSyncEnabled, supabaseStatus.status]);

  const handleToggleAutoSync = () => {
    const nextVal = !autoSyncEnabled;
    setAutoSyncEnabled(nextVal);
    localStorage.setItem('supabase_autosync_enabled', String(nextVal));
    notify(
      'info',
      nextVal ? 'Đã bật tự động đồng bộ Supabase' : 'Đã tắt tự động đồng bộ Supabase',
      nextVal ? 'Dữ liệu sẽ được lưu tự động lên đám mây.' : 'Thầy có thể bấm đồng bộ thủ công khi cần.'
    );
  };

  // Synchronize state with LocalStorage whenever data changes
  useEffect(() => {
    saveAppData(data);
  }, [data]);

  // Keyboard shortcut: Ctrl+K or Cmd+K to trigger Quick Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toast notification dispatcher with optional sound chime
  const notify = useCallback(
    (type: 'success' | 'warning' | 'error' | 'info', title: string, description?: string) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const newToast: ToastMessage = { id, type, title, description };
      setToasts((prev) => [...prev, newToast]);

      // Play soft sound if enabled
      if (type === 'success') {
        playChime('success', data.soundEnabled);
      } else if (type === 'warning' || type === 'error') {
        playChime('warning', data.soundEnabled);
      }

      // Auto dismiss after 4.5s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    [data.soundEnabled]
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Activity Log helper
  const recordActivity = (
    prevData: AppData,
    type: ActivityLog['type'],
    action: string
  ): AppData => {
    const newLog: ActivityLog = {
      id: 'log_' + Date.now(),
      type,
      action,
      timestamp: new Date().toISOString(),
    };
    return {
      ...prevData,
      activityLogs: [newLog, ...(prevData.activityLogs || []).slice(0, 49)],
    };
  };

  // Sound toggle handler
  const handleToggleSound = () => {
    const nextVal = !data.soundEnabled;
    setData((prev) => ({ ...prev, soundEnabled: nextVal }));
    notify(
      'info',
      nextVal ? 'Đã bật hiệu ứng âm thanh' : 'Đã tắt hiệu ứng âm thanh',
      nextVal ? 'Âm thanh thông báo nhẹ đã được kích hoạt' : 'Âm thanh đã ở chế độ im lặng'
    );
    if (nextVal) {
      playChime('success', true);
    }
  };

  // ----------------------------------------------------
  // Navigation
  // ----------------------------------------------------
  const handleNavigate = (tab: NavTab, filter?: string) => {
    setCurrentTab(tab);
    setSubFilter(filter);
    setIsMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ----------------------------------------------------
  // Classes Handlers
  // ----------------------------------------------------
  const handleAddClass = (clsData: Omit<ClassItem, 'id'>) => {
    const newClass: ClassItem = {
      ...clsData,
      id: 'cls_' + Date.now(),
    };
    setData((prev) => {
      const withClass = { ...prev, classes: [...prev.classes, newClass] };
      return recordActivity(withClass, 'class', `Đã thêm lớp ${newClass.name}`);
    });
    notify('success', 'Thêm lớp học thành công', `Đã tạo lớp ${clsData.name} trong hệ thống.`);
  };

  const handleUpdateClass = (updatedClass: ClassItem) => {
    setData((prev) => {
      const withClass = {
        ...prev,
        classes: prev.classes.map((c) => (c.id === updatedClass.id ? updatedClass : c)),
      };
      return recordActivity(withClass, 'class', `Đã cập nhật lớp ${updatedClass.name}`);
    });
    notify('success', 'Cập nhật lớp thành công', `Thông tin lớp ${updatedClass.name} đã được lưu.`);
  };

  const handleDeleteClass = (classId: string) => {
    const cls = data.classes.find((c) => c.id === classId);
    setConfirmModal({
      isOpen: true,
      title: `Xóa lớp ${cls?.name || ''}?`,
      message: `Thầy có chắc chắn muốn xóa lớp ${cls?.name || ''}? Dữ liệu học sinh, bài học, nhiệm vụ, điểm số và nhận xét liên quan đến lớp này sẽ được dọn dẹp tương ứng.`,
      isDestructive: true,
      onConfirm: () => {
        const updated = {
          ...data,
          classes: data.classes.filter((c) => c.id !== classId),
          students: data.students.filter((s) => s.classId !== classId),
          lessons: data.lessons.filter((l) => l.classId !== classId),
          tasks: data.tasks.filter((t) => t.classId !== classId),
          grades: data.grades.filter((g) => g.classId !== classId),
          comments: data.comments.filter((cm) => cm.classId !== classId),
        };
        const finalData = recordActivity(updated, 'class', `Đã xóa lớp ${cls?.name || classId}`);
        // 1. Cập nhật state UI
        setData(finalData);
        // 2. Lưu NGAY LẬP TỨC vào localStorage (tránh mất khi tải lại trang)
        saveAppData(finalData);
        // 3. Xóa NGAY LẬP TỨC khỏi cơ sở dữ liệu Supabase
        deleteClassFromSupabase(classId, finalData);
        notify('info', 'Đã xóa lớp học', `Lớp ${cls?.name || ''} đã được loại bỏ vĩnh viễn.`);
      },
    });
  };

  // ----------------------------------------------------
  // Students Handlers
  // ----------------------------------------------------
  const handleAddStudent = (studentData: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...studentData,
      id: 'st_' + Date.now(),
    };
    setData((prev) => {
      const withStudent = { ...prev, students: [...prev.students, newStudent] };
      return recordActivity(
        withStudent,
        'student',
        `Đã thêm học sinh ${newStudent.fullName} (${newStudent.studentCode})`
      );
    });
    notify(
      'success',
      'Thêm học sinh thành công',
      `Đã thêm em ${studentData.fullName} vào danh sách.`
    );
  };

  const handleAddStudentsBatch = (studentsBatch: Omit<Student, 'id'>[]) => {
    if (studentsBatch.length === 0) return;
    const timestamp = Date.now();
    const newStudents: Student[] = studentsBatch.map((st, idx) => ({
      ...st,
      id: `st_${timestamp}_${idx}`,
    }));
    setData((prev) => {
      const withStudents = { ...prev, students: [...prev.students, ...newStudents] };
      return recordActivity(
        withStudents,
        'student',
        `Đã nhập ${newStudents.length} học sinh từ file Excel`
      );
    });
    notify(
      'success',
      'Nhập file Excel thành công',
      `Đã thêm thành công ${newStudents.length} học sinh vào danh sách lớp.`
    );
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setData((prev) => {
      const withStudent = {
        ...prev,
        students: prev.students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)),
      };
      return recordActivity(
        withStudent,
        'student',
        `Đã cập nhật học sinh ${updatedStudent.fullName}`
      );
    });
    notify('success', 'Đã cập nhật học sinh', `Thông tin em ${updatedStudent.fullName} đã lưu.`);
  };

  const handleDeleteStudent = (studentId: string) => {
    const st = data.students.find((s) => s.id === studentId);
    setConfirmModal({
      isOpen: true,
      title: 'Xóa học sinh?',
      message: `Thầy có muốn xóa học sinh ${st?.fullName || ''} (${st?.studentCode}) khỏi danh sách lớp không?`,
      isDestructive: true,
      onConfirm: () => {
        const updated = {
          ...data,
          students: data.students.filter((s) => s.id !== studentId),
          grades: data.grades.filter((g) => g.studentId !== studentId),
          comments: data.comments.filter((c) => c.studentId !== studentId),
        };
        const finalData = recordActivity(
          updated,
          'student',
          `Đã xóa học sinh ${st?.fullName || studentId}`
        );
        setData(finalData);
        saveAppData(finalData);
        deleteStudentFromSupabase(studentId, finalData);
        notify('info', 'Đã xóa học sinh', `Học sinh ${st?.fullName || ''} đã được xóa.`);
      },
    });
  };

  // ----------------------------------------------------
  // Lessons Handlers
  // ----------------------------------------------------
  const handleAddLesson = (lessonData: Omit<Lesson, 'id'>) => {
    const newLesson: Lesson = {
      ...lessonData,
      id: 'les_' + Date.now(),
    };
    setData((prev) => {
      const withLesson = { ...prev, lessons: [...prev.lessons, newLesson] };
      return recordActivity(withLesson, 'lesson', `Đã tạo bài học ${newLesson.title}`);
    });
    notify('success', 'Tạo bài học thành công', `Bài dạy "${lessonData.title}" đã được lưu.`);
  };

  const handleUpdateLesson = (updatedLesson: Lesson) => {
    setData((prev) => {
      const withLesson = {
        ...prev,
        lessons: prev.lessons.map((l) => (l.id === updatedLesson.id ? updatedLesson : l)),
      };
      return recordActivity(withLesson, 'lesson', `Đã cập nhật bài học ${updatedLesson.title}`);
    });
    notify('success', 'Đã cập nhật bài học', `Bài "${updatedLesson.title}" đã lưu thay đổi.`);
  };

  const handleDeleteLesson = (lessonId: string) => {
    const l = data.lessons.find((les) => les.id === lessonId);
    setConfirmModal({
      isOpen: true,
      title: 'Xóa bài học?',
      message: `Thầy có chắc chắn muốn xóa bài học "${l?.title || ''}"?`,
      isDestructive: true,
      onConfirm: () => {
        const updated = {
          ...data,
          lessons: data.lessons.filter((item) => item.id !== lessonId),
        };
        const finalData = recordActivity(updated, 'lesson', `Đã xóa bài học ${l?.title || lessonId}`);
        setData(finalData);
        saveAppData(finalData);
        notify('info', 'Đã xóa bài học', `Bài dạy "${l?.title || ''}" đã được xóa.`);
      },
    });
  };

  // ----------------------------------------------------
  // Tasks Handlers
  // ----------------------------------------------------
  const handleAddTask = (taskData: Omit<LearningTask, 'id'>) => {
    const newTask: LearningTask = {
      ...taskData,
      id: 'task_' + Date.now(),
    };
    setData((prev) => {
      const withTask = { ...prev, tasks: [...prev.tasks, newTask] };
      return recordActivity(withTask, 'task', `Đã giao nhiệm vụ: ${newTask.title}`);
    });
    notify('success', 'Đã giao nhiệm vụ', `Nhiệm vụ "${taskData.title}" đã được tạo.`);
  };

  const handleUpdateTask = (updatedTask: LearningTask) => {
    setData((prev) => {
      const withTask = {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      };
      return recordActivity(withTask, 'task', `Đã cập nhật nhiệm vụ: ${updatedTask.title}`);
    });
    notify('success', 'Đã cập nhật nhiệm vụ', `Nhiệm vụ "${updatedTask.title}" đã được lưu.`);
  };

  const handleDeleteTask = (taskId: string) => {
    const t = data.tasks.find((task) => task.id === taskId);
    setConfirmModal({
      isOpen: true,
      title: 'Xóa nhiệm vụ học tập?',
      message: `Thầy có chắc chắn muốn xóa nhiệm vụ "${t?.title || ''}"?`,
      isDestructive: true,
      onConfirm: () => {
        const updated = {
          ...data,
          tasks: data.tasks.filter((task) => task.id !== taskId),
        };
        const finalData = recordActivity(updated, 'task', `Đã xóa nhiệm vụ: ${t?.title || taskId}`);
        setData(finalData);
        saveAppData(finalData);
        notify('info', 'Đã xóa nhiệm vụ', `Nhiệm vụ "${t?.title || ''}" đã xóa.`);
      },
    });
  };

  const handleToggleStudentTask = (taskId: string, studentId: string) => {
    setData((prev) => {
      const updatedTasks = prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const exists = t.completedStudentIds.includes(studentId);
        const newCompleted = exists
          ? t.completedStudentIds.filter((id) => id !== studentId)
          : [...t.completedStudentIds, studentId];
        return { ...t, completedStudentIds: newCompleted };
      });
      return { ...prev, tasks: updatedTasks };
    });
  };

  // ----------------------------------------------------
  // Grades Handlers
  // ----------------------------------------------------
  const handleAddGrade = (gradeData: Omit<GradeEntry, 'id'>) => {
    const newGrade: GradeEntry = {
      ...gradeData,
      id: 'gr_' + Date.now(),
    };
    setData((prev) => {
      const withGrade = { ...prev, grades: [...prev.grades, newGrade] };
      const st = prev.students.find((s) => s.id === gradeData.studentId);
      return recordActivity(
        withGrade,
        'grade',
        `Đã nhập điểm ${gradeData.score} cho em ${st?.fullName || 'học sinh'}`
      );
    });
    notify('success', 'Đã lưu điểm số', `Điểm ${gradeData.score} đã được ghi nhận.`);
  };

  const handleUpdateGrade = (updatedGrade: GradeEntry) => {
    setData((prev) => {
      const withGrade = {
        ...prev,
        grades: prev.grades.map((g) => (g.id === updatedGrade.id ? updatedGrade : g)),
      };
      return recordActivity(withGrade, 'grade', `Đã cập nhật điểm số ${updatedGrade.score}`);
    });
    notify('success', 'Cập nhật điểm thành công', `Điểm mới ${updatedGrade.score} đã được lưu.`);
  };

  const handleDeleteGrade = (gradeId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa kết quả điểm?',
      message: 'Thầy có muốn xóa cột điểm kiểm tra này khỏi hệ thống?',
      isDestructive: true,
      onConfirm: () => {
        const updated = {
          ...data,
          grades: data.grades.filter((g) => g.id !== gradeId),
        };
        const finalData = recordActivity(updated, 'grade', 'Đã xóa một kết quả kiểm tra');
        setData(finalData);
        saveAppData(finalData);
        notify('info', 'Đã xóa điểm', 'Cột điểm đã được loại bỏ.');
      },
    });
  };

  // ----------------------------------------------------
  // Comments Handlers
  // ----------------------------------------------------
  const handleAddComment = (commentData: Omit<StudentComment, 'id'>) => {
    const newComment: StudentComment = {
      ...commentData,
      id: 'cm_' + Date.now(),
    };
    setData((prev) => {
      const withComment = { ...prev, comments: [...prev.comments, newComment] };
      const st = prev.students.find((s) => s.id === commentData.studentId);
      return recordActivity(
        withComment,
        'comment',
        `Đã ghi nhận xét cho em ${st?.fullName || 'học sinh'} (${commentData.skillCategory})`
      );
    });
    notify('success', 'Đã lưu nhận xét', 'Lời nhận xét đánh giá thường xuyên đã được lưu.');
  };

  const handleUpdateComment = (updatedComment: StudentComment) => {
    setData((prev) => {
      const withComment = {
        ...prev,
        comments: prev.comments.map((c) => (c.id === updatedComment.id ? updatedComment : c)),
      };
      return recordActivity(withComment, 'comment', 'Đã cập nhật nội dung nhận xét');
    });
    notify('success', 'Đã cập nhật nhận xét', 'Lời nhận xét đã được chỉnh sửa.');
  };

  const handleDeleteComment = (commentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa nhận xét học sinh?',
      message: 'Thầy có chắc chắn muốn xóa nhận xét này?',
      isDestructive: true,
      onConfirm: () => {
        const updated = {
          ...data,
          comments: data.comments.filter((c) => c.id !== commentId),
        };
        const finalData = recordActivity(updated, 'comment', 'Đã xóa một nhận xét học sinh');
        setData(finalData);
        saveAppData(finalData);
        notify('info', 'Đã xóa nhận xét', 'Nhận xét đã được loại bỏ.');
      },
    });
  };

  // ----------------------------------------------------
  // Data Backup / Restore Handlers
  // ----------------------------------------------------
  const handleResetData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Khôi phục dữ liệu mẫu?',
      message:
        'Toàn bộ dữ liệu hiện tại sẽ được thay thế bằng dữ liệu mẫu ban đầu của Thầy Dương Thành Tín. Thầy có muốn tiếp tục?',
      isDestructive: false,
      onConfirm: () => {
        const restored = resetAppData();
        setData(restored);
        notify(
          'success',
          'Khôi phục thành công',
          'Dữ liệu mẫu Ngữ văn THCS Phan Bội Châu đã sẵn sàng.'
        );
      },
    });
  };

  const handleClearData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa sạch toàn bộ dữ liệu?',
      message:
        'Hành động này sẽ xóa toàn bộ danh sách lớp học, học sinh, bài học, nhiệm vụ và điểm số trên trình duyệt này. Thầy có thể xuất file JSON sao lưu trước nếu cần.',
      isDestructive: true,
      onConfirm: () => {
        const cleared = clearAppData();
        setData(cleared);
        notify('warning', 'Đã xóa dữ liệu', 'Toàn bộ dữ liệu trên trình duyệt đã được đặt lại trống.');
      },
    });
  };

  // ----------------------------------------------------
  // View Switcher
  // ----------------------------------------------------
  const renderCurrentView = () => {
    switch (currentTab) {
      case 'overview':
        return <OverviewView data={data} onNavigate={handleNavigate} />;

      case 'classes':
        return (
          <ClassesView
            data={data}
            onAddClass={handleAddClass}
            onUpdateClass={handleUpdateClass}
            onDeleteClass={handleDeleteClass}
            onViewClassStudents={(clsId) => handleNavigate('students', clsId)}
          />
        );

      case 'students':
        return (
          <StudentsView
            data={data}
            initialClassFilter={subFilter && subFilter.startsWith('cls_') ? subFilter : 'ALL'}
            initialSearchQuery={subFilter && !subFilter.startsWith('cls_') ? subFilter : ''}
            onAddStudent={handleAddStudent}
            onAddStudentsBatch={handleAddStudentsBatch}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onNavigateToComment={(studentId) => handleNavigate('comments', studentId)}
          />
        );

      case 'lessons':
        return (
          <LessonsView
            data={data}
            initialClassFilter={subFilter && subFilter.startsWith('cls_') ? subFilter : 'ALL'}
            initialSearchQuery={subFilter && !subFilter.startsWith('cls_') ? subFilter : ''}
            onAddLesson={handleAddLesson}
            onUpdateLesson={handleUpdateLesson}
            onDeleteLesson={handleDeleteLesson}
          />
        );

      case 'tasks':
        return (
          <TasksView
            data={data}
            initialClassFilter={subFilter && subFilter.startsWith('cls_') ? subFilter : 'ALL'}
            initialSearchQuery={subFilter && !subFilter.startsWith('cls_') ? subFilter : ''}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onToggleStudentTask={handleToggleStudentTask}
          />
        );

      case 'grades':
        return (
          <GradesView
            data={data}
            initialClassFilter={subFilter && subFilter.startsWith('cls_') ? subFilter : 'ALL'}
            onAddGrade={handleAddGrade}
            onUpdateGrade={handleUpdateGrade}
            onDeleteGrade={handleDeleteGrade}
          />
        );

      case 'progress':
        return <ProgressView data={data} onNavigate={handleNavigate} />;

      case 'comments':
        return (
          <CommentsView
            data={data}
            initialClassFilter={subFilter && subFilter.startsWith('cls_') ? subFilter : 'ALL'}
            onAddComment={handleAddComment}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
          />
        );

      case 'stats':
        return <StatsView data={data} onNavigate={handleNavigate} />;

      default:
        return (
          <OverviewView
            data={data}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onOpenAuthModal={handleOpenAuthModal}
          />
        );
    }
  };

  // Màn hình Đăng nhập & Đăng ký xuất hiện trước khi người dùng truy cập giao diện chính
  if (!currentUser) {
    return (
      <>
        <AuthScreen
          onLoginSuccess={(user) => {
            setCurrentUser(user);
          }}
          notify={notify}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Application Header */}
      <Header
        data={data}
        currentUser={currentUser}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenAuthModal={handleOpenAuthModal}
        onLogout={() => {
          setCurrentUser(null);
          notify('info', 'Đã đăng xuất', 'Thầy/Cô đã đăng xuất. Bấm Đăng ký hoặc Đăng nhập để tiếp tục.');
        }}
        supabaseStatus={supabaseStatus}
        onToggleSound={handleToggleSound}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        isSidebarOpen={isMobileSidebarOpen}
      />

      {/* Main App Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setSubFilter(undefined);
            setIsMobileSidebarOpen(false);
          }}
          data={data}
          currentUser={currentUser}
          onOpenAuthModal={handleOpenAuthModal}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Content Canvas */}
        <main
          id="main-content-canvas"
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-full min-w-0"
        >
          {renderCurrentView()}
        </main>
      </div>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Global Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Data Backup & Restore Modal */}
      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        data={data}
        onUpdateData={(newData) => {
          setData(newData);
          notify('success', 'Đã cập nhật dữ liệu', 'Dữ liệu mới đã được áp dụng.');
        }}
        onResetSample={handleResetData}
        onClearData={handleClearData}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onNotify={notify}
      />

      {/* Supabase Cloud Sync Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        data={data}
        onUpdateData={(newData) => {
          setData(newData);
        }}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={handleToggleAutoSync}
        onNotify={notify}
        statusResult={supabaseStatus}
        onRefreshStatus={refreshSupabaseStatus}
      />

      {/* Global Quick Search Modal (Ctrl + K) */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        data={data}
        onNavigate={handleNavigate}
      />

      {/* Account Authentication & Registration Modal */}
      <AuthModal
        isOpen={authModalState.isOpen}
        onClose={() => setAuthModalState((prev) => ({ ...prev, isOpen: false }))}
        defaultTab={authModalState.defaultTab}
        currentUser={currentUser}
        onUserChange={(newUser) => {
          setCurrentUser(newUser);
        }}
        notify={notify}
      />
    </div>
  );
}

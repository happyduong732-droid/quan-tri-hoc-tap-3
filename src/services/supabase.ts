/**
 * supabase.ts
 * Quản trị kết nối và đồng bộ dữ liệu với cơ sở dữ liệu Supabase
 * cho "TRỢ LÝ QUẢN TRỊ HỌC TẬP – THẦY DƯƠNG THÀNH TÍN"
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppData, ClassItem, Student, Lesson, LearningTask, GradeEntry, StudentComment, ActivityLog } from '../types';

// Lấy thông tin cấu hình từ biến môi trường
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://swhrpermczgbchpretry.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_t8jVj_SwiVAWLfsLhyOE_Q_k1TwO19X';

// Khởi tạo Supabase client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type SupabaseConnectionStatus = 'checking' | 'ready' | 'need_schema' | 'error' | 'not_configured';

export interface SupabaseStatusResult {
  status: SupabaseConnectionStatus;
  message: string;
  hasWorkspaceTable: boolean;
  hasRelationalTables: boolean;
  tableDetails?: string;
}

/**
 * Kiểm tra kết nối và trạng thái các bảng trong Supabase
 */
export async function checkSupabaseStatus(): Promise<SupabaseStatusResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      status: 'not_configured',
      message: 'Chưa cấu hình URL hoặc Anon Key của Supabase.',
      hasWorkspaceTable: false,
      hasRelationalTables: false,
    };
  }

  try {
    // 1. Kiểm tra bảng app_workspace
    let hasWorkspace = false;
    const { error: wsError } = await supabase
      .from('app_workspace')
      .select('id')
      .limit(1);

    if (!wsError) {
      hasWorkspace = true;
    }

    // 2. Kiểm tra bảng students
    let hasStudents = false;
    const { error: stError } = await supabase
      .from('students')
      .select('id')
      .limit(1);

    if (!stError) {
      hasStudents = true;
    }

    if (hasWorkspace || hasStudents) {
      return {
        status: 'ready',
        message: 'Đã kết nối thành công với cơ sở dữ liệu Supabase!',
        hasWorkspaceTable: hasWorkspace,
        hasRelationalTables: hasStudents,
        tableDetails: `Bảng Workspace: ${hasWorkspace ? 'Đã tạo' : 'Chưa tạo'} | Bảng Học sinh: ${hasStudents ? 'Đã tạo' : 'Chưa tạo'}`,
      };
    }

    // Nếu cả 2 bảng đều chưa tìm thấy trong schema cache
    const errorCode = wsError?.code || stError?.code;
    if (errorCode === 'PGRST205' || wsError?.message?.includes('schema cache')) {
      return {
        status: 'need_schema',
        message: 'Kết nối Supabase thành công nhưng chưa tạo bảng dữ liệu.',
        hasWorkspaceTable: false,
        hasRelationalTables: false,
        tableDetails: 'Cần chạy mã lệnh SQL trong mục SQL Editor trên Supabase để tạo các bảng.',
      };
    }

    return {
      status: 'error',
      message: wsError?.message || stError?.message || 'Không thể truy vấn cơ sở dữ liệu Supabase.',
      hasWorkspaceTable: false,
      hasRelationalTables: false,
    };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Lỗi kết nối mạng tới Supabase.',
      hasWorkspaceTable: false,
      hasRelationalTables: false,
    };
  }
}

/**
 * Đồng bộ dữ liệu hiện tại lên Supabase
 */
export async function syncAppDataToSupabase(data: AppData): Promise<{ success: boolean; message: string; detail?: string }> {
  try {
    const timestamp = new Date().toISOString();

    // 1. Luôn cố gắng lưu vào bảng app_workspace (đồng bộ tổng thể nhanh và toàn vẹn)
    const { error: wsError } = await supabase
      .from('app_workspace')
      .upsert({
        id: 'main_workspace',
        data: data,
        updated_at: timestamp,
      }, { onConflict: 'id' });

    let syncedWorkspace = !wsError;

    // 2. Cố gắng đồng bộ thêm vào các bảng quan hệ chi tiết nếu đã tạo
    let syncedRelational = false;
    try {
      // Upsert classes
      if (data.classes.length > 0) {
        const classPayload = data.classes.map((c: ClassItem) => ({
          id: c.id,
          name: c.name,
          grade_level: c.gradeLevel,
          room: c.room || null,
          academic_year: c.academicYear,
          note: c.note || null,
        }));
        await supabase.from('classes').upsert(classPayload, { onConflict: 'id' });
      }

      // Dọn dẹp các lớp học trên Supabase không còn trong danh sách (đã bị xóa)
      try {
        const { data: dbClasses } = await supabase.from('classes').select('id');
        if (dbClasses && dbClasses.length > 0) {
          const currentClassIds = new Set(data.classes.map((c) => c.id));
          const removedClassIds = dbClasses.map((r: any) => r.id).filter((id: string) => !currentClassIds.has(id));
          if (removedClassIds.length > 0) {
            await supabase.from('classes').delete().in('id', removedClassIds);
          }
        }
      } catch {
        // Bỏ qua nếu chưa hỗ trợ
      }

      // Upsert students
      if (data.students.length > 0) {
        const studentPayload = data.students.map((s: Student) => ({
          id: s.id,
          student_code: s.studentCode,
          full_name: s.fullName,
          class_id: s.classId,
          gender: s.gender,
          status: s.status,
          note: s.note || null,
          need_attention: !!s.needAttention,
        }));
        await supabase.from('students').upsert(studentPayload, { onConflict: 'id' });
      }

      // Dọn dẹp học sinh đã bị xóa
      try {
        const { data: dbStudents } = await supabase.from('students').select('id');
        if (dbStudents && dbStudents.length > 0) {
          const currentStudentIds = new Set(data.students.map((s) => s.id));
          const removedStudentIds = dbStudents.map((r: any) => r.id).filter((id: string) => !currentStudentIds.has(id));
          if (removedStudentIds.length > 0) {
            await supabase.from('students').delete().in('id', removedStudentIds);
          }
        }
      } catch {
        // Bỏ qua nếu lỗi
      }

      // Upsert lessons
      if (data.lessons.length > 0) {
        const lessonPayload = data.lessons.map((l: Lesson) => ({
          id: l.id,
          title: l.title,
          class_id: l.classId,
          topic: l.topic,
          objectives: l.objectives,
          summary: l.summary,
          teach_date: l.teachDate,
          status: l.status,
        }));
        await supabase.from('lessons').upsert(lessonPayload, { onConflict: 'id' });
      }

      // Upsert tasks
      if (data.tasks.length > 0) {
        const taskPayload = data.tasks.map((t: LearningTask) => ({
          id: t.id,
          title: t.title,
          class_id: t.classId,
          lesson_id: t.lessonId || null,
          description: t.description,
          due_date: t.dueDate,
          priority: t.priority,
          status: t.status,
          completed_student_ids: t.completedStudentIds || [],
        }));
        await supabase.from('learning_tasks').upsert(taskPayload, { onConflict: 'id' });
      }

      // Upsert grades
      if (data.grades.length > 0) {
        const gradePayload = data.grades.map((g: GradeEntry) => ({
          id: g.id,
          student_id: g.studentId,
          class_id: g.classId,
          activity_title: g.activityTitle,
          lesson_id: g.lessonId || null,
          score: g.score,
          date: g.date,
          note: g.note || null,
        }));
        await supabase.from('grade_entries').upsert(gradePayload, { onConflict: 'id' });
      }

      // Upsert comments
      if (data.comments.length > 0) {
        const commentPayload = data.comments.map((cm: StudentComment) => ({
          id: cm.id,
          student_id: cm.studentId,
          class_id: cm.classId,
          date: cm.date,
          content: cm.content,
          skill_category: cm.skillCategory,
          note: cm.note || null,
        }));
        await supabase.from('student_comments').upsert(commentPayload, { onConflict: 'id' });
      }

      // Upsert activity logs
      if (data.activityLogs.length > 0) {
        const logPayload = data.activityLogs.slice(-50).map((al: ActivityLog) => ({
          id: al.id,
          timestamp: al.timestamp,
          type: al.type,
          action: al.action,
        }));
        await supabase.from('activity_logs').upsert(logPayload, { onConflict: 'id' });
      }

      syncedRelational = true;
    } catch {
      // Bảng quan hệ có thể chưa tạo
    }

    if (syncedWorkspace || syncedRelational) {
      return {
        success: true,
        message: 'Đã đồng bộ toàn bộ dữ liệu lên máy chủ Supabase thành công!',
        detail: `Đã cập nhật ${data.classes.length} lớp, ${data.students.length} học sinh, ${data.lessons.length} bài học.`,
      };
    }

    if (wsError?.code === 'PGRST205' || wsError?.message?.includes('schema cache')) {
      return {
        success: false,
        message: 'Cơ sở dữ liệu Supabase chưa tạo bảng.',
        detail: 'Thầy vui lòng mở SQL Editor trên Supabase, dán mã SQL tạo bảng và bấm RUN.',
      };
    }

    return {
      success: false,
      message: 'Không thể đồng bộ lên Supabase: ' + (wsError?.message || 'Lỗi không xác định'),
    };
  } catch (err) {
    return {
      success: false,
      message: 'Lỗi khi đồng bộ lên Supabase: ' + (err instanceof Error ? err.message : String(err)),
    };
  }
}

/**
 * Tải dữ liệu từ Supabase về ứng dụng
 */
export async function loadAppDataFromSupabase(): Promise<{
  success: boolean;
  data?: AppData;
  message: string;
}> {
  try {
    // 1. Thử đọc từ bảng app_workspace
    const { data: wsData, error: wsError } = await supabase
      .from('app_workspace')
      .select('data, updated_at')
      .eq('id', 'main_workspace')
      .maybeSingle();

    if (!wsError && wsData?.data) {
      const parsed = wsData.data as AppData;
      if (parsed.classes && parsed.students) {
        // Lọc sạch 6A1 nếu còn lưu trong đám mây cũ
        const cleaned: AppData = {
          ...parsed,
          classes: parsed.classes.filter((c) => c.id !== 'c-6a1' && c.name !== '6A1'),
          students: (parsed.students || []).filter((s) => s.classId !== 'c-6a1'),
          lessons: (parsed.lessons || []).filter((l) => l.classId !== 'c-6a1'),
          tasks: (parsed.tasks || []).filter((t) => t.classId !== 'c-6a1'),
          grades: (parsed.grades || []).filter((g) => g.classId !== 'c-6a1'),
          comments: (parsed.comments || []).filter((cm) => cm.classId !== 'c-6a1'),
        };
        return {
          success: true,
          data: cleaned,
          message: 'Đã tải thành công dữ liệu mới nhất từ Supabase!',
        };
      }
    }

    // 2. Nếu không có bảng app_workspace, thử đọc từ các bảng quan hệ
    const [classesRes, studentsRes, lessonsRes, tasksRes, gradesRes, commentsRes, logsRes] = await Promise.all([
      supabase.from('classes').select('*'),
      supabase.from('students').select('*'),
      supabase.from('lessons').select('*'),
      supabase.from('learning_tasks').select('*'),
      supabase.from('grade_entries').select('*'),
      supabase.from('student_comments').select('*'),
      supabase.from('activity_logs').select('*'),
    ]);

    if (!classesRes.error && classesRes.data && classesRes.data.length > 0) {
      const mappedData: AppData = {
        classes: classesRes.data.map((r: any) => ({
          id: r.id,
          name: r.name,
          gradeLevel: r.grade_level,
          room: r.room || undefined,
          academicYear: r.academic_year,
          note: r.note || undefined,
        })),
        students: (studentsRes.data || []).map((r: any) => ({
          id: r.id,
          studentCode: r.student_code,
          fullName: r.full_name,
          classId: r.class_id,
          gender: r.gender,
          status: r.status,
          note: r.note || undefined,
          needAttention: r.need_attention,
        })),
        lessons: (lessonsRes.data || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          classId: r.class_id,
          topic: r.topic,
          objectives: r.objectives,
          summary: r.summary,
          teachDate: r.teach_date,
          status: r.status,
        })),
        tasks: (tasksRes.data || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          classId: r.class_id,
          lessonId: r.lesson_id || undefined,
          description: r.description,
          dueDate: r.due_date,
          priority: r.priority,
          status: r.status,
          completedStudentIds: r.completed_student_ids || [],
        })),
        grades: (gradesRes.data || []).map((r: any) => ({
          id: r.id,
          studentId: r.student_id,
          classId: r.class_id,
          activityTitle: r.activity_title,
          lessonId: r.lesson_id || undefined,
          score: Number(r.score),
          date: r.date,
          note: r.note || undefined,
        })),
        comments: (commentsRes.data || []).map((r: any) => ({
          id: r.id,
          studentId: r.student_id,
          classId: r.class_id,
          date: r.date,
          content: r.content,
          skillCategory: r.skill_category,
          note: r.note || undefined,
        })),
        activityLogs: (logsRes.data || []).map((r: any) => ({
          id: r.id,
          timestamp: r.timestamp,
          type: r.type,
          action: r.action,
        })),
        soundEnabled: false,
      };

      return {
        success: true,
        data: mappedData,
        message: 'Đã nạp dữ liệu từ các bảng quan hệ trên Supabase thành công!',
      };
    }

    return {
      success: false,
      message: 'Chưa có bản ghi nào trên Supabase hoặc bảng chưa được tạo.',
    };
  } catch (err) {
    return {
      success: false,
      message: 'Lỗi khi tải từ Supabase: ' + (err instanceof Error ? err.message : String(err)),
    };
  }
}

/**
 * Trả về đoạn mã SQL hoàn chỉnh để tạo bảng và phân quyền trên Supabase
 */
export function getSupabaseSqlSchema(): string {
  return `-- ================================================================
-- MÃ SQL KHỞI TẠO BẢNG CHO TRỢ LÝ QUẢN TRỊ HỌC TẬP (SUPABASE)
-- Hướng dẫn: Mở Supabase Dashboard -> chọn SQL Editor -> New Query -> Dán và bấm RUN
-- ================================================================

-- 1. Bảng đồng bộ nhanh toàn diện ứng dụng
CREATE TABLE IF NOT EXISTS public.app_workspace (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Bảng Lớp học (classes)
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade_level INT NOT NULL,
  room TEXT,
  academic_year TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Bảng Học sinh (students)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  student_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  class_id TEXT,
  gender TEXT,
  status TEXT,
  note TEXT,
  need_attention BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Bảng Kế hoạch bài dạy (lessons)
CREATE TABLE IF NOT EXISTS public.lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  class_id TEXT,
  topic TEXT,
  objectives TEXT,
  summary TEXT,
  teach_date TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. Bảng Nhiệm vụ học tập (learning_tasks)
CREATE TABLE IF NOT EXISTS public.learning_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  class_id TEXT,
  lesson_id TEXT,
  description TEXT,
  due_date TEXT,
  priority TEXT,
  status TEXT,
  completed_student_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 6. Bảng Điểm số (grade_entries)
CREATE TABLE IF NOT EXISTS public.grade_entries (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  activity_title TEXT NOT NULL,
  lesson_id TEXT,
  score NUMERIC NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 7. Bảng Nhận xét học sinh (student_comments)
CREATE TABLE IF NOT EXISTS public.student_comments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  skill_category TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 8. Bảng Nhật ký hoạt động (activity_logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- BẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.app_workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- CẤP QUYỀN ĐỌC GHI CHO ANON KEY (FRONTEND)
DROP POLICY IF EXISTS "Public access app_workspace" ON public.app_workspace;
CREATE POLICY "Public access app_workspace" ON public.app_workspace FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access classes" ON public.classes;
CREATE POLICY "Public access classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access students" ON public.students;
CREATE POLICY "Public access students" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access lessons" ON public.lessons;
CREATE POLICY "Public access lessons" ON public.lessons FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access learning_tasks" ON public.learning_tasks;
CREATE POLICY "Public access learning_tasks" ON public.learning_tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access grade_entries" ON public.grade_entries;
CREATE POLICY "Public access grade_entries" ON public.grade_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access student_comments" ON public.student_comments;
CREATE POLICY "Public access student_comments" ON public.student_comments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access activity_logs" ON public.activity_logs;
CREATE POLICY "Public access activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
`;
}

/**
 * Xóa lớp học và tất cả dữ liệu liên quan trực tiếp khỏi Supabase
 */
export async function deleteClassFromSupabase(classId: string, updatedData: AppData): Promise<void> {
  try {
    // 1. Cập nhật app_workspace với dữ liệu mới nhất
    await supabase.from('app_workspace').upsert({
      id: 'main_workspace',
      data: updatedData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    // 2. Xóa khỏi các bảng quan hệ trên Supabase
    await Promise.allSettled([
      supabase.from('classes').delete().eq('id', classId),
      supabase.from('students').delete().eq('class_id', classId),
      supabase.from('lessons').delete().eq('class_id', classId),
      supabase.from('learning_tasks').delete().eq('class_id', classId),
      supabase.from('grade_entries').delete().eq('class_id', classId),
      supabase.from('student_comments').delete().eq('class_id', classId),
    ]);
  } catch (err) {
    console.warn('Lỗi khi xóa lớp trên Supabase:', err);
  }
}

/**
 * Xóa học sinh và điểm số liên quan trực tiếp khỏi Supabase
 */
export async function deleteStudentFromSupabase(studentId: string, updatedData: AppData): Promise<void> {
  try {
    await supabase.from('app_workspace').upsert({
      id: 'main_workspace',
      data: updatedData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    await Promise.allSettled([
      supabase.from('students').delete().eq('id', studentId),
      supabase.from('grade_entries').delete().eq('student_id', studentId),
      supabase.from('student_comments').delete().eq('student_id', studentId),
    ]);
  } catch (err) {
    console.warn('Lỗi khi xóa học sinh trên Supabase:', err);
  }
}


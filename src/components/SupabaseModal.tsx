import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  UploadCloud,
  DownloadCloud,
  Database,
  X,
  Code2,
  Check,
  Zap,
} from 'lucide-react';
import { AppData } from '../types';
import {
  checkSupabaseStatus,
  syncAppDataToSupabase,
  loadAppDataFromSupabase,
  getSupabaseSqlSchema,
  SUPABASE_URL,
  SupabaseStatusResult,
} from '../services/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onUpdateData: (newData: AppData) => void;
  autoSyncEnabled: boolean;
  onToggleAutoSync: () => void;
  onNotify: (type: 'success' | 'warning' | 'error' | 'info', title: string, desc?: string) => void;
  statusResult: SupabaseStatusResult;
  onRefreshStatus: () => Promise<void>;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  data,
  onUpdateData,
  autoSyncEnabled,
  onToggleAutoSync,
  onNotify,
  statusResult,
  onRefreshStatus,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      handleCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheck = async () => {
    setIsChecking(true);
    await onRefreshStatus();
    setIsChecking(false);
  };

  const handleCopySql = () => {
    const sql = getSupabaseSqlSchema();
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    onNotify('success', 'Đã sao chép mã SQL!', 'Thầy hãy vào Supabase -> SQL Editor -> New Query -> Dán và bấm Run.');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    const result = await syncAppDataToSupabase(data);
    setIsSyncing(false);
    if (result.success) {
      onNotify('success', 'Đồng bộ thành công!', result.detail || result.message);
      await onRefreshStatus();
    } else {
      onNotify('error', 'Chưa đồng bộ được', result.detail || result.message);
    }
  };

  const handlePullFromSupabase = async () => {
    if (!window.confirm('Tải dữ liệu từ Supabase sẽ cập nhật và thay thế dữ liệu hiện tại trên trình duyệt này. Thầy có muốn tiếp tục?')) {
      return;
    }
    setIsPulling(true);
    const result = await loadAppDataFromSupabase();
    setIsPulling(false);
    if (result.success && result.data) {
      onUpdateData(result.data);
      onNotify('success', 'Tải dữ liệu thành công!', `Đã nạp ${result.data.students.length} học sinh và ${result.data.lessons.length} bài học từ đám mây.`);
      onClose();
    } else {
      onNotify('warning', 'Không thể tải dữ liệu', result.message);
    }
  };

  const projectReference = SUPABASE_URL.replace('https://', '').split('.')[0];
  const directSqlEditorUrl = `https://supabase.com/dashboard/project/${projectReference}/sql/new`;

  return (
    <div
      id="supabase-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="supabase-modal-card"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base">Đồng bộ Đám mây Supabase</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-400/30 text-emerald-100 rounded-full border border-emerald-300/40">
                  Chính thức
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Lưu trữ vĩnh viễn, truy cập mọi nơi trên máy tính trường & nhà
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Connection Status Box */}
          <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Trạng thái kết nối máy chủ
                </span>
                <div className="flex items-center gap-2 mt-1">
                  {statusResult.status === 'ready' && (
                    <>
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm font-bold text-emerald-700">Đã kết nối & Bảng dữ liệu sẵn sàng</span>
                    </>
                  )}
                  {statusResult.status === 'need_schema' && (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-sm font-bold text-amber-700">Đã kết nối thành công, cần tạo bảng</span>
                    </>
                  )}
                  {statusResult.status === 'checking' && (
                    <>
                      <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                      <span className="text-sm font-semibold text-blue-700">Đang kiểm tra kết nối...</span>
                    </>
                  )}
                  {statusResult.status === 'error' && (
                    <>
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span className="text-sm font-bold text-rose-700">Không thể kết nối</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 font-mono break-all">
                  Dự án: <span className="text-slate-700 font-semibold">{SUPABASE_URL}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleCheck}
                disabled={isChecking}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-2xs transition-colors self-start sm:self-center"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                Kiểm tra lại
              </button>
            </div>

            {statusResult.tableDetails && (
              <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                {statusResult.tableDetails}
              </div>
            )}
          </div>

          {/* Need Schema / Create Tables Action Card */}
          {statusResult.status === 'need_schema' && (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5">
                <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    Cần tạo cấu trúc bảng trên Supabase (Chỉ làm 1 lần duy nhất)
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Dự án Supabase của thầy đã hoạt động nhưng chưa có các bảng để chứa học sinh, bài học và điểm số. Thầy làm theo 3 bước nhanh bên dưới:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-amber-200/70">
                  <span className="font-bold text-amber-700">1. Nhấn nút dưới:</span>
                  <p className="text-slate-600 mt-0.5">Sao chép toàn bộ mã SQL tạo bảng tự động.</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-amber-200/70">
                  <span className="font-bold text-amber-700">2. Mở SQL Editor:</span>
                  <p className="text-slate-600 mt-0.5">Vào mục SQL Editor trên Supabase rồi dán mã (Ctrl+V).</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-amber-200/70">
                  <span className="font-bold text-amber-700">3. Nhấn RUN:</span>
                  <p className="text-slate-600 mt-0.5">Bấm nút Run xanh để tạo tất cả bảng chỉ trong 2 giây!</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  {copiedSql ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copiedSql ? 'Đã sao chép mã SQL!' : 'Sao chép mã SQL tạo bảng'}
                </button>

                <a
                  href={directSqlEditorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Mở SQL Editor Supabase
                </a>

                <button
                  type="button"
                  onClick={() => setShowSqlPreview(!showSqlPreview)}
                  className="px-3 py-2 text-xs font-medium text-amber-800 hover:text-amber-900 underline transition-colors"
                >
                  {showSqlPreview ? 'Ẩn xem trước mã' : 'Xem trước mã SQL'}
                </button>
              </div>

              {showSqlPreview && (
                <div className="mt-2 p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg max-h-48 overflow-y-auto leading-relaxed">
                  <pre>{getSupabaseSqlSchema()}</pre>
                </div>
              )}
            </div>
          )}

          {/* Sync Actions Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Thao tác đồng bộ dữ liệu
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Push to Supabase */}
              <button
                type="button"
                onClick={handleSyncToSupabase}
                disabled={isSyncing}
                className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all group relative overflow-hidden bg-white"
              >
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                  <UploadCloud className={`w-5 h-5 ${isSyncing ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-800 group-hover:text-emerald-900">
                    Đồng bộ lên Supabase
                  </h5>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đẩy {data.students.length} học sinh, {data.classes.length} lớp học và điểm số hiện tại lên đám mây.
                  </p>
                  <span className="inline-block mt-2 text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                    {isSyncing ? 'Đang tải lên...' : 'Đẩy dữ liệu ngay →'}
                  </span>
                </div>
              </button>

              {/* Pull from Supabase */}
              <button
                type="button"
                onClick={handlePullFromSupabase}
                disabled={isPulling}
                className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-left transition-all group bg-white"
              >
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                  <DownloadCloud className={`w-5 h-5 ${isPulling ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-800 group-hover:text-blue-900">
                    Tải về từ Supabase
                  </h5>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Khôi phục dữ liệu mới nhất từ Supabase về trình duyệt này (khi đổi máy).
                  </p>
                  <span className="inline-block mt-2 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                    {isPulling ? 'Đang lấy về...' : 'Tải dữ liệu về →'}
                  </span>
                </div>
              </button>
            </div>

            {/* Auto-Sync Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 mt-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${autoSyncEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-800">Tự động đồng bộ lên Supabase</span>
                  <p className="text-xs text-slate-500">
                    Tự động lưu lên đám mây khi thầy thêm hoặc sửa đổi học sinh, điểm số, bài học
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleAutoSync}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  autoSyncEnabled
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {autoSyncEnabled ? 'Đang Bật' : 'Đang Tắt'}
              </button>
            </div>

            {/* Schema SQL button always accessible */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-slate-400" />
                Mã nguồn cấu trúc bảng CSDL Supabase
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedSql ? 'Đã sao chép' : 'Sao chép mã SQL'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Tích hợp Supabase Realtime & PostgreSQL</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

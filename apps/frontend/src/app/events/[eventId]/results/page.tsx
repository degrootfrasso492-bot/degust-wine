'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  FileSpreadsheet,
  Home,
  Library,
  Loader2,
  Users,
  Wine,
  Trophy,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import {
  EventCard,
  ExportJobStatus,
} from '@/types/api';
import WineResultCard from '@/components/results/WineResultCard';

export default function ResultsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [pdfJobId, setPdfJobId] = useState<string | null>(null);
  const [excelJobId, setExcelJobId] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<'pdf' | 'excel' | null>(null);

  const { data: card, isLoading: cardLoading } = useQuery<EventCard>({
    queryKey: ['event-card', eventId],
    queryFn: () => api.get(`/events/${eventId}`),
  });

  const event = card?.event;
  const analytics = card?.results ?? null;

  // Poll PDF job status
  const { data: pdfJob } = useQuery<ExportJobStatus>({
    queryKey: ['export-job', pdfJobId],
    queryFn: () => api.get(`/export/jobs/${pdfJobId}/status`),
    enabled: !!pdfJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'waiting' || status === 'active' ? 2000 : false;
    },
  });

  // Poll Excel job status
  const { data: excelJob } = useQuery<ExportJobStatus>({
    queryKey: ['export-job', excelJobId],
    queryFn: () => api.get(`/export/jobs/${excelJobId}/status`),
    enabled: !!excelJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'waiting' || status === 'active' ? 2000 : false;
    },
  });

  const startExport = async (format: 'pdf' | 'excel') => {
    setExportLoading(format);
    try {
      const { jobId } = await api.post<{ jobId: string }>(
        `/export/events/${eventId}/${format}`,
      );
      if (format === 'pdf') setPdfJobId(jobId);
      else setExcelJobId(jobId);
    } catch {
      // error ignored — user can retry
    } finally {
      setExportLoading(null);
    }
  };

  const downloadFile = (jobId: string) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/export/jobs/${jobId}/download`;
    fetch(url, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`Export download failed: ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `drinx-edu-${eventId}.${pdfJobId === jobId ? 'pdf' : 'xlsx'}`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        // Сессия могла истечь — отправляем на страницу входа.
        window.location.href = '/login';
      });
  };

  if (cardLoading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-wine-500" />
      </div>
    );
  }

  // Итоги появляются только после завершения дегустации.
  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wine-50 to-orange-50">
        <div className="max-w-2xl mx-auto p-4 pb-16">
          <div className="flex items-center gap-3 py-5">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-wine-500 px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
            >
              <Home size={18} />
              Главная
            </Link>
            <Link
              href="/catalog"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-wine-500 px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
            >
              <Library size={18} />
              Каталог
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">
                {event.title}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(event.date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-sm text-gray-500">
              Итоги появятся, когда дегустация завершится.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-50 to-orange-50">
      <div className="max-w-2xl mx-auto p-4 pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 py-5">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-wine-500 px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
          >
            <Home size={18} />
            Главная
          </Link>
          <Link
            href="/catalog"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-wine-500 px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
          >
            <Library size={18} />
            Каталог
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {event?.title ?? 'Итоги дегустации'}
            </h1>
            {event?.date && (
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(event.date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <Users size={20} className="text-wine-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">
              {analytics.totalParticipants}
            </p>
            <p className="text-xs text-gray-400">участников</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <Wine size={20} className="text-wine-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">
              {analytics.wines.length}
            </p>
            <p className="text-xs text-gray-400">образцов</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <Trophy size={20} className="text-wine-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">
              {analytics.wines[0]?.likeCount ?? 0}
            </p>
            <p className="text-xs text-gray-400">лайков топ</p>
          </div>
        </div>

        {/* Export buttons — admin only */}
        {isAdmin && (
          <div className="flex gap-3 mb-6">
            <ExportButton
              label="PDF-буклет"
              icon={<Download size={15} />}
              format="pdf"
              job={pdfJob}
              onStart={() => startExport('pdf')}
              onDownload={() => pdfJobId && downloadFile(pdfJobId)}
              loading={exportLoading === 'pdf'}
            />
            <ExportButton
              label="Excel матрица"
              icon={<FileSpreadsheet size={15} />}
              format="excel"
              job={excelJob}
              onStart={() => startExport('excel')}
              onDownload={() => excelJobId && downloadFile(excelJobId)}
              loading={exportLoading === 'excel'}
            />
          </div>
        )}

        {/* Wine ranking */}
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Рейтинг вин по лайкам
        </h2>
        <div className="space-y-4 mb-8">
          {analytics.wines.map((wine, idx) => (
            <WineResultCard key={wine.wineId} wine={wine} rank={idx + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Export button sub-component ──────────────────────────────────────────────

interface ExportButtonProps {
  label: string;
  icon: React.ReactNode;
  format: 'pdf' | 'excel';
  job?: ExportJobStatus;
  onStart: () => void;
  onDownload: () => void;
  loading: boolean;
}

function ExportButton({
  label,
  icon,
  job,
  onStart,
  onDownload,
  loading,
}: ExportButtonProps) {
  const isReady = job?.status === 'completed';
  const isProcessing =
    loading || job?.status === 'waiting' || job?.status === 'active';

  if (isReady) {
    return (
      <button
        onClick={onDownload}
        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 text-white py-2.5 text-sm font-medium hover:bg-green-600 transition-colors"
      >
        <Download size={15} />
        Скачать
      </button>
    );
  }

  return (
    <button
      onClick={onStart}
      disabled={isProcessing}
      className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-wine-300 text-wine-700 py-2.5 text-sm font-medium hover:bg-wine-50 transition-colors disabled:opacity-60"
    >
      {isProcessing ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        icon
      )}
      {isProcessing ? 'Генерация...' : label}
    </button>
  );
}

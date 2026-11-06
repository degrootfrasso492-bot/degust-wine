'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wine, Loader2, ArrowRight, Home, Library } from 'lucide-react';
import { api, setToken } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { User } from '@/types/api';

type Mode = 'login' | 'register';

interface AuthResponse {
  accessToken: string;
  user: User;
}

const MIN_PASSWORD_LENGTH = 8;

function errorMessageFromError(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  const match = message.match(/API (\d{3}):/);
  const code = match ? Number(match[1]) : null;

  if (code === 401) return 'Неверный логин или пароль';
  if (code === 409) return 'Пользователь с такими данными уже существует';
  if (code === 400) return 'Проверьте email/телефон и пароль (минимум 8 символов)';
  return 'Не удалось выполнить запрос. Попробуйте позже';
}

export default function LoginPage() {
  const router = useRouter();
  const { setUser, isAuthenticated } = useAuthStore();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'oauth') {
      setError('Не удалось войти через VK/Яндекс');
    }
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов`);
        return;
      }
      if (password !== confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }
    }

    setLoading(true);
    try {
      const trimmedIdentifier = identifier.trim();
      const response =
        mode === 'login'
          ? await api.post<AuthResponse>('/auth/login', {
              identifier: trimmedIdentifier,
              password,
            })
          : await api.post<AuthResponse>('/auth/register', {
              identifier: trimmedIdentifier,
              password,
              ...(name.trim() ? { name: name.trim() } : {}),
            });
      setToken(response.accessToken);
      setUser(response.user, response.accessToken);
      router.replace('/');
    } catch (err) {
      setError(errorMessageFromError(err));
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled =
    loading ||
    !identifier.trim() ||
    !password ||
    (mode === 'register' && !confirmPassword);

  const inputClass =
    'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-wine-300';

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-50 to-orange-50 flex items-center justify-center p-4">
      <div className="absolute top-4 left-4 flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-wine-500 transition-colors"
        >
          <Home size={18} />
          Главная
        </Link>
        <Link
          href="/catalog"
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-wine-500 transition-colors"
        >
          <Library size={18} />
          Каталог
        </Link>
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-wine-500 mb-4">
            <Wine className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Drinx-edu</h1>
          <p className="text-sm text-gray-500 mt-1">
            Дегустационные заметки WSET
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 mb-5">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-white text-wine-500 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Войти
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'register'
                  ? 'bg-white text-wine-500 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Зарегистрироваться
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <input
                type="text"
                placeholder="Имя (необязательно)"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                autoComplete="name"
                className={inputClass}
              />
            )}

            <input
              type="text"
              placeholder="+7 (999) 000-00-00 или email@example.com"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError('');
              }}
              autoComplete="username"
              className={inputClass}
              autoFocus
            />

            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={inputClass}
            />

            {mode === 'register' && (
              <input
                type="password"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                autoComplete="new-password"
                className={inputClass}
              />
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full flex items-center justify-center gap-2 bg-wine-500 text-white rounded-xl py-3 font-medium hover:bg-wine-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : mode === 'login' ? (
                <>
                  Войти <ArrowRight size={16} />
                </>
              ) : (
                <>
                  Зарегистрироваться <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* OAuth VK/Яндекс скрыт — код оставлен для будущей реализации.
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">
                или войти через
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/vk`}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#0077FF]">
                <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.715-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.574c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.864 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.169.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.762-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.49-.085.745-.576.745z" />
              </svg>
              VK ID
            </a>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/yandex`}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#FC3F1D" d="M2.04 12C2.04 6.477 6.478 2.04 12 2.04S21.96 6.477 21.96 12 17.522 21.96 12 21.96 2.04 17.522 2.04 12z" />
                <path fill="#fff" d="M13.32 7.666h-.924c-1.694 0-2.585.858-2.585 2.123 0 1.43.616 2.1 1.881 2.959l1.045.704-3.003 4.548H7.49l2.718-4.104c-1.562-1.13-2.453-2.232-2.453-4.02 0-2.32 1.606-3.871 4.51-3.871h3.124v11.99H13.32V7.666z" />
              </svg>
              Яндекс
            </a>
          </div>
          */}
        </div>
      </div>
    </div>
  );
}

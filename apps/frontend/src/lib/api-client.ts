export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers,
    // JWT хранится в httpOnly-cookie; браузер должен прикладывать её к
    // кросс-origin запросам на backend.
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.text();
    const error = new Error(`API ${res.status}: ${body}`);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/**
 * Загрузка изображения (multipart/form-data) на эндпоинт /uploads/image.
 * Используется в админке для фото алкоголя и обложек дегустаций.
 */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_URL}/api/uploads/image`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

/**
 * Загрузка аватара профиля (multipart/form-data) на эндпоинт /uploads/avatar.
 * Доступна любому авторизованному пользователю.
 */
export async function uploadAvatar(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_URL}/api/uploads/avatar`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  const headers: Record<string, string> = isFormData
    ? {}
    : { 'Content-Type': 'application/json' };

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || `Erreur HTTP ${res.status}`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = (data as { code?: string }).code;
    throw err;
  }
  return data as T;
}

// Thin fetch wrapper around the backend's response envelope:
//   success → { success: true, data, meta?, message? }
//   failure → { success: false, error: { message, code, details?, requestId } }

const BASE_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(message, { status, code, details, requestId } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

function buildUrl(path, query) {
  const url = new URL(`${BASE_URL}/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }
  return url;
}

export async function api(path, { method = 'GET', query, body, signal } = {}) {
  const isForm = body instanceof FormData;
  let response;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Can’t reach the Squirl server. Is the backend running on port 4000?', {
      code: 'NETWORK_ERROR',
    });
  }

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    const error = json?.error || {};
    throw new ApiError(error.message || `Request failed with status ${response.status}`, {
      status: response.status,
      code: error.code,
      details: error.details,
      requestId: error.requestId,
    });
  }

  return json;
}

// Turns validation details into one readable line, e.g. "amount: Too small".
export function describeError(error) {
  if (error?.code === 'VALIDATION_ERROR' && error.details?.length) {
    return error.details.map((d) => `${d.path.replace(/^body\./, '')}: ${d.message}`).join(', ');
  }
  return error?.message || 'Something went wrong';
}

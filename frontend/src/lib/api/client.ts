import type {
  ApiClientErrorPayload,
  ApiRequestOptions,
  PrimitiveQueryValue,
  QueryParams,
  QueryValue,
} from "@/lib/api/types";

const isPresent = (value: PrimitiveQueryValue): value is string | number | boolean =>
  value !== undefined && value !== null;

const appendQueryValue = (searchParams: URLSearchParams, key: string, value: QueryValue) => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (isPresent(entry)) {
        searchParams.append(key, String(entry));
      }
    }

    return;
  }

  if (isPresent(value)) {
    searchParams.append(key, String(value));
  }
};

const buildPathWithQuery = (path: string, query?: QueryParams) => {
  if (!query || Object.keys(query).length === 0) {
    return path;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    appendQueryValue(searchParams, key, value);
  }

  const queryString = searchParams.toString();

  if (!queryString) {
    return path;
  }

  return `${path}${path.includes("?") ? "&" : "?"}${queryString}`;
};

const safeParseJson = async (response: Response): Promise<unknown | null> => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const resolveErrorMessage = (status: number, payload: unknown) => {
  if (payload && typeof payload === "object") {
    const candidateError = (payload as { error?: unknown }).error;
    const candidateMessage = (payload as { message?: unknown }).message;

    if (typeof candidateError === "string" && candidateError.trim().length > 0) {
      return candidateError;
    }

    if (typeof candidateMessage === "string" && candidateMessage.trim().length > 0) {
      return candidateMessage;
    }
  }

  return `Request failed with status ${status}`;
};

const toBodyInit = (body: unknown): BodyInit | undefined => {
  if (body === undefined) {
    return undefined;
  }

  if (
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    typeof body === "string"
  ) {
    return body;
  }

  return JSON.stringify(body);
};

export class ApiClientError extends Error {
  status: number;
  url: string;
  payload: ApiClientErrorPayload;

  constructor(message: string, status: number, url: string, payload: ApiClientErrorPayload) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.url = url;
    this.payload = payload;
  }
}

const request = async <TResponse, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {}
) => {
  const {
    method = "GET",
    query,
    body,
    headers,
    signal,
    cache,
  } = options;
  const url = buildPathWithQuery(path, query);
  const resolvedBody = toBodyInit(body);
  const resolvedHeaders = new Headers(headers);

  if (
    body !== undefined &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    typeof body !== "string" &&
    !resolvedHeaders.has("Content-Type")
  ) {
    resolvedHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    method,
    headers: resolvedHeaders,
    body: resolvedBody,
    signal,
    cache,
  });
  const payload = await safeParseJson(response);

  if (!response.ok) {
    throw new ApiClientError(
      resolveErrorMessage(response.status, payload),
      response.status,
      url,
      (payload as ApiClientErrorPayload) ?? null
    );
  }

  return payload as TResponse;
};

export const api = {
  get: <TResponse>(path: string, options?: Omit<ApiRequestOptions<never>, "method">) =>
    request<TResponse>(path, {
      ...options,
      method: "GET",
    }),
  post: <TResponse, TBody = unknown>(path: string, options?: Omit<ApiRequestOptions<TBody>, "method">) =>
    request<TResponse, TBody>(path, {
      ...options,
      method: "POST",
    }),
  put: <TResponse, TBody = unknown>(path: string, options?: Omit<ApiRequestOptions<TBody>, "method">) =>
    request<TResponse, TBody>(path, {
      ...options,
      method: "PUT",
    }),
  patch: <TResponse, TBody = unknown>(
    path: string,
    options?: Omit<ApiRequestOptions<TBody>, "method">
  ) =>
    request<TResponse, TBody>(path, {
      ...options,
      method: "PATCH",
    }),
  delete: <TResponse>(path: string, options?: Omit<ApiRequestOptions<never>, "method">) =>
    request<TResponse>(path, {
      ...options,
      method: "DELETE",
    }),
};

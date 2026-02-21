export type PrimitiveQueryValue = string | number | boolean | null | undefined;
export type QueryValue = PrimitiveQueryValue | PrimitiveQueryValue[];
export type QueryParams = Record<string, QueryValue>;

export type ApiClientErrorPayload = {
  error?: string;
  message?: string;
  [key: string]: unknown;
} | null;

export type ApiRequestOptions<TBody = unknown> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: QueryParams;
  body?: TBody;
  headers?: HeadersInit;
  signal?: AbortSignal;
  cache?: RequestCache;
};

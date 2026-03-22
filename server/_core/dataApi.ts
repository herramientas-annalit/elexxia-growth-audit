export async function makeDataRequest<T = unknown>(
  _endpoint: string,
  _params?: Record<string, string | string[]>
): Promise<T> {
  throw new Error("Data API not configured in this deployment");
}

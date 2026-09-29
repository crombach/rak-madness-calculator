/**
 * Shares one import between callers, and forgets it once it fails, so the next
 * call asks again. A deploy that replaced the chunk then costs one failed try,
 * not every try until a reload.
 */
export default function cachedImport<T>(
  load: () => Promise<T>,
): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () =>
    (pending ??= load().catch((error: unknown) => {
      pending = undefined;
      throw error;
    }));
}

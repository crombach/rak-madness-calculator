import { ComponentType, ReactNode, Suspense, lazy } from "react";

type Loader<P> = () => Promise<{ default: ComponentType<P> }>;

/**
 * A lazy component that can be fetched ahead of its first render.
 *
 * Once its chunk is in, `Page` renders the component straight away. `lazy`
 * suspends for a tick even on a chunk already in, and React then holds its
 * fallback up for 300ms.
 */
export default function lazyPreloadable<P extends object>(
  loader: Loader<P>,
  fallback: ReactNode,
) {
  let loaded: ComponentType<P> | undefined;
  const preload = () =>
    loader().then((module) => {
      loaded = module.default;
      return module;
    });
  const Lazy = lazy(preload);

  function Page(props: P) {
    const Loaded = loaded;
    if (Loaded != null) return <Loaded {...props} />;
    return (
      <Suspense fallback={fallback}>
        <Lazy {...props} />
      </Suspense>
    );
  }

  return { Page, preload };
}

import { Component, PropsWithChildren, ReactNode } from "react";

/**
 * Holds a lazy dialog or page that cannot be fetched, so the failure stays inside
 * it. Draws `fallback` in its place, or nothing.
 *
 * `lazy` throws the failed import at the render that needs the module, and with
 * nothing to catch it React unmounts the whole app. A deploy is the ordinary way
 * in. Pages serves only the current build's assets, so a chunk named by a page left
 * open since yesterday is already gone.
 *
 * There is nothing to retry. `lazy` keeps the rejected promise and throws it again
 * on every later render, so the way on is a reload.
 */
export default class LoadBoundary extends Component<
  PropsWithChildren<{ onError?: () => void; fallback?: ReactNode }>,
  { hasFailed: boolean }
> {
  state = { hasFailed: false };

  static getDerivedStateFromError() {
    return { hasFailed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.hasFailed
      ? (this.props.fallback ?? null)
      : this.props.children;
  }
}

import { Component, PropsWithChildren } from "react";

/**
 * Holds a dialog that cannot be fetched, so the failure stays inside it.
 *
 * `lazy` throws the failed import at the render that needs the module, and with
 * nothing to catch it React unmounts the whole app rather than the dialog. A
 * deploy is the ordinary way in: Pages serves only the current build's assets, so
 * a chunk named by a page left open since yesterday is already gone.
 *
 * There is nothing to retry. `lazy` keeps the rejected promise and throws it again
 * on every later render, so `onError` says to reload instead.
 */
export default class DialogLoadBoundary extends Component<
  PropsWithChildren<{ onError: () => void }>,
  { hasFailed: boolean }
> {
  state = { hasFailed: false };

  static getDerivedStateFromError() {
    return { hasFailed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.hasFailed ? null : this.props.children;
  }
}

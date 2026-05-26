/**
 * SceneErrorBoundary — catches render-time errors inside an R3F subtree
 * (e.g. drei `useGLTF` throwing because a model 404'd) and renders a
 * fallback group instead of taking down the whole Canvas.
 *
 * Use sparingly — wrap optional/visual subsystems, not the gameplay root.
 */

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional fallback subtree rendered when children throw. */
  fallback?: ReactNode;
  /** Optional callback fired with the caught error. */
  onError?: (err: Error) => void;
}

interface State {
  hasError: boolean;
}

export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[SceneErrorBoundary] subtree crashed:', error.message);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

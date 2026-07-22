import { useEffect } from 'react';

/** Sets document.title per route so screen-reader users get an orientation cue on navigation (WCAG 2.4.2). */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

import { type RefObject, useEffect, useRef } from 'react';
import type { AssistantResponse } from '@shared/types/index.ts';

/**
 * Moves keyboard focus to the results heading once whenever a new non-loading recommendation plan resolves.
 */
export function useResultsHeadingFocus(
  isLoading: boolean,
  assistantResponse: AssistantResponse | null,
): RefObject<HTMLHeadingElement | null> {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const prevResponseRef = useRef<AssistantResponse | null>(null);

  useEffect(() => {
    if (!isLoading && assistantResponse !== null && assistantResponse !== prevResponseRef.current) {
      headingRef.current?.focus();
    }
    prevResponseRef.current = assistantResponse;
  }, [assistantResponse, isLoading]);

  return headingRef;
}

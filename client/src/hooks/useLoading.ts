import { useState, useCallback } from 'react';

/**
 * Interface cho return của useLoading hook
 */
interface UseLoadingReturn {
  /** Trạng thái loading hiện tại */
  loading: boolean;
  /** Function để set loading state */
  setLoading: (loading: boolean) => void;
  /**
   * Wrapper function để wrap async function với loading
   * T: Array của parameters của async function
   * R: Return type của async function
   */
  withLoading: <T extends any[], R>(
    asyncFn: (...args: T) => Promise<R>
  ) => (...args: T) => Promise<R>;
  /** Function để bắt đầu loading */
  startLoading: () => void;
  /** Function để dừng loading */
  stopLoading: () => void;
}

/**
 * Custom hook để quản lý loading state
 * @param initialState - Trạng thái loading ban đầu (default: false)
 * @returns UseLoadingReturn object với các functions và state
 */
export const useLoading = (initialState = false): UseLoadingReturn => {
  // State để track loading
  const [loading, setLoading] = useState(initialState);

  // Function để bắt đầu loading
  const startLoading = useCallback(() => setLoading(true), []);

  // Function để dừng loading
  const stopLoading = useCallback(() => setLoading(false), []);

  /**
   * Wrapper function để wrap async function với loading
   * T: Array của parameters (ví dụ: [string, number])
   * R: Return type (ví dụ: string, void, etc.)
   *
   * Ví dụ: withLoading<[string, number], string>(async (name, age) => { return "result"; })
   */
  const withLoading = useCallback(
    <T extends any[], R>(asyncFn: (...args: T) => Promise<R>) =>
      async (...args: T): Promise<R> => {
        try {
          setLoading(true);
          const result = await asyncFn(...args);
          return result;
        } finally {
          setLoading(false);
        }
      },
    []
  );

  return {
    loading,
    setLoading,
    withLoading,
    startLoading,
    stopLoading,
  };
};

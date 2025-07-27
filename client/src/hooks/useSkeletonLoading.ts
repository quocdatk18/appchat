import { useState, useEffect } from 'react';

interface UseSkeletonLoadingProps {
  loading: boolean;
  error: string | null;
  retryFn?: () => void;
}

export const useSkeletonLoading = ({ loading, error, retryFn }: UseSkeletonLoadingProps) => {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (loading) {
      setShowSkeleton(true);
    } else {
      // Delay hiding skeleton để tránh flicker
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleRetry = () => {
    if (retryFn) {
      retryFn();
    }
  };

  return {
    showSkeleton,
    handleRetry,
    hasError: !!error,
    errorMessage: error,
  };
};

/**
 * Unified interface for all features.
 * All features must implement this interface to ensure proper lifecycle management.
 */
export interface Feature {
  /** Feature name for logging and identification */
  name: string;

  /** Cleanup function called during graceful shutdown */
  cleanup: () => void;
}

/**
 * Type guard to check if an object implements the Feature interface
 */
export function isFeature(obj: any): obj is Feature {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.cleanup === 'function'
  );
}

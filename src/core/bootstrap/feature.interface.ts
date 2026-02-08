export interface Feature {
  name: string;
  cleanup: () => void;
}

export function isFeature(obj: any): obj is Feature {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.cleanup === 'function'
  );
}

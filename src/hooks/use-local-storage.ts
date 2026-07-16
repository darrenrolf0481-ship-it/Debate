import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      const parsed = JSON.parse(item);
      // Merge plain objects so values saved by an older app version
      // still pick up fields added later, instead of leaving them undefined.
      if (
        parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
        initialValue && typeof initialValue === "object" && !Array.isArray(initialValue)
      ) {
        return { ...initialValue, ...parsed };
      }
      return parsed;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}

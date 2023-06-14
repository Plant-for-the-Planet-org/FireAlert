import * as React from "react";

/**
 *
 * @param key The key to set in localStorage for this value
 * @param defaultValue The value to use if it is not already in localStorage
 * @param options The serialize and deserialize functions to use (defaults to JSON.stringify and JSON.parse respectively)
 */

const useLocalStorageState = <T>(
  key: string,
  defaultValue: T | string = "",
  {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  }: {
    serialize?: (value: T) => string;
    deserialize?: (serialized: string) => T;
  } = {}
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] => {
  const [state, setState] = React.useState<T>(() => {
    const valueInLocalStorage =
      typeof window !== "undefined" && window.localStorage.getItem(key);
    if (valueInLocalStorage) {
      return deserialize(valueInLocalStorage);
    }
    return typeof defaultValue === "function"
      ? (defaultValue as () => T)()
      : (defaultValue as T);
  });

  const prevKeyRef = React.useRef<string>(key);

  React.useEffect(() => {
    const prevKey = prevKeyRef.current;
    if (prevKey !== key) {
      window.localStorage.removeItem(prevKey);
    }
    prevKeyRef.current = key;
    window.localStorage.setItem(key, serialize(state));
  }, [key, state, serialize]);

  const removeFromLocalStorage = React.useCallback(() => {
    window.localStorage.removeItem(key);
  }, [key]);

  return [state, setState, removeFromLocalStorage];
};

export default useLocalStorageState;

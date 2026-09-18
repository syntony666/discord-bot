export function createSignal<T>(initial: T): [() => T, (value: T) => void] {
  let current = initial;

  function get() {
    return current;
  }

  function set(value: T) {
    current = value;
  }

  return [get, set];
}

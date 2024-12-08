export class FallbackStorage implements Storage {
  private valuesMap = new Map();

  getItem(key) {
    const stringKey = String(key);
    if (this.valuesMap.has(key)) {
      return String(this.valuesMap.get(stringKey));
    }
    return null;
  }

  setItem(key, val) {
    this.valuesMap.set(String(key), String(val));
  }

  removeItem(key) {
    this.valuesMap.delete(key);
  }

  clear() {
    this.valuesMap.clear();
  }

  key(i) {
    if (arguments.length === 0) {
      // this is a TypeError implemented on Chrome, Firefox throws Not enough arguments to Storage.key.
      throw new TypeError(
        "Failed to execute 'key' on 'Storage': 1 argument required, but only 0 present."
      );
    }
    const arr = Array.from(this.valuesMap.keys());
    return arr[i];
  }

  get length() {
    return this.valuesMap.size;
  }
}

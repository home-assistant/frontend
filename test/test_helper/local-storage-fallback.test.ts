import { describe, test, expect, beforeEach } from "vitest";
import { FallbackStorage } from "./local-storage-fallback";

describe("FallbackStorage", () => {
  let storage;

  beforeEach(() => {
    storage = new FallbackStorage();
  });

  test("should set and get an item", () => {
    storage.setItem("key1", "value1");
    expect(storage.getItem("key1")).toBe("value1");
  });

  test("should return null for non-existing item", () => {
    expect(storage.getItem("nonExistingKey")).toBeNull();
  });

  test("should remove an item", () => {
    storage.setItem("key2", "value2");
    storage.removeItem("key2");
    expect(storage.getItem("key2")).toBeNull();
  });

  test("should clear all items", () => {
    storage.setItem("key3", "value3");
    storage.setItem("key4", "value4");
    storage.clear();
    expect(storage.getItem("key3")).toBeNull();
    expect(storage.getItem("key4")).toBeNull();
  });

  test("should return the correct key for an index", () => {
    storage.setItem("key5", "value5");
    storage.setItem("key6", "value6");
    expect(storage.key(0)).toBe("key5");
    expect(storage.key(1)).toBe("key6");
  });

  test("should throw TypeError if key method is called without arguments", () => {
    expect(() => storage.key()).toThrow(TypeError);
  });

  test("should return the correct length", () => {
    storage.setItem("key7", "value7");
    storage.setItem("key8", "value8");
    expect(storage.length).toBe(2);
    storage.removeItem("key7");
    expect(storage.length).toBe(1);
  });
});

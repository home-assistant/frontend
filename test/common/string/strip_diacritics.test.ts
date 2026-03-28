import { describe, it, expect } from "vitest";
import { stripDiacritics } from "../../../src/common/string/strip-diacritics";

describe("stripDiacritics", () => {
  it("should strip standard combining diacritics", () => {
    expect(stripDiacritics("ó")).toBe("o");
    expect(stripDiacritics("é")).toBe("e");
    expect(stripDiacritics("ñ")).toBe("n");
    expect(stripDiacritics("ü")).toBe("u");
    expect(stripDiacritics("ç")).toBe("c");
  });

  it("should strip Polish non-decomposable characters", () => {
    expect(stripDiacritics("ł")).toBe("l");
    expect(stripDiacritics("Ł")).toBe("L");
  });

  it("should normalize Polish words so 'lazienka' matches 'łazienka'", () => {
    expect(stripDiacritics("łazienka")).toBe("lazienka");
    expect(stripDiacritics("Łazienka")).toBe("Lazienka");
  });

  it("should strip all Polish diacritics", () => {
    expect(stripDiacritics("ąćęłńóśźż")).toBe("acelnoszz");
    expect(stripDiacritics("ĄĆĘŁŃÓŚŹŻ")).toBe("ACELNOSZZ");
  });

  it("should strip other non-decomposable European characters", () => {
    expect(stripDiacritics("đ")).toBe("d");
    expect(stripDiacritics("Đ")).toBe("D");
    expect(stripDiacritics("ø")).toBe("o");
    expect(stripDiacritics("Ø")).toBe("O");
    expect(stripDiacritics("ħ")).toBe("h");
    expect(stripDiacritics("Ħ")).toBe("H");
    expect(stripDiacritics("ŧ")).toBe("t");
    expect(stripDiacritics("Ŧ")).toBe("T");
    expect(stripDiacritics("ı")).toBe("i");
    expect(stripDiacritics("ß")).toBe("ss");
  });

  it("should handle mixed text with diacritics and ASCII", () => {
    expect(stripDiacritics("Pokój dziecka")).toBe("Pokoj dziecka");
    expect(stripDiacritics("Łazienka światło")).toBe("Lazienka swiatlo");
  });

  it("should return ASCII strings unchanged", () => {
    expect(stripDiacritics("hello world")).toBe("hello world");
    expect(stripDiacritics("")).toBe("");
  });
});

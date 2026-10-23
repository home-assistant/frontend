import { describe, expect, it, vi } from "vitest";

import type { LovelaceCardConfig } from "../../../../src/data/lovelace/config/card";
import type { LovelaceConfig } from "../../../../src/data/lovelace/config/types";
import {
  performCopy,
  performCut,
} from "../../../../src/panels/lovelace/editor/clipboard-actions";
import type { Lovelace } from "../../../../src/panels/lovelace/types";

const CARD_A: LovelaceCardConfig = { type: "card-a" };
const CARD_B: LovelaceCardConfig = { type: "card-b" };

const localize = (key: string) => key;

const createLovelace = (saveConfig: Lovelace["saveConfig"]) => {
  const config: LovelaceConfig = { views: [{ cards: [CARD_A, CARD_B] }] };
  return {
    config,
    rawConfig: config,
    saveConfig,
    showToast: vi.fn(),
  } as Partial<Lovelace> as Lovelace;
};

const cardParams = (
  config: LovelaceCardConfig,
  index: number,
  setClipboard: (config: LovelaceCardConfig) => void
) => ({
  type: "card" as const,
  path: [0, index] as [number, number],
  config,
  setClipboard,
});

describe("performCut", () => {
  it("only fills the clipboard when the delete succeeds", async () => {
    const setClipboard = vi.fn();

    await performCut(
      localize,
      createLovelace(() => Promise.resolve()),
      cardParams(CARD_A, 0, setClipboard)
    );
    expect(setClipboard).toHaveBeenCalledWith(CARD_A);

    setClipboard.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await performCut(
      localize,
      createLovelace(() => Promise.reject(new Error("save failed"))),
      cardParams(CARD_A, 0, setClipboard)
    );
    expect(setClipboard).not.toHaveBeenCalled();
  });

  it("does not overwrite a newer copy when a slow cut finishes", async () => {
    let finishSave!: () => void;
    const lovelace = createLovelace(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        })
    );
    let clipboard: LovelaceCardConfig | undefined;
    const setClipboard = (config: LovelaceCardConfig) => {
      clipboard = config;
    };

    const cut = performCut(
      localize,
      lovelace,
      cardParams(CARD_A, 0, setClipboard)
    );
    performCopy(localize, lovelace, cardParams(CARD_B, 1, setClipboard));
    finishSave();
    await cut;

    expect(clipboard).toEqual(CARD_B);
  });

  it("does not let a newer failed cut block an older successful one", async () => {
    let finishSaveA!: () => void;
    let failSaveB!: () => void;
    const lovelaceA = createLovelace(
      () =>
        new Promise<void>((resolve) => {
          finishSaveA = resolve;
        })
    );
    const lovelaceB = createLovelace(
      () =>
        new Promise<void>((_resolve, reject) => {
          failSaveB = () => reject(new Error("save failed"));
        })
    );
    let clipboard: LovelaceCardConfig | undefined;
    const setClipboard = (config: LovelaceCardConfig) => {
      clipboard = config;
    };
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const cutA = performCut(
      localize,
      lovelaceA,
      cardParams(CARD_A, 0, setClipboard)
    );
    const cutB = performCut(
      localize,
      lovelaceB,
      cardParams(CARD_B, 1, setClipboard)
    );
    failSaveB();
    await cutB;
    finishSaveA();
    await cutA;

    expect(clipboard).toEqual(CARD_A);
  });
});

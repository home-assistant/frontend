import { describe, expect, it, vi } from "vitest";

import type { LovelaceCardConfig } from "../../../../src/data/lovelace/config/card";
import type { LovelaceConfig } from "../../../../src/data/lovelace/config/types";
import {
  performCopy,
  performCut,
  performPasteCard,
} from "../../../../src/panels/lovelace/editor/clipboard-actions";
import type { LovelacePath } from "../../../../src/panels/lovelace/editor/lovelace-path";
import { getAtPath } from "../../../../src/panels/lovelace/editor/lovelace-path";
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

describe("performPasteCard", () => {
  const CLIPBOARD: LovelaceCardConfig = {
    type: "clipboard",
    entities: ["light.a"],
    view_layout: { position: "sidebar" },
  };

  const pasteInto = async (
    config: LovelaceConfig,
    params: Omit<Parameters<typeof performPasteCard>[2], "config">
  ) => {
    const saveConfig = vi.fn<Lovelace["saveConfig"]>(() => Promise.resolve());
    const lovelace = {
      config,
      rawConfig: config,
      saveConfig,
      showToast: vi.fn(),
    } as Partial<Lovelace> as Lovelace;
    await performPasteCard(localize, lovelace, {
      config: CLIPBOARD,
      ...params,
    });
    const saved = saveConfig.mock.calls[0][0] as LovelaceConfig;
    lovelace.config = saved;
    return {
      cardsAt: (cardsPath: LovelacePath) =>
        getAtPath<LovelaceCardConfig[]>(saved, cardsPath)!,
      saveConfig,
      showToast: lovelace.showToast,
    };
  };

  it("inserts a copy of the clipboard card after the target card", async () => {
    const { cardsAt } = await pasteInto(
      { views: [{ cards: [CARD_A, CARD_B] }] },
      { path: ["views", 0, "cards", 0] }
    );
    expect(cardsAt(["views", 0, "cards"])).toEqual([CARD_A, CLIPBOARD, CARD_B]);

    const { cardsAt: nestedCardsAt } = await pasteInto(
      { views: [{ sections: [{ cards: [CARD_A, CARD_B] }] }] },
      { path: ["views", 0, "sections", 0, "cards", 1] }
    );
    expect(nestedCardsAt(["views", 0, "sections", 0, "cards"])).toEqual([
      CARD_A,
      CARD_B,
      CLIPBOARD,
    ]);
  });

  it("pastes an independent copy", async () => {
    const { cardsAt } = await pasteInto(
      { views: [{ cards: [CARD_A] }] },
      { path: ["views", 0, "cards", 0] }
    );
    const pasted = cardsAt(["views", 0, "cards"])[1];
    expect(pasted).not.toBe(CLIPBOARD);
    expect(pasted.entities).not.toBe(CLIPBOARD.entities);
  });

  it("replaces the target card in panel views and can put it back", async () => {
    const { cardsAt, saveConfig, showToast } = await pasteInto(
      { views: [{ panel: true, cards: [CARD_A] }] },
      { path: ["views", 0, "cards", 0], replace: true }
    );
    expect(cardsAt(["views", 0, "cards"])).toEqual([CLIPBOARD]);
    expect(showToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: "ui.panel.lovelace.editor.edit_card.replaced",
        action: expect.objectContaining({ text: "ui.common.undo" }),
      })
    );

    vi.mocked(showToast).mock.lastCall![0].action!.action();
    const restored = saveConfig.mock.calls[1][0] as LovelaceConfig;
    expect(getAtPath(restored, ["views", 0, "cards"])).toEqual([CARD_A]);
  });

  it("takes the target card's view layout in sidebar views", async () => {
    const targetLayout = { position: "main", extra: { nested: true } };
    const { cardsAt } = await pasteInto(
      {
        views: [
          {
            type: "sidebar",
            cards: [{ ...CARD_A, view_layout: targetLayout }],
          },
        ],
      },
      { path: ["views", 0, "cards", 0], inheritViewLayout: true }
    );
    const pasted = cardsAt(["views", 0, "cards"])[1];
    expect(pasted.view_layout).toEqual(targetLayout);
    expect(pasted.view_layout.extra).not.toBe(targetLayout.extra);

    const { cardsAt: plainCardsAt } = await pasteInto(
      { views: [{ type: "sidebar", cards: [CARD_A] }] },
      { path: ["views", 0, "cards", 0], inheritViewLayout: true }
    );
    expect(plainCardsAt(["views", 0, "cards"])[1]).not.toHaveProperty(
      "view_layout"
    );
  });

  it("shows an error toast when saving fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const config: LovelaceConfig = { views: [{ cards: [CARD_A] }] };
    const lovelace = {
      config,
      rawConfig: config,
      saveConfig: () => Promise.reject(new Error("save failed")),
      showToast: vi.fn(),
    } as Partial<Lovelace> as Lovelace;

    await performPasteCard(localize, lovelace, {
      path: ["views", 0, "cards", 0],
      config: CLIPBOARD,
    });

    expect(lovelace.showToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: "ui.panel.lovelace.editor.edit_card.paste_error",
      })
    );
  });
});

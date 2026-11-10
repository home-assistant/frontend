import { describe, expect, it, vi } from "vitest";
import {
  PICTURE_ELEMENTS_EDITOR_BRIDGE,
  PictureElementsEditorBridge,
} from "../../../../../src/panels/lovelace/cards/picture-elements/editor-bridge";

const CONFIG = { type: "picture-elements", elements: [] };

const makeBridge = () =>
  new PictureElementsEditorBridge({
    selectElement: vi.fn(),
    moveElement: vi.fn(),
    clickImage: vi.fn(),
  });

describe("PictureElementsEditorBridge", () => {
  it("hands every config over while the bridge comes back", () => {
    const bridge = makeBridge();
    const bridged = { ...CONFIG, [PICTURE_ELEMENTS_EDITOR_BRIDGE]: bridge };
    for (let i = 0; i < 10; i++) {
      // Like the YAML editor sending the same content again.
      expect(bridge.needsHandOver({ ...CONFIG })).toBe(true);
      expect(bridge.needsHandOver(bridged)).toBe(false);
    }
  });

  it("gives up on a parent that drops the bridge", () => {
    const bridge = makeBridge();
    let handOvers = 0;
    while (bridge.needsHandOver(structuredClone(CONFIG)) && handOvers < 100) {
      handOvers++;
    }
    expect(handOvers).toBe(10);
  });

  it("announces state changes only", () => {
    const bridge = makeBridge();
    const changed = vi.fn();
    bridge.addEventListener("changed", changed);
    bridge.setState(true, 2);
    bridge.setState(true, 2);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(bridge.selectedIndex).toBe(2);
  });
});

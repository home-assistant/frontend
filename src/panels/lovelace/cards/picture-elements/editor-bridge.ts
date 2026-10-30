import type { PictureElementsCardConfig } from "../types";

// Connects the picture-elements card editor with the card in its preview, so
// that clicks and drags on the preview edit the config. It is attached to the
// config under a symbol: spreads keep it, serialization drops it, and only the
// edited card's preview receives it.
export const PICTURE_ELEMENTS_EDITOR_BRIDGE = Symbol(
  "pictureElementsEditorBridge"
);

// Hand-overs in a row that may go without the bridge coming back. A stale
// config can arrive meanwhile, like when switching back from YAML.
const MAX_HAND_OVERS = 10;

// Positions are in percent of the image.
export interface PictureElementsEditorHandlers {
  selectElement: (index: number) => void;
  moveElement: (index: number, left: number, top: number) => void;
  // A click on the image outside of any element.
  clickImage: (x: number, y: number) => void;
}

export class PictureElementsEditorBridge extends EventTarget {
  private _active = false;

  private _selectedIndex?: number;

  private _handOvers = 0;

  constructor(public readonly handlers: PictureElementsEditorHandlers) {
    super();
  }

  // Whether the visual editor is shown. While it is not (YAML mode, dialog
  // closed), the preview behaves like the card on a dashboard.
  public get active(): boolean {
    return this._active;
  }

  // Index of the element open in the editor.
  public get selectedIndex(): number | undefined {
    return this._selectedIndex;
  }

  public setState(active: boolean, selectedIndex?: number): void {
    if (active === this._active && selectedIndex === this._selectedIndex) {
      return;
    }
    this._active = active;
    this._selectedIndex = selectedIndex;
    this.dispatchEvent(new Event("changed"));
  }

  // Whether the editor has to pass a config on with the bridge attached:
  // configs from outside the editor (the first one, YAML edits) come without.
  // A parent editor that drops symbols sends each one back without, so give
  // up when the bridge doesn't come back.
  public needsHandOver(config: PictureElementsCardConfig): boolean {
    if (config[PICTURE_ELEMENTS_EDITOR_BRIDGE] === this) {
      this._handOvers = 0;
      return false;
    }
    if (this._handOvers >= MAX_HAND_OVERS) {
      return false;
    }
    this._handOvers++;
    return true;
  }
}

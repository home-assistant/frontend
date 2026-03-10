import { mdiDelete, mdiPlus, mdiRefresh } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-slider";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";

interface GradientBlob {
  id: number;
  color: string;
  opacity: number;
  size: number;
  x: number;
  y: number;
}

const MAX_BLOBS = 8;

let nextBlobId = 1;

function _randomColor(): string {
  const h = Math.floor(Math.random() * 360);
  const s = 70 + Math.floor(Math.random() * 30);
  const l = 40 + Math.floor(Math.random() * 30);
  return _hslToHex(h, s, l);
}

function _hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function _hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function _rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
  );
}

/** Parse a CSS gradient background string into blobs + base color */
function _parseGradientString(bg: string): {
  blobs: GradientBlob[];
  baseColor: string;
} {
  const blobs: GradientBlob[] = [];
  let baseColor = "#0e1117";

  const gradientRegex =
    /radial-gradient\(\s*at\s+(\d+)%\s+(\d+)%\s*,\s*rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)\s*0px\s*,\s*transparent\s+(\d+)%\s*\)/g;

  let match = gradientRegex.exec(bg);
  while (match) {
    blobs.push({
      id: nextBlobId++,
      x: parseInt(match[1]),
      y: parseInt(match[2]),
      color: _rgbToHex(
        parseInt(match[3]),
        parseInt(match[4]),
        parseInt(match[5])
      ),
      opacity: parseFloat(match[6]),
      size: parseInt(match[7]),
    });
    match = gradientRegex.exec(bg);
  }

  // Extract base color (last value, typically a hex color)
  const hexMatch = bg.match(/(#[0-9a-fA-F]{6})\s*$/);
  if (hexMatch) {
    baseColor = hexMatch[1];
  }

  return { blobs, baseColor };
}

@customElement("hui-view-gradient-editor")
export class HuiViewGradientEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _blobs: GradientBlob[] = [];

  @state() private _baseColor = "#0e1117";

  private _dragIndex: number | null = null;

  private _config?: LovelaceViewConfig;

  set config(config: LovelaceViewConfig) {
    const oldConfig = this._config;
    this._config = config;

    if (oldConfig !== config && !this._initialized) {
      this._initFromConfig(config);
    }
  }

  private _initialized = false;

  private _initFromConfig(config: LovelaceViewConfig) {
    const bg = config?.background;
    if (typeof bg === "string" && bg.includes("radial-gradient")) {
      const parsed = _parseGradientString(bg);
      this._blobs = parsed.blobs;
      this._baseColor = parsed.baseColor;
    } else if (!this._blobs.length) {
      // Start with a few random blobs
      this._randomize();
    }
    this._initialized = true;
  }

  private _buildGradientString(): string {
    const parts = this._blobs.map((b) => {
      const rgb = _hexToRgb(b.color);
      return `radial-gradient(at ${b.x}% ${b.y}%, rgba(${rgb.r},${rgb.g},${rgb.b},${b.opacity.toFixed(2)}) 0px, transparent ${b.size}%)`;
    });
    parts.push(this._baseColor);
    return parts.join(",\n  ");
  }

  private _fireConfigChanged() {
    const gradientStr = this._buildGradientString();
    const config: LovelaceViewConfig = {
      ...this._config,
      background: gradientStr,
    };
    fireEvent(this, "view-config-changed", { config });
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="gradient-editor">
        <div
          class="preview"
          style="background: ${this._buildGradientString()}"
        >
          ${repeat(
            this._blobs,
            (b) => b.id,
            (b, i) => html`
              <div
                class="blob-handle"
                data-index=${i}
                style="left:${b.x}%;top:${b.y}%;background:${b.color}"
                @pointerdown=${this._onHandlePointerDown}
              >
                <span class="handle-label">${i + 1}</span>
              </div>
            `
          )}
        </div>

        <div class="toolbar">
          <div class="base-color-control">
            <label>${this.hass.localize("ui.panel.lovelace.editor.edit_view.background.gradient.base_color")}</label>
            <input
              type="color"
              .value=${this._baseColor}
              @input=${this._baseColorChanged}
            />
          </div>
          <div class="toolbar-actions">
            <ha-icon-button
              .path=${mdiPlus}
              .label=${this.hass.localize("ui.panel.lovelace.editor.edit_view.background.gradient.add_layer")}
              .disabled=${this._blobs.length >= MAX_BLOBS}
              @click=${this._addBlob}
            ></ha-icon-button>
            <ha-icon-button
              .path=${mdiRefresh}
              .label=${this.hass.localize("ui.panel.lovelace.editor.edit_view.background.gradient.randomize")}
              @click=${this._randomize}
            ></ha-icon-button>
          </div>
        </div>

        <div class="layer-count">
          ${this.hass.localize("ui.panel.lovelace.editor.edit_view.background.gradient.layers_count", { count: this._blobs.length, max: MAX_BLOBS })}
        </div>

        <div class="blob-list">
          ${repeat(
            this._blobs,
            (b) => b.id,
            (b, i) => this._renderBlobCard(b, i)
          )}
        </div>
      </div>
    `;
  }

  private _renderBlobCard(blob: GradientBlob, index: number) {
    return html`
      <div class="blob-card">
        <div class="blob-card-header">
          <span class="blob-card-title">
            <span
              class="color-dot"
              style="background:${blob.color}"
            ></span>
            ${this.hass.localize("ui.panel.lovelace.editor.edit_view.background.gradient.layer", { number: index + 1 })}
          </span>
          <ha-icon-button
            .path=${mdiDelete}
            .label=${this.hass.localize("ui.panel.lovelace.editor.edit_view.background.gradient.remove_layer")}
            @click=${() => this._removeBlob(index)}
          ></ha-icon-button>
        </div>
        <div class="blob-card-controls">
          <div class="control-row">
            <label>${this.hass.localize("ui.panel.lovelace.editor.edit_view.background.gradient.color")}</label>
            <input
              type="color"
              .value=${blob.color}
              data-index=${index}
              @input=${this._blobColorChanged}
            />
          </div>
          <div class="control-row">
            <label>${this.hass.localize("ui.panel.lovelace.editor.edit_view.background.gradient.opacity")}</label>
            <ha-slider
              min="1"
              max="100"
              .value=${Math.round(blob.opacity * 100)}
              data-index=${index}
              data-prop="opacity"
              @change=${this._blobSliderChanged}
            ></ha-slider>
            <span class="value-label">${Math.round(blob.opacity * 100)}%</span>
          </div>
          <div class="control-row">
            <label>${this.hass.localize("ui.panel.lovelace.editor.edit_view.background.gradient.size")}</label>
            <ha-slider
              min="10"
              max="100"
              .value=${blob.size}
              data-index=${index}
              data-prop="size"
              @change=${this._blobSliderChanged}
            ></ha-slider>
            <span class="value-label">${blob.size}%</span>
          </div>
          <div class="control-row">
            <label>X</label>
            <ha-slider
              min="0"
              max="100"
              .value=${blob.x}
              data-index=${index}
              data-prop="x"
              @change=${this._blobSliderChanged}
            ></ha-slider>
            <span class="value-label">${blob.x}%</span>
          </div>
          <div class="control-row">
            <label>Y</label>
            <ha-slider
              min="0"
              max="100"
              .value=${blob.y}
              data-index=${index}
              data-prop="y"
              @change=${this._blobSliderChanged}
            ></ha-slider>
            <span class="value-label">${blob.y}%</span>
          </div>
        </div>
      </div>
    `;
  }

  private _baseColorChanged(ev: Event) {
    this._baseColor = (ev.target as HTMLInputElement).value;
    this._fireConfigChanged();
  }

  private _blobColorChanged(ev: Event) {
    const target = ev.target as HTMLInputElement;
    const index = parseInt(target.dataset.index!);
    this._blobs = this._blobs.map((b, i) =>
      i === index ? { ...b, color: target.value } : b
    );
    this._fireConfigChanged();
  }

  private _blobSliderChanged(ev: Event) {
    const target = ev.target as HTMLInputElement & {
      dataset: { index: string; prop: string };
    };
    const index = parseInt(target.dataset.index!);
    const prop = target.dataset.prop!;
    const value = parseFloat((target as any).value);

    this._blobs = this._blobs.map((b, i) => {
      if (i !== index) return b;
      if (prop === "opacity") {
        return { ...b, opacity: value / 100 };
      }
      return { ...b, [prop]: Math.round(value) };
    });
    this._fireConfigChanged();
  }

  private _addBlob() {
    if (this._blobs.length >= MAX_BLOBS) return;
    this._blobs = [
      ...this._blobs,
      {
        id: nextBlobId++,
        color: _randomColor(),
        opacity: 0.3,
        size: 50,
        x: Math.round(Math.random() * 80 + 10),
        y: Math.round(Math.random() * 80 + 10),
      },
    ];
    this._fireConfigChanged();
  }

  private _removeBlob(index: number) {
    this._blobs = this._blobs.filter((_, i) => i !== index);
    this._fireConfigChanged();
  }

  private _randomize() {
    const count = 3 + Math.floor(Math.random() * 4);
    const r = Math.floor(Math.random() * 20);
    const g = Math.floor(Math.random() * 20);
    const b = Math.floor(Math.random() * 25);
    this._baseColor = _rgbToHex(r, g, b);

    const blobs: GradientBlob[] = [];
    for (let i = 0; i < count; i++) {
      blobs.push({
        id: nextBlobId++,
        color: _randomColor(),
        opacity: +(0.15 + Math.random() * 0.65).toFixed(2),
        size: 35 + Math.floor(Math.random() * 55),
        x: Math.round(Math.random() * 80 + 10),
        y: Math.round(Math.random() * 80 + 10),
      });
    }
    this._blobs = blobs;
    this._fireConfigChanged();
  }

  // --- Drag & Drop ---

  private _onHandlePointerDown(ev: PointerEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    const handle = ev.currentTarget as HTMLElement;
    const index = parseInt(handle.dataset.index!);
    this._dragIndex = index;

    handle.setPointerCapture(ev.pointerId);
    handle.addEventListener("pointermove", this._onHandlePointerMove);
    handle.addEventListener("pointerup", this._onHandlePointerUp);
    handle.addEventListener("pointercancel", this._onHandlePointerUp);
  }

  private _onHandlePointerMove = (ev: PointerEvent) => {
    if (this._dragIndex === null) return;

    const preview = this.shadowRoot!.querySelector(".preview") as HTMLElement;
    const rect = preview.getBoundingClientRect();

    const x = Math.min(
      100,
      Math.max(0, ((ev.clientX - rect.left) / rect.width) * 100)
    );
    const y = Math.min(
      100,
      Math.max(0, ((ev.clientY - rect.top) / rect.height) * 100)
    );

    this._blobs = this._blobs.map((b, i) =>
      i === this._dragIndex ? { ...b, x: Math.round(x), y: Math.round(y) } : b
    );
  };

  private _onHandlePointerUp = (ev: PointerEvent) => {
    const handle = ev.currentTarget as HTMLElement;
    handle.releasePointerCapture(ev.pointerId);
    handle.removeEventListener("pointermove", this._onHandlePointerMove);
    handle.removeEventListener("pointerup", this._onHandlePointerUp);
    handle.removeEventListener("pointercancel", this._onHandlePointerUp);
    this._dragIndex = null;
    this._fireConfigChanged();
  };

  static styles = css`
    :host {
      display: block;
    }

    .gradient-editor {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .preview {
      position: relative;
      width: 100%;
      height: 200px;
      border-radius: var(--ha-border-radius, 12px);
      border: 1px solid var(--divider-color);
      overflow: hidden;
      cursor: crosshair;
    }

    .blob-handle {
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid #fff;
      transform: translate(-50%, -50%);
      cursor: grab;
      z-index: 10;
      box-shadow:
        0 0 8px rgba(0, 0, 0, 0.6),
        0 0 0 1px rgba(0, 0, 0, 0.3);
      touch-action: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .blob-handle:active {
      cursor: grabbing;
    }

    .handle-label {
      font-size: 9px;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
      pointer-events: none;
      user-select: none;
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .base-color-control {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .base-color-control label {
      font-size: 13px;
      color: var(--primary-text-color);
    }

    .base-color-control input[type="color"] {
      -webkit-appearance: none;
      appearance: none;
      width: 36px;
      height: 28px;
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      padding: 2px;
    }

    .base-color-control input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    .base-color-control input[type="color"]::-webkit-color-swatch {
      border: none;
      border-radius: 4px;
    }

    .toolbar-actions {
      display: flex;
      gap: 4px;
    }

    .layer-count {
      font-size: 12px;
      color: var(--secondary-text-color);
    }

    .blob-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .blob-card {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius, 12px);
      padding: 12px;
    }

    .blob-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .blob-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
    }

    .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .blob-card-controls {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .control-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .control-row label {
      font-size: 12px;
      color: var(--secondary-text-color);
      min-width: 52px;
    }

    .control-row ha-slider {
      flex: 1;
    }

    .control-row input[type="color"] {
      -webkit-appearance: none;
      appearance: none;
      width: 36px;
      height: 24px;
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      padding: 2px;
    }

    .control-row input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    .control-row input[type="color"]::-webkit-color-swatch {
      border: none;
      border-radius: 2px;
    }

    .value-label {
      font-size: 11px;
      color: var(--secondary-text-color);
      min-width: 32px;
      text-align: right;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-gradient-editor": HuiViewGradientEditor;
  }
}

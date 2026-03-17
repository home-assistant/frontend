import { mdiDelete, mdiPlus, mdiRefresh } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { hex2rgb, rgb2hex } from "../../../../common/color/convert-color";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";

const MAX_COLORS = 5;

function _generateGradientString(colors: string[]): string {
  const count = 3 + Math.floor(Math.random() * 4);
  const baseColor = rgb2hex([
    Math.floor(Math.random() * 20),
    Math.floor(Math.random() * 20),
    Math.floor(Math.random() * 25),
  ]);

  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const [r, g, b] = hex2rgb(colors[i % colors.length]).map((c) =>
      Math.min(255, Math.max(0, c + Math.round((Math.random() - 0.5) * 80)))
    );
    const opacity = (0.15 + Math.random() * 0.65).toFixed(2);
    const size = 35 + Math.floor(Math.random() * 55);
    const x = Math.round(Math.random() * 80 + 10);
    const y = Math.round(Math.random() * 80 + 10);
    parts.push(
      `radial-gradient(at ${x}% ${y}%, rgba(${r},${g},${b},${opacity}) 0px, transparent ${size}%)`
    );
  }
  parts.push(baseColor);
  return parts.join(",\n  ");
}

function _parseGradientColors(bg: string): string[] {
  const colors: string[] = [];
  const regex = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/g;
  let match = regex.exec(bg);
  while (match) {
    const hex = rgb2hex([
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
    ]);
    if (!colors.includes(hex)) colors.push(hex);
    match = regex.exec(bg);
  }
  return colors.slice(0, MAX_COLORS);
}

@customElement("hui-view-gradient-editor")
export class HuiViewGradientEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _colors: string[] = ["#3a5f8c"];

  @state() private _gradientString = "";

  private _config?: LovelaceViewConfig;

  private _initialized = false;

  get config(): LovelaceViewConfig | undefined {
    return this._config;
  }

  set config(config: LovelaceViewConfig) {
    if (this._config !== config) {
      this._config = config;
      if (!this._initialized) {
        this._initFromConfig(config);
        this._initialized = true;
      }
    }
  }

  private _initFromConfig(config: LovelaceViewConfig) {
    const bg = config?.background;
    if (typeof bg === "string" && bg.includes("radial-gradient")) {
      this._gradientString = bg;
      const parsed = _parseGradientColors(bg);
      if (parsed.length > 0) this._colors = parsed;
    } else if (typeof bg === "string" && bg.startsWith("#")) {
      this._colors = [bg];
    }
  }

  private get _previewBackground(): string {
    if (this._colors.length === 1) return this._colors[0];
    return this._gradientString || this._colors[0];
  }

  protected render() {
    if (!this.hass) return nothing;

    return html`
      <div class="gradient-editor">
        <div
          class="preview"
          style="background: ${this._previewBackground}"
        ></div>

        <div class="color-list">
          ${this._colors.map(
            (color, i) => html`
              <div class="color-row">
                <label>
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.edit_view.background.gradient.color_label",
                    { number: i + 1 }
                  )}
                </label>
                <input
                  type="color"
                  .value=${color}
                  data-index=${i}
                  @input=${this._colorChanged}
                />
                ${this._colors.length > 1
                  ? html`<ha-icon-button
                      .path=${mdiDelete}
                      .label=${this.hass.localize(
                        "ui.panel.lovelace.editor.edit_view.background.gradient.remove_color"
                      )}
                      data-index=${i}
                      @click=${this._removeColor}
                    ></ha-icon-button>`
                  : nothing}
              </div>
            `
          )}
        </div>

        <div class="actions">
          ${this._colors.length < MAX_COLORS
            ? html`<ha-icon-button
                .path=${mdiPlus}
                .label=${this.hass.localize(
                  "ui.panel.lovelace.editor.edit_view.background.gradient.add_color"
                )}
                @click=${this._addColor}
              ></ha-icon-button>`
            : nothing}
          ${this._colors.length >= 2
            ? html`<ha-button @click=${this._randomize}>
                <ha-svg-icon slot="icon" .path=${mdiRefresh}></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.edit_view.background.gradient.randomize"
                )}
              </ha-button>`
            : nothing}
        </div>
      </div>
    `;
  }

  private _colorChanged(ev: Event) {
    const target = ev.target as HTMLInputElement;
    const index = parseInt(target.dataset.index!, 10);
    this._colors = this._colors.map((c, i) =>
      i === index ? target.value : c
    );
    if (this._colors.length === 1) {
      this._fireConfigChanged(this._colors[0]);
    }
  }

  private _addColor() {
    if (this._colors.length >= MAX_COLORS) return;
    this._colors = [...this._colors, "#ffffff"];
  }

  private _removeColor(ev: Event) {
    const target = ev.currentTarget as HTMLElement;
    const index = parseInt(target.dataset.index!, 10);
    this._colors = this._colors.filter((_, i) => i !== index);
    if (this._colors.length === 1) {
      this._gradientString = "";
      this._fireConfigChanged(this._colors[0]);
    }
  }

  private _randomize() {
    this._gradientString = _generateGradientString(this._colors);
    this._fireConfigChanged(this._gradientString);
  }

  private _fireConfigChanged(background: string) {
    fireEvent(this, "view-config-changed", {
      config: { ...this._config, background },
    });
  }

  static styles = css`
    :host {
      display: block;
    }

    .gradient-editor {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-3);
    }

    .preview {
      width: 100%;
      height: 200px;
      border-radius: var(--ha-border-radius, 12px);
      border: 1px solid var(--divider-color);
    }

    .color-list {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }

    .color-row {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
    }

    .color-row label {
      flex: 1;
      font-size: var(--ha-font-size-m);
      color: var(--primary-text-color);
    }

    .color-row input[type="color"] {
      -webkit-appearance: none;
      appearance: none;
      width: 48px;
      height: 32px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-sm, 6px);
      background: transparent;
      cursor: pointer;
      padding: 2px;
    }

    .color-row input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    .color-row input[type="color"]::-webkit-color-swatch {
      border: none;
      border-radius: 4px;
    }

    .actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--ha-space-2);
    }

    ha-button {
      --mdc-theme-primary: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-gradient-editor": HuiViewGradientEditor;
  }
}

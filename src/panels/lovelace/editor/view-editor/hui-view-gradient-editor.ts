import { mdiRefresh } from "@mdi/js";
import memoizeOne from "memoize-one";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { hex2rgb, rgb2hex } from "../../../../common/color/convert-color";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-button-toggle-group";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-textfield";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { ToggleButton } from "../../../../types";

type GradientSubMode = "solid" | "random";

interface GradientBlob {
  color: string;
  opacity: number;
  size: number;
  x: number;
  y: number;
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

function _randomVariant(baseHex: string): string {
  const [r, g, b] = hex2rgb(baseHex);
  const shift = () => Math.min(255, Math.max(0, Math.round((Math.random() - 0.5) * 80)));
  return rgb2hex([
    Math.min(255, Math.max(0, r + shift())),
    Math.min(255, Math.max(0, g + shift())),
    Math.min(255, Math.max(0, b + shift())),
  ]);
}

function _generateBlobs(colors: string[]): {
  blobs: GradientBlob[];
  baseColor: string;
} {
  const count = 3 + Math.floor(Math.random() * 4);
  const baseR = Math.floor(Math.random() * 20);
  const baseG = Math.floor(Math.random() * 20);
  const baseB = Math.floor(Math.random() * 25);
  const baseColor = rgb2hex([baseR, baseG, baseB]);

  const palette = colors.filter((c) => c !== "");
  const blobs: GradientBlob[] = [];
  for (let i = 0; i < count; i++) {
    const seedColor =
      palette.length > 0
        ? palette[i % palette.length]
        : _hslToHex(
            Math.floor(Math.random() * 360),
            70 + Math.floor(Math.random() * 30),
            40 + Math.floor(Math.random() * 30)
          );
    blobs.push({
      color: palette.length > 0 ? _randomVariant(seedColor) : seedColor,
      opacity: +(0.15 + Math.random() * 0.65).toFixed(2),
      size: 35 + Math.floor(Math.random() * 55),
      x: Math.round(Math.random() * 80 + 10),
      y: Math.round(Math.random() * 80 + 10),
    });
  }
  return { blobs, baseColor };
}

function _buildGradientString(blobs: GradientBlob[], baseColor: string): string {
  const parts = blobs.map((b) => {
    const [r, g, bVal] = hex2rgb(b.color);
    return `radial-gradient(at ${b.x}% ${b.y}%, rgba(${r},${g},${bVal},${b.opacity.toFixed(2)}) 0px, transparent ${b.size}%)`;
  });
  parts.push(baseColor);
  return parts.join(",\n  ");
}

function _detectSubMode(bg: unknown): GradientSubMode {
  if (typeof bg === "string" && bg.includes("radial-gradient")) {
    return "random";
  }
  return "solid";
}

function _parseGradientColors(bg: string): string[] {
  const colors: string[] = [];
  const regex =
    /radial-gradient\(\s*at\s+\d+%\s+\d+%\s*,\s*rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/g;

  let match = regex.exec(bg);
  while (match) {
    const hex = rgb2hex([
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
    ]);
    if (!colors.includes(hex)) {
      colors.push(hex);
    }
    match = regex.exec(bg);
  }
  return colors.slice(0, 3);
}

@customElement("hui-view-gradient-editor")
export class HuiViewGradientEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _subMode: GradientSubMode = "random";

  @state() private _solidColor = "#3a5f8c";

  @state() private _color1 = "#ec7a41";

  @state() private _color2 = "#4169e1";

  @state() private _color3 = "";

  @state() private _gradientString = "";

  private _config?: LovelaceViewConfig;

  private _initialized = false;

  get config(): LovelaceViewConfig | undefined {
    return this._config;
  }

  set config(config: LovelaceViewConfig) {
    const oldConfig = this._config;
    this._config = config;

    if (oldConfig !== config && !this._initialized) {
      this._initFromConfig(config);
    }
  }

  private _initFromConfig(config: LovelaceViewConfig) {
    const bg = config?.background;
    this._subMode = _detectSubMode(bg);

    if (this._subMode === "random" && typeof bg === "string") {
      this._gradientString = bg;
      const colors = _parseGradientColors(bg);
      if (colors.length > 0) this._color1 = colors[0];
      if (colors.length > 1) this._color2 = colors[1];
      if (colors.length > 2) this._color3 = colors[2];
    } else if (typeof bg === "string" && bg.startsWith("#")) {
      this._solidColor = bg;
    }

    this._initialized = true;
  }

  private _subModeButtons = memoizeOne(
    (localize: LocalizeFunc): ToggleButton[] => [
      {
        value: "solid",
        label: localize(
          "ui.panel.lovelace.editor.edit_view.background.gradient.mode_solid"
        ),
      },
      {
        value: "random",
        label: localize(
          "ui.panel.lovelace.editor.edit_view.background.gradient.mode_random"
        ),
      },
    ]
  );

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="gradient-editor">
        <ha-button-toggle-group
          full-width
          .buttons=${this._subModeButtons(this.hass.localize)}
          .active=${this._subMode}
          @value-changed=${this._subModeChanged}
        ></ha-button-toggle-group>

        ${this._subMode === "solid"
          ? this._renderSolidEditor()
          : this._renderRandomEditor()}
      </div>
    `;
  }

  private _renderSolidEditor() {
    return html`
      <div
        class="preview"
        style="background: ${this._solidColor}"
      ></div>
      <div class="color-row">
        <ha-textfield
          type="color"
          .value=${this._solidColor}
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.edit_view.background.gradient.color"
          )}
          @change=${this._solidColorChanged}
        ></ha-textfield>
      </div>
    `;
  }

  private _renderRandomEditor() {
    const previewBg =
      this._gradientString || this._solidColor;

    return html`
      <div
        class="preview"
        style="background: ${previewBg}"
      ></div>
      <div class="color-inputs">
        <ha-textfield
          type="color"
          .value=${this._color1}
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.edit_view.background.gradient.base_color_1"
          )}
          data-index="0"
          @change=${this._baseColorInputChanged}
        ></ha-textfield>
        <ha-textfield
          type="color"
          .value=${this._color2}
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.edit_view.background.gradient.base_color_2"
          )}
          data-index="1"
          @change=${this._baseColorInputChanged}
        ></ha-textfield>
        <ha-textfield
          type="color"
          .value=${this._color3 || "#ffffff"}
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.edit_view.background.gradient.base_color_3"
          )}
          data-index="2"
          @change=${this._baseColorInputChanged}
        ></ha-textfield>
      </div>
      <ha-button @click=${this._randomize}>
        <ha-svg-icon slot="icon" .path=${mdiRefresh}></ha-svg-icon>
        ${this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.gradient.randomize"
        )}
      </ha-button>
    `;
  }

  private _subModeChanged(ev: CustomEvent) {
    const newMode = ev.detail.value as GradientSubMode;
    if (newMode === this._subMode) return;
    this._subMode = newMode;

    if (newMode === "solid") {
      this._fireConfigChanged(this._solidColor);
    } else if (this._gradientString) {
      this._fireConfigChanged(this._gradientString);
    }
  }

  private _solidColorChanged(ev: Event) {
    this._solidColor = (ev.target as HTMLInputElement).value;
    this._fireConfigChanged(this._solidColor);
  }

  private _baseColorInputChanged(ev: Event) {
    const target = ev.target as HTMLInputElement;
    const index = parseInt(target.dataset.index!, 10);
    const value = target.value;

    if (index === 0) this._color1 = value;
    else if (index === 1) this._color2 = value;
    else if (index === 2) this._color3 = value;
  }

  private _randomize() {
    const colors = [this._color1, this._color2, this._color3].filter(
      (c) => c !== ""
    );
    const { blobs, baseColor } = _generateBlobs(colors);
    this._gradientString = _buildGradientString(blobs, baseColor);
    this._fireConfigChanged(this._gradientString);
  }

  private _fireConfigChanged(background: string) {
    const config: LovelaceViewConfig = {
      ...this._config,
      background,
    };
    fireEvent(this, "view-config-changed", { config });
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

    .color-row {
      display: flex;
    }

    .color-row ha-textfield {
      flex: 1;
    }

    .color-inputs {
      display: flex;
      gap: var(--ha-space-2);
    }

    .color-inputs ha-textfield {
      flex: 1;
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

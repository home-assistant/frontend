/* eslint-disable -- FOR TESTING ONLY: tile card editor concept comparison; not for merge */
import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant, TileCardLabConfig } from "./tile-card-lab-types";
import "../../../../components/ha-form/ha-form";
import "../../../../components/ha-switch";
import "./hui-card-features-editor";
import "../card-editor/hui-card-visibility-editor";
import "../card-editor/hui-card-layout-editor";

type Tab = "config" | "visibility" | "layout";

const TABS: { id: Tab; label: string }[] = [
  { id: "config", label: "Config" },
  { id: "visibility", label: "Visibility" },
  { id: "layout", label: "Layout" },
];

const ENTITY_SCHEMA = [{ name: "entity", selector: { entity: {} } }] as const;

const NAME_SCHEMA = [
  {
    name: "name",
    selector: { entity_name: {} },
    context: { entity: "entity" },
  },
] as const;

const ICON_COLOUR_SCHEMA = [
  {
    name: "",
    type: "grid",
    schema: [
      {
        name: "icon",
        selector: { icon: {} },
        context: { icon_entity: "entity" },
      },
      {
        name: "color",
        selector: { ui_color: { default_color: "state", include_state: true } },
      },
    ],
  },
] as const;

const ACTIONS_SCHEMA = [
  {
    name: "tap_action",
    selector: { ui_action: { default_action: "more-info" } },
  },
  {
    name: "icon_tap_action",
    selector: { ui_action: { default_action: "toggle" } },
  },
] as const;

interface FeatureConfig {
  type: string;
  [key: string]: unknown;
}

// Concept C — everything in one "Config" tab, plus Visibility and Layout tabs.
@customElement("tile-lab-concept-c")
export class TileLabConceptC extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public config?: TileCardLabConfig;

  // Parent section config — required by hui-card-layout-editor for grid limits.
  @property({ attribute: false }) public sectionConfig?: unknown;

  @state() private _tab: Tab = "config";

  // ---- config helpers -------------------------------------------------------

  private _emit(config: TileCardLabConfig): void {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _update(patch: Partial<TileCardLabConfig>): void {
    this._emit({ ...this.config, ...patch } as TileCardLabConfig);
  }

  private _formValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._update(ev.detail.value as Partial<TileCardLabConfig>);
  }

  // HA sub-editors emit the full config; forward it as-is.
  private _visibilityChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._emit(ev.detail.value as TileCardLabConfig);
  }

  private _layoutChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._emit(ev.detail.value as TileCardLabConfig);
  }

  // ---- features -------------------------------------------------------------

  private get _features(): FeatureConfig[] {
    return (this.config?.features as FeatureConfig[] | undefined) ?? [];
  }

  private _featureContext(): { entity_id?: string } {
    return { entity_id: this.config?.entity };
  }

  private _featuresChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const features = ev.detail.features as FeatureConfig[];
    const next = { ...this.config, features } as TileCardLabConfig;
    if (features.length === 0) {
      delete next.features;
    }
    this._emit(next);
  }

  private _editDetailElement(ev: CustomEvent): void {
    const index = ev.detail.subElementConfig.index as number;
    this.dispatchEvent(
      new CustomEvent("edit-sub-element", {
        detail: {
          config: this._features[index],
          saveConfig: (newConfig: FeatureConfig) =>
            this._updateFeature(index, newConfig),
          context: this._featureContext(),
          type: "feature",
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _updateFeature(index: number, feature: FeatureConfig): void {
    const features = this._features.concat();
    features[index] = feature;
    this._emit({ ...this.config, features } as TileCardLabConfig);
  }

  // ---- shared render helpers ------------------------------------------------

  private _sectionHeading(label: string) {
    return html`<div class="section-heading">${label}</div>`;
  }

  private _entityForm() {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.config}
        .schema=${ENTITY_SCHEMA}
        .computeLabel=${() => "Entity"}
        @value-changed=${this._formValueChanged}
      ></ha-form>
    `;
  }

  private _switchRow(
    label: string,
    checked: boolean,
    onChange: (v: boolean) => void
  ) {
    return html`
      <div class="switch-row">
        <div class="switch-label">${label}</div>
        <ha-switch
          .checked=${checked}
          @change=${(e: Event) =>
            onChange((e.target as HTMLInputElement).checked)}
        ></ha-switch>
      </div>
    `;
  }

  private _boxSelect<T extends string>(
    value: T,
    options: { value: T; title: string; subtitle: string }[],
    onSelect: (v: T) => void
  ) {
    return html`
      <div class="box-grid">
        ${options.map(
          (o) => html`
            <button
              class="box ${o.value === value ? "selected" : ""}"
              @click=${() => onSelect(o.value)}
              role="radio"
              aria-checked=${o.value === value}
            >
              <span class="box-radio"></span>
              <span class="box-copy">
                <span class="box-title">${o.title}</span>
                <span class="box-subtitle">${o.subtitle}</span>
              </span>
            </button>
          `
        )}
      </div>
    `;
  }

  // ---- tabs -----------------------------------------------------------------

  private _renderConfig() {
    const vertical = this.config?.vertical ?? false;
    return html`
      ${this._entityForm()} ${this._sectionHeading("Name")}
      <ha-form
        .hass=${this.hass}
        .data=${this.config}
        .schema=${NAME_SCHEMA}
        .computeLabel=${() => "Name"}
        @value-changed=${this._formValueChanged}
      ></ha-form>

      ${this._sectionHeading("Features")}
      <hui-card-features-editor
        .hass=${this.hass}
        .context=${this._featureContext()}
        .features=${this._features}
        @features-changed=${this._featuresChanged}
        @edit-detail-element=${this._editDetailElement}
      ></hui-card-features-editor>

      <div class="field-label">Display as</div>
      ${this._boxSelect(
        this.config?.features_position ?? "bottom",
        [
          {
            value: "bottom",
            title: "Bottom",
            subtitle: "Displays all features stacked",
          },
          {
            value: "inline",
            title: "Inline",
            subtitle: "Displays only the first feature",
          },
        ],
        (v) => this._update({ features_position: v })
      )}

      <div class="field-label">Content layout</div>
      ${this._boxSelect(
        vertical ? "vertical" : "horizontal",
        [
          {
            value: "horizontal",
            title: "Horizontal",
            subtitle: "Features stacked below",
          },
          {
            value: "vertical",
            title: "Vertical",
            subtitle: "Features alongside",
          },
        ],
        (v) => this._update({ vertical: v === "vertical" })
      )}
      ${this._sectionHeading("Display")}
      <ha-form
        .hass=${this.hass}
        .data=${this.config}
        .schema=${ICON_COLOUR_SCHEMA}
        .computeLabel=${(s: { name: string }) =>
          s.name === "icon" ? "Icon" : "Colour"}
        @value-changed=${this._formValueChanged}
      ></ha-form>
      ${this._switchRow(
        "Show entity picture",
        this.config?.show_entity_picture ?? false,
        (v) => this._update({ show_entity_picture: v })
      )}
      ${this._switchRow("Hide state", this.config?.hide_state ?? false, (v) =>
        this._update({ hide_state: v })
      )}
      ${this._sectionHeading("Interactions")}
      <ha-form
        .hass=${this.hass}
        .data=${this.config}
        .schema=${ACTIONS_SCHEMA}
        .computeLabel=${(s: { name: string }) =>
          s.name === "tap_action" ? "Tap behaviour" : "Icon tap"}
        @value-changed=${this._formValueChanged}
      ></ha-form>
    `;
  }

  private _renderVisibility() {
    return html`
      <hui-card-visibility-editor
        .hass=${this.hass}
        .config=${this.config}
        .entityId=${this.config?.entity}
        @value-changed=${this._visibilityChanged}
      ></hui-card-visibility-editor>
    `;
  }

  private _renderLayout() {
    return html`
      <hui-card-layout-editor
        .hass=${this.hass}
        .config=${this.config}
        .sectionConfig=${this.sectionConfig}
        @value-changed=${this._layoutChanged}
      ></hui-card-layout-editor>
    `;
  }

  protected render() {
    if (!this.hass || !this.config) {
      return nothing;
    }
    return html`
      <div class="tabbar" role="tablist">
        ${TABS.map(
          (t) => html`
            <button
              class="tab ${t.id === this._tab ? "active" : ""}"
              role="tab"
              aria-selected=${t.id === this._tab}
              @click=${() => {
                this._tab = t.id;
              }}
            >
              ${t.label}
            </button>
          `
        )}
      </div>
      <div class="tab-content">
        ${this._tab === "config" ? this._renderConfig() : nothing}
        ${this._tab === "visibility" ? this._renderVisibility() : nothing}
        ${this._tab === "layout" ? this._renderLayout() : nothing}
      </div>
    `;
  }

  static styles = css`
    /* Fixed-height flex column: tab bar is a non-scrolling header, only the
       content scrolls under it. Height matches the (fixed) dialog editor pane
       so there is no double scroll. */
    :host {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      max-height: calc(min(900px, 80vh) - 160px);
      --lab-accent: var(--primary-color, #6750a4);
      --lab-accent-rgb: var(--rgb-primary-color, 103, 80, 164);
    }
    .tabbar {
      display: flex;
      flex-shrink: 0;
      gap: var(--ha-space-1, 4px);
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      padding: var(--ha-space-6, 24px) var(--ha-space-6, 24px) 0;
    }
    .tab-content {
      flex: 1 1 auto;
      overflow-y: auto;
      padding: var(--ha-space-4, 16px) var(--ha-space-6, 24px)
        var(--ha-space-6, 24px);
    }
    .tab {
      appearance: none;
      background: none;
      border: 0;
      border-bottom: 2px solid transparent;
      color: var(--secondary-text-color);
      cursor: pointer;
      font-family: inherit;
      font-size: var(--ha-font-size-m, 14px);
      font-weight: var(--ha-font-weight-medium, 500);
      margin-bottom: -1px;
      padding: var(--ha-space-3, 12px) var(--ha-space-4, 16px);
    }
    .tab.active {
      border-bottom-color: var(--lab-accent);
      color: var(--lab-accent);
    }
    .tab-content > :first-child {
      margin-top: 0;
    }
    .section-heading {
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-l, 16px);
      font-weight: var(--ha-font-weight-medium, 500);
      line-height: var(--ha-line-height-condensed, 1.2);
      margin: var(--ha-space-6, 24px) 0 var(--ha-space-3, 12px);
    }
    .field-label {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s, 12px);
      margin: var(--ha-space-4, 16px) 0 var(--ha-space-1, 4px);
    }
    ha-form {
      display: block;
    }
    hui-card-features-editor,
    hui-card-visibility-editor,
    hui-card-layout-editor {
      display: block;
    }
    /* Composed/Custom pill — matches ha-control-select */
    .segmented {
      box-sizing: border-box;
      display: inline-flex;
      width: fit-content;
      height: 36px;
      margin-bottom: var(--ha-space-2, 8px);
      padding: 4px;
      position: relative;
      border-radius: 18px;
    }
    .segmented::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 18px;
      background: var(--disabled-color, #bdbdbd);
      opacity: 0.2;
    }
    .seg {
      align-items: center;
      appearance: none;
      background: none;
      border: 0;
      border-radius: 14px;
      color: var(--primary-text-color);
      cursor: pointer;
      display: flex;
      font-family: inherit;
      font-size: var(--ha-font-size-m, 14px);
      font-weight: var(--ha-font-weight-medium, 500);
      justify-content: center;
      padding: 0 var(--ha-space-4, 16px);
      position: relative;
      white-space: nowrap;
      z-index: 1;
    }
    .seg.active {
      background: var(--primary-color);
      color: white;
    }
    .demo-unavailable {
      align-items: center;
      background: var(
        --input-fill-color,
        rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.04)
      );
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      border-radius: var(--ha-border-radius-sm, 4px)
        var(--ha-border-radius-sm, 4px) 0 0;
      box-sizing: border-box;
      color: var(--secondary-text-color);
      display: flex;
      font-size: var(--ha-font-size-m, 14px);
      font-style: italic;
      min-height: 56px;
      padding: 0 var(--ha-space-4, 16px);
    }
    /* Box selects (borderless compact radios) */
    .box-grid {
      display: grid;
      gap: var(--ha-space-3, 12px);
      grid-template-columns: 1fr 1fr;
      margin-bottom: var(--ha-space-2, 8px);
    }
    .box {
      align-items: center;
      appearance: none;
      background: none;
      border: 0;
      cursor: pointer;
      display: flex;
      font-family: inherit;
      gap: var(--ha-space-3, 12px);
      padding: var(--ha-space-2, 8px) 0;
      text-align: start;
    }
    .box-radio {
      border: 2px solid var(--divider-color, #bdbdbd);
      border-radius: 50%;
      flex-shrink: 0;
      height: 18px;
      width: 18px;
      position: relative;
    }
    .box.selected .box-radio {
      border-color: var(--lab-accent);
    }
    .box.selected .box-radio::after {
      background: var(--lab-accent);
      border-radius: 50%;
      content: "";
      height: 10px;
      left: 50%;
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 10px;
    }
    .box-copy {
      display: flex;
      flex-direction: column;
    }
    .box-title {
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-m, 14px);
      font-weight: var(--ha-font-weight-medium, 500);
    }
    .box.selected .box-title {
      color: var(--lab-accent);
    }
    .box-subtitle {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s, 12px);
    }
    /* Switch rows */
    .switch-row {
      align-items: center;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      display: flex;
      justify-content: space-between;
      padding: var(--ha-space-3, 12px) 0;
    }
    .switch-label {
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-m, 14px);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "tile-lab-concept-c": TileLabConceptC;
  }
}

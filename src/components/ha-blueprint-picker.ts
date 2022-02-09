import "@material/mwc-list/mwc-list-item";
import "@material/mwc-select/mwc-select";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { stringCompare } from "../common/string/compare";
import { Blueprint, Blueprints, fetchBlueprints } from "../data/blueprint";
import { HomeAssistant } from "../types";

@customElement("ha-blueprint-picker")
class HaBluePrintPicker extends LitElement {
  public hass?: HomeAssistant;

  @property() public label?: string;

  @property() public value = "";

  @property() public domain = "automation";

  @property() public blueprints?: Blueprints;

  @property({ type: Boolean }) public disabled = false;

  public open() {
    const select = this.shadowRoot?.querySelector("mwc-select");
    if (select) {
      // @ts-expect-error
      select.menuOpen = true;
    }
  }

  private _processedBlueprints = memoizeOne((blueprints?: Blueprints) => {
    if (!blueprints) {
      return [];
    }
    const result = Object.entries(blueprints)
      .filter(([_path, blueprint]) => !("error" in blueprint))
      .map(([path, blueprint]) => ({
        ...(blueprint as Blueprint).metadata,
        path,
      }));
    return result.sort((a, b) => stringCompare(a.name, b.name));
  });

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    return html`
      <mwc-select
        .label=${this.label ||
        this.hass.localize("ui.components.blueprint-picker.label")}
        fixedMenuPosition
        naturalMenuWidth
        .value=${this.value}
        .disabled=${this.disabled}
        @selected=${this._blueprintChanged}
        @closed=${stopPropagation}
      >
        <mwc-list-item value="">
          ${this.hass.localize(
            "ui.components.blueprint-picker.select_blueprint"
          )}
        </mwc-list-item>
        ${this._processedBlueprints(this.blueprints).map(
          (blueprint) => html`
            <mwc-list-item .value=${blueprint.path}>
              ${blueprint.name}
            </mwc-list-item>
          `
        )}
      </mwc-select>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (this.blueprints === undefined) {
      fetchBlueprints(this.hass!, this.domain).then((blueprints) => {
        this.blueprints = blueprints;
      });
    }
  }

  private _blueprintChanged(ev) {
    const newValue = ev.target.value;

    if (newValue !== this.value) {
      this.value = newValue;
      setTimeout(() => {
        fireEvent(this, "value-changed", { value: newValue });
        fireEvent(this, "change");
      }, 0);
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: inline-block;
      }
      mwc-select {
        width: 100%;
        min-width: 200px;
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-picker": HaBluePrintPicker;
  }
}

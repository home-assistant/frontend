import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { stringCompare } from "../common/string/compare";
import {
  Blueprint,
  BlueprintDomain,
  Blueprints,
  fetchBlueprints,
} from "../data/blueprint";
import { HomeAssistant } from "../types";
import "./ha-select";

@customElement("ha-blueprint-picker")
class HaBluePrintPicker extends LitElement {
  public hass?: HomeAssistant;

  @property() public label?: string;

  @property() public value = "";

  @property() public domain: BlueprintDomain = "automation";

  @property() public blueprints?: Blueprints;

  @property({ type: Boolean }) public disabled = false;

  public open() {
    const select = this.shadowRoot?.querySelector("ha-select");
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
      .filter((entry): entry is [string, Blueprint] => !("error" in entry[1]))
      .map(([path, blueprint]) => ({
        ...blueprint.metadata,
        path,
      }));
    return result.sort((a, b) =>
      stringCompare(a.name, b.name, this.hass!.locale.language)
    );
  });

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    return html`
      <ha-select
        .label=${this.label ||
        this.hass.localize("ui.components.blueprint-picker.select_blueprint")}
        fixedMenuPosition
        naturalMenuWidth
        .value=${this.value}
        .disabled=${this.disabled}
        @selected=${this._blueprintChanged}
        @closed=${stopPropagation}
      >
        ${this._processedBlueprints(this.blueprints).map(
          (blueprint) => html`
            <mwc-list-item .value=${blueprint.path}>
              ${blueprint.name}
            </mwc-list-item>
          `
        )}
      </ha-select>
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
      ha-select {
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

import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
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
      <paper-dropdown-menu-light
        .label=${this.label ||
        this.hass.localize("ui.components.blueprint-picker.label")}
        .disabled=${this.disabled}
        horizontal-align="left"
      >
        <paper-listbox
          slot="dropdown-content"
          .selected=${this.value}
          attr-for-selected="data-blueprint-path"
          @iron-select=${this._blueprintChanged}
        >
          <paper-item data-blueprint-path="">
            ${this.hass.localize(
              "ui.components.blueprint-picker.select_blueprint"
            )}
          </paper-item>
          ${this._processedBlueprints(this.blueprints).map(
            (blueprint) => html`
              <paper-item data-blueprint-path=${blueprint.path}>
                ${blueprint.name}
              </paper-item>
            `
          )}
        </paper-listbox>
      </paper-dropdown-menu-light>
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
    const newValue = ev.detail.item.dataset.blueprintPath;

    if (newValue !== this.value) {
      this.value = ev.detail.value;
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
      paper-dropdown-menu-light {
        width: 100%;
        min-width: 200px;
        display: block;
      }
      paper-item {
        cursor: pointer;
        min-width: 200px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-picker": HaBluePrintPicker;
  }
}

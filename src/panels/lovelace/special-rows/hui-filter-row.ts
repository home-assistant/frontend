import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../../../types";
import { createRowElement } from "../create-element/create-row-element";
import type { FilterRowConfig, LovelaceRow } from "../entity-rows/types";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stringCompare } from "../../../common/string/compare";
import { ensureArray } from "../../../common/array/ensure-array";

@customElement("hui-filter-row")
class HuiFilterRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: FilterRowConfig;

  private _elements: Record<string, LovelaceRow> = {};

  private _elementsSorted: LovelaceRow[] = [];

  public setConfig(config: FilterRowConfig): void {
    if (!config.filter) {
      throw new Error("No filter configured");
    }
    if (!config.filter.label) {
      throw new Error("No label configured");
    }
    this._config = config;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (!this._config || !this.hass) {
      return;
    }

    if (
      (changedProps.has("hass") &&
        this.hass.entities !== changedProps.get("hass")?.entities) ||
      changedProps.has("_config")
    ) {
      let changed = false;
      if (changedProps.has("_config")) {
        this._elements = {};
        changed = true;
      }

      const configExtra = { ...this._config } as any;
      delete configExtra.type;
      delete configExtra.filter;

      const configLabels = ensureArray(this._config!.filter.label);

      Object.values(this.hass.entities).forEach((entityReg) => {
        const id = entityReg.entity_id;

        if (configLabels.some((l) => entityReg.labels.includes(l))) {
          if (!(id in this._elements)) {
            changed = true;
            const element = createRowElement({
              entity: id,
              ...configExtra,
            });
            element.hass = this.hass;
            this._elements[id] = element;
          }
        } else if (id in this._elements) {
          changed = true;
          delete this._elements[id];
        }
      });

      if (changed) {
        const sortedNames = Object.keys(this._elements)
          .map((id) => ({
            id,
            name: computeStateName(this.hass!.states[id]),
          }))
          .sort((a, b) =>
            stringCompare(a.name, b.name, this.hass!.locale.language)
          );

        this._elementsSorted = sortedNames.map(
          (element) => this._elements[element.id]
        );
      }
    }

    if (changedProps.has("hass")) {
      this._elementsSorted.forEach((e) => {
        e.hass = this.hass;
      });
    }
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    return Object.values(this._elementsSorted).map(
      (e) => html`<div>${e}</div>`
    );
  }

  static styles = css`
    div {
      margin: 8px 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-filter-row": HuiFilterRow;
  }
}

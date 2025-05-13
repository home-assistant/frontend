import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../../../types";
import { createRowElement } from "../create-element/create-row-element";
import type { LabelRowConfig, LovelaceRow } from "../entity-rows/types";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import { subscribeEntityRegistry } from "../../../data/entity_registry";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stringCompare } from "../../../common/string/compare";

@customElement("hui-label-row")
class HuiLabelRow extends SubscribeMixin(LitElement) implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: LabelRowConfig;

  @state() private _entities?: EntityRegistryEntry[];

  private _elements: Record<string, LovelaceRow> = {};

  private _elementsSorted: LovelaceRow[] = [];

  public setConfig(config: LabelRowConfig): void {
    if (!config.label) {
      throw new Error("No label configured");
    }
    this._config = config;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (!this._config || !this.hass) {
      return;
    }

    if (changedProps.has("_entities") || changedProps.has("_config")) {
      let changed = false;
      if (changedProps.has("_config")) {
        this._elements = {};
        changed = true;
      }

      const configExtra = { ...this._config } as any;
      delete configExtra.type;
      delete configExtra.label;

      this._entities?.forEach((entityReg) => {
        const id = entityReg.entity_id;

        if (entityReg.labels.includes(this._config!.label)) {
          if (!(id in this._elements)) {
            changed = true;
            this._elements[id] = createRowElement({
              entity: id,
              ...configExtra,
            });
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
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass!.connection, (entries) => {
        this._entities = entries;
      }),
    ];
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    Object.values(this._elementsSorted).forEach((e) => {
      e.hass = this.hass;
    });
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
    "hui-label-row": HuiLabelRow;
  }
}

import { ContextProvider } from "@lit/context";
import type { PropertyValues } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../../types";
import type { Condition } from "../../common/validate-condition";
import { conditionsEntityContext } from "../conditions/context";
import "../conditions/ha-card-conditions-editor";
import "../conditions/ha-visibility-status";

@customElement("hui-badge-visibility-editor")
export class HuiBadgeVisibilityEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceCardConfig;

  @property({ attribute: false }) public entityId?: string;

  private _contextProvider = new ContextProvider(this, {
    context: conditionsEntityContext,
    initialValue: undefined,
  });

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("entityId")) {
      this._contextProvider.setValue(
        this.entityId ? { mode: "current", entityId: this.entityId } : undefined
      );
    }
  }

  render() {
    const conditions = this.config.visibility ?? [];
    return html`
      <ha-visibility-status
        .hass=${this.hass}
        .conditions=${conditions}
      ></ha-visibility-status>
      <ha-card-conditions-editor
        .hass=${this.hass}
        .conditions=${conditions}
        @value-changed=${this._valueChanged}
      >
      </ha-card-conditions-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const conditions = ev.detail.value as Condition[];
    const newConfig: LovelaceCardConfig = {
      ...this.config,
      visibility: conditions,
    };
    if (newConfig.visibility?.length === 0) {
      delete newConfig.visibility;
    }
    fireEvent(this, "value-changed", { value: newConfig });
  }

  static styles = css`
    ha-visibility-status {
      margin-bottom: var(--ha-space-3);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-badge-visibility-editor": HuiBadgeVisibilityEditor;
  }
}

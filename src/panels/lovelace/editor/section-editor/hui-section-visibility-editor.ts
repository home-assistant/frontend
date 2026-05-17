import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { HomeAssistant } from "../../../../types";
import type { Condition } from "../../common/validate-condition";
import "../conditions/ha-card-conditions-editor";
import "../conditions/ha-visibility-status";

@customElement("hui-section-visibility-editor")
export class HuiDialogEditSection extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceSectionRawConfig;

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

  static styles = css`
    ha-visibility-status {
      margin-bottom: var(--ha-space-3);
    }
  `;

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const conditions = ev.detail.value as Condition[];
    const newConfig: LovelaceSectionRawConfig = {
      ...this.config,
      visibility: conditions,
    };
    if (newConfig.visibility?.length === 0) {
      delete newConfig.visibility;
    }
    fireEvent(this, "value-changed", { value: newConfig });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-visibility-editor": HuiDialogEditSection;
  }
}

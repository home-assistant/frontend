import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import { HomeAssistant } from "../../../../types";
import { Condition } from "../../common/validate-condition";
import "../conditions/ha-card-conditions-editor";

@customElement("hui-section-visibility-editor")
export class HuiDialogEditSection extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceSectionRawConfig;

  render() {
    const conditions = this.config.visibility ?? [];
    return html`
      <ha-alert alert-type="info">
        ${this.hass.localize(
          `ui.panel.lovelace.editor.edit_section.visibility.explanation`
        )}
      </ha-alert>
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

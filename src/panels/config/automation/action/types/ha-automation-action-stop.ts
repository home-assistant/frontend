import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import { StopAction } from "../../../../../data/script";
import { HomeAssistant } from "../../../../../types";
import { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-stop")
export class HaStopAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public action!: StopAction;

  public static get defaultConfig() {
    return { stop: "" };
  }

  protected render() {
    const { error, stop } = this.action;

    return html`
      <ha-textfield
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.stop.stop"
        )}
        .value=${stop}
        @change=${this._stopChanged}
      ></ha-textfield>
      <ha-formfield
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.stop.error"
        )}
      >
        <ha-switch
          .checked=${error ?? false}
          @change=${this._errorChanged}
        ></ha-switch>
      </ha-formfield>
    `;
  }

  private _stopChanged(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.action, stop: (ev.target as any).value },
    });
  }

  private _errorChanged(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.action, error: (ev.target as any).checked },
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-textfield {
        display: block;
        margin-bottom: 24px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-stop": HaStopAction;
  }
}

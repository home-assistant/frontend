import { consume, type ContextType } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-switch";
import "../../../../../components/input/ha-input";
import type { HaInput } from "../../../../../components/input/ha-input";
import { localizeContext } from "../../../../../data/context";
import type { StopAction } from "../../../../../data/script";
import type { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-stop")
export class HaStopAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public action!: StopAction;

  @property({ type: Boolean }) public disabled = false;

  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: ContextType<typeof localizeContext>;

  public static get defaultConfig(): StopAction {
    return { stop: "" };
  }

  protected render() {
    const { error, stop, response_variable } = this.action;

    return html`
      <ha-input
        .label=${this.localize(
          "ui.panel.config.automation.editor.actions.type.stop.stop"
        )}
        .value=${stop}
        .disabled=${this.disabled}
        @change=${this._stopChanged}
      ></ha-input>
      <ha-input
        .label=${this.localize(
          "ui.panel.config.automation.editor.actions.type.stop.response_variable"
        )}
        .value=${response_variable || ""}
        .disabled=${this.disabled}
        @change=${this._responseChanged}
      ></ha-input>
      <ha-formfield
        .disabled=${this.disabled}
        .label=${this.localize(
          "ui.panel.config.automation.editor.actions.type.stop.error"
        )}
      >
        <ha-switch
          .disabled=${this.disabled}
          .checked=${error ?? false}
          @change=${this._errorChanged}
        ></ha-switch>
      </ha-formfield>
    `;
  }

  private _stopChanged(ev: InputEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.action, stop: (ev.target as HaInput).value },
    });
  }

  private _responseChanged(ev: InputEvent) {
    ev.stopPropagation();
    const newAction = { ...this.action };
    const newValue = (ev.target as HaInput).value;
    if (newValue) {
      newAction.response_variable = newValue;
    } else {
      delete newAction.response_variable;
    }
    fireEvent(this, "value-changed", {
      value: newAction,
    });
  }

  private _errorChanged(ev: Event) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.action, error: (ev.target as any).checked },
    });
  }

  static styles = css`
    ha-input {
      margin-bottom: var(--ha-space-6);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-stop": HaStopAction;
  }
}

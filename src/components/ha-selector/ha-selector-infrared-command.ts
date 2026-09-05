import { mdiDeleteOutline, mdiRemote } from "@mdi/js";
import type {
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { InfraredCommand } from "../../data/infrared";
import {
  isInfraredReceiver,
  subscribeInfraredReceiver,
} from "../../data/infrared";
import type {
  InfraredCommandSelector,
  TargetSelector,
} from "../../data/selector";
import { resolveEntityIDs } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-alert";
import "../ha-button";
import "../ha-icon-button";
import "../ha-input-helper-text";
import "../ha-spinner";
import "../ha-svg-icon";
import "../input/ha-input";
import type { HaInput } from "../input/ha-input";

@customElement("ha-selector-infrared_command")
export class HaSelectorInfraredCommand extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: InfraredCommandSelector;

  @property({ attribute: false }) public value?: InfraredCommand[];

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    filter_target?: HassServiceTarget;
    target_selector?: TargetSelector;
  };

  @state() private _capturing = false;

  @state() private _error?: string;

  @query("ha-input[data-last]") private _lastInput?: HaInput;

  private _unsubscribes?: UnsubscribeFunc[];

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopCapture();
  }

  public reportValidity(): boolean {
    return !this.required || (this.value?.length ?? 0) > 0;
  }

  protected render() {
    const commands = this.value ?? [];
    const receivers = this._receivers();

    return html`
      ${
        commands.length
          ? html`<div class="commands">
              ${commands.map(
                (command, index) => html`
                  <div class="row">
                    <ha-svg-icon .path=${mdiRemote}></ha-svg-icon>
                    <ha-input
                      class="name"
                      .label=${this.hass.localize(
                        "ui.components.selectors.infrared_command.name"
                      )}
                      .value=${command.name}
                      .index=${index}
                      .disabled=${this.disabled}
                      ?data-last=${index === commands.length - 1}
                      @input=${this._nameChanged}
                      @change=${this._nameChanged}
                    ></ha-input>
                    <ha-icon-button
                      .path=${mdiDeleteOutline}
                      .index=${index}
                      .label=${this.hass.localize("ui.common.delete")}
                      .disabled=${this.disabled}
                      @click=${this._deleteCommand}
                    ></ha-icon-button>
                  </div>
                `
              )}
            </div>`
          : nothing
      }
      ${
        this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }
      ${
        this._capturing
          ? html`<div class="capturing">
              <ha-spinner size="small"></ha-spinner>
              <span>
                ${this.hass.localize(
                  "ui.components.selectors.infrared_command.press_a_button"
                )}
              </span>
              <ha-button
                appearance="plain"
                size="s"
                @click=${this._stopCapture}
              >
                ${this.hass.localize("ui.common.cancel")}
              </ha-button>
            </div>`
          : receivers.length === 0
            ? html`<ha-alert alert-type="info">
                ${this.hass.localize(
                  "ui.components.selectors.infrared_command.select_receiver"
                )}
              </ha-alert>`
            : html`<ha-button
                appearance="filled"
                size="s"
                .disabled=${this.disabled}
                @click=${this._startCapture}
              >
                <ha-svg-icon slot="start" .path=${mdiRemote}></ha-svg-icon>
                ${this.hass.localize(
                  "ui.components.selectors.infrared_command.capture"
                )}
              </ha-button>`
      }
      ${
        this.helper
          ? html`<ha-input-helper-text .disabled=${this.disabled}
              >${this.helper}</ha-input-helper-text
            >`
          : nothing
      }
    `;
  }

  // Codes are captured from the receivers covered by the target the surrounding
  // field points at - for the infrared trigger, the receiver it listens to.
  private _receivers(): string[] {
    const target = this.context?.filter_target;
    if (!target) {
      return [];
    }
    return resolveEntityIDs(
      this.hass,
      target,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas,
      this.context?.target_selector
    ).filter((entityId) => isInfraredReceiver(this.hass, entityId));
  }

  private async _startCapture() {
    const receivers = this._receivers();
    this._error = undefined;
    this._capturing = true;
    try {
      const unsubscribes = await Promise.all(
        receivers.map((entityId) =>
          subscribeInfraredReceiver(this.hass, entityId, this._codeCaptured)
        )
      );
      if (!this._capturing) {
        // Capturing was cancelled while the subscriptions were being set up.
        unsubscribes.forEach((unsubscribe) => unsubscribe());
        return;
      }
      this._unsubscribes = unsubscribes;
    } catch (_err) {
      this._capturing = false;
      this._error = this.hass.localize(
        "ui.components.selectors.infrared_command.capture_failed"
      );
    }
  }

  private _stopCapture = () => {
    this._capturing = false;
    this._unsubscribes?.forEach((unsubscribe) => unsubscribe());
    this._unsubscribes = undefined;
  };

  // Only the first code that comes in is captured, so a remote that repeats
  // its frame while the button is held adds a single command.
  private _codeCaptured = async (code: string) => {
    if (!this._capturing) {
      return;
    }
    this._stopCapture();
    const commands = this.value ?? [];
    this._fireChanged([
      ...commands,
      {
        name: this.hass.localize(
          "ui.components.selectors.infrared_command.captured_name",
          { number: commands.length + 1 }
        ),
        code,
      },
    ]);
    await this.updateComplete;
    this._lastInput?.focus();
  };

  private _nameChanged(ev: Event) {
    const input = ev.currentTarget as HaInput & { index: number };
    const commands = [...(this.value ?? [])];
    commands[input.index] = {
      ...commands[input.index],
      name: input.value ?? "",
    };
    this._fireChanged(commands);
  }

  private _deleteCommand(ev: Event) {
    const { index } = ev.currentTarget as HTMLElement & { index: number };
    this._fireChanged((this.value ?? []).filter((_, i) => i !== index));
  }

  private _fireChanged(value: InfraredCommand[]) {
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    :host {
      display: block;
    }
    .commands {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
      margin-bottom: var(--ha-space-2);
    }
    .row {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
    }
    .row > ha-svg-icon {
      color: var(--secondary-text-color);
    }
    .name {
      flex: 1;
      --ha-input-padding-bottom: 0;
    }
    .capturing {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      color: var(--secondary-text-color);
    }
    ha-alert {
      display: block;
      margin-bottom: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-infrared_command": HaSelectorInfraredCommand;
  }
}

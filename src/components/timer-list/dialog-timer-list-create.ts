import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { durationDataToSeconds } from "../../common/datetime/duration_to_seconds";
import { consume } from "../../common/decorators/consume";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import type { HASSDomCurrentTargetEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import { apiContext } from "../../data/context";
import { createTimerListTimer } from "../../data/timer_list";
import { DialogMixin } from "../../dialogs/dialog-mixin";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistantApi, ValueChangedEvent } from "../../types";
import "../ha-alert";
import "../ha-button";
import "../ha-dialog";
import "../ha-dialog-footer";
import "../ha-duration-input";
import type { HaDurationData } from "../ha-duration-input";
import "../input/ha-input";
import type { HaInput } from "../input/ha-input";
import type { TimerListCreateDialogParams } from "./show-dialog-timer-list-create";

@customElement("dialog-timer-list-create")
class DialogTimerListCreate extends DialogMixin<TimerListCreateDialogParams>(
  LitElement
) {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _name = "";

  @state() private _duration: HaDurationData = { minutes: 5 };

  @state() private _error?: string;

  @state() private _submitting = false;

  protected render() {
    if (!this.params || !this._localize) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        width="small"
        header-title=${this._localize("ui.components.timer-list.add_timer")}
      >
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        <div class="form">
          <ha-duration-input
            autofocus
            required
            .label=${this._localize("ui.components.timer-list.duration")}
            .data=${this._duration}
            @value-changed=${this._durationChanged}
          ></ha-duration-input>
          <ha-input
            .label=${this._localize("ui.components.timer-list.name")}
            .value=${this._name}
            @input=${this._nameChanged}
          ></ha-input>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this._localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            .disabled=${
              this._submitting || !durationDataToSeconds(this._duration)
            }
            @click=${this._start}
          >
            ${this._localize("ui.components.timer-list.start")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _nameChanged(ev: HASSDomCurrentTargetEvent<HaInput>): void {
    this._name = ev.currentTarget.value ?? "";
  }

  private _durationChanged(
    ev: ValueChangedEvent<HaDurationData | undefined>
  ): void {
    this._duration = ev.detail.value ?? {};
  }

  private async _start(): Promise<void> {
    this._submitting = true;
    this._error = undefined;
    try {
      await createTimerListTimer(
        this._api.callService,
        this.params!.entityId,
        this._duration,
        this._name.trim()
      );
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message;
    } finally {
      this._submitting = false;
    }
  }

  static styles = [
    haStyleDialog,
    css`
      .form {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-4);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-timer-list-create": DialogTimerListCreate;
  }
}

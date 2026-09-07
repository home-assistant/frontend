import { consume, type ContextType } from "@lit/context";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../../components/entity/ha-entity-picker";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-spinner";
import "../../../../../components/input/ha-input";
import {
  internationalizationContext,
  statesContext,
} from "../../../../../data/context";
import type { InfraredCapturedCode } from "../../../../../data/infrared";
import { infraredReceiverEntityIds } from "../../../../../data/infrared";
import { DialogMixin } from "../../../../../dialogs/dialog-mixin";
import { haStyleDialog } from "../../../../../resources/styles";
import type { InfraredRecordCommandDialogParams } from "./show-dialog-infrared-record-command";

type RecordStep = "receiver" | "listening" | "name";

@customElement("dialog-infrared-record-command")
class DialogInfraredRecordCommand extends DialogMixin<InfraredRecordCommandDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state() private _step: RecordStep = "receiver";

  @state() private _receiver?: string;

  @state() private _code?: string;

  @state() private _name = "";

  @state() private _error?: string;

  @state() private _repeated?: string;

  @state() private _submitting = false;

  private _unsubscribe?: Promise<UnsubscribeFunc>;

  public connectedCallback(): void {
    super.connectedCallback();
    const receivers = infraredReceiverEntityIds(this._states);
    if (receivers.length === 1) {
      this._receiver = receivers[0];
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopListening();
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        header-title=${this._i18n.localize(
          "ui.panel.config.infrared.record.title"
        )}
      >
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        ${
          this._step === "receiver"
            ? this._renderReceiverStep()
            : this._step === "listening"
              ? this._renderListeningStep()
              : this._renderNameStep()
        }
      </ha-dialog>
    `;
  }

  private _renderReceiverStep() {
    const hasReceivers = infraredReceiverEntityIds(this._states).length > 0;

    return html`
      ${
        hasReceivers
          ? html`<ha-entity-picker
              autofocus
              .value=${this._receiver}
              .label=${this._i18n.localize(
                "ui.panel.config.infrared.record.receiver"
              )}
              .helper=${this._i18n.localize(
                "ui.panel.config.infrared.record.receiver_description"
              )}
              .includeDomains=${["infrared"]}
              .includeDeviceClasses=${["receiver"]}
              @value-changed=${this._receiverChanged}
            ></ha-entity-picker>`
          : html`<ha-alert alert-type="info">
              ${this._i18n.localize(
                "ui.panel.config.infrared.record.no_receivers"
              )}
            </ha-alert>`
      }
      <ha-dialog-footer slot="footer">
        <ha-button
          appearance="plain"
          slot="secondaryAction"
          @click=${this.closeDialog}
        >
          ${this._i18n.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          slot="primaryAction"
          .disabled=${!this._receiver}
          @click=${this._startListening}
        >
          ${this._i18n.localize("ui.panel.config.infrared.record.start")}
        </ha-button>
      </ha-dialog-footer>
    `;
  }

  private _renderListeningStep() {
    return html`
      ${
        this._repeated
          ? html`<ha-alert alert-type="warning">${this._repeated}</ha-alert>`
          : nothing
      }
      <div class="listening">
        <ha-spinner size="small"></ha-spinner>
        <span>
          ${this._i18n.localize(
            "ui.panel.config.infrared.record.press_a_button"
          )}
        </span>
      </div>
      <ha-dialog-footer slot="footer">
        <ha-button
          appearance="plain"
          slot="primaryAction"
          @click=${this.closeDialog}
        >
          ${this._i18n.localize("ui.common.cancel")}
        </ha-button>
      </ha-dialog-footer>
    `;
  }

  private _renderNameStep() {
    return html`
      <ha-input
        autofocus
        required
        .value=${this._name}
        .label=${this._i18n.localize("ui.panel.config.infrared.record.name")}
        @input=${this._nameChanged}
      ></ha-input>
      <ha-dialog-footer slot="footer">
        <ha-button
          appearance="plain"
          slot="secondaryAction"
          @click=${this.closeDialog}
        >
          ${this._i18n.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          slot="primaryAction"
          .disabled=${this._submitting || !this._name.trim()}
          @click=${this._save}
        >
          ${this._i18n.localize("ui.common.save")}
        </ha-button>
      </ha-dialog-footer>
    `;
  }

  private _receiverChanged(ev: CustomEvent) {
    this._receiver = ev.detail.value || undefined;
  }

  private _nameChanged(ev: Event) {
    this._name = (ev.target as HTMLInputElement).value;
  }

  private async _startListening() {
    this._error = undefined;
    this._repeated = undefined;
    this._step = "listening";
    const unsubscribe = this.params!.subscribeReceiver(
      this._receiver!,
      this._codeCaptured
    );
    this._unsubscribe = unsubscribe;
    try {
      await unsubscribe;
    } catch (_err) {
      this._unsubscribe = undefined;
      this._step = "receiver";
      this._error = this._i18n.localize(
        "ui.panel.config.infrared.record.listen_failed"
      );
    }
  }

  private _stopListening() {
    const pending = this._unsubscribe;
    this._unsubscribe = undefined;
    // The subscription may still be starting; a failure to start is reported
    // by `_startListening`, so ignore it here.
    pending?.then(
      (unsubscribe) => unsubscribe(),
      () => undefined
    );
  }

  // A remote repeats its frame while the button is held, so only the first
  // code that comes in is recorded.
  private _codeCaptured = ({ code, duplicate_of }: InfraredCapturedCode) => {
    if (this._step !== "listening") {
      return;
    }
    if (duplicate_of) {
      // The button is already in the database, so listen on for another one
      // rather than storing a command that could never be told apart.
      const known = this.params!.commands.find(
        (command) => command.id === duplicate_of
      );
      this._repeated = known
        ? this._i18n.localize("ui.panel.config.infrared.record.duplicate", {
            name: known.name,
          })
        : this._i18n.localize(
            "ui.panel.config.infrared.record.duplicate_unknown"
          );
      return;
    }
    this._stopListening();
    this._code = code;
    this._name = this._i18n.localize(
      "ui.panel.config.infrared.record.suggested_name",
      { number: this.params!.commands.length + 1 }
    );
    this._step = "name";
  };

  private async _save() {
    this._submitting = true;
    this._error = undefined;
    try {
      await this.params!.createCommand({
        name: this._name.trim(),
        code: this._code!,
      });
      this.closeDialog();
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-alert {
          display: block;
          margin-bottom: var(--ha-space-4);
        }
        .listening {
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
          color: var(--secondary-text-color);
        }
        ha-input {
          display: block;
          --ha-input-padding-bottom: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-infrared-record-command": DialogInfraredRecordCommand;
  }
}

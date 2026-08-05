import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { haStyle, haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { PrivateDialogConfirmRestartParams } from "./show-dialog-confirm-restart";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-dialog";
import "../../components/ha-dialog-footer";
import "../../components/ha-dialog-header";
import { computeDomain } from "../../common/entity/compute_domain";
import { STRINGS_SEPARATOR_DOT } from "../../common/const";
import type { EntityNameItem } from "../../common/entity/compute_entity_name_display";

const ENTITY_NAME_FORMAT: EntityNameItem[] = [
  { type: "entity" },
  { type: "area" },
] as const;
const ENTITY_NAME_OPTIONS = { separator: STRINGS_SEPARATOR_DOT } as const;
@customElement("dialog-confirm-restart")
export class DialogConfirmRestart extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: PrivateDialogConfirmRestartParams;

  @state() private _open = false;

  public showDialog(params: PrivateDialogConfirmRestartParams): void {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
    this._params!.cancel();
  }

  private _dialogClosed(): void {
    this._open = false;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _confirm(): void {
    this._open = false;
    this._params!.confirm();
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const automations = Object.values(this.hass.states).filter((s) => {
      const domain = computeDomain(s.entity_id);
      return (
        (domain === "script" || domain === "automation") && s.attributes.current
      );
    });

    const warning = automations.length
      ? html`${this.hass.localize("ui.dialogs.restart.interrupt_automations")}
          <ul>
            ${automations.map((a) => html`<li>${this.hass.formatEntityName(a, ENTITY_NAME_FORMAT, ENTITY_NAME_OPTIONS)}</li>`)}
          </ul>`
      : html`${this.hass.localize("ui.dialogs.restart.no_interrupt_automations")}`;

    const content = html`${this._params.text}<br /><br />${warning}`;

    const footer = html`
      <ha-button
        slot="secondaryAction"
        @click=${this.closeDialog}
        appearance="plain"
      >
        ${this.hass.localize("ui.common.cancel")}</ha-button
      >
      <ha-button slot="primaryAction" variant="danger" @click=${this._confirm}>
        ${this._params.confirmText}</ha-button
      >
    `;

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this._params.title}
        @closed=${this._dialogClosed}
      >
        ${content}
        <ha-dialog-footer slot="footer">${footer}</ha-dialog-footer>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [haStyle, haStyleDialog];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-confirm-restart": DialogConfirmRestart;
  }
}

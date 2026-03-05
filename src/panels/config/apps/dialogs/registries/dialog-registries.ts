import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import { extractApiErrorMessage } from "../../../../../data/hassio/common";
import { addHassioDockerRegistry } from "../../../../../data/hassio/docker";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { RegistryDialogParams } from "./show-dialog-registries";

const SCHEMA = [
  {
    name: "registry",
    required: true,
    selector: { text: {} },
  },
  {
    name: "username",
    required: true,
    selector: { text: {} },
  },
  {
    name: "password",
    required: true,
    selector: { text: { type: "password" } },
  },
] as const;

@customElement("dialog-apps-registries")
class AppsRegistriesDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: RegistryDialogParams;

  @state() private _input: {
    registry?: string;
    username?: string;
    password?: string;
  } = {};

  @state() private _open = false;

  @state() private _submitting = false;

  public async showDialog(dialogParams: RegistryDialogParams): Promise<void> {
    this._dialogParams = dialogParams;
    this._open = true;
    this._input = {};
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._dialogParams = undefined;
    this._open = false;
    this._input = {};
    this._submitting = false;
    fireEvent(this, "dialog-closed");
  }

  protected render(): TemplateResult {
    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        @closed=${this._dialogClosed}
        header-title=${this.hass.localize(
          "ui.panel.config.apps.registries.add_title"
        )}
      >
        <ha-form
          autofocus
          .data=${this._input}
          .schema=${SCHEMA}
          .disabled=${this._submitting}
          @value-changed=${this._valueChanged}
          .computeLabel=${this._computeLabel}
        ></ha-form>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            @click=${this.closeDialog}
            appearance="plain"
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            ?disabled=${!this._input.registry ||
            !this._input.username ||
            !this._input.password}
            .loading=${this._submitting}
            @click=${this._addRegistry}
          >
            ${this.hass.localize("ui.panel.config.apps.registries.add")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _computeLabel = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass.localize(`ui.panel.config.apps.registries.${schema.name}` as any);

  private _valueChanged(ev: CustomEvent) {
    this._input = ev.detail.value;
  }

  private async _addRegistry(): Promise<void> {
    const data = {};
    data[this._input.registry!] = {
      username: this._input.username,
      password: this._input.password,
    };

    this._submitting = true;
    try {
      await addHassioDockerRegistry(this.hass, data);
      this._dialogParams?.registryAdded?.();
      this.closeDialog();
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.apps.registries.failed_to_add"
        ),
        text: extractApiErrorMessage(err),
      });
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [haStyle, haStyleDialog];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-apps-registries": AppsRegistriesDialog;
  }
}

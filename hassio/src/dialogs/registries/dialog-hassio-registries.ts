import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import "@material/mwc-list/mwc-list-item";
import { mdiDelete } from "@mdi/js";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../src/components/ha-circular-progress";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-svg-icon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import {
  addHassioDockerRegistry,
  fetchHassioDockerRegistries,
  removeHassioDockerRegistry,
} from "../../../../src/data/hassio/docker";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { showAlertDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { RegistriesDialogParams } from "./show-dialog-registries";

@customElement("dialog-hassio-registries")
class HassioRegistriesDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) private _registries?: {
    registry: string;
    username: string;
  }[];

  @state() private _registry?: string;

  @state() private _username?: string;

  @state() private _password?: string;

  @state() private _opened = false;

  @state() private _addingRegistry = false;

  protected render(): TemplateResult {
    return html`
      <ha-dialog
        .open=${this._opened}
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._addingRegistry
            ? this.supervisor.localize("dialog.registries.title_add")
            : this.supervisor.localize("dialog.registries.title_manage")
        )}
      >
        <div class="form">
          ${this._addingRegistry
            ? html`
                <paper-input
                  @value-changed=${this._inputChanged}
                  class="flex-auto"
                  name="registry"
                  .label=${this.supervisor.localize(
                    "dialog.registries.registry"
                  )}
                  required
                  auto-validate
                ></paper-input>
                <paper-input
                  @value-changed=${this._inputChanged}
                  class="flex-auto"
                  name="username"
                  .label=${this.supervisor.localize(
                    "dialog.registries.username"
                  )}
                  required
                  auto-validate
                ></paper-input>
                <paper-input
                  @value-changed=${this._inputChanged}
                  class="flex-auto"
                  name="password"
                  .label=${this.supervisor.localize(
                    "dialog.registries.password"
                  )}
                  type="password"
                  required
                  auto-validate
                ></paper-input>

                <mwc-button
                  ?disabled=${Boolean(
                    !this._registry || !this._username || !this._password
                  )}
                  @click=${this._addNewRegistry}
                >
                  ${this.supervisor.localize("dialog.registries.add_registry")}
                </mwc-button>
              `
            : html`${this._registries?.length
                  ? this._registries.map(
                      (entry) => html`
                        <mwc-list-item class="option" hasMeta twoline>
                          <span>${entry.registry}</span>
                          <span slot="secondary"
                            >${this.supervisor.localize(
                              "dialog.registries.username"
                            )}:
                            ${entry.username}</span
                          >
                          <mwc-icon-button
                            .entry=${entry}
                            .title=${this.supervisor.localize(
                              "dialog.registries.remove"
                            )}
                            slot="meta"
                            @click=${this._removeRegistry}
                          >
                            <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                          </mwc-icon-button>
                        </mwc-list-item>
                      `
                    )
                  : html`
                      <mwc-list-item>
                        <span
                          >${this.supervisor.localize(
                            "dialog.registries.no_registries"
                          )}</span
                        >
                      </mwc-list-item>
                    `}
                <mwc-button @click=${this._addRegistry}>
                  ${this.supervisor.localize(
                    "dialog.registries.add_new_registry"
                  )}
                </mwc-button> `}
        </div>
      </ha-dialog>
    `;
  }

  private _inputChanged(ev: Event) {
    const target = ev.currentTarget as PaperInputElement;
    this[`_${target.name}`] = target.value;
  }

  public async showDialog(dialogParams: RegistriesDialogParams): Promise<void> {
    this._opened = true;
    this.supervisor = dialogParams.supervisor;
    await this._loadRegistries();
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._addingRegistry = false;
    this._opened = false;
  }

  public focus(): void {
    this.updateComplete.then(() =>
      (
        this.shadowRoot?.querySelector("[dialogInitialFocus]") as HTMLElement
      )?.focus()
    );
  }

  private async _loadRegistries(): Promise<void> {
    const registries = await fetchHassioDockerRegistries(this.hass);
    this._registries = Object.keys(registries!.registries).map((key) => ({
      registry: key,
      username: registries.registries[key].username,
    }));
  }

  private _addRegistry(): void {
    this._addingRegistry = true;
  }

  private async _addNewRegistry(): Promise<void> {
    const data = {};
    data[this._registry!] = {
      username: this._username,
      password: this._password,
    };

    try {
      await addHassioDockerRegistry(this.hass, data);
      await this._loadRegistries();
      this._addingRegistry = false;
    } catch (err) {
      showAlertDialog(this, {
        title: this.supervisor.localize("dialog.registries.failed_to_add"),
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _removeRegistry(ev: Event): Promise<void> {
    const entry = (ev.currentTarget as any).entry;

    try {
      await removeHassioDockerRegistry(this.hass, entry.registry);
      await this._loadRegistries();
    } catch (err) {
      showAlertDialog(this, {
        title: this.supervisor.localize("dialog.registries.failed_to_remove"),
        text: extractApiErrorMessage(err),
      });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog.button-left {
          --justify-action-buttons: flex-start;
        }
        paper-icon-item {
          cursor: pointer;
        }
        .form {
          color: var(--primary-text-color);
        }
        .option {
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          margin-top: 4px;
        }
        mwc-button {
          margin-left: 8px;
        }
        mwc-icon-button {
          color: var(--error-color);
          margin: -10px;
        }
        mwc-list-item {
          cursor: default;
        }
        mwc-list-item span[slot="secondary"] {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-registries": HassioRegistriesDialog;
  }
}

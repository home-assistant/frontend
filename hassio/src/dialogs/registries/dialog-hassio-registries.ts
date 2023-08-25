import "@material/mwc-button/mwc-button";
import { mdiDelete } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../src/components/ha-form/types";
import "../../../../src/components/ha-icon-button";
import "../../../../src/components/ha-settings-row";
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

@customElement("dialog-hassio-registries")
class HassioRegistriesDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @state() private _registries?: {
    registry: string;
    username: string;
  }[];

  @state() private _input: {
    registry?: string;
    username?: string;
    password?: string;
  } = {};

  @state() private _opened = false;

  @state() private _addingRegistry = false;

  protected render(): TemplateResult {
    return html`
      <ha-dialog
        .open=${this._opened}
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        hideActions
        .heading=${createCloseHeading(
          this.hass,
          this._addingRegistry
            ? this.supervisor.localize("dialog.registries.title_add")
            : this.supervisor.localize("dialog.registries.title_manage")
        )}
      >
        ${this._addingRegistry
          ? html`
              <ha-form
                .data=${this._input}
                .schema=${SCHEMA}
                @value-changed=${this._valueChanged}
                .computeLabel=${this._computeLabel}
                dialogInitialFocus
              ></ha-form>
              <div class="action">
                <mwc-button
                  ?disabled=${Boolean(
                    !this._input.registry ||
                      !this._input.username ||
                      !this._input.password
                  )}
                  @click=${this._addNewRegistry}
                >
                  ${this.supervisor.localize("dialog.registries.add_registry")}
                </mwc-button>
              </div>
            `
          : html`${this._registries?.length
                ? this._registries.map(
                    (entry) => html`
                      <ha-settings-row class="registry">
                        <span slot="heading"> ${entry.registry} </span>
                        <span slot="description">
                          ${this.supervisor.localize(
                            "dialog.registries.username"
                          )}:
                          ${entry.username}
                        </span>
                        <ha-icon-button
                          .entry=${entry}
                          .label=${this.supervisor.localize(
                            "dialog.registries.remove"
                          )}
                          .path=${mdiDelete}
                          @click=${this._removeRegistry}
                        ></ha-icon-button>
                      </ha-settings-row>
                    `
                  )
                : html`
                    <ha-alert>
                      ${this.supervisor.localize(
                        "dialog.registries.no_registries"
                      )}
                    </ha-alert>
                  `}
              <div class="action">
                <mwc-button @click=${this._addRegistry} dialogInitialFocus>
                  ${this.supervisor.localize(
                    "dialog.registries.add_new_registry"
                  )}
                </mwc-button>
              </div> `}
      </ha-dialog>
    `;
  }

  private _computeLabel = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.supervisor.localize(`dialog.registries.${schema.name}`);

  private _valueChanged(ev: CustomEvent) {
    this._input = ev.detail.value;
  }

  public async showDialog(dialogParams: RegistriesDialogParams): Promise<void> {
    this._opened = true;
    this._input = {};
    this.supervisor = dialogParams.supervisor;
    await this._loadRegistries();
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._addingRegistry = false;
    this._opened = false;
    this._input = {};
  }

  public focus(): void {
    this.updateComplete.then(
      () =>
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
    data[this._input.registry!] = {
      username: this._input.username,
      password: this._input.password,
    };

    try {
      await addHassioDockerRegistry(this.hass, data);
      await this._loadRegistries();
      this._addingRegistry = false;
      this._input = {};
    } catch (err: any) {
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
    } catch (err: any) {
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
        .registry {
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          margin-top: 4px;
        }
        .action {
          margin-top: 24px;
          width: 100%;
          display: flex;
          justify-content: flex-end;
        }
        ha-icon-button {
          color: var(--error-color);
          margin-right: -10px;
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

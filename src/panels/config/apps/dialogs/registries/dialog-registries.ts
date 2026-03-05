import { mdiDelete } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-icon-button-prev";
import "../../../../../components/ha-settings-row";
import "../../../../../components/ha-wa-dialog";
import { extractApiErrorMessage } from "../../../../../data/hassio/common";
import {
  addHassioDockerRegistry,
  fetchHassioDockerRegistries,
  removeHassioDockerRegistry,
} from "../../../../../data/hassio/docker";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { fireEvent } from "../../../../../common/dom/fire_event";

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

  @state() private _registries?: {
    registry: string;
    username: string;
  }[];

  @state() private _input: {
    registry?: string;
    username?: string;
    password?: string;
  } = {};

  @state() private _open = false;

  @state() private _addingRegistry = false;

  protected render(): TemplateResult {
    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        @closed=${this._dialogClosed}
        header-title=${this._addingRegistry
          ? this.hass.localize(
              "ui.panel.config.apps.dialog.registries.title_add"
            )
          : this.hass.localize(
              "ui.panel.config.apps.dialog.registries.title_manage"
            )}
      >
        ${this._addingRegistry
          ? html`
              <ha-icon-button-prev
                slot="headerNavigationIcon"
                @click=${this._stopAddingRegistry}
              ></ha-icon-button-prev>
            `
          : ""}
        ${this._addingRegistry
          ? html`
              <ha-form
                autofocus
                .data=${this._input}
                .schema=${SCHEMA}
                @value-changed=${this._valueChanged}
                .computeLabel=${this._computeLabel}
              ></ha-form>
            `
          : html`${this._registries?.length
              ? this._registries.map(
                  (entry) => html`
                    <ha-settings-row class="registry">
                      <span slot="heading"> ${entry.registry} </span>
                      <span slot="description">
                        ${this.hass.localize(
                          "ui.panel.config.apps.dialog.registries.username"
                        )}:
                        ${entry.username}
                      </span>
                      <ha-icon-button
                        .entry=${entry}
                        .label=${this.hass.localize(
                          "ui.panel.config.apps.dialog.registries.remove"
                        )}
                        .path=${mdiDelete}
                        @click=${this._removeRegistry}
                      ></ha-icon-button>
                    </ha-settings-row>
                  `
                )
              : html`
                  <ha-alert>
                    ${this.hass.localize(
                      "ui.panel.config.apps.dialog.registries.no_registries"
                    )}
                  </ha-alert>
                `}`}
        <ha-dialog-footer slot="footer">
          ${this._addingRegistry
            ? html`
                <ha-button
                  slot="primaryAction"
                  ?disabled=${Boolean(
                    !this._input.registry ||
                    !this._input.username ||
                    !this._input.password
                  )}
                  @click=${this._addNewRegistry}
                >
                  ${this.hass.localize(
                    "ui.panel.config.apps.dialog.registries.add_registry"
                  )}
                </ha-button>
              `
            : html`
                <ha-button
                  slot="primaryAction"
                  @click=${this._addRegistry}
                  autofocus
                >
                  ${this.hass.localize(
                    "ui.panel.config.apps.dialog.registries.add_new_registry"
                  )}
                </ha-button>
              `}
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _computeLabel = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass.localize(
      `ui.panel.config.apps.dialog.registries.${schema.name}` as any
    );

  private _valueChanged(ev: CustomEvent) {
    this._input = ev.detail.value;
  }

  public async showDialog(): Promise<void> {
    this._open = true;
    this._input = {};
    await this._loadRegistries();
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._open = false;
    this._stopAddingRegistry();
    fireEvent(this, "dialog-closed");
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

  private _stopAddingRegistry(): void {
    this._addingRegistry = false;
    this._input = {};
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
      this._stopAddingRegistry();
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.apps.dialog.registries.failed_to_add"
        ),
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
        title: this.hass.localize(
          "ui.panel.config.apps.dialog.registries.failed_to_remove"
        ),
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
          border-radius: var(--ha-border-radius-sm);
          margin-top: 4px;
        }
        ha-icon-button {
          color: var(--error-color);
          margin-right: -10px;
          margin-inline-end: -10px;
          margin-inline-start: initial;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-apps-registries": AppsRegistriesDialog;
  }
}

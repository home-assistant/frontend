import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "../../../../src/components/ha-circular-progress";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  query,
  PolymerChangedEvent,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-svg-icon";
import {
  fetchHassioAddonsInfo,
  HassioAddonRepository,
} from "../../../../src/data/hassio/addon";
import { setSupervisorOption } from "../../../../src/data/hassio/supervisor";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { HassioNetworkDialogParams } from "./show-dialog-network";
import { PaperRadioGroupElement } from "@polymer/paper-radio-group/paper-radio-group";

@customElement("dialog-hassio-network")
class HassioNetworkDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) private _network: any = {};

  @property({ attribute: false })
  private _dialogParams?: HassioNetworkDialogParams;

  @query("#repository_input") private _optionInput?: PaperInputElement;

  @internalProperty() private _opened = false;

  @internalProperty() private _prosessing = false;

  @internalProperty() private _error?: string;

  public async showDialog(_dialogParams: any): Promise<void> {
    this._dialogParams = _dialogParams;
    this._opened = true;
    this._network = Object.keys(_dialogParams.network?.interfaces).map(
      (device) => ({
        interface: device,
        data: _dialogParams.network.interfaces[device],
      })
    );
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._opened = false;
    this._error = "";
  }

  private _filteredRepositories = memoizeOne((repos: HassioAddonRepository[]) =>
    repos.sort((a, b) => (a.name < b.name ? -1 : 1))
  );

  protected render(): TemplateResult {
    //const repositories = this._filteredRepositories(this._network);
    console.log(this._network);
    this._network[0].data.method = "manual";
    return html`
      <ha-dialog
        .open=${this._opened}
        @closing=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        heading="Change network"
      >
        ${this._error ? html`<div class="error">${this._error}</div>` : ""}
        <div class="form" @keydown=${this._handleKeyAdd}>
          <paper-radio-group
            name="snapshotType"
            .selected=${this._network[0].data.method}
            @selected-changed=${this._handleRadioValueChanged}
          >
            <paper-radio-button name="auto">
              DHCP
            </paper-radio-button>
            <paper-radio-button name="manual">
              Static
            </paper-radio-button>
          </paper-radio-group>
          ${this._network[0].data.method !== "auto"
            ? html` <paper-input
                  class="flex-auto"
                  id="repository_input"
                  label="IP Address"
                  ?disabled=${this._network[0].data.method === "auto"}
                  .value="${this._network[0].data.ip_address}"
                ></paper-input>
                <paper-input
                  class="flex-auto"
                  id="repository_input"
                  label="Gateway"
                  ?disabled=${this._network[0].data.method === "auto"}
                  .value="${this._network[0].data.gateway}"
                ></paper-input>
                <paper-input
                  class="flex-auto"
                  id="repository_input"
                  label="DNS"
                  ?disabled=${this._network[0].data.method === "auto"}
                  .value="${this._network[0].data.nameservers}"
                ></paper-input>
                NB!: If you are changing IP or gateway addresses, you might
                loose the connection.`
            : ""}
        </div>
        <mwc-button slot="secondaryAction" @click="${this.closeDialog}">
          Close
        </mwc-button>
        <mwc-button slot="primaryAction" @click="${this.closeDialog}">
          Save
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _handleRadioValueChanged(ev: PolymerChangedEvent<string>) {
    this._network[0].data.method = ev.detail.value;
  }

  static get styles(): CSSResult[] {
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
        ha-paper-dropdown-menu {
          display: block;
        }
      `,
    ];
  }

  public focus() {
    this.updateComplete.then(() =>
      (this.shadowRoot?.querySelector(
        "[dialogInitialFocus]"
      ) as HTMLElement)?.focus()
    );
  }

  private _handleKeyAdd(ev: KeyboardEvent) {
    ev.stopPropagation();
    if (ev.keyCode !== 13) {
      return;
    }
    this._addRepository();
  }

  private async _addRepository() {
    const input = this._optionInput;
    if (!input || !input.value) {
      return;
    }
    this._prosessing = true;
    const repositories = this._filteredRepositories(this._network);
    const newRepositories = repositories.map((repo) => {
      return repo.source;
    });
    newRepositories.push(input.value);

    try {
      await setSupervisorOption(this.hass, {
        addons_repositories: newRepositories,
      });

      const addonsInfo = await fetchHassioAddonsInfo(this.hass);
      this._network = addonsInfo.repositories;

      await this._dialogParams!.loadData();

      input.value = "";
    } catch (err) {
      this._error = err.message;
    }
    this._prosessing = false;
  }

  private async _removeRepository(ev: Event) {
    const slug = (ev.currentTarget as any).slug;
    const repositories = this._filteredRepositories(this._network);
    const repository = repositories.find((repo) => {
      return repo.slug === slug;
    });
    if (!repository) {
      return;
    }
    const newRepositories = repositories
      .map((repo) => {
        return repo.source;
      })
      .filter((repo) => {
        return repo !== repository.source;
      });

    try {
      await setSupervisorOption(this.hass, {
        addons_repositories: newRepositories,
      });

      const addonsInfo = await fetchHassioAddonsInfo(this.hass);
      this._network = addonsInfo.repositories;

      await this._dialogParams!.loadData();
    } catch (err) {
      this._error = err.message;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-network": HassioNetworkDialog;
  }
}

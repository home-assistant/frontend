import "@material/mwc-tab-bar";
import "@material/mwc-tab";
import "@material/mwc-icon-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { cache } from "lit-html/directives/cache";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-header-bar";
import "../../../../src/components/ha-svg-icon";
import "../../../../src/components/ha-related-items";

import { haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { mdiClose } from "@mdi/js";
import "../../../../src/../src/components/ha-dialog";
import "../../../../src/../src/components/ha-header-bar";
import "@polymer/paper-radio-group/paper-radio-group";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-input/paper-input";
import type { PolymerChangedEvent } from "../../../../src/../src/polymer-types";
import "@material/mwc-button/mwc-button";

@customElement("dialog-hassio-network")
export class DialogHassioNetwork extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _params?: any;

  @internalProperty() private _network!: any[];

  @internalProperty() private _curTab!: string;

  private _curTabIndex = 0;

  public async showDialog(params: any): Promise<void> {
    this._params = params;
    this._network = Object.keys(params.network?.interfaces)
      .map((device) => ({
        interface: device,
        data: params.network.interfaces[device],
      }))
      .sort((a, b) => {
        return a.data.primary - b.data.primary;
      });
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params || !this._network) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        .heading=${true}
        hideActions
        @closed=${this.closeDialog}
        @close-dialog=${this.closeDialog}
      >
        <div slot="heading">
          <ha-header-bar>
            <mwc-icon-button slot="navigationIcon" dialogAction="cancel">
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </mwc-icon-button>
            <span slot="title">
              Network settings
            </span>
          </ha-header-bar>
          <mwc-tab-bar
            .activeIndex=${this._curTabIndex}
            @MDCTabBar:activated=${this._handleTabActivated}
            @MDCTab:interacted=${this._handleTabInteracted}
          >
            <mwc-tab id="eth0" label="eth0"> </mwc-tab>
            <mwc-tab id="eth1" label="eth1"> </mwc-tab>
          </mwc-tab-bar>
        </div>
        <div class="wrapper">
          ${cache(this._renderTab())}
        </div>
      </ha-dialog>
    `;
  }

  private _renderTab() {
    const device = this._network[this._curTabIndex];
    return html` <div class="form container">
        <paper-radio-group
          name="snapshotType"
          .selected=${device.data.method}
          @selected-changed=${this._handleRadioValueChanged}
        >
          <paper-radio-button name="auto">
            DHCP
          </paper-radio-button>
          <paper-radio-button name="manual">
            Static
          </paper-radio-button>
        </paper-radio-group>
        ${device.data.method !== "auto"
          ? html` <paper-input
                class="flex-auto"
                id="repository_input"
                label="IP Address"
                ?disabled=${device.data.method === "auto"}
                .value="${device.data.ip_address}"
              ></paper-input>
              <paper-input
                class="flex-auto"
                id="repository_input"
                label="Gateway"
                ?disabled=${device.data.method === "auto"}
                .value="${device.data.gateway}"
              ></paper-input>
              <paper-input
                class="flex-auto"
                id="repository_input"
                label="DNS"
                ?disabled=${device.data.method === "auto"}
                .value="${device.data.nameservers}"
              ></paper-input>
              NB!: If you are changing IP or gateway addresses, you might loose
              the connection.`
          : ""}
      </div>
      <div class="buttons">
        <mwc-button @click=${this.closeDialog}>
          close
        </mwc-button>
        <mwc-button @click=${this._updateNetwork}>
          Update
        </mwc-button>
      </div>`;
  }

  private async _updateNetwork() {}

  private _handleTabActivated(ev: CustomEvent): void {
    this._curTabIndex = ev.detail.index;
  }

  private _handleTabInteracted(ev: CustomEvent): void {
    this._curTab = ev.detail.tabId;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
        }

        mwc-tab-bar {
          border-bottom: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
        }

        ha-dialog {
          --dialog-content-position: static;
          --dialog-content-padding: 0;
          --dialog-z-index: 6;
        }

        @media all and (min-width: 451px) and (min-height: 501px) {
          .wrapper {
            width: 400px;
          }
        }

        .content {
          display: block;
          padding: 20px 24px;
        }

        /* overrule the ha-style-dialog max-height on small screens */
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-header-bar {
            --mdc-theme-primary: var(--app-header-background-color);
            --mdc-theme-on-primary: var(--app-header-text-color, white);
          }
        }

        mwc-button.warning {
          --mdc-theme-primary: var(--error-color);
        }

        :host([rtl]) app-toolbar {
          direction: rtl;
          text-align: right;
        }
        .container {
          padding: 20px 24px;
        }
        .form {
          margin-bottom: 53px;
        }
        .buttons {
          position: absolute;
          bottom: 0;
          width: 100%;
          box-sizing: border-box;
          border-top: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
          display: flex;
          justify-content: space-between;
          padding: 8px;
          padding-bottom: max(env(safe-area-inset-bottom), 8px);
          background-color: var(--mdc-theme-surface, #fff);
        }
      `,
    ];
  }

  private _handleRadioValueChanged(ev: PolymerChangedEvent<string>) {
    this._network[this._curTabIndex].data.method = ev.detail.value;
  }

  public focus() {
    this.updateComplete.then(() =>
      (this.shadowRoot?.querySelector(
        "[dialogInitialFocus]"
      ) as HTMLElement)?.focus()
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-network": DialogHassioNetwork;
  }
}

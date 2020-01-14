import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { cache } from "lit-html/directives/cache";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/dialog/ha-paper-dialog";
// tslint:disable-next-line: no-duplicate-imports
import { HaPaperDialog } from "../../../components/dialog/ha-paper-dialog";
import "../../../components/ha-related-items";
import "../../../dialogs/more-info/controls/more-info-content";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import "../../../state-summary/state-card-content";
import { HomeAssistant } from "../../../types";
import "./entity-registry-settings";
import { EntityRegistryDetailDialogParams } from "./show-dialog-entity-registry-detail";

@customElement("dialog-entity-registry-detail")
export class DialogEntityRegistryDetail extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _params?: EntityRegistryDetailDialogParams;
  @property() private _curTab?: string;
  @query("ha-paper-dialog") private _dialog!: HaPaperDialog;
  private _curTabIndex = 0;

  public async showDialog(
    params: EntityRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._params = undefined;
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }
    const entry = this._params.entry;
    const stateObj: HassEntity | undefined = this.hass.states[entry.entity_id];

    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed=${this._openedChanged}
      >
        <h2>
          ${stateObj
            ? computeStateName(stateObj)
            : entry.name || entry.entity_id}
        </h2>
        <paper-tabs
          scrollable
          hide-scroll-buttons
          .selected=${this._curTabIndex}
          @selected-item-changed=${this._handleTabSelected}
        >
          <paper-tab id="tab-settings"
            >${this.hass.localize(
              "ui.panel.config.entities.dialog.settings"
            )}</paper-tab
          >
          <paper-tab id="tab-state"
            >${this.hass.localize(
              "ui.panel.config.entities.dialog.state"
            )}</paper-tab
          >
          <paper-tab id="tab-related"
            >${this.hass.localize(
              "ui.panel.config.entities.dialog.related"
            )}</paper-tab
          >
        </paper-tabs>
        ${cache(
          this._curTab === "tab-settings"
            ? html`
                <entity-registry-settings
                  .hass=${this.hass}
                  .entry=${entry}
                  @close-dialog=${this._closeDialog}
                ></entity-registry-settings>
              `
            : this._curTab === "tab-state"
            ? html`
                <paper-dialog-scrollable>
                  <state-card-content
                    .hass=${this.hass}
                    .stateObj=${stateObj}
                  ></state-card-content>
                  <more-info-content
                    .hass=${this.hass}
                    .stateObj=${stateObj}
                  ></more-info-content>
                </paper-dialog-scrollable>
              `
            : this._curTab === "tab-related"
            ? html`
                <paper-dialog-scrollable>
                  <ha-related-items
                    .hass=${this.hass}
                    .itemId=${entry.entity_id}
                    itemType="entity"
                    @close-dialog=${this._closeDialog}
                  ></ha-related-items>
                </paper-dialog-scrollable>
              `
            : html``
        )}
      </ha-paper-dialog>
    `;
  }

  private _handleTabSelected(ev: CustomEvent): void {
    if (!ev.detail.value) {
      return;
    }
    this._curTab = ev.detail.value.id;
    this._resizeDialog();
  }

  private async _resizeDialog(): Promise<void> {
    await this.updateComplete;
    fireEvent(this._dialog as HTMLElement, "iron-resize");
  }

  private _closeDialog(): void {
    this._params = undefined;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        :host {
          --paper-font-title_-_white-space: normal;
        }
        ha-paper-dialog {
          width: 450px;
        }
        paper-tabs {
          --paper-tabs-selection-bar-color: var(--primary-color);
          text-transform: uppercase;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-entity-registry-detail": DialogEntityRegistryDetail;
  }
}

import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import "@material/mwc-icon-button";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { cache } from "lit-html/directives/cache";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/ha-dialog";
import "../../../components/ha-svg-icon";
import "../../../components/ha-related-items";
import {
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
  getExtendedEntityRegistryEntry,
} from "../../../data/entity_registry";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { PLATFORMS_WITH_SETTINGS_TAB } from "./const";
import "./entity-registry-settings";
import type { EntityRegistryDetailDialogParams } from "./show-dialog-entity-editor";
import { mdiClose, mdiTune } from "@mdi/js";

interface Tabs {
  [key: string]: Tab;
}

interface Tab {
  component: string;
  translationKey: string;
}

@customElement("dialog-entity-editor")
export class DialogEntityEditor extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() private _params?: EntityRegistryDetailDialogParams;

  @property() private _entry?:
    | EntityRegistryEntry
    | ExtEntityRegistryEntry
    | null;

  @property() private _curTab?: string;

  @property() private _extraTabs: Tabs = {};

  @property() private _settingsElementTag?: string;

  private _curTabIndex = 0;

  public async showDialog(
    params: EntityRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._entry = undefined;
    this._settingsElementTag = undefined;
    this._extraTabs = {};
    this._getEntityReg();
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._params = undefined;
  }

  protected render(): TemplateResult {
    if (!this._params || this._entry === undefined) {
      return html``;
    }
    const entityId = this._params.entity_id;
    const entry = this._entry;
    const stateObj: HassEntity | undefined = this.hass.states[entityId];

    return html`
      <ha-dialog
        open
        .heading=${true}
        hideActions
        @closed=${this.closeDialog}
        @close-dialog=${this.closeDialog}
      >
        <div slot="heading">
          <app-toolbar>
            <mwc-icon-button
              .label=${this.hass.localize("ui.dialogs.entity_registry.dismiss")}
              dialogAction="cancel"
            >
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </mwc-icon-button>
            <div class="main-title" main-title>
              ${stateObj ? computeStateName(stateObj) : entry?.name || entityId}
            </div>
            ${stateObj
              ? html`
                  <mwc-icon-button
                    .label=${this.hass.localize(
                      "ui.dialogs.entity_registry.control"
                    )}
                    @click=${this._openMoreInfo}
                  >
                    <ha-svg-icon .path=${mdiTune}></ha-svg-icon>
                  </mwc-icon-button>
                `
              : ""}
          </app-toolbar>
          <paper-tabs
            .selected=${this._curTabIndex}
            @selected-item-changed=${this._handleTabSelected}
          >
            <paper-tab id="tab-settings">
              ${this.hass.localize("ui.dialogs.entity_registry.settings")}
            </paper-tab>
            ${Object.entries(this._extraTabs).map(
              ([key, tab]) => html`
                <paper-tab id=${key}>
                  ${this.hass.localize(tab.translationKey) || key}
                </paper-tab>
              `
            )}
            <paper-tab id="tab-related">
              ${this.hass.localize("ui.dialogs.entity_registry.related")}
            </paper-tab>
          </paper-tabs>
        </div>
        <div class="wrapper">
          ${cache(this._renderTab())}
        </div>
      </ha-dialog>
    `;
  }

  private _renderTab() {
    switch (this._curTab) {
      case "tab-settings":
        if (this._entry) {
          if (this._settingsElementTag) {
            return html`
              ${dynamicElement(this._settingsElementTag, {
                hass: this.hass,
                entry: this._entry,
                entityId: this._params!.entity_id,
              })}
            `;
          }
          return html``;
        }
        return html`
          <div class="content">
            ${this.hass.localize("ui.dialogs.entity_registry.no_unique_id")}
          </div>
        `;
      case "tab-related":
        return html`
          <ha-related-items
            class="content"
            .hass=${this.hass}
            .itemId=${this._params!.entity_id}
            itemType="entity"
          ></ha-related-items>
        `;
      default:
        return html``;
    }
  }

  private async _getEntityReg() {
    try {
      this._entry = await getExtendedEntityRegistryEntry(
        this.hass,
        this._params!.entity_id
      );
      this._loadPlatformSettingTabs();
    } catch {
      this._entry = null;
    }
  }

  private _handleTabSelected(ev: CustomEvent): void {
    if (!ev.detail.value) {
      return;
    }
    this._curTab = ev.detail.value.id;
  }

  private async _loadPlatformSettingTabs(): Promise<void> {
    if (!this._entry) {
      return;
    }
    if (
      !Object.keys(PLATFORMS_WITH_SETTINGS_TAB).includes(this._entry.platform)
    ) {
      this._settingsElementTag = "entity-registry-settings";
      return;
    }
    const tag = PLATFORMS_WITH_SETTINGS_TAB[this._entry.platform];
    await import(`./editor-tabs/settings/${tag}`);
    this._settingsElementTag = tag;
  }

  private _openMoreInfo(): void {
    fireEvent(this, "hass-more-info", {
      entityId: this._params!.entity_id,
    });
    this.closeDialog();
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        app-toolbar {
          color: var(--primary-text-color);
          background-color: var(--secondary-background-color);
          margin: 0;
          padding: 0 16px;
        }

        app-toolbar [main-title] {
          /* Design guideline states 24px, changed to 16 to align with state info */
          margin-left: 16px;
          line-height: 1.3em;
          max-height: 2.6em;
          overflow: hidden;
          /* webkit and blink still support simple multiline text-overflow */
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          text-overflow: ellipsis;
        }

        ha-dialog {
          --dialog-content-padding: 0;
        }

        @media all and (min-width: 451px) and (min-height: 501px) {
          .main-title {
            pointer-events: auto;
            cursor: default;
          }
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
          app-toolbar {
            background-color: var(--app-header-background-color);
            color: var(--app-header-text-color, white);
          }
        }

        mwc-button.warning {
          --mdc-theme-primary: var(--error-color);
        }

        :host([rtl]) app-toolbar {
          direction: rtl;
          text-align: right;
        }
        :host {
          --paper-font-title_-_white-space: normal;
        }
        paper-tabs {
          --paper-tabs-selection-bar-color: var(--primary-color);
          text-transform: uppercase;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          margin-top: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-entity-editor": DialogEntityEditor;
  }
}

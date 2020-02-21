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
import { PLATFORMS_WITH_SETTINGS_TAB } from "./const";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/dialog/ha-paper-dialog";
// tslint:disable-next-line: no-duplicate-imports
import { HaPaperDialog } from "../../../components/dialog/ha-paper-dialog";
import "../../../components/ha-related-items";
import {
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
  getExtendedEntityRegistryEntry,
} from "../../../data/entity_registry";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "./entity-registry-settings";
import { EntityRegistryDetailDialogParams } from "./show-dialog-entity-editor";

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
  @query("ha-paper-dialog") private _dialog!: HaPaperDialog;
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
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed=${this._openedChanged}
        @close-dialog=${this.closeDialog}
      >
        <app-toolbar>
          <paper-icon-button
            aria-label=${this.hass.localize(
              "ui.dialogs.entity_registry.dismiss"
            )}
            icon="hass:close"
            dialog-dismiss
          ></paper-icon-button>
          <div class="main-title" main-title>
            ${stateObj ? computeStateName(stateObj) : entry?.name || entityId}
          </div>
          ${stateObj
            ? html`
                <paper-icon-button
                  aria-label=${this.hass.localize(
                    "ui.dialogs.entity_registry.control"
                  )}
                  icon="hass:tune"
                  @click=${this._openMoreInfo}
                ></paper-icon-button>
              `
            : ""}
        </app-toolbar>
        <paper-tabs
          scrollable
          hide-scroll-buttons
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
        ${cache(
          this._curTab === "tab-settings"
            ? entry
              ? this._settingsElementTag
                ? html`
                    ${dynamicElement(this._settingsElementTag, {
                      hass: this.hass,
                      entry,
                      entityId,
                      dialogElement: this._dialog,
                    })}
                  `
                : ""
              : html`
                  <paper-dialog-scrollable>
                    ${this.hass.localize(
                      "ui.dialogs.entity_registry.no_unique_id"
                    )}
                  </paper-dialog-scrollable>
                `
            : this._curTab === "tab-related"
            ? html`
                <paper-dialog-scrollable>
                  <ha-related-items
                    .hass=${this.hass}
                    .itemId=${entityId}
                    itemType="entity"
                  ></ha-related-items>
                </paper-dialog-scrollable>
              `
            : html``
        )}
      </ha-paper-dialog>
    `;
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
    this._resizeDialog();
  }

  private async _resizeDialog(): Promise<void> {
    await this.updateComplete;
    fireEvent(this._dialog as HTMLElement, "iron-resize");
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

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
    }
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

        @media all and (min-width: 451px) and (min-height: 501px) {
          .main-title {
            pointer-events: auto;
            cursor: default;
          }
        }

        ha-paper-dialog {
          width: 450px;
        }

        /* overrule the ha-style-dialog max-height on small screens */
        @media all and (max-width: 450px), all and (max-height: 500px) {
          app-toolbar {
            background-color: var(--primary-color);
            color: var(--text-primary-color);
          }
          ha-paper-dialog {
            height: 100%;
            max-height: 100% !important;
            width: 100% !important;
            border-radius: 0px;
            position: fixed !important;
            margin: 0;
          }
          ha-paper-dialog::before {
            content: "";
            position: fixed;
            z-index: -1;
            top: 0px;
            left: 0px;
            right: 0px;
            bottom: 0px;
            background-color: inherit;
          }
        }

        paper-dialog-scrollable {
          padding-bottom: 16px;
        }

        mwc-button.warning {
          --mdc-theme-primary: var(--google-red-500);
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

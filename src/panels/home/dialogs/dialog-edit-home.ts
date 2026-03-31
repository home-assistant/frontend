import { mdiClose, mdiPlus } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entities-picker";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-dialog";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-picker";
import "../../../components/ha-navigation-picker";
import "../../../components/ha-svg-icon";
import "../../../components/ha-switch";
import "../../../components/ha-textfield";
import type {
  HomeFrontendSystemData,
  HomeQuickLink,
} from "../../../data/frontend";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import {
  HOME_SUMMARIES,
  getSummaryLabel,
  type HomeSummary,
} from "../../../panels/lovelace/strategies/home/helpers/home-summaries";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { EditHomeDialogParams } from "./show-dialog-edit-home";

const ALL_SUMMARY_KEYS = [...HOME_SUMMARIES, "weather"] as const;

@customElement("dialog-edit-home")
export class DialogEditHome
  extends LitElement
  implements HassDialog<EditHomeDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EditHomeDialogParams;

  @state() private _config?: HomeFrontendSystemData;

  @state() private _open = false;

  @state() private _submitting = false;

  public showDialog(params: EditHomeDialogParams): void {
    this._params = params;
    this._config = { ...params.config };
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._config = undefined;
    this._submitting = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const hiddenSummaries = new Set(this._config?.hidden_summaries || []);
    const quickLinks = this._config?.quick_links || [];

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        .headerTitle=${this.hass.localize("ui.panel.home.editor.title")}
        prevent-scrim-close
        @closed=${this._dialogClosed}
      >
        <p class="description">
          ${this.hass.localize("ui.panel.home.editor.description")}
        </p>

        <ha-entities-picker
          autofocus
          .hass=${this.hass}
          .value=${this._config?.favorite_entities || []}
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.strategy.home.favorite_entities"
          )}
          .placeholder=${this.hass.localize(
            "ui.panel.lovelace.editor.strategy.home.add_favorite_entity"
          )}
          .helper=${this.hass.localize(
            "ui.panel.home.editor.favorite_entities_helper"
          )}
          reorder
          @value-changed=${this._favoriteEntitiesChanged}
        ></ha-entities-picker>

        <h3 class="section-header">
          ${this.hass.localize("ui.panel.home.editor.summaries")}
        </h3>
        <p class="section-description">
          ${this.hass.localize("ui.panel.home.editor.summaries_description")}
        </p>
        <div class="summary-toggles">
          ${ALL_SUMMARY_KEYS.map((key) => {
            const label = this._getSummaryLabel(key);
            return html`
              <label class="summary-toggle">
                <ha-switch
                  .checked=${!hiddenSummaries.has(key)}
                  .summary=${key}
                  @change=${this._summaryToggleChanged}
                ></ha-switch>
                <span>${label}</span>
              </label>
            `;
          })}
        </div>

        <h3 class="section-header">
          ${this.hass.localize("ui.panel.home.editor.quick_links")}
        </h3>
        <p class="section-description">
          ${this.hass.localize("ui.panel.home.editor.quick_links_description")}
        </p>
        <div class="quick-links">
          ${repeat(
            quickLinks,
            (_link, index) => index,
            (link, index) => html`
              <div class="quick-link-row">
                <ha-icon-picker
                  .hass=${this.hass}
                  .value=${link.icon || ""}
                  .label=${this.hass.localize(
                    "ui.panel.home.editor.quick_link_icon"
                  )}
                  @value-changed=${(ev: CustomEvent) =>
                    this._quickLinkChanged(index, "icon", ev.detail.value)}
                ></ha-icon-picker>
                <ha-textfield
                  .value=${link.name}
                  .label=${this.hass.localize(
                    "ui.panel.home.editor.quick_link_name"
                  )}
                  @input=${(ev: InputEvent) =>
                    this._quickLinkChanged(
                      index,
                      "name",
                      (ev.target as HTMLInputElement).value
                    )}
                ></ha-textfield>
                <ha-navigation-picker
                  .hass=${this.hass}
                  .value=${link.navigation_path}
                  .label=${this.hass.localize(
                    "ui.panel.home.editor.quick_link_path"
                  )}
                  @value-changed=${(ev: CustomEvent) =>
                    this._quickLinkChanged(
                      index,
                      "navigation_path",
                      ev.detail.value
                    )}
                ></ha-navigation-picker>
                <ha-icon-button
                  .path=${mdiClose}
                  .label=${this.hass.localize("ui.common.remove")}
                  @click=${() => this._removeQuickLink(index)}
                ></ha-icon-button>
              </div>
            `
          )}
          <ha-button @click=${this._addQuickLink}>
            <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
            ${this.hass.localize("ui.panel.home.editor.add_quick_link")}
          </ha-button>
        </div>

        <ha-alert alert-type="info">
          ${this.hass.localize("ui.panel.home.editor.areas_hint", {
            areas_page: html`<a
              href="/config/areas?historyBack=1"
              @click=${this.closeDialog}
              >${this.hass.localize("ui.panel.home.editor.areas_page")}</a
            >`,
          })}
        </ha-alert>

        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            slot="secondaryAction"
            @click=${this.closeDialog}
            .disabled=${this._submitting}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${this._submitting}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _getSummaryLabel(key: string): string {
    if (key === "weather") {
      return this.hass.localize(
        "ui.panel.lovelace.strategy.home.summary_list.weather"
      );
    }
    return getSummaryLabel(this.hass.localize, key as HomeSummary);
  }

  private _summaryToggleChanged(ev: Event): void {
    const target = ev.target as HTMLElement & {
      checked: boolean;
      summary: string;
    };
    const summary = target.summary;
    const checked = target.checked;

    const hiddenSummaries = new Set(this._config?.hidden_summaries || []);

    if (checked) {
      hiddenSummaries.delete(summary);
    } else {
      hiddenSummaries.add(summary);
    }

    this._config = {
      ...this._config,
      hidden_summaries:
        hiddenSummaries.size > 0 ? [...hiddenSummaries] : undefined,
    };
  }

  private _quickLinkChanged(
    index: number,
    field: keyof HomeQuickLink,
    value: string
  ): void {
    const quickLinks = [...(this._config?.quick_links || [])];
    quickLinks[index] = { ...quickLinks[index], [field]: value };
    this._config = {
      ...this._config,
      quick_links: quickLinks,
    };
  }

  private _removeQuickLink(index: number): void {
    const quickLinks = [...(this._config?.quick_links || [])];
    quickLinks.splice(index, 1);
    this._config = {
      ...this._config,
      quick_links: quickLinks.length > 0 ? quickLinks : undefined,
    };
  }

  private _addQuickLink(): void {
    const quickLinks = [...(this._config?.quick_links || [])];
    quickLinks.push({ name: "", icon: "mdi:link", navigation_path: "" });
    this._config = {
      ...this._config,
      quick_links: quickLinks,
    };
  }

  private _favoriteEntitiesChanged(ev: CustomEvent): void {
    const entities = ev.detail.value as string[];
    this._config = {
      ...this._config,
      favorite_entities: entities.length > 0 ? entities : undefined,
    };
  }

  private async _save(): Promise<void> {
    if (!this._params || !this._config) {
      return;
    }

    this._submitting = true;

    try {
      await this._params.saveConfig(this._config);
      this.closeDialog();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Failed to save home configuration:", err);
    } finally {
      this._submitting = false;
    }
  }

  static styles = [
    haStyleDialog,
    css`
      ha-dialog {
        --dialog-content-padding: var(--ha-space-6);
      }

      .description {
        margin: 0 0 var(--ha-space-4) 0;
        color: var(--secondary-text-color);
      }

      .section-header {
        font-size: 16px;
        font-weight: 500;
        margin: var(--ha-space-6) 0 var(--ha-space-1) 0;
      }

      .section-description {
        margin: 0 0 var(--ha-space-2) 0;
        color: var(--secondary-text-color);
        font-size: 14px;
      }

      .summary-toggles {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-2);
      }

      .summary-toggle {
        display: flex;
        align-items: center;
        gap: var(--ha-space-3);
        padding: var(--ha-space-1) 0;
        cursor: pointer;
      }

      .quick-links {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-3);
      }

      .quick-link-row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
      }

      .quick-link-row ha-icon-picker {
        width: 80px;
        flex-shrink: 0;
      }

      .quick-link-row ha-textfield {
        flex: 1;
        min-width: 0;
      }

      .quick-link-row ha-navigation-picker {
        flex: 2;
        min-width: 0;
      }

      .quick-link-row ha-icon-button {
        flex-shrink: 0;
      }

      ha-entities-picker {
        display: block;
      }

      ha-alert {
        display: block;
        margin-top: var(--ha-space-4);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-edit-home": DialogEditHome;
  }
}

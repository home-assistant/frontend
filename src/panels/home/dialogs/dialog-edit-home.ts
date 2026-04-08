import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entities-picker";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-dialog";
import "../../../components/ha-form/ha-form";
import "../../../components/ha-icon";
import "../../../components/ha-switch";
import type { HaFormSchema } from "../../../components/ha-form/types";
import type { HomeFrontendSystemData } from "../../../data/frontend";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import {
  getSummaryLabel,
  HOME_SUMMARIES_ICONS,
  type HomeSummary,
} from "../../lovelace/strategies/home/helpers/home-summaries";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { EditHomeDialogParams } from "./show-dialog-edit-home";

interface SummaryInfo {
  key: string;
  icon: string;
  color: string;
}

const SUGGESTED_ENTITIES_SCHEMA: HaFormSchema[] = [
  { name: "show_suggested", selector: { boolean: {} } },
];

// Ordered to match dashboard rendering order
const SUMMARY_ITEMS: SummaryInfo[] = [
  { key: "light", icon: HOME_SUMMARIES_ICONS.light, color: "amber" },
  { key: "climate", icon: HOME_SUMMARIES_ICONS.climate, color: "deep-orange" },
  {
    key: "security",
    icon: HOME_SUMMARIES_ICONS.security,
    color: "blue-grey",
  },
  {
    key: "media_players",
    icon: HOME_SUMMARIES_ICONS.media_players,
    color: "blue",
  },
  { key: "weather", icon: "mdi:weather-partly-cloudy", color: "teal" },
  { key: "energy", icon: HOME_SUMMARIES_ICONS.energy, color: "amber" },
];

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

        <ha-form
          .hass=${this.hass}
          .data=${{ welcome_message: !this._config?.hide_welcome_message }}
          .schema=${[
            {
              name: "welcome_message",
              selector: { boolean: {} },
            },
          ]}
          .computeLabel=${this._computeWelcomeLabel}
          .computeHelper=${this._computeWelcomeHelper}
          @value-changed=${this._welcomeMessageToggleChanged}
        ></ha-form>

        <ha-form
          .hass=${this.hass}
          .data=${{ show_suggested: !this._config?.hide_suggested_entities }}
          .schema=${SUGGESTED_ENTITIES_SCHEMA}
          .computeLabel=${this._computeSuggestedLabel}
          .computeHelper=${this._computeSuggestedHelper}
          @value-changed=${this._suggestedEntitiesChanged}
        ></ha-form>

        <h3 class="section-header">
          ${this.hass.localize("ui.panel.home.editor.summaries")}
        </h3>
        <p class="section-description">
          ${this.hass.localize("ui.panel.home.editor.summaries_description")}
        </p>
        <div class="summary-toggles">
          ${SUMMARY_ITEMS.map((item) => {
            const label = this._getSummaryLabel(item.key);
            const color = computeCssColor(item.color);
            return html`
              <label class="summary-toggle">
                <ha-icon
                  .icon=${item.icon}
                  style=${styleMap({ "--mdc-icon-size": "24px", color })}
                ></ha-icon>
                <span class="summary-label">${label}</span>
                <ha-switch
                  .checked=${!hiddenSummaries.has(item.key)}
                  .summary=${item.key}
                  @change=${this._summaryToggleChanged}
                ></ha-switch>
              </label>
            `;
          })}
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

  private _computeWelcomeLabel = () =>
    this.hass.localize("ui.panel.home.editor.welcome_message");

  private _computeWelcomeHelper = () =>
    this.hass.localize("ui.panel.home.editor.welcome_message_helper");

  private _welcomeMessageToggleChanged(ev: CustomEvent): void {
    this._config = {
      ...this._config,
      hide_welcome_message: ev.detail.value.welcome_message ? undefined : true,
    };
  }

  private _computeSuggestedLabel = (_schema: HaFormSchema): string =>
    this.hass.localize("ui.panel.home.editor.suggested_entities");

  private _computeSuggestedHelper = (_schema: HaFormSchema): string =>
    this.hass.localize("ui.panel.home.editor.suggested_entities_description");

  private _suggestedEntitiesChanged(ev: CustomEvent): void {
    const showSuggested = (ev.detail.value as { show_suggested: boolean })
      .show_suggested;
    this._config = {
      ...this._config,
      hide_suggested_entities: showSuggested ? undefined : true,
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
      }

      .summary-toggle {
        display: flex;
        align-items: center;
        gap: var(--ha-space-3);
        padding: var(--ha-space-2) 0;
        cursor: pointer;
      }

      .summary-label {
        flex: 1;
        font-size: 14px;
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

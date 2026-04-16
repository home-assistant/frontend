import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { fireEvent, type HASSDomEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entities-picker";
import "../../../components/ha-alert";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-dialog";
import "../../../components/ha-form/ha-form";
import "../../../components/ha-icon";
import "../../../components/ha-navigation-picker";
import "../../../components/ha-switch";
import type { HaFormSchema } from "../../../components/ha-form/types";
import type {
  CustomShortcutItem,
  HomeFrontendSystemData,
} from "../../../data/frontend";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import {
  getSummaryLabel,
  HOME_SUMMARIES_ICONS,
  type HomeSummary,
} from "../../lovelace/strategies/home/helpers/home-summaries";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "../components/home-shortcut-list-item";
import type { EditHomeDialogParams } from "./show-dialog-edit-home";
import { showEditShortcutDialog } from "./show-dialog-edit-shortcut";

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

// Paths already covered by built-in summaries
const SUMMARY_PANEL_PATHS = [
  "/home",
  "/light",
  "/climate",
  "/security",
  "/energy",
  "/maintenance",
];

const WELCOME_MESSAGE_SCHEMA = [
  { name: "welcome_message", selector: { boolean: {} } },
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
    const customShortcuts = this._config?.custom_shortcuts || [];
    const excludePaths = [
      ...SUMMARY_PANEL_PATHS,
      ...customShortcuts.map((s) => s.path),
    ];

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        .headerTitle=${this.hass.localize("ui.panel.home.editor.title")}
        .headerSubtitle=${this.hass.localize(
          "ui.panel.home.editor.description"
        )}
        prevent-scrim-close
        @closed=${this._dialogClosed}
      >
        <ha-alert alert-type="info">
          ${this.hass.localize("ui.panel.home.editor.areas_hint", {
            areas_page: html`<a
              href="/config/areas?historyBack=1"
              @click=${this.closeDialog}
              >${this.hass.localize("ui.panel.home.editor.areas_page")}</a
            >`,
          })}
        </ha-alert>

        <ha-expansion-panel
          outlined
          expanded
          .header=${this.hass.localize(
            "ui.panel.lovelace.editor.strategy.home.favorite_entities"
          )}
        >
          <ha-icon slot="leading-icon" icon="mdi:star-outline"></ha-icon>
          <div class="expansion-content">
            <ha-entities-picker
              autofocus
              .hass=${this.hass}
              .value=${this._config?.favorite_entities || []}
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
              .data=${{
                show_suggested: !this._config?.hide_suggested_entities,
              }}
              .schema=${SUGGESTED_ENTITIES_SCHEMA}
              .computeLabel=${this._computeSuggestedLabel}
              .computeHelper=${this._computeSuggestedHelper}
              @value-changed=${this._suggestedEntitiesChanged}
            ></ha-form>
          </div>
        </ha-expansion-panel>

        <h3 class="section-header">
          ${this.hass.localize("ui.panel.home.editor.welcome_message")}
        </h3>
        <p class="section-description">
          ${this.hass.localize("ui.panel.home.editor.welcome_message_helper")}
        </p>
        <ha-form
          .hass=${this.hass}
          .data=${{ welcome_message: !this._config?.hide_welcome_message }}
          .schema=${WELCOME_MESSAGE_SCHEMA}
          .computeLabel=${this._computeWelcomeLabel}
          @value-changed=${this._welcomeMessageToggleChanged}
        ></ha-form>

        <h3 class="section-header">
          ${this.hass.localize("ui.panel.home.editor.summaries")}
        </h3>
        <p class="section-description">
          ${this.hass.localize("ui.panel.home.editor.summaries_description")}
        </p>
        <div class="home-list">
          ${SUMMARY_ITEMS.map((item) => {
            const label = this._getSummaryLabel(item.key);
            const color = computeCssColor(item.color);
            return html`
              <label class="home-list-item summary-toggle">
                <ha-icon
                  .icon=${item.icon}
                  style=${styleMap({ "--mdc-icon-size": "24px", color })}
                ></ha-icon>
                <span class="label">${label}</span>
                <ha-switch
                  .checked=${!hiddenSummaries.has(item.key)}
                  .summary=${item.key}
                  @change=${this._summaryToggleChanged}
                ></ha-switch>
              </label>
            `;
          })}
        </div>

        <h3 class="section-header">
          ${this.hass.localize("ui.panel.home.editor.custom_shortcuts")}
        </h3>
        <p class="section-description">
          ${this.hass.localize(
            "ui.panel.home.editor.custom_shortcuts_description"
          )}
        </p>
        <div class="home-list">
          ${customShortcuts.map(
            (item, index) => html`
              <home-shortcut-list-item
                class="home-list-item"
                .hass=${this.hass}
                .item=${item}
                .index=${index}
                @edit-shortcut=${this._editShortcut}
                @delete-shortcut=${this._removeShortcut}
              ></home-shortcut-list-item>
            `
          )}
        </div>
        <ha-navigation-picker
          .hass=${this.hass}
          .addButtonLabel=${this.hass.localize(
            "ui.panel.home.editor.add_custom_shortcut"
          )}
          .excludePaths=${excludePaths}
          @value-changed=${this._addShortcut}
        ></ha-navigation-picker>

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

  private _welcomeMessageToggleChanged(ev: CustomEvent): void {
    this._config = {
      ...this._config,
      hide_welcome_message: ev.detail.value.welcome_message ? undefined : true,
    };
  }

  private _computeSuggestedLabel = (): string =>
    this.hass.localize("ui.panel.home.editor.suggested_entities");

  private _computeSuggestedHelper = (): string =>
    this.hass.localize("ui.panel.home.editor.suggested_entities_description");

  private _suggestedEntitiesChanged(ev: CustomEvent): void {
    const showSuggested = (ev.detail.value as { show_suggested: boolean })
      .show_suggested;
    this._config = {
      ...this._config,
      hide_suggested_entities: showSuggested ? undefined : true,
    };
  }

  private _updateShortcuts(
    updater: (shortcuts: CustomShortcutItem[]) => CustomShortcutItem[]
  ): void {
    const next = updater([...(this._config?.custom_shortcuts || [])]);
    this._config = {
      ...this._config,
      custom_shortcuts: next.length > 0 ? next : undefined,
    };
  }

  private _addShortcut(ev: CustomEvent): void {
    ev.stopPropagation();
    const path = ev.detail.value as string;
    if (!path) return;

    (ev.currentTarget as any).value = "";

    this._updateShortcuts((shortcuts) =>
      shortcuts.some((item) => item.path === path)
        ? shortcuts
        : [...shortcuts, { path }]
    );
  }

  private _editShortcut(ev: HASSDomEvent<{ index: number }>): void {
    const { index } = ev.detail;
    const item = this._config?.custom_shortcuts?.[index];
    if (!item) return;

    showEditShortcutDialog(this, {
      item,
      saveCallback: (updated) => {
        this._updateShortcuts((shortcuts) => {
          shortcuts[index] = updated;
          return shortcuts;
        });
      },
    });
  }

  private _removeShortcut(ev: HASSDomEvent<{ index: number }>): void {
    const { index } = ev.detail;
    this._updateShortcuts((shortcuts) => {
      shortcuts.splice(index, 1);
      return shortcuts;
    });
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

      .home-list {
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

      .summary-toggle .label {
        flex: 1;
        font-size: 14px;
      }

      ha-expansion-panel {
        display: block;
        margin-top: var(--ha-space-4);
        --expansion-panel-content-padding: 0;
        border-radius: var(--ha-border-radius-md);
        --ha-card-border-radius: var(--ha-border-radius-md);
      }

      .expansion-content {
        padding: var(--ha-space-3);
      }

      ha-navigation-picker {
        display: block;
        padding-top: var(--ha-space-2);
      }

      ha-entities-picker {
        display: block;
      }

      ha-alert {
        display: block;
        margin: 0 calc(-1 * var(--dialog-content-padding));
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-edit-home": DialogEditHome;
  }
}

import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-dialog";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-form/ha-form";
import "../../../components/ha-icon";
import type { HaFormSchema } from "../../../components/ha-form/types";
import type {
  CustomShortcutItem,
  HomeFrontendSystemData,
  HomeSummaryConfig,
} from "../../../data/frontend";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import "../components/home-custom-shortcuts-editor";
import "../components/home-favorites-editor";
import "../components/home-summaries-editor";
import type { EditHomeDialogParams } from "./show-dialog-edit-home";

// Default summary order — must match SUMMARY_META keys in home-summaries-editor.ts
const DEFAULT_SUMMARY_ORDER = [
  "light",
  "climate",
  "security",
  "media_players",
  "maintenance",
  "weather",
  "energy",
] as const;

// Builds the initial summaries state when no `summaries` config exists yet
// (new user or migration from legacy `hidden_summaries`).
function buildDefaultSummaries(hiddenKeys: string[]): HomeSummaryConfig[] {
  const hidden = new Set(hiddenKeys);
  return DEFAULT_SUMMARY_ORDER.map((key) => ({
    key,
    ...(hidden.has(key) && { hidden: true }),
  }));
}

interface EditorState {
  favorite_entities: string[];
  show_suggested_entities: boolean;
  show_welcome_message: boolean;
  summaries: HomeSummaryConfig[];
  custom_shortcuts: CustomShortcutItem[];
}

// The common-controls strategy caps the section at 8 (or the favorites count,
// whichever is larger); once favorites reach the cap, predictions never render
// so the suggested-entities toggle has no effect.
const SUGGESTED_ENTITIES_CAP = 8;

const WELCOME_SCHEMA: HaFormSchema[] = [
  { name: "show_welcome_message", selector: { boolean: {} } },
];

@customElement("dialog-edit-home")
export class DialogEditHome
  extends LitElement
  implements HassDialog<EditHomeDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EditHomeDialogParams;

  @state() private _state?: EditorState;

  @state() private _open = false;

  @state() private _submitting = false;

  public showDialog(params: EditHomeDialogParams): void {
    this._params = params;
    this._state = {
      favorite_entities: params.config.favorite_entities
        ? [...params.config.favorite_entities]
        : [],
      show_suggested_entities: !params.config.hide_suggested_entities,
      show_welcome_message: !params.config.hide_welcome_message,
      summaries: params.config.summaries
        ? [...params.config.summaries]
        : buildDefaultSummaries(params.config.hidden_summaries ?? []),
      custom_shortcuts: params.config.custom_shortcuts
        ? [...params.config.custom_shortcuts]
        : [],
    };
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._state = undefined;
    this._submitting = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._state) {
      return nothing;
    }

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
          .header=${this.hass.localize("ui.panel.home.editor.personalize")}
          .secondary=${this.hass.localize(
            "ui.panel.home.editor.personalize_description"
          )}
        >
          <ha-icon slot="leading-icon" icon="mdi:palette-outline"></ha-icon>
          <div class="expansion-content">
            <ha-form
              .hass=${this.hass}
              .data=${{
                show_welcome_message: this._state.show_welcome_message,
              }}
              .schema=${WELCOME_SCHEMA}
              .computeLabel=${this._computeWelcomeLabel}
              .computeHelper=${this._computeWelcomeHelper}
              @value-changed=${this._welcomeChanged}
            ></ha-form>

            <home-favorites-editor
              .hass=${this.hass}
              .favorites=${this._state.favorite_entities}
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.strategy.home.favorite_entities"
              )}
              @value-changed=${this._favoriteEntitiesChanged}
            ></home-favorites-editor>

            <ha-form
              .hass=${this.hass}
              .data=${{
                show_suggested_entities: this._state.show_suggested_entities,
              }}
              .schema=${this._suggestedSchema(
                this._state.favorite_entities.length >= SUGGESTED_ENTITIES_CAP
              )}
              .computeLabel=${this._computeSuggestedLabel}
              .computeHelper=${this._computeSuggestedHelper}
              @value-changed=${this._suggestedChanged}
            ></ha-form>
          </div>
        </ha-expansion-panel>

        <ha-expansion-panel
          outlined
          expanded
          .header=${this.hass.localize("ui.panel.home.editor.summaries")}
          .secondary=${this.hass.localize(
            "ui.panel.home.editor.summaries_description"
          )}
        >
          <ha-icon
            slot="leading-icon"
            icon="mdi:view-dashboard-outline"
          ></ha-icon>
          <div class="expansion-content">
            <home-summaries-editor
              .hass=${this.hass}
              .summaries=${this._state.summaries}
              @value-changed=${this._summariesChanged}
            ></home-summaries-editor>
          </div>
        </ha-expansion-panel>

        <ha-expansion-panel
          outlined
          expanded
          .header=${this.hass.localize("ui.panel.home.editor.custom_shortcuts")}
          .secondary=${this.hass.localize(
            "ui.panel.home.editor.custom_shortcuts_description"
          )}
        >
          <ha-icon slot="leading-icon" icon="mdi:link-variant"></ha-icon>
          <div class="expansion-content">
            <home-custom-shortcuts-editor
              .hass=${this.hass}
              .shortcuts=${this._state.custom_shortcuts}
              @value-changed=${this._shortcutsChanged}
            ></home-custom-shortcuts-editor>
          </div>
        </ha-expansion-panel>

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

  private _suggestedSchema = memoizeOne(
    (disabled: boolean) =>
      [
        {
          name: "show_suggested_entities",
          selector: { boolean: {} },
          disabled,
        },
      ] as HaFormSchema[]
  );

  private _computeWelcomeLabel = (): string =>
    this.hass.localize("ui.panel.home.editor.welcome_message");

  private _computeWelcomeHelper = (): string =>
    this.hass.localize("ui.panel.home.editor.welcome_message_helper");

  private _computeSuggestedLabel = (): string =>
    this.hass.localize("ui.panel.home.editor.suggested_entities");

  private _computeSuggestedHelper = (): string => {
    const favoritesFull =
      (this._state?.favorite_entities.length ?? 0) >= SUGGESTED_ENTITIES_CAP;
    return this.hass.localize(
      favoritesFull
        ? "ui.panel.home.editor.suggested_entities_disabled_description"
        : "ui.panel.home.editor.suggested_entities_description"
    );
  };

  private _favoriteEntitiesChanged(ev: ValueChangedEvent<string[]>): void {
    this._state = {
      ...this._state!,
      favorite_entities: ev.detail.value,
    };
  }

  private _welcomeChanged(
    ev: ValueChangedEvent<{ show_welcome_message: boolean }>
  ): void {
    this._state = {
      ...this._state!,
      show_welcome_message: ev.detail.value.show_welcome_message,
    };
  }

  private _suggestedChanged(
    ev: ValueChangedEvent<{ show_suggested_entities: boolean }>
  ): void {
    this._state = {
      ...this._state!,
      show_suggested_entities: ev.detail.value.show_suggested_entities,
    };
  }

  private _summariesChanged(ev: ValueChangedEvent<HomeSummaryConfig[]>): void {
    this._state = {
      ...this._state!,
      summaries: ev.detail.value,
    };
  }

  private _shortcutsChanged(ev: ValueChangedEvent<CustomShortcutItem[]>): void {
    this._state = {
      ...this._state!,
      custom_shortcuts: ev.detail.value,
    };
  }

  private async _save(): Promise<void> {
    if (!this._params || !this._state) return;

    this._submitting = true;
    const editor = this._state;

    const config: HomeFrontendSystemData = {
      ...this._params.config,
      favorite_entities:
        editor.favorite_entities.length > 0
          ? editor.favorite_entities
          : undefined,
      hide_suggested_entities: editor.show_suggested_entities
        ? undefined
        : true,
      hide_welcome_message: editor.show_welcome_message ? undefined : true,
      summaries: editor.summaries,
      // hidden_summaries is intentionally omitted: it is superseded by
      // summaries. Existing values from the loaded config are preserved via
      // the spread above only until the user saves, at which point summaries
      // takes over.
      hidden_summaries: undefined,
      custom_shortcuts:
        editor.custom_shortcuts.length > 0
          ? editor.custom_shortcuts
          : undefined,
    };

    try {
      await this._params.saveConfig(config);
      this.closeDialog();
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

      ha-expansion-panel {
        display: block;
        --expansion-panel-content-padding: 0;
        border-radius: var(--ha-border-radius-md);
        --ha-card-border-radius: var(--ha-border-radius-md);
      }

      ha-expansion-panel + ha-expansion-panel {
        margin-top: var(--ha-space-2);
      }

      .expansion-content {
        padding: var(--ha-space-3);
      }

      ha-form {
        display: block;
      }

      home-favorites-editor {
        display: block;
        margin-top: var(--ha-space-2);
        margin-bottom: var(--ha-space-4);
      }

      ha-alert {
        display: block;
        margin: calc(-1 * var(--dialog-content-padding));
        margin-bottom: var(--ha-space-4);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-edit-home": DialogEditHome;
  }
}

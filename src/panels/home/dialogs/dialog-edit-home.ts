import { css, html, LitElement, nothing } from "lit";
import type { PropertyValues } from "lit";
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
import type { HomeFrontendSystemData } from "../../../data/frontend";
import type { ShortcutItem } from "../../../data/home_shortcuts";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { DirtyStateProviderMixin } from "../../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import "../../../components/entity/ha-favorites-editor";
import "../components/home-shortcuts-editor";
import { HomeConfigDraftSession } from "./home-config-draft-session";
import type { EditHomeDialogParams } from "./show-dialog-edit-home";

export interface EditorState {
  favorite_entities: string[];
  show_suggested_entities: boolean;
  show_welcome_message: boolean;
  shortcuts: ShortcutItem[];
}

export const buildHomeConfig = (
  baseConfig: HomeFrontendSystemData,
  draft: EditorState
): HomeFrontendSystemData => ({
  ...baseConfig,
  favorite_entities:
    draft.favorite_entities.length > 0 ? draft.favorite_entities : undefined,
  hide_suggested_entities: draft.show_suggested_entities ? undefined : true,
  hide_welcome_message: draft.show_welcome_message ? undefined : true,
  shortcuts: draft.shortcuts.length > 0 ? draft.shortcuts : undefined,
});

// The common-controls strategy caps the section at 8 (or the favorites count,
// whichever is larger); once favorites reach the cap, predictions never render
// so the suggested-entities toggle has no effect.
const SUGGESTED_ENTITIES_CAP = 8;

const WELCOME_SCHEMA: HaFormSchema[] = [
  { name: "show_welcome_message", selector: { boolean: {} } },
];

@customElement("dialog-edit-home")
export class DialogEditHome
  extends DirtyStateProviderMixin<EditorState>()(LitElement)
  implements HassDialog<EditHomeDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EditHomeDialogParams;

  @state() private _session?: HomeConfigDraftSession;

  @state() private _open = false;

  @state() private _submitting = false;

  // Distinguishes _dialogClosed() firing because _save() itself just
  // closed a successfully, non-stale-or-now-clean session (no preview
  // clear needed: the panel already has the truth via its own
  // regeneration) from every other close path (Cancel/scrim/Esc, or a
  // save still pending when one of those fires), which must still revert
  // an edited session's preview.
  private _closedBySave = false;

  public showDialog(params: EditHomeDialogParams): void {
    this._params = params;
    const initial: EditorState = {
      favorite_entities: params.config.favorite_entities
        ? [...params.config.favorite_entities]
        : [],
      show_suggested_entities: !params.config.hide_suggested_entities,
      show_welcome_message: !params.config.hide_welcome_message,
      shortcuts: params.config.shortcuts ? [...params.config.shortcuts] : [],
    };
    this._session = HomeConfigDraftSession.start(initial);
    this._initDirtyTracking({ type: "shallow" }, initial);
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (
      changedProps.has("_session") &&
      this._session &&
      this._params &&
      // Skip the first _session assignment from showDialog(): it mirrors
      // the already-rendered saved config, so previewing it would just
      // trigger a redundant regeneration in the panel behind the dialog.
      changedProps.get("_session") !== undefined
    ) {
      this._params.previewConfig(
        buildHomeConfig(this._params.config, this._session.draft)
      );
    }
  }

  private _dialogClosed(): void {
    if (this._session && this._session.generation > 0 && !this._closedBySave) {
      // Revert whenever this session ever pushed a draft to the panel,
      // unless _save() itself already closed a session it just finished
      // committing (see _closedBySave). Checking generation here rather
      // than isDirtyState matters specifically when a save is still
      // pending: an edit made during that await can make isDirtyState
      // read false again (e.g. edited back to the original content)
      // before the pending save resolves, but the panel's preview still
      // needs reverting now — _save()'s own continuation is blocked from
      // doing anything once this dialog is closed (see its params-identity
      // guard), so this is the only chance to do it.
      this._params?.previewConfig(undefined);
    }
    this._params = undefined;
    this._session = undefined;
    this._submitting = false;
    this._closedBySave = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._session) {
      return nothing;
    }
    const draft = this._session.draft;

    return html`
      <ha-dialog
        .open=${this._open}
        .headerTitle=${this.hass.localize("ui.panel.home.editor.title")}
        .headerSubtitle=${this.hass.localize(
          "ui.panel.home.editor.description"
        )}
        .preventScrimClose=${this.isDirtyState}
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
                show_welcome_message: draft.show_welcome_message,
              }}
              .schema=${WELCOME_SCHEMA}
              .computeLabel=${this._computeWelcomeLabel}
              .computeHelper=${this._computeWelcomeHelper}
              @value-changed=${this._welcomeChanged}
            ></ha-form>

            <ha-favorites-editor
              .favorites=${draft.favorite_entities}
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.strategy.home.favorite_entities"
              )}
              .addButtonLabel=${this.hass.localize(
                "ui.panel.lovelace.editor.strategy.home.add_favorite_entity"
              )}
              @value-changed=${this._favoriteEntitiesChanged}
            ></ha-favorites-editor>

            <ha-form
              .hass=${this.hass}
              .data=${{
                show_suggested_entities: draft.show_suggested_entities,
              }}
              .schema=${this._suggestedSchema(
                draft.favorite_entities.length >= SUGGESTED_ENTITIES_CAP
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
            <home-shortcuts-editor
              .hass=${this.hass}
              .shortcuts=${draft.shortcuts}
              @value-changed=${this._shortcutsChanged}
            ></home-shortcuts-editor>
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
            .disabled=${this._submitting || !this.isDirtyState}
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
      (this._session?.draft.favorite_entities.length ?? 0) >=
      SUGGESTED_ENTITIES_CAP;
    return this.hass.localize(
      favoritesFull
        ? "ui.panel.home.editor.suggested_entities_disabled_description"
        : "ui.panel.home.editor.suggested_entities_description"
    );
  };

  private _favoriteEntitiesChanged(ev: ValueChangedEvent<string[]>): void {
    this._session = this._session!.withDraft({
      ...this._session!.draft,
      favorite_entities: ev.detail.value,
    });
    this._updateDirtyState(this._session.draft);
  }

  private _welcomeChanged(
    ev: ValueChangedEvent<{ show_welcome_message: boolean }>
  ): void {
    this._session = this._session!.withDraft({
      ...this._session!.draft,
      show_welcome_message: ev.detail.value.show_welcome_message,
    });
    this._updateDirtyState(this._session.draft);
  }

  private _suggestedChanged(
    ev: ValueChangedEvent<{ show_suggested_entities: boolean }>
  ): void {
    this._session = this._session!.withDraft({
      ...this._session!.draft,
      show_suggested_entities: ev.detail.value.show_suggested_entities,
    });
    this._updateDirtyState(this._session.draft);
  }

  private _shortcutsChanged(ev: ValueChangedEvent<ShortcutItem[]>): void {
    this._session = this._session!.withDraft({
      ...this._session!.draft,
      shortcuts: ev.detail.value,
    });
    this._updateDirtyState(this._session.draft);
  }

  private async _save(): Promise<void> {
    if (!this._params || !this._session) return;
    if (this._submitting) return;

    const paramsAtSave = this._params;
    const savedGeneration = this._session.generation;
    const savedDraft = this._session.draft;
    const config = buildHomeConfig(paramsAtSave.config, savedDraft);

    this._submitting = true;
    try {
      // On failure, stay open with the draft intact so the user can retry
      // or explicitly discard it (matches dialog-edit-security's pattern);
      // closing anyway would leave this legacy dialog instance connected
      // and dirty with no editor left to act on it.
      const success = await paramsAtSave.saveConfig(config);

      // The dialog may have been closed (and possibly reopened) while this
      // save was in flight: preventScrimClose only blocks a scrim/Esc close
      // while isDirtyState is true, and an edit made during the await can
      // momentarily make it false again before this continuation resumes.
      // Nothing here is still valid to apply in that case.
      if (this._params !== paramsAtSave) {
        return;
      }
      if (!success) {
        return;
      }

      // Use the *current* session (this._session), not the one captured at
      // the top of this method: an edit during the await already advanced
      // it, and that's the generation/draft withSaved() needs to compare
      // against to correctly detect staleness.
      const { session: updated, stale } = this._session.withSaved(
        savedGeneration,
        savedDraft
      );

      if (stale) {
        // Rebase the clean baseline to what was actually persisted,
        // keeping the live draft as current, so isDirtyState reflects the
        // screen against what's now truly saved (not the session's
        // original baseline).
        this._updateDirtyState(savedDraft);
        this._markDirtyStateClean();
        this._updateDirtyState(updated.draft);

        if (updated.isDirty) {
          // A genuinely newer, unsaved draft exists: stay open on it.
          this._session = updated;
          return;
        }
        // The rebased draft happens to match what was just persisted (e.g.
        // edited away and back to it): nothing left to revert, so fall
        // through and close normally below instead of leaving the dialog
        // open with Save disabled and nothing to do.
      } else {
        this._markDirtyStateClean();
      }

      this._closedBySave = true;
      this.closeDialog();
    } finally {
      if (this._params === paramsAtSave) {
        this._submitting = false;
      }
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

      ha-favorites-editor {
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

import { mdiClose } from "@mdi/js";
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
import "../../../components/ha-icon-button";
import type { HaFormSchema } from "../../../components/ha-form/types";
import type { ShortcutItem } from "../../../data/home_shortcuts";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { DirtyStateProviderMixin } from "../../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import "../../../components/entity/ha-favorites-editor";
import "../components/home-shortcuts-editor";
import { HomeConfigDraftSession } from "./home-config-draft-session";
import {
  buildHomeConfig,
  editorStateFromConfig,
  editorStatesEqual,
  type EditorState,
} from "./home-config-editor-state";
import type { EditHomeDialogParams } from "./show-dialog-edit-home";

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

  public showDialog(params: EditHomeDialogParams): void {
    this._params = params;
    const initial = editorStateFromConfig(params.config);
    this._session = HomeConfigDraftSession.start(initial);
    // The mixin is the only dirty tracking: it drives Save and
    // preventScrimClose. It doesn't clone baselines for custom compares;
    // safe since drafts are never mutated in place.
    this._initDirtyTracking(
      { type: "custom", compare: editorStatesEqual },
      initial
    );
    this._open = true;
  }

  public closeDialog(): boolean {
    // Keep the dialog open while a save is in flight, so it cannot be
    // reopened and start a second, overlapping save.
    if (this._submitting) {
      return false;
    }
    this._open = false;
    return true;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    const previous = changedProps.get("_session") as
      HomeConfigDraftSession | undefined;
    if (
      changedProps.has("_session") &&
      this._session &&
      this._params &&
      // Skip the first _session assignment from showDialog(): it mirrors
      // the already-rendered saved config, so previewing it would just
      // trigger a redundant regeneration in the panel behind the dialog.
      previous !== undefined &&
      // The preview follows the draft: only withDraft() bumps generation.
      previous.generation !== this._session.generation
    ) {
      this._params.previewConfig(
        buildHomeConfig(this._params.config, this._session.draft)
      );
    }
  }

  private _dialogClosed(): void {
    // Always revert: the panel ignores it when nothing is previewed (no
    // edit, or already cleared by a successful save), and still drops a
    // draft edited back to its baseline, which was previewed along the way.
    this._params?.previewConfig(undefined);
    this._params = undefined;
    this._session = undefined;
    this._submitting = false;
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
        .preventScrimClose=${this.isDirtyState || this._submitting}
        @closed=${this._dialogClosed}
      >
        <ha-icon-button
          slot="headerNavigationIcon"
          .label=${this.hass.localize("ui.common.close")}
          .path=${mdiClose}
          .disabled=${this._submitting}
          @click=${this.closeDialog}
        ></ha-icon-button>
        <ha-alert alert-type="info">
          ${this.hass.localize("ui.panel.home.editor.areas_hint", {
            areas_page: html`<a
              href="/config/areas?historyBack=1"
              @click=${this._areasLinkClicked}
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
              .disabled=${this._submitting}
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
              .disabled=${this._submitting}
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
              .disabled=${this._submitting}
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
              .disabled=${this._submitting}
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

  private _areasLinkClicked(ev: MouseEvent): void {
    // Don't navigate away from a dialog that refuses to close mid-save.
    if (!this.closeDialog()) {
      ev.preventDefault();
    }
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

  // Every editor change goes through here, so none can skip the guard or
  // the dirty update. The preview push stays in updated().
  private _patchDraft(patch: Partial<EditorState>): void {
    // Editors are disabled while saving; ignore any change still reaching
    // a handler, so the draft cannot move under a pending save.
    if (!this._session || this._submitting) {
      return;
    }
    this._session = this._session.withDraft({
      ...this._session.draft,
      ...patch,
    });
    this._updateDirtyState(this._session.draft);
  }

  private _favoriteEntitiesChanged(ev: ValueChangedEvent<string[]>): void {
    this._patchDraft({ favorite_entities: ev.detail.value });
  }

  private _welcomeChanged(
    ev: ValueChangedEvent<{ show_welcome_message: boolean }>
  ): void {
    this._patchDraft({
      show_welcome_message: ev.detail.value.show_welcome_message,
    });
  }

  private _suggestedChanged(
    ev: ValueChangedEvent<{ show_suggested_entities: boolean }>
  ): void {
    this._patchDraft({
      show_suggested_entities: ev.detail.value.show_suggested_entities,
    });
  }

  private _shortcutsChanged(ev: ValueChangedEvent<ShortcutItem[]>): void {
    this._patchDraft({ shortcuts: ev.detail.value });
  }

  private async _save(): Promise<void> {
    if (!this._params || !this._session || this._submitting) return;
    const params = this._params;
    const config = buildHomeConfig(params.config, this._session.draft);

    // The editors are disabled while submitting, so the draft cannot change
    // until the save settles.
    this._submitting = true;
    let success: boolean;
    try {
      success = await params.saveConfig(config);
    } finally {
      // closeDialog() refuses while submitting, so the session should still
      // be the one this save started from. Defensive guard in case it was
      // torn down some other way (e.g. _dialogClosed() called directly):
      // don't touch a session this save didn't start.
      if (this._params === params) {
        this._submitting = false;
      }
    }
    // On failure, stay open with the draft intact so the user can retry or
    // explicitly discard it (matches dialog-edit-security's pattern).
    if (!success || this._params !== params) {
      return;
    }
    this._markDirtyStateClean();
    // _submitting is already false: closeDialog() accepts.
    this.closeDialog();
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

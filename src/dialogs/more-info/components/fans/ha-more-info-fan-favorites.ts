import type { ContextType } from "@lit/context";
import { mdiContentSaveEditOutline, mdiStarPlusOutline } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  indexAfterMove,
  indexAfterRemove,
} from "../../../../common/array/track-index";
import { consume } from "../../../../common/decorators/consume";
import { transform } from "../../../../common/decorators/transform";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/fan/ha-fan-favorite-button";
import "../../../../components/ha-button";
import "../../../../components/ha-svg-icon";
import {
  apiContext,
  configContext,
  formattersContext,
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import type {
  ExtEntityRegistryEntry,
  FanEntityOptions,
  FanFavorite,
} from "../../../../data/entity/entity_registry";
import { updateEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type {
  FanEntity,
  FanFavoriteSaveBlocker,
  FanSnapshot,
} from "../../../../data/fan";
import {
  completeFanSceneState,
  computeFanFavoriteFromState,
  computeFanFavoriteSaveBlocker,
  computeFanFavoriteSceneState,
  computeFanSnapshot,
  fanFavoritesEqual,
  formatFanFavorite,
  normalizeFanFavorites,
} from "../../../../data/fan";
import { applyScene } from "../../../../data/scene";
import { showToast } from "../../../../util/toast";
import type { HomeAssistant, HomeAssistantConfig } from "../../../../types";
import { showConfirmationDialog } from "../../../generic/show-dialog-box";
import "../ha-more-info-favorites";
import type { HaMoreInfoFavorites } from "../ha-more-info-favorites";

type FavoriteLocalizeKey =
  | "add"
  | "save"
  | "update"
  | "apply"
  | "select"
  | "deselect"
  | "delete"
  | "delete_confirm_title"
  | "delete_confirm_text"
  | "delete_confirm_action"
  | "save_failed";

interface StoredSnapshot {
  entityId: string;
  state: FanSnapshot;
}

/**
 * Fan favorites work like small scenes: each one is a full target state.
 *
 * While editing, the regular controls change the fan for real and the
 * favorites are saved from the state it reports. The state from before
 * editing is restored when editing ends, whatever the cause.
 */
@customElement("ha-more-info-fan-favorites")
export class HaMoreInfoFanFavorites extends LitElement {
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  // Read when an apply runs, which can be after the dialog moved on.
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HomeAssistant["user"]>({
    transformer: ({ user }) => user,
  })
  private _user!: HomeAssistant["user"];

  @property({ attribute: false }) public stateObj!: FanEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  // Owned by more-info-fan, which also words the edit banner from it.
  @property({ attribute: false }) public selectedIndex?: number;

  @state() private _favorites: FanFavorite[] = [];

  // An apply call is running. Saving then would read the state from before
  // it. This only waits for the call: a fan that reports its new state later
  // can still be saved with the previous one.
  @state() private _applying = false;

  // Last save blocker reported to more-info-fan for the edit banner.
  private _reportedBlocker?: FanFavoriteSaveBlocker;

  // Saves still waiting for the registry. Only the last response resyncs
  // the list: the counter drops before the dialog passes the entry back.
  private _pendingSaves = 0;

  private _snapshot?: StoredSnapshot;

  // Applies run one after the other, so a restore never interleaves with a
  // favorite that is still being applied.
  private _pendingApply?: Promise<void>;

  // No snapshot on reattach: the dialog caches this view with a stale
  // stateObj, and a snapshot of it would reapply the edited state.
  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._restoreSnapshot();
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    // A pending save keeps the local list, unless the entry is for another fan.
    if (
      changedProps.has("entry") &&
      this.entry &&
      (!this._pendingSaves ||
        changedProps.get("entry")?.entity_id !== this.entry.entity_id)
    ) {
      this._favorites = normalizeFanFavorites(
        this.entry.options?.fan?.favorites
      );
    }

    // Checked against the local list: the entry lags behind pending saves.
    // Another client may have removed the selected favorite.
    if (
      this.selectedIndex !== undefined &&
      this.selectedIndex >= this._favorites.length
    ) {
      this._select(undefined);
    }

    if (changedProps.has("editMode")) {
      const wasEditing = Boolean(changedProps.get("editMode"));
      if (this.editMode && !wasEditing) {
        this._takeSnapshot();
      } else if (!this.editMode && wasEditing) {
        this._restoreSnapshot();
      }
    }
  }

  protected updated(): void {
    const blocker = this.stateObj
      ? computeFanFavoriteSaveBlocker(
          this.stateObj,
          this._favorites,
          this.selectedIndex
        )
      : undefined;
    if (blocker !== this._reportedBlocker) {
      this._reportedBlocker = blocker;
      fireEvent(this, "fan-favorite-save-blocker-changed", { blocker });
    }
  }

  private _takeSnapshot(): void {
    if (!this.stateObj) {
      return;
    }
    const snapshot = computeFanSnapshot(this.stateObj);
    this._snapshot = snapshot
      ? { entityId: this.stateObj.entity_id, state: snapshot }
      : undefined;
  }

  private _restoreSnapshot(): void {
    const snapshot = this._snapshot;
    this._snapshot = undefined;
    if (!snapshot) {
      return;
    }
    // Best effort: the fan stays as it is if the call fails.
    this._queueApply(snapshot.entityId, (current) =>
      completeFanSceneState(current, snapshot.state)
    );
  }

  // Waits for the previous apply, then builds the target from the state at
  // that time. callService already shows a toast when the call fails.
  // That state is the one the frontend has received: it can lag behind the
  // fan, and stops updating once this element is disconnected.
  private _queueApply(
    entityId: string,
    buildTarget: (current: FanEntity) => FanSnapshot
  ): void {
    const run = (this._pendingApply ?? Promise.resolve())
      .then(async () => {
        const current = this._states?.[entityId] as FanEntity | undefined;
        if (!current || !this._api) {
          return;
        }
        await applyScene(this._api, { [entityId]: buildTarget(current) });
      })
      .catch(() => undefined);

    this._pendingApply = run;
    this._applying = true;
    run.then(() => {
      if (this._pendingApply === run) {
        this._pendingApply = undefined;
        this._applying = false;
      }
    });
  }

  private _localizeFavorite(
    key: FavoriteLocalizeKey,
    values?: Record<string, string | number>
  ): string {
    return this._i18n.localize(
      `ui.dialogs.more_info_control.fan.favorites.${key}`,
      values
    );
  }

  private _select(index: number | undefined): void {
    fireEvent(this, "fan-favorite-selected", { index });
  }

  private async _save(favorites: FanFavorite[]): Promise<void> {
    if (!this.entry) {
      return;
    }

    this._favorites = favorites;

    const options: FanEntityOptions = {
      ...(this.entry.options?.fan ?? {}),
      favorites: favorites.length ? favorites : undefined,
    };

    this._pendingSaves++;
    try {
      const result = await updateEntityRegistryEntry(
        this._api,
        this.entry.entity_id,
        {
          options_domain: "fan",
          options,
        }
      );
      fireEvent(this, "entity-entry-updated", result.entity_entry);
    } catch (err: unknown) {
      // Go back to what is stored. The selection may point to a favorite
      // that moved, so drop it.
      this._favorites = normalizeFanFavorites(
        this.entry?.options?.fan?.favorites
      );
      this._select(undefined);
      showToast(this, {
        message: this._localizeFavorite("save_failed", {
          // WebSocket errors are plain objects with a message.
          error:
            err && typeof err === "object" && "message" in err
              ? String(err.message)
              : String(err),
        }),
      });
    } finally {
      this._pendingSaves--;
    }
  }

  private _applyFavorite(index: number): void {
    const favorite = this._favorites[index];

    if (!favorite) {
      return;
    }

    this._queueApply(this.stateObj.entity_id, (current) =>
      computeFanFavoriteSceneState(current, favorite)
    );
  }

  private async _saveCurrentState(): Promise<void> {
    const favorite = computeFanFavoriteFromState(this.stateObj);

    if (
      this._applying ||
      !favorite ||
      computeFanFavoriteSaveBlocker(
        this.stateObj,
        this._favorites,
        this.selectedIndex
      )
    ) {
      return;
    }

    if (this.selectedIndex === undefined) {
      await this._save([...this._favorites, favorite]);
      return;
    }

    const updated = [...this._favorites];
    updated[this.selectedIndex] = favorite;
    this._select(undefined);
    await this._save(updated);
  }

  private async _deleteFavorite(index: number): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      destructive: true,
      title: this._localizeFavorite("delete_confirm_title"),
      text: this._localizeFavorite("delete_confirm_text"),
      confirmText: this._localizeFavorite("delete_confirm_action"),
    });

    if (!confirmed) {
      return;
    }

    if (this.selectedIndex !== undefined) {
      this._select(indexAfterRemove(this.selectedIndex, index));
    }

    await this._save(
      this._favorites.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  private _move(oldIndex: number, newIndex: number): void {
    const favorites = this._favorites.concat();
    const moved = favorites.splice(oldIndex, 1)[0];
    favorites.splice(newIndex, 0, moved);

    // Keep the same favorite selected at its new position.
    if (this.selectedIndex !== undefined) {
      this._select(indexAfterMove(this.selectedIndex, oldIndex, newIndex));
    }

    this._save(favorites);
  }

  // Rebuilt on each render so the list rerenders when the fan state changes.
  private _renderFavorite =
    (current: FanFavorite | undefined): HaMoreInfoFavorites["renderItem"] =>
    (item, index, editMode) => {
      const favorite = item as FanFavorite;
      const value = formatFanFavorite(
        this.stateObj,
        favorite,
        this._formatters,
        this._i18n
      );

      return html`
        <ha-fan-favorite-button
          .stateObj=${this.stateObj}
          .favorite=${favorite}
          .label=${this._localizeFavorite(
            !editMode
              ? "apply"
              : index === this.selectedIndex
                ? "deselect"
                : "select",
            { value }
          )}
          .active=${Boolean(
            current && fanFavoritesEqual(this.stateObj, current, favorite)
          )}
          .disabled=${this.stateObj.state === UNAVAILABLE}
        ></ha-fan-favorite-button>
      `;
    };

  private _deleteLabel = (index: number): string =>
    this._localizeFavorite("delete", { number: index + 1 });

  private _handleFavoriteAction = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-action"]>
  ): void => {
    ev.stopPropagation();

    const { action, index } = ev.detail;

    if (action === "hold" && this._user?.is_admin) {
      fireEvent(this, "toggle-edit-mode", true);
      return;
    }

    if (!this.editMode) {
      this._applyFavorite(index);
      return;
    }

    if (this.selectedIndex === index) {
      this._select(undefined);
      return;
    }

    this._select(index);
    this._applyFavorite(index);
  };

  private _handleFavoriteMoved = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-moved"]>
  ): void => {
    ev.stopPropagation();
    this._move(ev.detail.oldIndex, ev.detail.newIndex);
  };

  private _handleFavoriteDelete = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-delete"]>
  ): void => {
    ev.stopPropagation();
    this._deleteFavorite(ev.detail.index);
  };

  private _handleFavoriteAdd = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-add"]>
  ): void => {
    ev.stopPropagation();
    this._saveCurrentState();
  };

  private _handleFavoriteDone = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-done"]>
  ): void => {
    ev.stopPropagation();
    fireEvent(this, "toggle-edit-mode", false);
  };

  private _enterEditMode(): void {
    fireEvent(this, "toggle-edit-mode", true);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.stateObj || !this.entry || !this._i18n) {
      return nothing;
    }

    const isAdmin = Boolean(this._user?.is_admin);

    if (!this.editMode && this._favorites.length === 0) {
      return isAdmin
        ? html`
            <div class="empty">
              <ha-button
                appearance="plain"
                size="s"
                .disabled=${this.stateObj.state === UNAVAILABLE}
                @click=${this._enterEditMode}
              >
                <ha-svg-icon
                  slot="start"
                  .path=${mdiStarPlusOutline}
                ></ha-svg-icon>
                ${this._localizeFavorite("add")}
              </ha-button>
            </div>
          `
        : nothing;
    }

    const updating = this.selectedIndex !== undefined;
    const saveBlocked = Boolean(
      computeFanFavoriteSaveBlocker(
        this.stateObj,
        this._favorites,
        this.selectedIndex
      )
    );

    return html`
      <section class="favorites">
        <ha-more-info-favorites
          .items=${this._favorites}
          .renderItem=${this._renderFavorite(
            computeFanFavoriteFromState(this.stateObj)
          )}
          .deleteLabel=${this._deleteLabel}
          .editMode=${this.editMode ?? false}
          .selectedIndex=${this.editMode ? this.selectedIndex : undefined}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          .isAdmin=${isAdmin}
          .addIcon=${updating ? mdiContentSaveEditOutline : mdiStarPlusOutline}
          .addLabel=${this._localizeFavorite(updating ? "update" : "save")}
          .addDisabled=${
            saveBlocked || this._applying || this.stateObj.state === UNAVAILABLE
          }
          .doneLabel=${this._i18n.localize(
            "ui.dialogs.more_info_control.exit_edit_mode"
          )}
          @favorite-item-action=${this._handleFavoriteAction}
          @favorite-item-moved=${this._handleFavoriteMoved}
          @favorite-item-delete=${this._handleFavoriteDelete}
          @favorite-item-add=${this._handleFavoriteAdd}
          @favorite-item-done=${this._handleFavoriteDone}
        ></ha-more-info-favorites>
      </section>
    `;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .favorites {
      width: 100%;
      max-width: 384px;
      margin: 0 auto;
    }

    .favorites ha-more-info-favorites {
      --favorite-items-max-width: 384px;
      --favorite-item-active-background-color: var(--state-fan-active-color);
    }

    .empty {
      display: flex;
      justify-content: center;
    }
  `;
}

declare global {
  interface HASSDomEvents {
    "fan-favorite-selected": { index?: number };
    // Computed from the favorites list, which is updated before it is
    // saved, so the banner and the save button always agree.
    "fan-favorite-save-blocker-changed": { blocker?: FanFavoriteSaveBlocker };
  }

  interface HTMLElementTagNameMap {
    "ha-more-info-fan-favorites": HaMoreInfoFanFavorites;
  }
}

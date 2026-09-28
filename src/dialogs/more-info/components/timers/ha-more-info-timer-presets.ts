import { consume } from "@lit/context";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { durationDataToSeconds } from "../../../../common/datetime/duration_to_seconds";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { transform } from "../../../../common/decorators/transform";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-control-button";
import type { HaDurationData } from "../../../../components/ha-duration-input";
import {
  apiContext,
  configContext,
  internationalizationContext,
} from "../../../../data/context";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import type {
  ExtEntityRegistryEntry,
  TimerEntityOptions,
} from "../../../../data/entity/entity_registry";
import { updateEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { TimerEntity } from "../../../../data/timer";
import {
  normalizeTimerDuration,
  normalizeTimerPresets,
  timerPresetLabel,
} from "../../../../data/timer";
import type { FrontendLocaleData } from "../../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantConfig,
  HomeAssistantInternationalization,
} from "../../../../types";
import { showFormDialog } from "../../../form/show-form-dialog";
import { showConfirmationDialog } from "../../../generic/show-dialog-box";
import "../ha-more-info-favorites";
import type { HaMoreInfoFavorites } from "../ha-more-info-favorites";

type PresetLocalizeKey =
  | "set"
  | "edit"
  | "delete"
  | "delete_confirm_title"
  | "delete_confirm_text"
  | "delete_confirm_action"
  | "add"
  | "edit_title"
  | "add_title"
  | "duration"
  | "duration_error";

@customElement("ha-more-info-timer-presets")
export class HaMoreInfoTimerPresets extends LitElement {
  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HomeAssistant["user"]>({
    transformer: ({ user }) => user,
  })
  private _user!: HomeAssistant["user"];

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @property({ attribute: false }) public stateObj!: TimerEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @state() private _presets: number[] = [];

  protected updated(changedProps: PropertyValues<this>): void {
    // Sync from entry only; a stateObj tick must not clobber optimistic edits.
    if (changedProps.has("entry") && this.entry) {
      this._presets = normalizeTimerPresets(this.entry.options?.timer?.presets);
    }
  }

  private _localizePreset(
    key: PresetLocalizeKey,
    values?: Record<string, string | number>
  ): string {
    return this._localize(
      `ui.dialogs.more_info_control.timer.preset.${key}`,
      values
    );
  }

  private async _save(presets: number[]): Promise<void> {
    if (!this.entry) {
      return;
    }

    const currentOptions: TimerEntityOptions = {
      ...(this.entry.options?.timer ?? {}),
    };

    const result = await updateEntityRegistryEntry(
      this._api,
      this.entry.entity_id,
      {
        options_domain: "timer",
        options: {
          ...currentOptions,
          presets: presets.length ? presets : undefined,
        },
      }
    );

    fireEvent(this, "entity-entry-updated", result.entity_entry);
  }

  private async _setPresets(presets: number[]): Promise<void> {
    const normalized = normalizeTimerPresets(presets);
    this._presets = normalized;
    await this._save(normalized);
  }

  private _move(index: number, newIndex: number): void {
    const presets = this._presets.concat();
    const moved = presets.splice(index, 1)[0];
    presets.splice(newIndex, 0, moved);
    this._setPresets(presets);
  }

  private _applyPreset(index: number): void {
    const preset = this._presets[index];

    if (preset === undefined) {
      return;
    }

    this._api.callService("timer", "start", {
      entity_id: this.stateObj.entity_id,
      duration: preset,
    });
  }

  private async _promptPresetValue(
    seconds?: number
  ): Promise<number | undefined> {
    const response = await showFormDialog(this, {
      title: this._localizePreset(
        seconds === undefined ? "add_title" : "edit_title"
      ),
      schema: [
        {
          name: "duration",
          required: true,
          selector: {
            duration: { enable_day: false, enable_millisecond: false },
          },
        },
      ],
      data: {
        duration: normalizeTimerDuration({ seconds: seconds ?? 0 }),
      },
      computeLabel: () => this._localizePreset("duration"),
      validate: (data) =>
        data.duration &&
        Math.floor(durationDataToSeconds(data.duration as HaDurationData)) > 0
          ? undefined
          : { duration: this._localizePreset("duration_error") },
    });

    if (!response?.duration) {
      return undefined;
    }

    const value = Math.floor(
      durationDataToSeconds(response.duration as HaDurationData)
    );

    return value > 0 ? value : undefined;
  }

  private async _addPreset(): Promise<void> {
    const value = await this._promptPresetValue();

    if (value === undefined) {
      return;
    }

    await this._setPresets([...this._presets, value]);
  }

  private async _editPreset(index: number): Promise<void> {
    const current = this._presets[index];

    if (current === undefined) {
      return;
    }

    const value = await this._promptPresetValue(current);

    if (value === undefined) {
      return;
    }

    const updated = [...this._presets];
    updated[index] = value;
    await this._setPresets(updated);
  }

  private async _deletePreset(index: number): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      destructive: true,
      title: this._localizePreset("delete_confirm_title"),
      text: this._localizePreset("delete_confirm_text"),
      confirmText: this._localizePreset("delete_confirm_action"),
    });

    if (!confirmed) {
      return;
    }

    await this._setPresets(
      this._presets.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  private _renderPreset: HaMoreInfoFavorites["renderItem"] = (
    preset,
    _index,
    editMode
  ) => {
    const seconds = preset as number;
    const value = timerPresetLabel(this._locale!, seconds);
    const label = this._localizePreset(editMode ? "edit" : "set", { value });

    return html`
      <ha-control-button
        style=${styleMap({
          "--control-button-border-radius": "var(--ha-border-radius-pill)",
          "min-width": "72px",
          width: "auto",
          height: "36px",
          padding: "0 var(--ha-space-3)",
        })}
        .label=${label}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
        ${value}
      </ha-control-button>
    `;
  };

  private _deleteLabel = (index: number): string =>
    this._localizePreset("delete", {
      number: index + 1,
    });

  private _handlePresetAction = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-action"]>
  ): void => {
    ev.stopPropagation();

    const { action, index } = ev.detail;

    if (action === "hold" && this._user?.is_admin) {
      fireEvent(this, "toggle-edit-mode", true);
      return;
    }

    if (this.editMode) {
      this._editPreset(index);
      return;
    }

    this._applyPreset(index);
  };

  private _handlePresetMoved = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-moved"]>
  ): void => {
    ev.stopPropagation();
    this._move(ev.detail.oldIndex, ev.detail.newIndex);
  };

  private _handlePresetDelete = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-delete"]>
  ): void => {
    ev.stopPropagation();
    this._deletePreset(ev.detail.index);
  };

  private _handlePresetAdd = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-add"]>
  ): void => {
    ev.stopPropagation();
    this._addPreset();
  };

  private _handlePresetDone = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-done"]>
  ): void => {
    ev.stopPropagation();
    fireEvent(this, "toggle-edit-mode", false);
  };

  protected render(): TemplateResult | typeof nothing {
    if (!this.stateObj || !this.entry || !this._locale) {
      return nothing;
    }

    if (!this.editMode && this._presets.length === 0) {
      return nothing;
    }

    return html`
      <section class="presets">
        <ha-more-info-favorites
          .items=${this._presets}
          .renderItem=${this._renderPreset}
          .deleteLabel=${this._deleteLabel}
          .editMode=${this.editMode ?? false}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          .isAdmin=${Boolean(this._user?.is_admin)}
          .showDone=${true}
          .addLabel=${this._localizePreset("add")}
          .doneLabel=${this._localize(
            "ui.dialogs.more_info_control.exit_edit_mode"
          )}
          @favorite-item-action=${this._handlePresetAction}
          @favorite-item-moved=${this._handlePresetMoved}
          @favorite-item-delete=${this._handlePresetDelete}
          @favorite-item-add=${this._handlePresetAdd}
          @favorite-item-done=${this._handlePresetDone}
        ></ha-more-info-favorites>
      </section>
    `;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .presets {
      width: 100%;
      max-width: 384px;
      margin: 0 auto;
    }

    .presets ha-more-info-favorites {
      --favorite-items-max-width: 384px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-timer-presets": HaMoreInfoTimerPresets;
  }
}

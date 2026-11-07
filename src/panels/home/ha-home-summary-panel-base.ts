import { mdiPencil } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { property, query, state } from "lit/decorators";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { debounce } from "../../common/util/debounce";
import { deepEqual } from "../../common/util/deep-equal";
import "../../components/ha-button";
import type { HaButton } from "../../components/ha-button";
import "../../components/ha-icon-button";
import "../../components/ha-top-app-bar-fixed";
import {
  fetchFrontendSystemDataAfterSaves,
  queueFrontendSystemDataSave,
  type HomeSummaryPanelSystemDataKey,
} from "../../data/frontend";
import { ChildPanelReady } from "../../layouts/panel-ready";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { showToast } from "../../util/toast";
import { clearEntityVisibilityFocus } from "../lovelace/cards/hui-entity-visibility-card";
import { generateLovelaceViewStrategy } from "../lovelace/strategies/get-strategy";
import type { Lovelace } from "../lovelace/types";
import "../lovelace/views/hui-view";
import "../lovelace/views/hui-view-background";
import "../lovelace/views/hui-view-container";

export abstract class HaHomeSummaryPanelBase<
  K extends HomeSummaryPanelSystemDataKey,
> extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() protected _config?: FrontendSystemData[K];

  @state() private _lovelace?: Lovelace;

  @state() private _editVisibility = false;

  @state() private _searchParams = new URLSearchParams(window.location.search);

  @query("ha-button") private _exitEditButton?: HaButton;

  protected abstract readonly _systemDataKey: K;

  private _childPanelReady?: ChildPanelReady;

  private _loadConfigPromise?: Promise<void>;

  private _loadConfigRevision = 0;

  private _setLovelaceRevision = 0;

  protected _strategyOptions(): Record<string, unknown> {
    return {};
  }

  protected _favoriteChanged?(
    ev: HASSDomEvent<HASSDomEvents["entity-favorite-changed"]>
  ): void;

  protected _alertChanged?(
    ev: HASSDomEvent<HASSDomEvents["entity-alert-changed"]>
  ): void;

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._setup();
      return;
    }

    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as this["hass"];
    if (
      oldHass &&
      this.hass.config.state === "RUNNING" &&
      oldHass.config.state !== "RUNNING"
    ) {
      this._setup();
      return;
    }

    if (oldHass && oldHass.localize !== this.hass.localize) {
      this._setLovelace();
      return;
    }

    if (
      oldHass &&
      (oldHass.entities !== this.hass.entities ||
        oldHass.devices !== this.hass.devices ||
        oldHass.areas !== this.hass.areas ||
        oldHass.floors !== this.hass.floors ||
        oldHass.panels !== this.hass.panels) &&
      this.hass.config.state === "RUNNING"
    ) {
      this._debounceRegistriesChanged();
    }
  }

  private async _setup() {
    this._loadConfigPromise = this._loadConfig();
    await Promise.all([
      this.hass.loadFragmentTranslation("lovelace"),
      this._loadConfigPromise,
    ]);
    await this._setLovelace();
  }

  private async _loadConfig() {
    const revision = ++this._loadConfigRevision;
    this._config = undefined;
    try {
      const data = await fetchFrontendSystemDataAfterSaves(
        this.hass.connection,
        this._systemDataKey
      );
      if (revision !== this._loadConfigRevision) {
        return;
      }
      this._config = data || ({} as FrontendSystemData[K]);
    } catch (err) {
      if (revision !== this._loadConfigRevision) {
        return;
      }
      this._editVisibility = false;
      const key: HomeSummaryPanelSystemDataKey = this._systemDataKey;
      // eslint-disable-next-line no-console
      console.error(`Failed to load ${key} configuration:`, err);
      showToast(this, {
        message: this.hass.localize(`ui.panel.${key}.editor.load_failed`),
        duration: 0,
        dismissable: true,
      });
    }
  }

  private _debounceRegistriesChanged = debounce(() => this._setLovelace(), 200);

  protected render() {
    const key: HomeSummaryPanelSystemDataKey = this._systemDataKey;
    return html`
      <ha-top-app-bar-fixed
        .narrow=${this.narrow}
        .backButton=${this._searchParams.has("historyBack")}
      >
        <div slot="title">${this.hass.localize(`panel.${key}`)}</div>
        ${
          !this.hass.user?.is_admin
            ? nothing
            : this._editVisibility
              ? html`<ha-button
                  slot="actionItems"
                  appearance="filled"
                  size="s"
                  @click=${this._stopEditVisibility}
                >
                  ${this.hass.localize("ui.panel.lovelace.menu.exit_edit_mode")}
                </ha-button>`
              : this._config
                ? html`<ha-icon-button
                    slot="actionItems"
                    .path=${mdiPencil}
                    .label=${this.hass.localize(`ui.panel.${key}.editor.title`)}
                    @click=${this._startEditVisibility}
                  ></ha-icon-button>`
                : nothing
        }
        ${
          this._lovelace
            ? html`
                <hui-view-container .hass=${this.hass}>
                  <hui-view-background .hass=${this.hass}>
                  </hui-view-background>
                  <hui-view
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                    .lovelace=${this._lovelace}
                    .index=${0}
                    @entity-visibility-changed=${this._visibilityChanged}
                    @entity-favorite-changed=${this._favoriteChanged}
                    @entity-alert-changed=${this._alertChanged}
                    @entity-visibility-focus-lost=${this._focusLost}
                  ></hui-view>
                </hui-view-container>
              `
            : nothing
        }
      </ha-top-app-bar-fixed>
    `;
  }

  protected async _setLovelace(force = false) {
    const revision = ++this._setLovelaceRevision;
    if (this._loadConfigPromise) {
      await this._loadConfigPromise;
    }

    const strategy = { type: this._systemDataKey };
    const viewConfig = await generateLovelaceViewStrategy(
      {
        strategy: {
          ...strategy,
          ...this._strategyOptions(),
          hidden_entities: this._config?.hidden_entities,
          edit_visibility: this._editVisibility || undefined,
        },
      },
      this.hass
    );

    if (revision !== this._setLovelaceRevision) {
      return;
    }

    const config = { views: [viewConfig] };
    const rawConfig = { views: [{ strategy }] };

    if (!force && deepEqual(config, this._lovelace?.config)) {
      return;
    }

    this._childPanelReady ??= new ChildPanelReady(this);
    this._lovelace = {
      config: config,
      rawConfig: rawConfig,
      editMode: false,
      urlPath: this._systemDataKey,
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
      showToast: () => undefined,
    };
  }

  private _startEditVisibility = () => {
    clearEntityVisibilityFocus();
    this._editVisibility = true;
    this._setLovelace();
  };

  private _stopEditVisibility = () => {
    this._editVisibility = false;
    if (!this._config) {
      this._loadConfigPromise = this._loadConfig();
    }
    this._setLovelace();
  };

  private _focusLost = () => {
    this._exitEditButton?.focus();
  };

  private _visibilityChanged = (
    ev: HASSDomEvent<HASSDomEvents["entity-visibility-changed"]>
  ) => {
    if (!this._config) {
      return;
    }
    const { entity, hidden } = ev.detail;
    const hiddenEntities = (this._config.hidden_entities ?? []).filter(
      (entityId) => entityId !== entity
    );
    if (hidden) {
      hiddenEntities.push(entity);
    }
    this._saveConfig({
      ...this._config,
      hidden_entities: hiddenEntities.length ? hiddenEntities : undefined,
    });
  };

  protected _saveConfig(config: FrontendSystemData[K]): Promise<void> {
    this._config = config;
    const key: HomeSummaryPanelSystemDataKey = this._systemDataKey;
    return queueFrontendSystemDataSave(
      this.hass.connection,
      this._systemDataKey,
      config
    ).catch(async (err) => {
      // eslint-disable-next-line no-console
      console.error(`Failed to save ${key} configuration:`, err);
      showToast(this, {
        message: this.hass.localize(`ui.panel.${key}.editor.save_failed`),
        duration: 0,
        dismissable: true,
      });
      if (config !== this._config) {
        return;
      }
      await this._loadConfig();
      await this._setLovelace(true);
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          user-select: none;
        }
        hui-view-container {
          position: relative;
          display: flex;
          min-height: 100%;
          box-sizing: border-box;
        }
        hui-view {
          flex: 1 1 100%;
          max-width: 100%;
        }
      `,
    ];
  }
}

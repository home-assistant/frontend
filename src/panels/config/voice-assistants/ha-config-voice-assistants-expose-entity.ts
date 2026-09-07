import { consume, type ContextType } from "@lit/context";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent, type HASSDomEvent } from "../../../common/dom/fire_event";
import { goBack, replaceCurrentUrl } from "../../../common/navigate";
import { currentPath } from "../../../common/url/current-path";
import { extractSearchParamsObject } from "../../../common/url/search-params";
import {
  createVoiceAssistantQueryString,
  decodeVoiceAssistantQueryParams,
  type VoiceAssistantQueryParams,
} from "../../../common/url/voice-assistant-query-params";
import { deepEqual } from "../../../common/util/deep-equal";
import type { SelectionChangedEvent } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import type { CloudStatus } from "../../../data/cloud";
import {
  internationalizationContext,
  statesContext,
} from "../../../data/context";
import type { DataTableFiltersValues } from "../../../data/data_table_filters";
import type { ExposeEntitySettings } from "../../../data/expose";
import { exposeEntities, voiceAssistants } from "../../../data/expose";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-loading-screen";
import { DirtyStateProviderMixin } from "../../../mixins/dirty-state-provider-mixin";
import { PreventUnsavedMixin } from "../../../mixins/prevent-unsaved-mixin";
import type { HomeAssistant, Route, ValueChangedEvent } from "../../../types";
import "../entities/ha-entity-table";
import type { HaEntityTable } from "../entities/ha-entity-table";
import { getAvailableAssistants } from "./expose/available-assistants";

@customElement("ha-config-voice-assistants-expose-entity")
class HaConfigVoiceAssistantsExposeEntity extends DirtyStateProviderMixin<
  string[]
>()(PreventUnsavedMixin(LitElement)) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public exposedEntities?: Record<
    string,
    ExposeEntitySettings
  >;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state() private _assistantQuery: VoiceAssistantQueryParams["assistants"];

  @state() private _assistants: (keyof typeof voiceAssistants)[] = [];

  @state() private _selected: string[] = [];

  @state() private _filter = "";

  @state() private _filters: DataTableFiltersValues = {};

  @state() private _saving = false;

  @state() private _error?: string;

  @query("ha-entity-table") private _table?: HaEntityTable;

  private _acceptedUrl = window.location.href;

  private _queryChangePending = false;

  private _discardChangesPromise?: Promise<boolean>;

  public connectedCallback() {
    super.connectedCallback();
    this._initDirtyTracking({ type: "deep" }, []);
    window.addEventListener("location-changed", this._locationChanged);
    window.addEventListener("popstate", this._locationChanged);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("location-changed", this._locationChanged);
    window.removeEventListener("popstate", this._locationChanged);
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has("route")) {
      this._locationChanged();
    }
    if (
      changedProperties.has("route") ||
      changedProperties.has("_assistantQuery") ||
      changedProperties.has("cloudStatus") ||
      changedProperties.has("hass")
    ) {
      const requested = new Set(
        this._assistantQuery ??
          getAvailableAssistants(this.cloudStatus, this.hass)
      );
      const assistants = Object.keys(voiceAssistants).filter(
        (assistant): assistant is keyof typeof voiceAssistants =>
          requested.has(assistant)
      );
      if (!deepEqual(assistants, this._assistants)) {
        this._assistants = assistants;
        this._table?.clearSelection();
        this._selected = [];
        this._initDirtyTracking({ type: "deep" }, []);
        this._error = undefined;
      }
    }
    super.willUpdate(changedProperties);
  }

  private _locationChanged = async () => {
    if (
      !this.isConnected ||
      !this.route ||
      currentPath() !== `${this.route.prefix}${this.route.path}` ||
      this._queryChangePending
    ) {
      return;
    }
    const { assistants: assistantQuery } = decodeVoiceAssistantQueryParams(
      extractSearchParamsObject()
    );
    if (!deepEqual(assistantQuery, this._assistantQuery) && this.isDirtyState) {
      this._queryChangePending = true;
      try {
        const confirmed = await this.promptDiscardChanges();
        if (
          !this.isConnected ||
          currentPath() !== `${this.route.prefix}${this.route.path}`
        ) {
          return;
        }
        if (!confirmed) {
          replaceCurrentUrl(this._acceptedUrl);
        }
      } finally {
        this._queryChangePending = false;
      }
      // Read the latest URL if more query changes arrived during the prompt.
      this._locationChanged();
      return;
    }
    if (!deepEqual(assistantQuery, this._assistantQuery)) {
      this._assistantQuery = assistantQuery;
    }
    this._acceptedUrl = window.location.href;
  };

  private _candidateIds = memoizeOne(
    (
      states: HomeAssistant["states"],
      exposedEntities: Record<string, ExposeEntitySettings>,
      assistants: (keyof typeof voiceAssistants)[]
    ): ReadonlySet<string> =>
      new Set(
        Object.keys(states).filter((entityId) =>
          assistants.some(
            (assistant) => !exposedEntities[entityId]?.[assistant]
          )
        )
      )
  );

  private get _backPath() {
    return `/config/voice-assistants/expose?${createVoiceAssistantQueryString({
      assistants: this._assistants,
    })}`;
  }

  protected render() {
    if (!this.exposedEntities) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }
    return html`
      <ha-entity-table
        .hass=${this.hass}
        .cloudStatus=${this.cloudStatus}
        .narrow=${this.narrow}
        .isWide=${this.isWide}
        .route=${this.route}
        .tabs=${[
          {
            path: "/config/voice-assistants/expose-entity",
            name: this._assistants.length
              ? this._i18n.localize(
                  "ui.panel.config.voice_assistants.expose.expose_page.expose_to",
                  {
                    assistants: this._assistants
                      .map((assistant) => voiceAssistants[assistant].name)
                      .join(", "),
                  }
                )
              : this._i18n.localize(
                  "ui.panel.config.voice_assistants.expose.add"
                ),
          },
        ]}
        .backPath=${this._backPath}
        .backCallback=${this._backTapped}
        .entityIds=${this._candidateIds(
          this._states,
          this.exposedEntities,
          this._assistants
        )}
        .exposedEntities=${this.exposedEntities}
        .selectionMode=${"always"}
        .selected=${this._selected.length}
        .filter=${this._filter}
        .filterValues=${this._filters}
        .initialGroupColumn=${"device_full"}
        .noDataText=${this._i18n.localize(
          this._assistants.length
            ? "ui.panel.config.voice_assistants.expose.expose_page.no_entities"
            : "ui.panel.config.voice_assistants.expose.expose_page.no_assistants"
        )}
        has-fab
        @selection-changed=${this._selectionChanged}
        @search-changed=${this._searchChanged}
        @entity-table-filters-changed=${this._filtersChanged}
      >
        ${
          this._error
            ? html`<ha-alert slot="top-header" alert-type="error"
                >${this._error}</ha-alert
              >`
            : nothing
        }
        <ha-button
          slot="fab"
          size="l"
          .disabled=${!this._assistants.length || !this._selected.length || this._saving}
          .loading=${this._saving}
          @click=${this._expose}
        >
          ${this._i18n.localize(
            "ui.panel.config.voice_assistants.expose.expose_page.expose_entities",
            { count: this._selected.length }
          )}
        </ha-button>
      </ha-entity-table>
    `;
  }

  private _selectionChanged(ev: HASSDomEvent<SelectionChangedEvent>) {
    this._selected = [...ev.detail.value];
    this._updateDirtyState(this._selected);
  }

  private _searchChanged(ev: ValueChangedEvent<string>) {
    this._filter = ev.detail.value;
  }

  private _filtersChanged(
    ev: HASSDomEvent<HASSDomEvents["entity-table-filters-changed"]>
  ) {
    this._filters = ev.detail.value;
  }

  protected async promptDiscardChanges() {
    if (!this._discardChangesPromise) {
      this._discardChangesPromise = showConfirmationDialog(this, {
        addHistory: false,
        title: this._i18n.localize(
          "ui.panel.config.voice_assistants.expose.expose_page.discard_title"
        ),
        text: this._i18n.localize(
          "ui.panel.config.voice_assistants.expose.expose_page.discard_text"
        ),
        confirmText: this._i18n.localize(
          "ui.panel.config.voice_assistants.expose.expose_page.discard"
        ),
        dismissText: this._i18n.localize("ui.common.cancel"),
      })
        .then((confirmed) => {
          if (!this.isConnected) {
            return false;
          }
          if (confirmed) {
            this._table?.clearSelection();
            this._selected = [];
            this._updateDirtyState(this._selected);
            this._markDirtyStateClean();
          }
          return confirmed;
        })
        .finally(() => {
          this._discardChangesPromise = undefined;
        });
    }
    return this._discardChangesPromise;
  }

  private _backTapped = async () => {
    if (this.isDirtyState && !(await this.promptDiscardChanges())) {
      return;
    }
    if (this.isConnected) {
      goBack(this._backPath);
    }
  };

  private async _expose() {
    if (this._saving || !this._assistants.length || !this._selected.length) {
      return;
    }
    const assistants = this._assistants;
    const selected = this._selected;
    this._saving = true;
    this._error = undefined;
    try {
      await exposeEntities(this.hass, [...assistants], [...selected], true);
    } catch (err: unknown) {
      if (this.isConnected && assistants === this._assistants) {
        this._error = this._i18n.localize(
          "ui.panel.config.voice_assistants.expose.expose_page.expose_failed",
          {
            error:
              err && typeof err === "object" && "message" in err
                ? String(err.message)
                : String(err),
          }
        );
      }
      return;
    } finally {
      this._saving = false;
    }
    if (!this.isConnected) {
      return;
    }
    const unchanged =
      assistants === this._assistants && selected === this._selected;
    if (unchanged) {
      this._markDirtyStateClean();
    }
    fireEvent(this, "exposed-entities-changed");
    if (unchanged) {
      goBack(this._backPath);
    }
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    ha-alert {
      margin: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-voice-assistants-expose-entity": HaConfigVoiceAssistantsExposeEntity;
  }
}

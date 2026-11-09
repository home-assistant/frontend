import type { ContextType } from "@lit/context";
import type { HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../common/decorators/consume";
import {
  consumeLocalize,
  preserveUnchangedEntityStatesRecord,
} from "../common/decorators/consume-context-entry";
import { transform } from "../common/decorators/transform";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import type { LocalizeFunc } from "../common/translations/localize";
import { debounce } from "../common/util/debounce";
import {
  apiContext,
  configContext,
  entitiesContext,
  formattersContext,
  statesContext,
} from "../data/context";
import type { TTSEngine } from "../data/tts";
import { listTTSEngines } from "../data/tts";
import type { HomeAssistant, HomeAssistantFormatters } from "../types";
import type { HaSelectOption, HaSelectSelectEvent } from "./ha-select";
import "./ha-select";

const NONE = "__NONE_OPTION__";

@customElement("ha-tts-picker")
export class HaTTSPicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public language?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() _engines?: TTSEngine[];

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  @transform<HomeAssistant["entities"], string | undefined>({
    transformer: (entities) =>
      Object.values(entities ?? {}).find(
        (entity) =>
          entity.platform === "cloud" &&
          computeDomain(entity.entity_id) === "tts"
      )?.entity_id,
  })
  private _cloudEngineId?: string;

  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, HassEntities>({
    transformer: function (this: HaTTSPicker, states) {
      const engineStates: HassEntities = {};
      this._engines?.forEach(({ engine_id }) => {
        if (states?.[engine_id]) {
          engineStates[engine_id] = states[engine_id];
        }
      });
      return preserveUnchangedEntityStatesRecord(this._states, engineStates);
    },
    watch: ["_engines"],
  })
  private _states: HassEntities = {};

  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityName"]
  >({
    transformer: ({ formatEntityName }) => formatEntityName,
  })
  private _formatEntityName!: HomeAssistantFormatters["formatEntityName"];

  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  protected render() {
    if (!this._engines) {
      return nothing;
    }

    let value = this.value;
    if (!value && this.required) {
      value = this._cloudEngineId;

      if (!value) {
        for (const ttsEngine of this._engines) {
          if (ttsEngine?.supported_languages?.length !== 0) {
            value = ttsEngine.engine_id;
            break;
          }
        }
      }
    }
    if (!value) {
      value = NONE;
    }

    const options: HaSelectOption[] = this._engines
      .filter((engine) => !engine.deprecated || engine.engine_id === value)
      .map((engine) => {
        let label: string;
        if (engine.engine_id.includes(".")) {
          const stateObj = this._states[engine.engine_id];
          label = stateObj
            ? this._formatEntityName(stateObj)
            : engine.engine_id;
        } else {
          label = engine.name || engine.engine_id;
        }
        return {
          value: engine.engine_id,
          label,
          disabled: engine.supported_languages?.length === 0,
        };
      });

    if (!this.required || value === NONE) {
      options.unshift({
        value: NONE,
        label: this._localize("ui.components.tts-picker.none"),
      });
    }

    return html`
      <ha-select
        .label=${this.label || this._localize("ui.components.tts-picker.tts")}
        .value=${value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        .options=${options}
      >
      </ha-select>
    `;
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (!this.hasUpdated) {
      this._updateEngines();
    } else if (changedProperties.has("language")) {
      this._debouncedUpdateEngines();
    }
  }

  private _debouncedUpdateEngines = debounce(() => this._updateEngines(), 500);

  private async _updateEngines() {
    this._engines = (
      await listTTSEngines(
        this._api.callWS,
        this.language,
        this._config.config.country || undefined
      )
    ).providers;

    if (!this.value) {
      return;
    }

    const selectedEngine = this._engines.find(
      (engine) => engine.engine_id === this.value
    );

    fireEvent(this, "supported-languages-changed", {
      value: selectedEngine?.supported_languages,
    });

    if (!selectedEngine || selectedEngine.supported_languages?.length === 0) {
      this.value = undefined;
      fireEvent(this, "value-changed", { value: this.value });
    }
  }

  static styles = css`
    ha-select {
      width: 100%;
    }
  `;

  private _changed(ev: HaSelectSelectEvent): void {
    const value = ev.detail.value;
    if (
      value === "" ||
      value === this.value ||
      (this.value === undefined && value === NONE)
    ) {
      return;
    }
    this.value = value === NONE ? undefined : value;
    fireEvent(this, "value-changed", { value: this.value });
    fireEvent(this, "supported-languages-changed", {
      value: this._engines!.find((engine) => engine.engine_id === this.value)
        ?.supported_languages,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tts-picker": HaTTSPicker;
  }
}

import type { ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/item/ha-list-item-option";
import "../../../../components/list/ha-list-selectable";
import {
  apiContext,
  formattersContext,
  statesContext,
} from "../../../../data/context";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import { setSelectOption } from "../../../../data/select";
import {
  cameraControlHintStyle,
  disabledEntitiesHint,
} from "./camera-control-styles";

/**
 * Lists the saved positions of a camera, from its preset select entity.
 * Selecting one moves the camera there.
 */
@customElement("ha-more-info-camera-presets")
export class HaMoreInfoCameraPresets extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @property({ attribute: "entity-id" }) public entityId?: string;

  /** The entity is disabled, so it has no state */
  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public deviceId?: string;

  protected render() {
    if (this.disabled) {
      return html`<div class="hint">
        ${disabledEntitiesHint(this._localize, this.deviceId)}
      </div>`;
    }
    const stateObj = this.entityId ? this._states[this.entityId] : undefined;
    if (!stateObj) {
      return nothing;
    }
    if (stateObj.state === UNAVAILABLE) {
      return html`<div class="hint">
        ${this._localize("ui.dialogs.more_info_control.camera.ptz.unavailable")}
      </div>`;
    }
    const options = (stateObj.attributes.options as string[] | undefined) ?? [];
    if (!options.length) {
      return html`<div class="hint">
        ${this._localize("ui.dialogs.more_info_control.camera.presets.empty")}
      </div>`;
    }
    return html`
      <ha-list-selectable
        controlled
        aria-label=${this._localize(
          "ui.dialogs.more_info_control.camera.tabs.presets"
        )}
        @ha-list-item-selected=${this._presetSelected}
      >
        ${options.map(
          (option) => html`
            <ha-list-item-option
              .value=${option}
              .selected=${option === stateObj.state}
            >
              <span slot="headline"
                >${this._formatters.formatEntityState(stateObj, option)}</span
              >
            </ha-list-item-option>
          `
        )}
      </ha-list-selectable>
    `;
  }

  private _presetSelected(ev: HASSDomEvent<number>) {
    const stateObj = this._states[this.entityId!];
    const option = (stateObj?.attributes.options as string[] | undefined)?.[
      ev.detail
    ];
    if (!stateObj || !option) {
      return;
    }
    // Moving to the same preset again is fine, the camera may have moved
    setSelectOption(this._api.callService, stateObj.entity_id, option);
  }

  static styles = [
    cameraControlHintStyle,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      /* Scrolls on its own, the tabs above stay */
      ha-list-selectable {
        display: block;
        box-sizing: border-box;
        width: 100%;
        max-width: 360px;
        min-height: 0;
        margin: 0 auto;
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-border-radius-lg);
        overflow-y: auto;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-camera-presets": HaMoreInfoCameraPresets;
  }
}

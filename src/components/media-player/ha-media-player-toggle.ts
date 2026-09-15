import { consume, type ContextType } from "@lit/context";
import { mdiSpeaker, mdiSpeakerPause, mdiSpeakerPlay } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { type CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";

import { consumeEntityState } from "../../common/decorators/consume-context-entry";
import { fireEvent } from "../../common/dom/fire_event";
import { computeEntityPickerDisplay } from "../../common/entity/compute_entity_name_display";
import {
  areasContext,
  devicesContext,
  entitiesContext,
  floorsContext,
  internationalizationContext,
} from "../../data/context";

import "../ha-switch";
import "../ha-svg-icon";

@customElement("ha-media-player-toggle")
class HaMediaPlayerToggle extends LitElement {
  @property({ attribute: false }) public entityId!: string;

  @property({ type: Boolean }) public checked = false;

  @property({ type: Boolean }) public disabled = false;

  @state()
  @consumeEntityState({ entityIdPath: ["entityId"] })
  private _stateObj?: HassEntity;

  @consume({ context: entitiesContext, subscribe: true })
  @state()
  private _entities!: ContextType<typeof entitiesContext>;

  @consume({ context: devicesContext, subscribe: true })
  @state()
  private _devices!: ContextType<typeof devicesContext>;

  @consume({ context: areasContext, subscribe: true })
  @state()
  private _areas!: ContextType<typeof areasContext>;

  @consume({ context: floorsContext, subscribe: true })
  @state()
  private _floors!: ContextType<typeof floorsContext>;

  @consume({ context: internationalizationContext, subscribe: true })
  @state()
  private _i18n!: ContextType<typeof internationalizationContext>;

  private _computeDisplayData = memoizeOne(
    (
      entities: ContextType<typeof entitiesContext>,
      devices: ContextType<typeof devicesContext>,
      areas: ContextType<typeof areasContext>,
      floors: ContextType<typeof floorsContext>,
      i18n: ContextType<typeof internationalizationContext>,
      stateObj: HassEntity
    ) =>
      computeEntityPickerDisplay(
        {
          entities,
          devices,
          areas,
          floors,
          language: i18n.language,
          translationMetadata: i18n.translationMetadata,
        },
        stateObj
      )
  );

  protected render() {
    const stateObj = this._stateObj;

    if (!stateObj) {
      return nothing;
    }

    let icon = mdiSpeaker;
    if (stateObj.state === "playing") {
      icon = mdiSpeakerPlay;
    } else if (stateObj.state === "paused") {
      icon = mdiSpeakerPause;
    }

    const { primary, secondary } = this._computeDisplayData(
      this._entities,
      this._devices,
      this._areas,
      this._floors,
      this._i18n,
      stateObj
    );

    return html`<div class="list-item">
      <ha-svg-icon .path=${icon}></ha-svg-icon>
      <div class="info">
        <div class="main-text">${primary}</div>
        <div class="secondary-text">${secondary}</div>
      </div>
      <ha-switch
        .disabled=${this.disabled}
        .checked=${this.checked}
        @change=${this._handleChange}
      ></ha-switch>
    </div>`;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .list-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          column-gap: var(--ha-space-4);
          align-items: center;
          width: 100%;
        }

        .info {
          min-width: 0;
        }

        .main-text {
          color: var(--primary-text-color);
        }

        .main-text[take-height] {
          line-height: 40px;
        }

        .secondary-text {
          color: var(--secondary-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
    ];
  }

  private _handleChange(ev) {
    ev.stopPropagation();

    this.checked = ev.target.checked;
    fireEvent(this, "change");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-media-player-toggle": HaMediaPlayerToggle;
  }
}

import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeAttributeNameDisplay } from "../../common/entity/compute_attribute_display";
import "../../components/ha-attribute-value";
import "../../components/ha-card";
import type { LocalizeKeys } from "../../common/translations/localize";
import { computeShownAttributes } from "../../data/entity/entity_attributes";
import type { ExtEntityRegistryEntry } from "../../data/entity/entity_registry";
import type { HomeAssistant } from "../../types";
import "../../components/ha-yaml-editor";

interface DetailsViewParams {
  entityId: string;
}

interface DetailEntry {
  translationKey: LocalizeKeys;
  value: string;
}

@customElement("ha-more-info-details")
class HaMoreInfoDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public params?: DetailsViewParams;

  @property({ attribute: false }) public yamlMode = false;

  @state() private _stateObj?: HassEntity;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("params") || changedProps.has("hass")) {
      if (this.params?.entityId && this.hass) {
        this._stateObj = this.hass.states[this.params.entityId];
      }
    }
  }

  protected render() {
    if (!this.params || !this._stateObj) {
      return nothing;
    }

    const { stateEntries, attributes, yamlData } = this._getDetailData(
      this.hass,
      this._stateObj
    );

    return html`
      <div class="content">
        ${this.yamlMode
          ? html`<ha-yaml-editor
              .hass=${this.hass}
              .value=${yamlData}
              read-only
              auto-update
            ></ha-yaml-editor>`
          : html`
              <section class="section">
                <h2 class="section-title">
                  ${this.hass.localize(
                    "ui.components.entity.entity-state-picker.state"
                  )}
                </h2>
                <ha-card>
                  <div class="card-content">
                    <div class="data-group">
                      ${stateEntries.map(
                        (entry) =>
                          html`<div class="data-entry">
                            <div class="key">
                              ${this.hass.localize(entry.translationKey)}
                            </div>
                            <div class="value">${entry.value}</div>
                          </div>`
                      )}
                    </div>
                  </div>
                </ha-card>
              </section>

              <section class="section">
                <h2 class="section-title">
                  ${this.hass.localize(
                    "ui.dialogs.more_info_control.attributes"
                  )}
                </h2>
                <ha-card>
                  <div class="card-content">
                    <div class="data-group">
                      ${this._renderAttributes(attributes)}
                    </div>
                  </div>
                </ha-card>
              </section>
            `}
      </div>
    `;
  }

  private _getDetailData = memoizeOne(
    (
      hass: HomeAssistant,
      stateObj: HassEntity
    ): {
      stateEntries: DetailEntry[];
      attributes: string[];
      yamlData: {
        state: {
          translated: string;
          raw: string;
          last_changed: string;
          last_updated: string;
        };
        attributes: string[];
      };
    } => {
      const translatedState = hass.formatEntityState(stateObj);
      const detailsAttributes = computeShownAttributes(stateObj);
      const detailsAttributeSet = new Set(detailsAttributes);
      const builtInAttributes = Object.keys(stateObj.attributes).filter(
        (attribute) => !detailsAttributeSet.has(attribute)
      );
      const allAttributes = [...detailsAttributes, ...builtInAttributes];

      return {
        stateEntries: [
          {
            translationKey: "ui.dialogs.more_info_control.translated",
            value: translatedState,
          },
          {
            translationKey: "ui.dialogs.more_info_control.raw",
            value: stateObj.state,
          },
          {
            translationKey: "ui.dialogs.more_info_control.last_changed",
            value: stateObj.last_changed,
          },
          {
            translationKey: "ui.dialogs.more_info_control.last_updated",
            value: stateObj.last_updated,
          },
        ],
        attributes: allAttributes,
        yamlData: {
          state: {
            translated: translatedState,
            raw: stateObj.state,
            last_changed: stateObj.last_changed,
            last_updated: stateObj.last_updated,
          },
          attributes: allAttributes,
        },
      };
    }
  );

  private _renderAttributes(attributes: string[]) {
    if (attributes.length === 0) {
      return html`<div class="empty">
        ${this.hass.localize("ui.common.none")}
      </div>`;
    }

    return attributes.map(
      (attribute) => html`
        <div class="data-entry">
          <div class="key">
            ${computeAttributeNameDisplay(
              this.hass.localize,
              this._stateObj!,
              this.hass.entities,
              attribute
            )}
          </div>
          <div class="value">
            <ha-attribute-value
              .hass=${this.hass}
              .attribute=${attribute}
              .stateObj=${this._stateObj}
            ></ha-attribute-value>
          </div>
        </div>
      `
    );
  }

  static styles: CSSResultGroup = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .content {
      padding: var(--ha-space-6);
      padding-bottom: max(var(--safe-area-inset-bottom), var(--ha-space-6));
    }

    .section + .section {
      margin-top: var(--ha-space-4);
    }

    .section-title {
      margin: 0 0 var(--ha-space-2);
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
    }

    ha-card {
      direction: ltr;
    }

    .card-content {
      padding: var(--ha-space-2) var(--ha-space-4);
    }

    .data-entry {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      padding: var(--ha-space-2) 0;
      border-bottom: 1px solid var(--divider-color);
    }

    .data-group .data-entry:last-of-type {
      border-bottom: none;
    }

    .data-entry .value {
      max-width: 60%;
      overflow-wrap: break-word;
      text-align: right;
    }

    .key {
      flex-grow: 1;
      color: var(--secondary-text-color);
    }

    .empty {
      color: var(--secondary-text-color);
      text-align: center;
      padding: var(--ha-space-2) 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-details": HaMoreInfoDetails;
  }
}

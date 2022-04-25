import "@material/mwc-button/mwc-button";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/state-badge";
import "../../../components/ha-alert";
import "../../../components/ha-icon-next";
import type { UpdateEntity } from "../../../data/update";
import { HomeAssistant } from "../../../types";

@customElement("ha-config-updates")
class HaConfigUpdates extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false })
  public updateEntities?: UpdateEntity[];

  @property({ type: Boolean, reflect: true }) showAll = false;

  protected render(): TemplateResult {
    if (!this.updateEntities?.length) {
      return html``;
    }

    const updates =
      this.showAll || this.updateEntities.length <= 3
        ? this.updateEntities
        : this.updateEntities.slice(0, 2);

    return html`
      <div class="title">
        ${this.hass.localize("ui.panel.config.updates.title", {
          count: this.updateEntities.length,
        })}
      </div>
      ${updates.map(
        (entity) => html`
          <paper-icon-item
            @click=${this._openMoreInfo}
            .entity_id=${entity.entity_id}
            class=${entity.attributes.skipped_version ? "skipped" : ""}
          >
            <span slot="item-icon" class="icon">
              <state-badge
                .title=${entity.attributes.title ||
                entity.attributes.friendly_name}
                .stateObj=${entity}
                slot="item-icon"
              ></state-badge>
            </span>
            <paper-item-body two-line>
              ${entity.attributes.title || entity.attributes.friendly_name}
              <div secondary>
                ${this.hass.localize(
                  "ui.panel.config.updates.version_available",
                  {
                    version_available: entity.attributes.latest_version,
                  }
                )}
                ${entity.attributes.skipped_version
                  ? `(${this.hass.localize("ui.panel.config.updates.skipped")})`
                  : ""}
              </div>
            </paper-item-body>
            ${!this.narrow ? html`<ha-icon-next></ha-icon-next>` : ""}
          </paper-icon-item>
        `
      )}
      ${!this.showAll && this.updateEntities.length >= 4
        ? html`
            <button class="show-more" @click=${this._showAllClicked}>
              ${this.hass.localize("ui.panel.config.updates.more_updates", {
                count: this.updateEntities!.length - updates.length,
              })}
            </button>
          `
        : ""}
    `;
  }

  private _openMoreInfo(ev: MouseEvent): void {
    fireEvent(this, "hass-more-info", {
      entityId: (ev.currentTarget as any).entity_id,
    });
  }

  private _showAllClicked() {
    this.showAll = true;
  }

  static get styles(): CSSResultGroup[] {
    return [
      css`
        .title {
          font-size: 16px;
          padding: 16px;
          padding-bottom: 0;
        }
        .skipped {
          background: var(--secondary-background-color);
        }
        .icon {
          display: inline-flex;
          height: 100%;
          align-items: center;
        }
        ha-icon-next {
          color: var(--secondary-text-color);
          height: 24px;
          width: 24px;
        }
        button.show-more {
          color: var(--primary-color);
          text-align: left;
          cursor: pointer;
          background: none;
          border-width: initial;
          border-style: none;
          border-color: initial;
          border-image: initial;
          padding: 16px;
          font: inherit;
        }
        button.show-more:focus {
          outline: none;
          text-decoration: underline;
        }
        paper-icon-item {
          cursor: pointer;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-updates": HaConfigUpdates;
  }
}

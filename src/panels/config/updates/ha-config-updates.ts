import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/entity/state-badge";
import "../../../components/ha-alert";
import "../../../components/ha-circular-progress";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import type { UpdateEntity } from "../../../data/update";
import type { HomeAssistant } from "../../../types";
import { showUpdateDialog } from "./show-update-dialog";

@customElement("ha-config-updates")
class HaConfigUpdates extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false })
  public updateEntities?: UpdateEntity[];

  @property({ type: Number })
  public total?: number;

  protected render(): TemplateResult {
    if (!this.updateEntities?.length) {
      return html``;
    }

    const updates = this.updateEntities;

    return html`
      <div class="title">
        ${this.hass.localize("ui.panel.config.updates.title", {
          count: this.total || this.updateEntities.length,
        })}
      </div>
      <mwc-list>
        ${updates.map(
          (entity) => html`
            <ha-list-item
              twoline
              graphic="avatar"
              class=${entity.attributes.skipped_version ? "skipped" : ""}
              .entity=${entity}
              .hasMeta=${!this.narrow}
              @click=${this._openMoreInfo}
            >
              <state-badge
                slot="graphic"
                .title=${entity.attributes.title ||
                entity.attributes.friendly_name}
                .stateObj=${entity}
                class=${this.narrow && entity.attributes.in_progress
                  ? "updating"
                  : ""}
              ></state-badge>
              ${this.narrow && entity.attributes.in_progress
                ? html`<ha-circular-progress
                    active
                    size="small"
                    slot="graphic"
                    class="absolute"
                  ></ha-circular-progress>`
                : ""}
              <span
                >${entity.attributes.title ||
                entity.attributes.friendly_name}</span
              >
              <span slot="secondary">
                ${this.hass.localize(
                  "ui.panel.config.updates.version_available",
                  {
                    version_available: entity.attributes.latest_version,
                  }
                )}${entity.attributes.skipped_version
                  ? `(${this.hass.localize("ui.panel.config.updates.skipped")})`
                  : ""}
              </span>
              ${!this.narrow
                ? entity.attributes.in_progress
                  ? html`<ha-circular-progress
                      active
                      size="small"
                      slot="meta"
                    ></ha-circular-progress>`
                  : html`<ha-icon-next slot="meta"></ha-icon-next>`
                : ""}
            </ha-list-item>
          `
        )}
      </mwc-list>
    `;
  }

  private _openMoreInfo(ev: MouseEvent): void {
    showUpdateDialog(this, { entity: (ev.currentTarget as any).entity });
    // fireEvent(this, "hass-more-info", {
    //   entityId: (ev.currentTarget as any).entity.entity_id,
    // });
  }

  static get styles(): CSSResultGroup[] {
    return [
      css`
        :host {
          --mdc-list-vertical-padding: 0;
        }
        .title {
          font-size: 16px;
          padding: 16px;
          padding-bottom: 0;
        }
        .skipped {
          background: var(--secondary-background-color);
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
        ha-list-item {
          cursor: pointer;
          font-size: 16px;
        }
        ha-circular-progress.absolute {
          position: absolute;
        }
        state-badge.updating {
          opacity: 0.5;
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

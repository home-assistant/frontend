import "@material/mwc-list/mwc-list";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { domainIcon } from "../../../common/entity/domain_icon";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import type { ResolutionIssue } from "../../../data/resolutions";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-resolutions")
class HaConfigResolutions extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false })
  public resolutionIssues?: ResolutionIssue[];

  protected render(): TemplateResult {
    if (!this.resolutionIssues?.length) {
      return html``;
    }

    const issues = this.resolutionIssues;

    return html`
      <div class="title">
        ${this.hass.localize("ui.panel.config.resolutions.title", {
          count: this.resolutionIssues.length,
        })}
      </div>
      <mwc-list>
        ${issues.map(
          (issue) => html`
            <ha-list-item twoline graphic="avatar" .hasMeta=${!this.narrow}>
              <ha-svg-icon
                slot="graphic"
                .title=${issue.domain}
                .path=${domainIcon(issue.domain)}
              ></ha-svg-icon>
              <span
                >${this.hass.localize(
                  `component.${issue.domain}.issues.${issue.issue_id}.title`
                )}</span
              >
              <span slot="secondary">
                Breaks in version ${issue.breaks_in_ha_version}
              </span>
            </ha-list-item>
          `
        )}
      </mwc-list>
    `;
  }

  // private _openShowMoreDialog(ev: MouseEvent): void {
  // }

  static styles = css`
    :host {
      --mdc-list-vertical-padding: 0;
    }
    .title {
      font-size: 16px;
      padding: 16px;
      padding-bottom: 0;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-resolutions": HaConfigResolutions;
  }
}

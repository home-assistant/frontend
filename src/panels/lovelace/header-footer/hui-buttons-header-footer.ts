import { css, html, LitElement, TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { HomeAssistant } from "../../../types";
import { processConfigEntities } from "../common/process-config-entities";
import "../components/hui-buttons-base";
import { EntityConfig } from "../entity-rows/types";
import { LovelaceHeaderFooter } from "../types";
import { ButtonsHeaderFooterConfig } from "./types";

@customElement("hui-buttons-header-footer")
export class HuiButtonsHeaderFooter
  extends LitElement
  implements LovelaceHeaderFooter
{
  public static getStubConfig(): Record<string, unknown> {
    return { entities: [] };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public type!: "header" | "footer";

  @state() private _configEntities?: EntityConfig[];

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: ButtonsHeaderFooterConfig): void {
    this._configEntities = processConfigEntities(config.entities).map(
      (entityConfig) => {
        const conf = {
          tap_action: { action: "toggle" },
          hold_action: { action: "more-info" },
          ...entityConfig,
        };
        if (computeDomain(entityConfig.entity) === "scene") {
          conf.tap_action = {
            action: "call-service",
            service: "scene.turn_on",
            target: { entity_id: conf.entity },
          };
        }
        return conf;
      }
    );
  }

  protected render(): TemplateResult | void {
    return html`
      ${this.type === "footer"
        ? html`<li class="divider footer" role="separator"></li>`
        : ""}
      <hui-buttons-base
        .hass=${this.hass}
        .configEntities=${this._configEntities}
        class=${classMap({
          footer: this.type === "footer",
          header: this.type === "header",
        })}
      ></hui-buttons-base>
      ${this.type === "header"
        ? html`<li class="divider header" role="separator"></li>`
        : ""}
    `;
  }

  static styles = css`
    .divider {
      height: 0;
      margin: 16px 0;
      list-style-type: none;
      border: none;
      border-bottom-width: 1px;
      border-bottom-style: solid;
      border-bottom-color: var(--divider-color);
    }
    .divider.header {
      margin-top: 0;
    }
    hui-buttons-base.footer {
      --padding-bottom: 16px;
    }
    hui-buttons-base.header {
      --padding-top: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-buttons-header-footer": HuiButtonsHeaderFooter;
  }
}

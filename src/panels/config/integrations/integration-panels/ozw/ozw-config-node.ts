import {
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { computeTail } from "./ozw-config-router";
import "./ozw-node-router";

@customElement("ozw-config-node")
class OZWConfigNode extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() public ozwInstance?: number;

  @property() public nodeId?: number;

  protected render(): TemplateResult {
    const route = computeTail(this.route);
    return html`
      <ozw-node-router
        .ozwInstance=${this.ozwInstance}
        .nodeId=${this.nodeId}
        .route=${route}
        .hass=${this.hass}
        .narrow=${this.narrow}
      >
      </ozw-node-router>
    `;
  }

  static get styles(): CSSResultArray {
    return [haStyle];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ozw-config-node": OZWConfigNode;
  }
}

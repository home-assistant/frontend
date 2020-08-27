import {
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { navigate } from "../../../../../common/navigate";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../../../layouts/hass-tabs-subpage";
import "./ozw-node-router";
import { computeTail } from "./ozw-config-router";

@customElement("ozw-config-node")
class OZWConfigNode extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() public ozw_instance = 0;

  @property() public node_id = 0;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.ozw_instance <= 0) {
      navigate(this, "/config/ozw/dashboard", true);
    }
  }

  protected render(): TemplateResult {
    const route = computeTail(this.route);
    return html`
      <ozw-node-router
        .ozw_instance=${this.ozw_instance}
        .node_id=${this.node_id}
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

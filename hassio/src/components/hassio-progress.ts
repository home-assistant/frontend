import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { SubscribeMixin } from "../../../src/mixins/subscribe-mixin";
import { HomeAssistant } from "../../../src/types";
import "@polymer/paper-progress/paper-progress";

interface HassioProgressEvent {
  data: {
    name: string;
    downloading: { current: number; total: number };
    extracting: { current: number; total: number };
  };
}

@customElement("hassio-progress")
export class HassioProgress extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;

  @property() public name = "";

  @property() private downloaded = 0;

  @property() private progress = 100;

  protected render(): TemplateResult {
    if (this.progress === 100) {
      return html``;
    }
    if (this.progress === 0 && this.downloaded === 0) {
      return html` <paper-progress indeterminate></paper-progress> `;
    }
    return html`
      <paper-progress
        .value=${this.progress}
        .secondaryProgress=${this.downloaded}
      ></paper-progress>
    `;
  }

  public hassSubscribe(): Promise<UnsubscribeFunc>[] {
    return [
      this.hass!.connection.subscribeEvents(this._update, "hassio_progress"),
    ];
  }

  private _update = (ev: HassioProgressEvent) => {
    if (ev.data.name === this.name) {
      this.downloaded =
        Math.round(
          (ev.data.downloading.current / ev.data.downloading.total) * 100
        ) || 0;
      this.progress =
        Math.round(
          (ev.data.extracting.current / ev.data.extracting.total) * 100
        ) || 0;
    }
  };

  static get styles(): CSSResult[] {
    return [
      css`
        paper-progress {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          width: auto;

          --paper-progress-active-color: var(--primary-color);
          --paper-progress-secondary-color: var(--light-primary-color);
        }
      `,
    ];
  }
}

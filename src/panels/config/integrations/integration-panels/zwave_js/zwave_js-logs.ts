import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, property, customElement, LitElement } from "lit-element";
import { subscribeZWaveJSLogs } from "../../../../../data/zwave_js";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../../../types";

@customElement("zwave_js-logs")
class ZWaveJSLogs extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public configEntryId!: string;

  private _textarea?: HTMLTextAreaElement;

  public hassSubscribe(): Array<UnsubscribeFunc | Promise<UnsubscribeFunc>> {
    return [
      subscribeZWaveJSLogs(this.hass, this.configEntryId, (log) => {
        if (this._textarea) {
          this._textarea.value += `${log.timestamp} ${log.message}\n`;
        }
      }),
    ];
  }

  protected render() {
    return html`<textarea></textarea>`;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._textarea = this.shadowRoot!.querySelector("textarea")!;
  }

  static styles = css``;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-logs": ZWaveJSLogs;
  }
}

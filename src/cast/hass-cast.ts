import {
  customElement,
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
  property,
} from "lit-element";
import "../components/ha-card";
import { HomeAssistant } from "../types";
import { castApiAvailable } from "./cast_framework";

@customElement("hass-cast")
class HassCast extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _connected = false;

  protected render(): TemplateResult | void {
    return html`
      <div class="connect">
        <google-cast-launcher></google-cast-launcher>
      </div>
      ${this._connected
        ? html`
            <div class="actions">
              <mwc-button @click=${this._sendAuth}>Send Auth</mwc-button>
              <br /><br />
              <mwc-button @click=${this._showLovelace}
                >Send Lovelace</mwc-button
              >
              <br /><br />
              <mwc-button @click=${this._breakFree}>Break Free</mwc-button>
            </div>
          `
        : ""}
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    castApiAvailable().then((isAvailable) =>
      this._onCastAvailable(isAvailable)
    );
  }

  private _onCastAvailable(isAvailable: boolean) {
    if (!isAvailable) {
      console.log("CAST NOT AVAILABLE");
      return;
    }
    console.log("INIT CAST");
    const context = this._castContext;
    context.setOptions({
      receiverApplicationId: "B12CE3CA",
      // @ts-ignore
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });
    context.addEventListener(
      // @ts-ignore
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      (ev: SessionStateChangedEvent) => {
        if (ev.sessionState === "SESSION_RESUMED") {
          // TODO we should verify that it is actually connected
          this._connected = true;
        } else if (ev.sessionState === "SESSION_STARTED") {
          this._sendAuth();
        }
      }
    );
  }

  private _sendCastMessage(msg: HassMessage) {
    this._castSession.sendMessage("urn:x-cast:com.nabucasa.hast", msg);
  }

  private _sendAuth() {
    this._sendCastMessage({
      type: "connect",
      refreshToken: this.hass.auth.data.refresh_token,
      clientId: this.hass.auth.data.clientId,
      hassUrl: "http://192.168.1.234:8123",
    });
    this._connected = true;
  }

  private get _castContext(): any {
    // @ts-ignore
    return cast.framework.CastContext.getInstance();
  }

  private get _castSession(): any {
    return this._castContext.getCurrentSession();
  }

  private _showLovelace() {
    this._sendCastMessage({
      type: "show_lovelace",
      config: {
        views: [
          {
            cards: [
              {
                title: "Home",
                type: "entities",
                entities: [
                  "light.ceiling_lights",
                  "light.bed_light",
                  "light.kitchen_lights",
                ],
              },

              {
                type: "horizontal-stack",
                cards: [],
              },
              {
                type: "horizontal-stack",
                cards: [
                  {
                    type: "sensor",
                    entity: "sensor.inside_temperature",
                  },
                  {
                    type: "sensor",
                    entity: "sensor.inside_humidity",
                  },
                ],
              },
              {
                type: "map",
                aspect_ratio: "16:7.6",
                // default_zoom: 15,
                entities: [
                  "device_tracker.paulus_demo",
                  "device_tracker.at_demo",
                  "zone.home",
                ],
              },

              {
                type: "horizontal-stack",
                cards: [
                  {
                    type: "sensor",
                    entity: "sensor.outside_temperature",
                  },
                  {
                    type: "sensor",
                    entity: "sensor.outside_humidity",
                  },
                ],
              },
              {
                type: "picture",
                image: "http://192.168.1.234:8123/local/next-screen.png",
                tap_action: {
                  action: "call-service",
                  service: "cast_demo.show_lovelace",
                  service_data: {
                    config: {
                      views: [
                        {
                          cards: [
                            {
                              entity: "media_player.office_display",
                              type: "media-control",
                            },
                            {
                              type: "picture-entity",
                              entity: "camera.demo_camera",
                            },
                            {
                              type: "thermostat",
                              entity: "climate.hvac",
                            },
                            {
                              type: "picture",
                              image:
                                "http://192.168.1.234:8123/local/next-screen.png",
                              tap_action: {
                                action: "call-service",
                                service: "camera.play_stream",
                                service_data: {
                                  entity_id: "camera.g3",
                                  media_player: "media_player.office_display",
                                },
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    });
  }

  private _breakFree() {
    this._sendCastMessage({
      type: "break_free",
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        text-align: left;
        display: block;
        max-width: 300px;
      }
      .content {
        padding: 0 16px 16px;
      }
      .connect {
        max-width: 50px;
      }
      .actions {
        margin-top: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-cast": HassCast;
  }
}

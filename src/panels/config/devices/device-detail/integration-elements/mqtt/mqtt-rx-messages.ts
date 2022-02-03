import { customElement } from "lit/decorators";
import { MQTTMessages } from "./mqtt-messages";

@customElement("mqtt-rx-messages")
class MQTTRxMessages extends MQTTMessages {
  direction = "Received";
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-rx-messages": MQTTRxMessages;
  }
}

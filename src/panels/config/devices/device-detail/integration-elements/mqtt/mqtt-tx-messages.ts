import { customElement } from "lit/decorators";
import { MQTTMessages } from "./mqtt-messages";

@customElement("mqtt-tx-messages")
class MQTTTxMessages extends MQTTMessages {
  direction = "Transmitted";
}

declare global {
  interface HTMLElementTagNameMap {
    "mqtt-tx-messages": MQTTTxMessages;
  }
}

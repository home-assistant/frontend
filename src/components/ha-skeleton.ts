import WaSkeleton from "@home-assistant/webawesome/dist/components/skeleton/skeleton";
import { customElement } from "lit/decorators";

@customElement("ha-skeleton")
export class HaSkeleton extends WaSkeleton {}

declare global {
  interface HTMLElementTagNameMap {
    "ha-skeleton": HaSkeleton;
  }
}

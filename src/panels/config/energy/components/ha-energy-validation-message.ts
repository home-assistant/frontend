import { html } from "lit";
import { EnergyValidationMessage } from "../../../../data/energy";

export const renderEnergyValidationMessage = (
  type: "error" | "warning",
  message: EnergyValidationMessage
) =>
  html` <p>
    <b style="color: var(--${type}-color)">[${type}]</b>
    ${message.message}${!message.link
      ? ""
      : html` <a href=${message.link} target="_blank" rel="noreferrer noopener"
          >Learn more</a
        >`}
  </p>`;

import { mdiViewGridPlus } from "@mdi/js";
import { css, html } from "lit";
import "../../../components/ha-ripple";
import "../../../components/ha-svg-icon";

export const renderCreateSectionButton = (
  label: string,
  action: () => void,
  icon = mdiViewGridPlus,
  kind: "section" | "stack" = "section"
) => html`
  <button
    class="create-section ${kind === "stack" ? "create-stack" : ""}"
    @click=${action}
    aria-label=${label}
    .title=${label}
  >
    <ha-ripple></ha-ripple>
    <ha-svg-icon .path=${icon}></ha-svg-icon>
  </button>
`;

export const createSectionButtonStyles = css`
  .create-section {
    display: block;
    position: relative;
    outline: none;
    background: none;
    cursor: pointer;
    border-radius: var(--ha-section-border-radius, var(--ha-border-radius-xl));
    border: 2px dashed var(--primary-color);
    order: 1;
    height: calc(var(--row-height) + 2 * (var(--row-gap) + 2px));
    padding: 8px;
    box-sizing: border-box;
    width: 100%;
    --ha-ripple-color: var(--primary-color);
    --ha-ripple-hover-opacity: 0.04;
    --ha-ripple-pressed-opacity: 0.12;
  }

  .create-section:focus {
    border: 2px solid var(--primary-color);
  }

  .create-stack,
  .create-stack:focus {
    border-color: var(--cyan-color);
    --ha-ripple-color: var(--cyan-color);
  }
`;

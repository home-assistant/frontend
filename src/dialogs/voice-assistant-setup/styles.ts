import { css } from "lit";
import { haStyle } from "../../resources/styles";

export const AssistantSetupStyles = [
  haStyle,
  css`
    :host {
      align-items: center;
      text-align: center;
      min-height: 300px;
      max-width: 500px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      padding: 24px;
      box-sizing: border-box;
    }
    .content {
      flex: 1;
    }
    .content img {
      width: 120px;
      margin-top: 68px;
      margin-bottom: 68px;
    }
    .footer {
      width: 100%;
      display: flex;
      flex-direction: column;
    }
    .footer ha-button {
      width: 100%;
    }
  `,
];

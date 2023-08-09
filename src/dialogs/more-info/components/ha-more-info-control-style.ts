import { css } from "lit";

export const moreInfoControlStyle = css`
  :host {
    display: flex;
    flex-direction: column;
    flex: 1;
    justify-content: space-between;
  }

  .controls {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .controls:not(:last-child) {
    margin-bottom: 24px;
  }

  .controls > *:not(:last-child) {
    margin-bottom: 24px;
  }

  .secondary-controls {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }
  .secondary-controls-scroll {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    gap: 12px;
    margin: auto;
    overflow: auto;
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
    margin: 0 -24px;
    padding: 0 24px;
  }
  .secondary-controls-scroll::-webkit-scrollbar {
    display: none;
  }

  /* Don't use scroll on device without touch support  */
  @media (hover: hover) {
    .secondary-controls-scroll {
      justify-content: center;
      flex-wrap: wrap;
    }
  }

  .buttons {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  .buttons > * {
    margin: 8px;
  }

  ha-attributes {
    width: 100%;
  }
`;

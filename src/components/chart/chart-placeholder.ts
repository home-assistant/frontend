import { css } from "lit";

/* The space a chart takes while its data loads, as big as `ha-chart-base`
   draws one by default: half as tall as it's wide, within the same limits,
   with a line for its legend under it. Put the placeholder and its legend
   in a `.placeholder-container` as wide as the chart will be. */
export const chartPlaceholderStyles = css`
  .placeholder-container {
    container-type: inline-size;
  }
  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: min(max(50cqi, 200px), var(--chart-max-height, 350px));
  }
  .legend-placeholder {
    width: 40%;
    height: 16px;
    margin: 10px auto;
  }
`;

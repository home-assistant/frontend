import { css } from "lit";

export const coverDrawingStyles = css`
  :host {
    --cover-drawing-sky-top: #9ed3f6;
    --cover-drawing-sky-bottom: #3f97e6;
    --cover-drawing-sky-warm: #ffffff;
    --cover-drawing-sky-cool: #2b86d9;
    --cover-drawing-frame: color-mix(
      in srgb,
      var(--disabled-color) 20%,
      var(--ha-dialog-surface-background, var(--card-background-color))
    );
    --cover-drawing-frame-edge: #e6e0d8;
    --cover-drawing-fabric: #e1e1e1;
    --cover-drawing-fabric-edge: #bdbdbd;
    --cover-drawing-seam: #bdbdbd;
    --cover-drawing-lift: #f5f5f5;
    --cover-drawing-stripe: #ffffff;
    --cover-drawing-slot: #cfe8fb;
    --cover-drawing-ghost: #e1e1e1;
    --cover-drawing-metal: #6f7a84;
    --cover-drawing-grass-top: #a8d49a;
    --cover-drawing-grass-bottom: #7fb071;
    --cover-drawing-handle: #ffffff;
    --cover-drawing-gauge: rgba(0, 0, 0, 0.12);
    --cover-drawing-handle-shadow: rgba(0, 0, 0, 0.28);
  }
  .control.dark {
    --cover-drawing-sky-top: #1a2140;
    --cover-drawing-sky-bottom: #2c5490;
    --cover-drawing-sky-warm: #3e59a6;
    --cover-drawing-sky-cool: #0a1733;
    --cover-drawing-frame-edge: #3a4149;
    --cover-drawing-fabric: #5a6069;
    --cover-drawing-fabric-edge: #858e99;
    --cover-drawing-seam: #464b53;
    --cover-drawing-lift: #6e757e;
    --cover-drawing-stripe: #676e78;
    --cover-drawing-slot: #3b5f96;
    --cover-drawing-ghost: #9aa3ad;
    --cover-drawing-metal: #9aa5b0;
    --cover-drawing-grass-top: #3f6b45;
    --cover-drawing-grass-bottom: #2b4a31;
    --cover-drawing-handle: #f2f4f6;
    --cover-drawing-gauge: rgba(0, 0, 0, 0.28);
    --cover-drawing-handle-shadow: rgba(0, 0, 0, 0.6);
  }
  .sky-top {
    stop-color: var(--cover-drawing-sky-top);
  }
  .sky-bottom {
    stop-color: var(--cover-drawing-sky-bottom);
  }
  .sky-warm {
    stop-color: var(--cover-drawing-sky-warm);
  }
  .sky-cool {
    stop-color: var(--cover-drawing-sky-cool);
  }
  .grass-top {
    stop-color: var(--cover-drawing-grass-top);
  }
  .grass-bottom {
    stop-color: var(--cover-drawing-grass-bottom);
  }
  .frame {
    fill: var(--cover-drawing-frame);
  }
  .opening-edge {
    fill: none;
    stroke: var(--cover-drawing-frame);
    stroke-width: 3;
  }
  .fabric {
    fill: var(--cover-drawing-fabric);
  }
  .stripe {
    fill: var(--cover-drawing-stripe);
  }
  .bottom-bar {
    fill: var(--cover-drawing-fabric-edge);
  }
  .seam,
  .cord {
    fill: var(--cover-drawing-seam);
  }
  .seam.faint {
    opacity: 0.5;
  }
  .cord {
    opacity: 0.85;
  }
  .lift {
    fill: var(--cover-drawing-lift);
    opacity: 0.75;
  }
  .slat-line {
    stroke: var(--cover-drawing-fabric-edge);
  }
  .slot {
    fill: var(--cover-drawing-slot);
  }
  .panel-shadow {
    fill: #000;
  }
  .ghost {
    fill: var(--cover-drawing-ghost);
  }
  .target-line {
    fill: none;
    stroke: var(--cover-drawing-handle);
    stroke-width: 2;
    stroke-linecap: round;
    filter: drop-shadow(0 1px 1.5px var(--cover-drawing-handle-shadow));
  }
  .metal {
    fill: var(--cover-drawing-metal);
  }
  .gauge-rail {
    fill: var(--cover-drawing-gauge);
  }
  .gauge-ball {
    fill: var(--cover-drawing-handle);
    filter: drop-shadow(0 0.5px 1.5px var(--cover-drawing-handle-shadow));
  }
  .pill-handle {
    fill: var(--cover-drawing-handle);
    filter: drop-shadow(0 1px 2px var(--cover-drawing-handle-shadow));
  }
`;

import "@home-assistant/webawesome/dist/components/skeleton/skeleton";
import type { TemplateResult } from "lit";
import { css, html } from "lit";

/** Placeholder shown in place of a text while onboarding translations load. */
export const renderSkeleton = (variant: string): TemplateResult =>
  html`<wa-skeleton effect="sheen" class="skeleton ${variant}"></wa-skeleton>`;

export const skeletonStyles = css`
  .skeleton {
    height: 1em;
    vertical-align: middle;
    --color: var(--ha-color-fill-neutral-normal-resting);
    --sheen-color: var(--ha-color-fill-neutral-loud-resting);
  }
  .skeleton.title {
    width: 200px;
  }
  .skeleton.line {
    width: 100%;
  }
  .skeleton.headline {
    width: 40%;
    margin-bottom: var(--ha-space-1);
  }
  .skeleton.chip {
    width: 80px;
  }
  .skeleton.button {
    width: 120px;
  }
  .skeleton.label {
    width: 80px;
  }
`;

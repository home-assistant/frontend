import type { TemplateResult } from "lit";
import { css, html } from "lit";
import "../components/skeleton/ha-skeleton-text";

/** Placeholder shown in place of a text while onboarding translations load. */
export const renderSkeleton = (variant: string): TemplateResult =>
  html`<ha-skeleton-text class="skeleton ${variant}"></ha-skeleton-text>`;

export const skeletonStyles = css`
  .skeleton.title {
    --ha-skeleton-text-width: 200px;
  }
  .skeleton.line {
    --ha-skeleton-text-width: 100%;
  }
  .skeleton.headline {
    --ha-skeleton-text-width: 40%;
    margin-bottom: var(--ha-space-1);
  }
  .skeleton.chip {
    --ha-skeleton-text-width: 80px;
  }
  .skeleton.button {
    --ha-skeleton-text-width: 120px;
  }
  .skeleton.label {
    --ha-skeleton-text-width: 80px;
  }
`;

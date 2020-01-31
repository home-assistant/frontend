import { css } from "lit-element";

export const embeddedHaMarkdownCSS = css`
  ha-markdown {
    display: block;
    -ms-user-select: initial;
    -webkit-user-select: initial;
    -moz-user-select: initial;
  }
  ha-markdown > *:first-child {
    margin-top: 0;
  }
  ha-markdown > *:last-child {
    margin-bottom: 0;
  }
  ha-markdown a {
    color: var(--primary-color);
  }
  ha-markdown img {
    max-width: 100%;
  }
`;

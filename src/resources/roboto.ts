import { css, unsafeCSS } from "lit";

export const fontStyles = css`
  @font-face {
    font-family: "Roboto";
    src:
      local("Roboto Light"),
      local("Roboto-Light"),
      url(${unsafeCSS(__STATIC_PATH__)}fonts/roboto/Roboto-Light.woff2)
        format("woff2");
    font-weight: var(--ha-font-weight-light);
    font-style: normal;
  }
  @font-face {
    font-family: "Roboto";
    src:
      local("Roboto Light Italic"),
      local("Roboto-LightItalic"),
      url(${unsafeCSS(__STATIC_PATH__)}fonts/roboto/Roboto-LightItalic.woff2)
        format("woff2");
    font-weight: var(--ha-font-weight-light);
    font-style: italic;
  }
  @font-face {
    font-family: "Roboto";
    src:
      local("Roboto Regular"),
      local("Roboto-Regular"),
      url(${unsafeCSS(__STATIC_PATH__)}fonts/roboto/Roboto-Regular.woff2)
        format("woff2");
    font-weight: var(--ha-font-weight-normal);
    font-style: normal;
  }
  @font-face {
    font-family: "Roboto";
    src:
      local("Roboto Italic"),
      local("Roboto-Italic"),
      url(${unsafeCSS(__STATIC_PATH__)}fonts/roboto/Roboto-RegularItalic.woff2)
        format("woff2");
    font-weight: var(--ha-font-weight-normal);
    font-style: italic;
  }
  @font-face {
    font-family: "Roboto";
    src:
      local("Roboto Medium"),
      local("Roboto-Medium"),
      url(${unsafeCSS(__STATIC_PATH__)}fonts/roboto/Roboto-Medium.woff2)
        format("woff2");
    font-weight: var(--ha-font-weight-semibold);
    font-style: normal;
  }
  @font-face {
    font-family: "Roboto";
    src:
      local("Roboto Medium Italic"),
      local("Roboto-MediumItalic"),
      url(${unsafeCSS(__STATIC_PATH__)}fonts/roboto/Roboto-MediumItalic.woff2)
        format("woff2");
    font-weight: var(--ha-font-weight-semibold);
    font-style: italic;
  }
  @font-face {
    font-family: "Roboto";
    src:
      local("Roboto Bold"),
      local("Roboto-Bold"),
      url(${unsafeCSS(__STATIC_PATH__)}fonts/roboto/Roboto-Bold.woff2)
        format("woff2");
    font-weight: var(--ha-font-weight-bold);
    font-style: normal;
  }
  @font-face {
    font-family: "Roboto";
    src:
      local("Roboto Bold Italic"),
      local("Roboto-BoldItalic"),
      url(${unsafeCSS(__STATIC_PATH__)}fonts/roboto/Roboto-BoldItalic.woff2)
        format("woff2");
    font-weight: var(--ha-font-weight-bold);
    font-style: italic;
  }
`;

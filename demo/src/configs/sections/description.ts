import { html } from "lit";
import { DemoConfig } from "../types";

export const demoLovelaceDescription: DemoConfig["description"] = (
  localize
) => html`
  <p>
    ${localize("ui.panel.page-demo.config.sections.description", {
      blog_post: html`<a
        href="https://www.home-assistant.io/blog/2024/03/04/dashboard-chapter-1/"
        target="_blank"
        >${localize("ui.panel.page-demo.config.sections.description_blog_post")}
      </a>`,
    })}
  </p>
`;

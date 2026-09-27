import { css, html, LitElement } from "lit";
import { dashboardActions } from "../data/dashboard_actions";

window.customDashboardActions = {
  register: (action) => dashboardActions.register(action),
};

(LitElement.prototype as any).html = html;
(LitElement.prototype as any).css = css;

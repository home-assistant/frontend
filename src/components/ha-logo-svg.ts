import { css, CSSResultGroup, LitElement, svg, SVGTemplateResult } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-logo-svg")
export class HaLogoSvg extends LitElement {
  protected render(): SVGTemplateResult {
    return svg`
      <svg version="1.1" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <rect fill="#41bdf5" width="200" height="200" ry="16.4"/>
        <path fill="#fff" d="m38.416 165.29v-53.456h-13.901a3.7332 3.7332 0 0 1-2.662-6.3504l74.804-76.084c1.8068-1.8376 4.7612-1.8628 6.5992-0.056l0.048 0.048 39.04 39.518v-7.3188a3.1112 3.1112 0 0 1 3.1112-3.1112h12.964a3.1112 3.1112 0 0 1 3.1116 3.1112v26.855l16.627 17.047a3.7332 3.7332 0 0 1-2.6728 6.34h-13.954v53.456a3.1112 3.1112 0 0 1-3.1112 3.1112h-116.89a3.1112 3.1112 0 0 1-3.1112-3.1112zm82.556-65.304a6.0116 6.0116 0 0 0 0.584-2.5944c0-3.3232-2.684-6.0172-5.9956-6.0172-3.3112 0-5.9956 2.694-5.9956 6.0172s2.6844 6.0176 5.996 6.0176c0.9256 0 1.802-0.2108 2.5848-0.5868l8.6072 8.6384v8.3672l-10.792 10.831v-7.936a6.0184 6.0184 0 0 0 3.9972-5.6748c0-3.3232-2.6844-6.0176-5.996-6.0176-3.3112 0-5.996 2.6944-5.996 6.0176 0 2.62 1.6688 4.8488 3.9976 5.6748v11.947l-9.9932 10.029v-58.912l8.2076-8.2368a5.9544 5.9544 0 0 0 2.5848 0.5864c3.3116 0 5.996-2.694 5.996-6.0176 0-3.3232-2.6844-6.0172-5.996-6.0172-3.3112 0-5.9956 2.694-5.9956 6.0172 0 0.9292 0.2096 1.8088 0.584 2.5944l-7.3792 7.406-7.3796-7.406a6.0116 6.0116 0 0 0 0.584-2.5944c0-3.3232-2.684-6.0172-5.9956-6.0172-3.3112 0-5.9956 2.694-5.9956 6.0172 0 3.3236 2.6844 6.0176 5.996 6.0176 0.9256 0 1.802-0.2108 2.5848-0.5864l8.2072 8.2368v42.064l-14.39-14.442v-11.546a6.0184 6.0184 0 0 0 3.9972-5.6748c0-3.3236-2.6844-6.0176-5.996-6.0176-3.3112 0-5.996 2.694-5.996 6.0176 0 2.62 1.6688 4.8488 3.9976 5.6748v7.5348l-11.192-11.232v-11.145a6.0184 6.0184 0 0 0 3.9972-5.6748c0-3.3232-2.6844-6.0176-5.996-6.0176-3.3112 0-5.996 2.6944-5.996 6.0176 0 2.62 1.6688 4.8488 3.9976 5.6748v12.807l12.363 12.407h-7.108c-0.8232-2.3372-3.044-4.0116-5.6548-4.0116-3.3112 0-5.996 2.694-5.996 6.0172 0 3.3236 2.6848 6.0176 5.996 6.0176 2.6108 0 4.832-1.6744 5.6548-4.012h11.105l17.216 17.278v30.03l-9.1932-9.2264v-11.546a6.0184 6.0184 0 0 0 3.9972-5.6748c0-3.3232-2.6844-6.0172-5.996-6.0172-3.3112 0-5.996 2.694-5.996 6.0172 0 2.62 1.6688 4.8488 3.9976 5.6748v7.5348l-13.376-13.423a6.0116 6.0116 0 0 0 0.5844-2.5944c0-3.3232-2.684-6.0172-5.996-6.0172-3.3112 0-5.9956 2.694-5.9956 6.0172s2.6844 6.0172 5.996 6.0172c0.9256 0 1.8024-0.2104 2.5848-0.5864l13.376 13.424h-7.108c-0.8232-2.3372-3.044-4.012-5.6548-4.012-3.3112 0-5.996 2.6944-5.996 6.0176s2.6848 6.0172 5.996 6.0172c2.6108 0 4.8316-1.6744 5.6548-4.0116h11.105l11.192 11.232h5.6528l11.592-11.633h10.705c0.8232 2.3368 3.044 4.0112 5.6548 4.0112 3.3112 0 5.996-2.694 5.996-6.0172s-2.6848-6.0172-5.996-6.0172c-2.6108 0-4.8316 1.6744-5.6548 4.0116h-12.361l-10.764 10.802v-13.18l12.82-12.866h20.698c0.8232 2.3372 3.044 4.0116 5.6544 4.0116 3.3116 0 5.996-2.694 5.996-6.0172 0-3.3236-2.6844-6.0176-5.996-6.0176-2.6104 0-4.8312 1.6744-5.6544 4.012h-16.702l11.963-12.006v-10.029l8.6068-8.6384a5.9544 5.9544 0 0 0 2.5852 0.5868c3.3112 0 5.996-2.6944 5.996-6.0176s-2.6848-6.0172-5.996-6.0172-5.996 2.694-5.996 6.0172c0 0.9292 0.21 1.8088 0.5844 2.5944l-5.7804 5.8016v-18.367a6.0184 6.0184 0 0 0 3.9972-5.6748c0-3.3236-2.6844-6.0176-5.996-6.0176-3.3112 0-5.996 2.694-5.996 6.0176 0 2.62 1.6688 4.8488 3.9976 5.6748v18.366l-5.7808-5.8016zm-51.78 57.58c-1.3244 0-2.3984-1.0776-2.3984-2.4068s1.074-2.4068 2.3984-2.4068c1.3248 0 2.3984 1.0776 2.3984 2.4068s-1.0736 2.4068-2.3984 2.4068zm17.588-18.052c-1.3248 0-2.3988-1.0776-2.3988-2.4068s1.074-2.4068 2.3984-2.4068c1.3248 0 2.3984 1.0776 2.3984 2.4068s-1.0736 2.4068-2.3984 2.4068zm-20.786-2.808c-1.3248 0-2.3984-1.0776-2.3984-2.4068s1.0736-2.4068 2.3984-2.4068c1.3244 0 2.3984 1.0776 2.3984 2.4068s-1.074 2.4068-2.3984 2.4068zm-1.9988-20.058c-1.3244 0-2.398-1.0776-2.398-2.4072 0-1.3292 1.0736-2.4068 2.398-2.4068 1.3248 0 2.3984 1.0776 2.3984 2.4068 0 1.3296-1.0736 2.4072-2.3984 2.4072zm49.964 2.808c-1.3244 0-2.398-1.0776-2.398-2.4068 0-1.3296 1.0736-2.4072 2.398-2.4072 1.3248 0 2.3984 1.0776 2.3984 2.4072 0 1.3292-1.0736 2.4068-2.3984 2.4068zm27.181 18.453c-1.324 0-2.398-1.0776-2.398-2.4068 0-1.3296 1.0736-2.4072 2.398-2.4072 1.3248 0 2.3984 1.0776 2.3984 2.4072 0 1.3292-1.0736 2.4068-2.3984 2.4068zm-10.392 19.255c-1.3248 0-2.3984-1.0776-2.3984-2.4068s1.0736-2.4068 2.3984-2.4068c1.3244 0 2.3984 1.0776 2.3984 2.4068s-1.074 2.4068-2.3984 2.4068zm11.192-57.364c-1.3244 0-2.3984-1.078-2.3984-2.4072s1.074-2.4068 2.3984-2.4068 2.3984 1.0776 2.3984 2.4068-1.074 2.4072-2.3984 2.4072zm-13.191-15.645c-1.3244 0-2.3984-1.0776-2.3984-2.4068 0-1.3296 1.074-2.4072 2.3984-2.4072 1.3248 0 2.3984 1.0776 2.3984 2.4072 0 1.3292-1.0736 2.4068-2.3984 2.4068zm-15.989-9.628c-1.3244 0-2.398-1.0772-2.398-2.4068 0-1.3292 1.0736-2.4068 2.398-2.4068 1.3248 0 2.3984 1.0776 2.3984 2.4068 0 1.3296-1.0736 2.4072-2.3984 2.4072zm-25.582 0c-1.324 0-2.398-1.0772-2.398-2.4068 0-1.3292 1.0736-2.4068 2.398-2.4068 1.3248 0 2.3984 1.0776 2.3984 2.4068 0 1.3296-1.0736 2.4072-2.3984 2.4072zm-20.785 9.2268c-1.3244 0-2.3984-1.0776-2.3984-2.4068 0-1.3296 1.074-2.4072 2.3984-2.4072s2.3984 1.0776 2.3984 2.4072c0 1.3292-1.074 2.4068-2.3984 2.4068zm15.189 14.843c-1.3244 0-2.398-1.0776-2.398-2.4068 0-1.3296 1.0736-2.4072 2.398-2.4072 1.3248 0 2.3984 1.0776 2.3984 2.4072 0 1.3292-1.0736 2.4068-2.3984 2.4068zm33.976 1.2036c-1.324 0-2.398-1.078-2.398-2.4072s1.0736-2.4068 2.398-2.4068c1.3248 0 2.3984 1.0776 2.3984 2.4068s-1.0736 2.4072-2.3984 2.4072z"/>
      </svg>`;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: var(--ha-icon-display, inline-flex);
        align-items: center;
        justify-content: center;
        position: relative;
        vertical-align: middle;
        fill: currentcolor;
        width: var(--mdc-icon-size, 24px);
        height: var(--mdc-icon-size, 24px);
      }
      svg {
        width: 100%;
        height: 100%;
        pointer-events: none;
        display: block;
      }
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-logo-svg": HaLogoSvg;
  }
}

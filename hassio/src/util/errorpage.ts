import { html } from "lit-element";

export const supervisorErrorPage = html`<style>
    .supervisor_error-container {
      font-family: Roboto, sans-serif;
      color: #e1e1e1;
      background-color: #111111;
      text-align: -webkit-center;
      padding: 32px 0 0;
      height: calc(100vh - 32px);
      width: 100vw;
    }

    .supervisor_error-header {
      font-size: 24px;
      font-weight: 400;
      line-height: 32px;
      padding-bottom: 16px;
    }

    .supervisor_error-card {
      text-align: left;
      max-width: 600px;
      background-color: #1c1c1c;
      margin: 16px;
      padding: 8px;
      border-radius: 4px;
    }

    .supervisor_error-link {
      color: #0288d1;
    }
  </style>

  <div class="supervisor_error-container">
    <span class="supervisor_error-header">
      Could not load the Supervisor panel!
    </span>
    <div class="supervisor_error-card">
      <span class="supervisor_error-header">Troubleshooting</span>
      <div class="supervisor_error-card-content">
        <ol>
          <li>
            If you just started, make sure you have given the supervisor enough
            time to start.
          </li>
          <li>Check the observer</li>
          <li>Try a reboot of the host</li>
        </ol>
      </div>
    </div>
    <div class="supervisor_error-card">
      <span class="supervisor_error-header">Links</span>
      <div class="supervisor_error-card-content">
        <ol>
          <li>
            Observer, navigate to:<code>http://homeassistant.local:4357</code>
          </li>
          <li>
            <a
              class="supervisor_error-link"
              href="/config/info"
              target="_parent"
            >
              System Health
            </a>
          </li>
          <li>
            <a
              class="supervisor_error-link"
              href="https://www.home-assistant.io/help/"
              target="_blank"
              rel="noreferrer"
            >
              Need help?
            </a>
          </li>
        </ol>
      </div>
    </div>
  </div> `;

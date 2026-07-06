import {
  mdiBackupRestore,
  mdiCellphone,
  mdiEarth,
  mdiEye,
  mdiEyeOff,
  mdiMicrophone,
  mdiMicrophoneMessage,
  mdiVideo,
  mdiWebhook,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { TemplateResult } from "lit";
import { formatDate } from "../../../../common/datetime/format_date";
import { relativeTime } from "../../../../common/datetime/relative_time";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-svg-icon";
import type { BackupConfig } from "../../../../data/backup";
import { cloudBackupHealth, cloudBackupEnabled } from "../../../../data/backup";
import type {
  CloudStatusLoggedIn,
  SubscriptionInfo,
} from "../../../../data/cloud";
import type { Webhook } from "../../../../data/webhook";
import { isActiveCloudWebhook } from "../../../../data/webhook";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";

@customElement("cloud-account-overview")
export class CloudAccountOverview extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus!: CloudStatusLoggedIn;

  @property({ attribute: false }) public subscription?: SubscriptionInfo;

  @property({ attribute: false }) public backupConfig?: BackupConfig;

  @property({ attribute: false }) public webhooks?: Webhook[];

  @state() private _emailRevealed = false;

  protected render(): TemplateResult {
    return html`
      ${this._renderTopCard()} ${this._renderFeaturesCard()}
      ${this._renderAccountCard()}
    `;
  }

  private _renderTopCard(): TemplateResult {
    return html`
      <ha-card outlined>
        <div class="card-content">
          <div
            class="thank-you-header"
            role="heading"
            aria-level="1"
            aria-label=${this.hass.localize(
              "ui.panel.config.cloud.account.thank_you_title"
            )}
          >
            <svg
              width="163"
              height="30"
              viewBox="0 0 163 30"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M156.478 16.0647C156.254 16.0686 156.052 15.9841 155.873 15.8112C155.71 15.622 155.624 15.2795 155.615 14.7836C155.609 14.4316 155.664 13.8786 155.778 13.1245C155.893 12.3703 156.054 11.5034 156.261 10.5236C156.484 9.52761 156.738 8.49102 157.023 7.41388C157.308 6.32074 157.617 5.25118 157.951 4.20519C158.285 3.14321 158.628 2.18507 158.981 1.33078C159.15 0.911768 159.416 0.595068 159.781 0.380677C160.161 0.15001 160.575 0.0307665 161.023 0.0229478C161.487 0.0148499 161.826 0.224953 162.042 0.653257C162.257 1.08156 162.369 1.55167 162.378 2.0636C162.382 2.25557 162.292 2.61719 162.109 3.14846C161.943 3.67945 161.714 4.32354 161.423 5.08073C161.132 5.83792 160.81 6.65966 160.458 7.54595C160.121 8.41596 159.776 9.30211 159.424 10.2044C159.087 11.0904 158.774 11.936 158.484 12.7412C158.194 13.5464 157.959 14.2546 157.777 14.8658C157.657 15.3 157.486 15.607 157.265 15.7869C157.06 15.9665 156.798 16.0591 156.478 16.0647ZM155.347 22.7815C155.155 22.7848 154.93 22.7407 154.673 22.6492C154.415 22.5577 154.187 22.3296 153.988 21.9651C153.806 21.6162 153.708 21.0498 153.695 20.2659C153.684 19.658 153.868 19.1907 154.246 18.8641C154.625 18.5374 155.134 18.3685 155.774 18.3573C156.318 18.3479 156.736 18.4926 157.03 18.7915C157.339 19.0901 157.498 19.5194 157.508 20.0793C157.517 20.5913 157.397 21.0494 157.148 21.4538C156.915 21.858 156.625 22.1751 156.276 22.4052C155.945 22.651 155.635 22.7764 155.347 22.7815Z"
                fill="currentColor"
              />
              <path
                d="M148.022 22.7654C147.654 22.7718 147.315 22.6257 147.006 22.327C146.713 22.0441 146.56 21.5587 146.548 20.8708C146.539 20.3589 146.567 19.6463 146.631 18.733C146.711 17.8035 146.866 16.6086 147.097 15.1484C146.557 16.31 145.991 17.344 145.398 18.2505C144.806 19.1569 144.218 19.8713 143.636 20.3936C143.068 20.8995 142.521 21.1571 141.993 21.1664C141.145 21.1812 140.469 20.9369 139.964 20.4337C139.459 19.9144 139.193 18.9349 139.168 17.4951C139.156 16.8072 139.199 16.0303 139.296 15.1645C139.408 14.2984 139.553 13.4317 139.73 12.5645C139.907 11.6973 140.086 10.9261 140.266 10.2508C140.462 9.5593 140.637 9.04417 140.791 8.70543C140.914 8.41524 141.07 8.18848 141.259 8.02515C141.464 7.86155 141.727 7.77695 142.047 7.77137C142.559 7.76243 142.954 7.92356 143.232 8.25477C143.509 8.58597 143.651 8.92754 143.658 9.27949C143.662 9.55145 143.605 9.9445 143.486 10.4587C143.383 10.9725 143.249 11.543 143.084 12.1699C142.935 12.7966 142.778 13.4395 142.613 14.0984C142.449 14.7574 142.308 15.376 142.19 15.9541C142.088 16.532 142.04 17.0209 142.047 17.4208C142.056 17.9168 142.252 18.1614 142.636 18.1547C142.86 18.1508 143.144 17.9298 143.489 17.4917C143.849 17.0533 144.223 16.4707 144.611 15.7438C145.014 15.0007 145.416 14.1936 145.816 13.3224C146.233 12.435 146.609 11.5403 146.946 10.6383C147.298 9.72002 147.595 8.87471 147.838 8.10235C147.989 7.61964 148.199 7.27992 148.468 7.0832C148.737 6.88648 149.047 6.78505 149.399 6.77891C149.943 6.76941 150.361 6.91413 150.655 7.21306C150.964 7.51171 151.123 7.94099 151.133 8.5009C151.138 8.75686 151.105 9.1895 151.036 9.7988C150.966 10.4081 150.875 11.1218 150.761 11.9399C150.663 12.7577 150.542 13.624 150.398 14.5386C150.254 15.4533 150.11 16.352 149.965 17.2346C149.837 18.117 149.707 18.9274 149.576 19.6658C149.444 20.3882 149.334 20.9662 149.246 21.3998C149.097 22.0425 148.912 22.4298 148.69 22.5617C148.468 22.6936 148.246 22.7615 148.022 22.7654Z"
                fill="currentColor"
              />
              <path
                d="M128.996 22.8094C127.86 22.8292 126.942 22.4452 126.24 21.6573C125.538 20.8534 125.175 19.7716 125.151 18.4118C125.143 17.9799 125.192 17.539 125.296 17.0891C125.416 16.6389 125.561 16.2203 125.73 15.8333C125.632 15.691 125.548 15.5084 125.48 15.2856C125.428 15.0465 125.399 14.7669 125.394 14.447C125.376 13.4071 125.543 12.4521 125.896 11.5818C126.248 10.6955 126.731 9.92695 127.344 9.27616C127.957 8.62537 128.636 8.11744 129.382 7.75236C130.127 7.38729 130.884 7.19806 131.652 7.18465C132.964 7.16175 134.043 7.58298 134.891 8.44833C135.754 9.31339 136.202 10.6738 136.234 12.5295C136.25 13.4574 136.123 14.4037 135.851 15.3686C135.58 16.3335 135.204 17.2602 134.724 18.1487C134.259 19.021 133.713 19.8066 133.085 20.5057C132.473 21.2045 131.81 21.7601 131.098 22.1726C130.401 22.5848 129.7 22.7971 128.996 22.8094ZM128.471 14.7053C128.554 14.8799 128.597 15.0872 128.602 15.3271C128.606 15.5671 128.562 15.8159 128.471 16.0735C128.379 16.3312 128.289 16.6768 128.201 17.1104C128.112 17.528 128.074 18.1288 128.088 18.9126C128.092 19.1206 128.119 19.2962 128.169 19.4393C128.236 19.5662 128.373 19.6278 128.581 19.6242C129.125 19.6147 129.633 19.4297 130.107 19.0694C130.597 18.7088 131.029 18.2372 131.403 17.6546C131.793 17.0717 132.117 16.4259 132.377 15.7173C132.652 14.9924 132.856 14.2607 132.987 13.5223C133.134 12.7676 133.202 12.0704 133.19 11.4305C133.183 11.0145 133.098 10.728 132.935 10.5708C132.773 10.4136 132.491 10.3385 132.091 10.3455C131.547 10.355 130.99 10.5407 130.421 10.9027C129.867 11.2484 129.403 11.7206 129.029 12.3192C128.655 12.9018 128.475 13.5611 128.488 14.297C128.49 14.4409 128.485 14.5771 128.471 14.7053Z"
                fill="currentColor"
              />
              <path
                d="M113.297 28.8921C112.401 28.9078 111.584 28.866 110.846 28.7669C110.109 28.6837 109.386 28.5363 108.678 28.3247C107.971 28.113 107.206 27.8303 106.383 27.4766C106.045 27.3225 105.762 27.1594 105.535 26.9873C105.308 26.8153 105.191 26.5533 105.185 26.2013C105.176 25.6894 105.329 25.2947 105.644 25.0171C105.944 24.7558 106.365 24.6205 106.909 24.611C107.197 24.6059 107.567 24.6955 108.018 24.8797C108.47 25.0798 108.986 25.3028 109.566 25.5487C110.163 25.8104 110.823 26.0309 111.546 26.2103C112.269 26.4057 113.047 26.4961 113.879 26.4816C114.727 26.4668 115.513 26.101 116.236 25.3843C116.96 24.6676 117.534 23.6654 117.96 22.3778C118.402 21.1059 118.608 19.606 118.578 17.8783C118.571 17.4784 118.555 17.0466 118.531 16.5829C118.507 16.1033 118.482 15.5996 118.457 15.072C117.9 16.1699 117.294 17.1966 116.638 18.1522C115.983 19.1078 115.3 19.8878 114.591 20.4923C113.897 21.0805 113.19 21.3809 112.47 21.3934C111.59 21.4088 110.947 21.212 110.539 20.803C110.148 20.3778 109.944 19.7013 109.928 18.7734C109.914 17.9895 109.955 17.1327 110.051 16.2029C110.163 15.2568 110.314 14.302 110.505 13.3385C110.696 12.375 110.92 11.459 111.177 10.5903C111.45 9.70545 111.741 8.94026 112.049 8.29478C112.281 7.82666 112.645 7.58827 113.141 7.57962C113.461 7.57403 113.784 7.72042 114.109 8.01879C114.45 8.31688 114.625 8.72189 114.634 9.23381C114.639 9.52176 114.574 9.93896 114.44 10.4854C114.305 11.0318 114.14 11.6508 113.944 12.3423C113.764 13.0176 113.577 13.733 113.382 14.4885C113.187 15.228 113.023 15.9589 112.892 16.6814C112.76 17.3878 112.699 18.0289 112.709 18.6048C112.711 18.6688 112.759 18.7 112.855 18.6983C113.047 18.6949 113.3 18.5305 113.615 18.205C113.945 17.8632 114.305 17.4248 114.696 16.8899C115.102 16.3387 115.508 15.7396 115.913 15.0924C116.333 14.429 116.738 13.7738 117.126 13.1269C117.515 12.48 117.865 11.8898 118.176 11.3563C118.123 11.1012 118.087 10.8778 118.068 10.6861C118.064 10.4781 118.061 10.3022 118.059 10.1582C118.047 9.50228 118.15 8.95641 118.366 8.52057C118.599 8.08444 119.059 7.86038 119.747 7.84837C120.195 7.84055 120.542 8.00252 120.787 8.33428C121.033 8.65005 121.161 9.10388 121.171 9.69579C121.176 9.95175 121.141 10.2484 121.067 10.5858C120.992 10.9071 120.841 11.4218 120.614 12.1299L120.865 11.3814C121.034 12.8187 121.176 14.0964 121.292 15.2145C121.423 16.3324 121.498 17.4433 121.518 18.5471C121.554 20.6268 121.234 22.4326 120.556 23.9647C119.895 25.5125 118.94 26.7133 117.691 27.5673C116.457 28.4209 114.993 28.8625 113.297 28.8921Z"
                fill="currentColor"
              />
              <path
                d="M91.1422 24.4303C90.0544 24.4493 89.0425 24.2349 88.1065 23.7872C87.1709 23.3554 86.3127 22.7783 85.5319 22.0558C84.7509 21.3174 84.0488 20.5135 83.4255 19.6442C82.818 18.7587 82.2987 17.8876 81.8677 17.031C81.6911 17.9142 81.5282 18.6692 81.3791 19.2959C81.2461 19.9223 81.1351 20.4443 81.0464 20.8619C80.972 21.1833 80.8895 21.4968 80.7988 21.8024C80.7241 22.1078 80.6005 22.3579 80.4278 22.553C80.2552 22.748 80.0089 22.8483 79.689 22.8539C79.0011 22.8659 78.5571 22.6417 78.357 22.1811C78.1567 21.7045 78.0501 21.0983 78.0372 20.3624C78.0258 19.7065 78.1147 18.8408 78.304 17.7653C78.5092 16.6896 78.7842 15.4846 79.129 14.1504C79.4738 12.8162 79.8738 11.441 80.3292 10.0248C80.8002 8.59236 81.304 7.19936 81.8405 5.84579C82.3767 4.47622 82.9151 3.23464 83.4557 2.12103C83.7959 1.44299 84.1005 1.01361 84.3694 0.832891C84.638 0.636173 84.9562 0.534603 85.3242 0.52818C85.6921 0.521758 85.9738 0.612857 86.1691 0.801477C86.3644 0.990096 86.4649 1.24438 86.4705 1.56433C86.4741 1.7723 86.4297 1.98111 86.3374 2.19075C86.245 2.40039 86.1455 2.65817 86.0388 2.96408C85.6851 3.78638 85.3178 4.74493 84.9368 5.83975C84.5556 6.91857 84.1911 8.0371 83.8432 9.19535C83.4951 10.3376 83.186 11.4232 82.9159 12.452C83.6917 11.9744 84.5558 11.5113 85.5081 11.0626C86.4601 10.5979 87.421 10.1811 88.3907 9.81208C89.3761 9.42682 90.2989 9.12267 91.1592 8.89962C92.0194 8.67657 92.7455 8.55988 93.3374 8.54955C93.8013 8.54146 94.1557 8.67129 94.4004 8.93906C94.6451 9.20683 94.7702 9.50069 94.7758 9.82064C94.78 10.0606 94.7122 10.3018 94.5724 10.5443C94.4326 10.7868 94.1323 11.0001 93.6714 11.1841C92.1446 11.7229 90.6259 12.2694 89.1154 12.8239C87.6208 13.3781 85.96 14.0311 84.1328 14.7831C84.5299 15.5283 84.9913 16.2964 85.5172 17.0873C86.0428 17.8623 86.6076 18.5885 87.2115 19.2661C87.8151 19.9277 88.4327 20.469 89.0641 20.89C89.6953 21.2951 90.3148 21.4923 90.9227 21.4817C91.8186 21.466 92.6794 21.275 93.5051 20.9085C94.3306 20.526 95.0908 20.0727 95.7857 19.5485C96.4804 19.0083 97.0874 18.4856 97.6067 17.9805C98.1419 17.4751 98.5591 17.0837 98.8584 16.8065C99.0313 16.6274 99.197 16.4965 99.3556 16.4137C99.5302 16.3307 99.7454 16.2869 100.001 16.2824C100.305 16.2771 100.539 16.3691 100.702 16.5582C100.881 16.7311 100.965 16.9617 100.954 17.2499C100.943 17.5222 100.812 17.7965 100.561 18.0729C100.357 18.3005 100.035 18.6662 99.5957 19.1699C99.1722 19.6574 98.6536 20.2025 98.04 20.8053C97.4422 21.3919 96.772 21.9637 96.0296 22.5207C95.303 23.0615 94.5266 23.5071 93.7006 23.8575C92.8749 24.224 92.0221 24.4149 91.1422 24.4303Z"
                fill="currentColor"
              />
              <path
                d="M60.3456 23.2154C59.9616 23.2221 59.5754 23.1008 59.187 22.8516C58.8143 22.586 58.5037 22.2074 58.2551 21.7156C58.0062 21.2079 57.8754 20.5941 57.8629 19.8742C57.8461 18.9144 57.9562 17.8883 58.1932 16.796C58.4462 15.7034 58.7551 14.6098 59.1201 13.5153C59.485 12.4208 59.8431 11.3904 60.1943 10.4241C60.3622 9.95708 60.5727 9.64135 60.8259 9.47691C61.0787 9.29647 61.4132 9.20262 61.8291 9.19536C62.773 9.17888 63.2531 9.64258 63.2696 10.5864C63.2724 10.7464 63.2058 11.0596 63.07 11.5261C62.9338 11.9765 62.7515 12.5318 62.523 13.1919C62.3104 13.8517 62.0829 14.5677 61.8403 15.3401C61.6135 16.0962 61.4029 16.868 61.2087 17.6555C61.0301 18.4267 60.8908 19.1573 60.7908 19.8471C61.149 19.2808 61.5448 18.5778 61.9782 17.7381C62.4273 16.8821 62.8998 15.9857 63.3955 15.0489C63.9072 14.1118 64.4201 13.2388 64.934 12.4297C65.4477 11.6046 65.956 10.9316 66.459 10.4107C66.962 9.88988 67.4455 9.62541 67.9094 9.61731C68.3093 9.61033 68.6867 9.68375 69.0414 9.83759C69.4119 9.97514 69.7368 10.2575 70.0163 10.6847C70.2956 11.0959 70.514 11.6922 70.6717 12.4735C70.8453 13.2546 70.9433 14.2851 70.9657 15.5649C70.9768 16.2048 71.0437 16.8277 71.1663 17.4337C71.3046 18.0233 71.5212 18.5156 71.8162 18.9105C72.1108 19.2895 72.5221 19.4743 73.05 19.4651C73.9619 19.4492 74.7748 19.267 75.4889 18.9184C76.2029 18.5699 76.828 18.167 77.3641 17.7095C77.9002 17.2521 78.3492 16.8522 78.7113 16.5098C78.9314 16.282 79.1203 16.1026 79.278 15.9719C79.4518 15.8408 79.5946 15.7743 79.7066 15.7724C80.0426 15.7665 80.2841 15.8503 80.4311 16.0238C80.5942 16.1969 80.6783 16.4355 80.6836 16.7395C80.6864 16.8994 80.5556 17.1978 80.2912 17.6344C80.0268 18.0711 79.6515 18.5737 79.1653 19.1423C78.6949 19.6946 78.1522 20.2322 77.5372 20.755C76.9223 21.2778 76.2578 21.7135 75.5437 22.062C74.8297 22.4105 74.0968 22.5913 73.3449 22.6044C72.0811 22.6265 71.0293 22.4208 70.1896 21.9874C69.3657 21.5377 68.7443 20.7804 68.3257 19.7156C67.9068 18.6347 67.681 17.1584 67.6483 15.2867C67.6475 15.2387 67.6461 15.1587 67.6441 15.0468C67.6355 14.5508 67.6198 14.111 67.5971 13.7274C67.5904 13.3434 67.5609 13.0319 67.5087 12.7928C67.2454 13.2935 66.9278 13.8911 66.5559 14.5857C66.2 15.28 65.8129 16.0229 65.3946 16.8143C64.9761 17.5897 64.5414 18.3574 64.0906 19.1174C63.6395 19.8614 63.1873 20.5414 62.734 21.1574C62.2967 21.7731 61.8733 22.2686 61.4638 22.6438C61.0542 23.019 60.6815 23.2095 60.3456 23.2154Z"
                fill="currentColor"
              />
              <path
                d="M41.481 24.457C40.9691 24.4659 40.5027 24.33 40.0817 24.0494C39.661 23.7847 39.3268 23.4304 39.079 22.9867C38.831 22.5269 38.7023 22.0331 38.6931 21.5052C38.6758 20.5134 38.8749 19.5417 39.2903 18.5903C39.7218 17.6387 40.29 16.7326 40.9951 15.8722C41.7002 15.0117 42.4706 14.2222 43.3062 13.5035C44.1575 12.7685 45.0026 12.1377 45.8415 11.6109C46.6964 11.0839 47.4733 10.6703 48.1722 10.3701C48.8871 10.0695 49.4445 9.91579 49.8444 9.90881C50.3083 9.90072 50.6861 9.99814 50.9777 10.2011C51.285 10.3877 51.4423 10.689 51.4495 11.105C51.4518 11.233 51.4216 11.3375 51.359 11.4186C51.5678 11.463 51.7379 11.58 51.8692 11.7698C52.0005 11.9595 52.0695 12.2463 52.0763 12.6303C52.079 12.7903 52.0463 13.2069 51.978 13.8802C51.9098 14.5535 51.836 15.3709 51.7568 16.3324C51.6936 17.2937 51.671 18.2942 51.6892 19.3341C51.692 19.494 51.7185 19.6376 51.7687 19.7647C51.8187 19.8759 51.9236 19.9301 52.0836 19.9273C52.7235 19.9161 53.3692 19.7768 54.0206 19.5094C54.6878 19.2257 55.3299 18.8864 55.9471 18.4916C56.5801 18.0805 57.1491 17.6785 57.6543 17.2856C58.1753 16.8765 58.6095 16.5409 58.957 16.2787C59.3202 16.0004 59.5578 15.8602 59.6697 15.8582C60.2137 15.8488 60.4904 16.116 60.4999 16.6599C60.5024 16.8039 60.3317 17.1109 59.9879 17.581C59.6597 18.0348 59.2049 18.5628 58.6233 19.165C58.0414 19.7513 57.3876 20.3388 56.6618 20.9275C55.9516 21.5 55.2079 21.977 54.4304 22.3587C53.6689 22.74 52.9283 22.937 52.2084 22.9495C51.3285 22.9649 50.653 22.7687 50.1818 22.3608C49.7266 21.9527 49.3969 21.3984 49.1926 20.6978C49.0041 19.981 48.894 19.1748 48.8623 18.2792C48.0669 19.4613 47.2371 20.5159 46.3732 21.4432C45.525 22.3541 44.6815 23.0809 43.8429 23.6236C43.0042 24.1664 42.2169 24.4441 41.481 24.457ZM49.7659 12.2865C48.2113 13.0658 46.8186 13.9542 45.5878 14.9519C44.3567 15.9335 43.3825 16.9587 42.665 18.0273C41.9635 19.0958 41.6213 20.1179 41.6384 21.0937C41.6431 21.3657 41.7735 21.4994 42.0294 21.495C42.3334 21.4897 42.7303 21.3067 43.22 20.9461C43.7258 20.5852 44.2696 20.1117 44.8515 19.5254C45.4331 18.9232 46.0135 18.2569 46.5929 17.5267C47.1719 16.7805 47.7107 16.019 48.2092 15.2422C48.7078 14.4653 49.1029 13.7223 49.3945 13.0131C49.502 12.7552 49.6258 12.513 49.7659 12.2865Z"
                fill="currentColor"
              />
              <path
                d="M20.2332 25.788C19.4974 25.8008 18.9658 25.6021 18.6386 25.1917C18.3114 24.7814 18.1408 24.1763 18.1268 23.3764C18.114 22.6405 18.2332 21.6783 18.4845 20.4897C18.7515 19.2849 19.1042 17.9425 19.5424 16.4626C19.9963 14.9665 20.5056 13.4294 21.0701 11.8513C21.6344 10.2572 22.2232 8.69467 22.8366 7.16373C23.4497 5.6168 24.049 4.19812 24.6346 2.9077C24.9128 2.34276 25.21 1.95352 25.5264 1.73996C25.8427 1.52641 26.1928 1.41628 26.5767 1.40958C26.9447 1.40316 27.2585 1.5017 27.5181 1.7052C27.7774 1.8927 27.9108 2.20242 27.9183 2.63435C27.92 2.73034 27.7984 3.10052 27.5537 3.74489C27.3086 4.37326 26.9869 5.195 26.5885 6.21011C26.1899 7.20922 25.7535 8.337 25.2794 9.59347C24.805 10.8339 24.3315 12.1304 23.859 13.4829C23.3863 14.8193 22.9613 16.1389 22.5839 17.4417C22.2066 18.7445 21.9076 19.9499 21.6869 21.0579C22.2337 20.2963 22.8191 19.4539 23.4431 18.5309C24.0828 17.5916 24.7306 16.6601 25.3866 15.7365C26.0583 14.7967 26.7154 13.9371 27.3579 13.1577C28.0164 12.3781 28.6296 11.7513 29.1974 11.2773C29.7652 10.8034 30.2651 10.5626 30.697 10.5551C31.4969 10.5411 32.1407 10.7539 32.6284 11.1935C33.1319 11.6167 33.393 12.3643 33.4117 13.4361C33.4203 13.9321 33.3348 14.5336 33.1551 15.2409C32.9752 15.9321 32.7559 16.6641 32.4974 17.4367C32.2545 18.193 32.0433 18.9248 31.8636 19.6321C31.6839 20.3393 31.5987 20.9569 31.6079 21.4848C31.6129 21.7728 31.7514 21.9144 32.0234 21.9096C32.8072 21.896 33.5962 21.7142 34.3902 21.3643C35.2002 21.0141 35.9688 20.5846 36.6961 20.0758C37.439 19.5508 38.1101 19.035 38.7094 18.5284C39.3243 18.0056 39.8209 17.5729 40.1989 17.2303C40.4664 16.9695 40.7115 16.7972 40.934 16.7133C41.1563 16.6134 41.3634 16.5618 41.5554 16.5585C42.2113 16.547 42.545 16.8693 42.5564 17.5252C42.5587 17.6531 42.5375 17.8135 42.4928 18.0063C42.4479 18.1831 42.2998 18.4098 42.0486 18.6862C41.7974 18.9626 41.4202 19.3533 40.9169 19.8581C40.4136 20.363 39.8229 20.9014 39.1448 21.4733C38.4827 22.0449 37.7562 22.5937 36.9652 23.1196C36.19 23.6292 35.3892 24.0512 34.563 24.3857C33.7367 24.7202 32.9316 24.8943 32.1477 24.9079C30.9639 24.9286 30.0462 24.6086 29.3945 23.9478C28.7432 23.3031 28.4076 22.4128 28.3878 21.277C28.3741 20.4931 28.5169 19.5065 28.8162 18.3171C29.1152 17.1117 29.4538 15.8816 29.8319 14.6268C29.2815 15.1805 28.7089 15.8386 28.1141 16.6011C27.519 17.3476 26.9168 18.1422 26.3074 18.985C25.6978 19.8117 25.096 20.6304 24.502 21.4408C23.9238 22.2351 23.3685 22.9649 22.836 23.6303C22.3032 24.2796 21.8162 24.8002 21.375 25.192C20.9338 25.5837 20.5532 25.7824 20.2332 25.788Z"
                fill="currentColor"
              />
              <path
                d="M2.61566 9.60494C1.84777 9.61835 1.2786 9.55627 0.908146 9.41872C0.553407 9.26488 0.318231 9.08496 0.202618 8.87895C0.102724 8.65666 0.0512403 8.45753 0.0481686 8.28155C0.0442593 8.05759 0.167772 7.79939 0.418707 7.50697C0.669362 7.19855 1.16138 6.96592 1.89475 6.8091C2.62785 6.63628 3.4972 6.47708 4.50281 6.33151C5.50815 6.16994 6.57789 6.03125 7.71204 5.91544C8.84592 5.78363 9.99606 5.66754 11.1625 5.56717C12.3289 5.46679 13.4398 5.3914 14.495 5.34097C15.5501 5.27455 16.4855 5.23422 17.3014 5.21998C18.1492 5.20518 18.806 5.24172 19.2716 5.32961C19.7372 5.4175 20.0672 5.53175 20.2617 5.67238C20.4722 5.81273 20.5948 5.96261 20.6296 6.12203C20.6804 6.28117 20.707 6.43272 20.7096 6.5767C20.7101 6.6087 20.7105 6.63269 20.7108 6.64869C20.7142 6.84066 20.6698 7.04947 20.5777 7.27511C20.5017 7.50047 20.321 7.69565 20.0359 7.86065C19.7504 8.00966 19.3197 8.08919 18.7438 8.09924C18.5359 8.10287 18.0725 8.14296 17.3537 8.21952C16.6349 8.29608 15.7565 8.39142 14.7183 8.50556C13.6801 8.61969 12.578 8.73495 11.4118 8.85132C11.2484 9.57428 11.0631 10.4176 10.8559 11.3814C10.6647 12.3449 10.4663 13.3565 10.2608 14.4163C10.0713 15.4757 9.88943 16.5191 9.71533 17.5462C9.54095 18.5574 9.39731 19.4961 9.28441 20.3622C9.17123 21.2123 9.09539 21.9097 9.05689 22.4545C9.00575 23.1915 8.79886 23.7152 8.43622 24.0256C8.0893 24.3197 7.73986 24.4698 7.38792 24.4759C7.13196 24.4804 6.87502 24.4289 6.6171 24.3214C6.35947 24.2298 6.14773 24.0175 5.98189 23.6843C5.81577 23.3352 5.72671 22.8167 5.7147 22.1288C5.70241 21.4249 5.75132 20.5599 5.86143 19.5338C5.97126 18.4917 6.11983 17.377 6.30714 16.1895C6.51044 15.0018 6.7376 13.8056 6.98861 12.6011C7.25563 11.3962 7.53203 10.2712 7.81784 9.2261C6.7474 9.32479 5.7568 9.41409 4.84606 9.494C3.93504 9.55791 3.19157 9.59489 2.61566 9.60494Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <p class="muted">
            ${this.hass.localize(
              "ui.panel.config.cloud.account.thank_you_note"
            )}
          </p>
          <p class="muted">
            ${this.hass.localize("ui.panel.config.cloud.account.funding_note")}
          </p>
          ${this._renderSubscriptionState()}
        </div>
      </ha-card>
    `;
  }

  private _renderSubscriptionState(): TemplateResult | typeof nothing {
    switch (this._accountState) {
      case "trial":
        return html`
          <ha-alert
            alert-type="warning"
            .title=${this.hass.localize(
              "ui.panel.config.cloud.account.overview.trial_title"
            )}
          >
            ${this.hass.localize(
              "ui.panel.config.cloud.account.overview.trial_text"
            )}
            <ha-button
              slot="action"
              size="s"
              href="https://account.nabucasa.com"
              target="_blank"
              rel="noreferrer"
            >
              ${this.hass.localize(
                "ui.panel.config.cloud.account.overview.add_payment"
              )}
            </ha-button>
          </ha-alert>
        `;
      case "canceled":
        return html`
          <ha-alert
            alert-type="warning"
            .title=${this.hass.localize(
              "ui.panel.config.cloud.account.overview.canceled_title"
            )}
          >
            ${this.hass.localize(
              "ui.panel.config.cloud.account.overview.canceled_text",
              { date: this._renewalDate }
            )}
            <ha-button
              slot="action"
              size="s"
              href="https://account.nabucasa.com"
              target="_blank"
              rel="noreferrer"
            >
              ${this.hass.localize(
                "ui.panel.config.cloud.account.overview.resubscribe"
              )}
            </ha-button>
          </ha-alert>
        `;
      case "expired":
        return html`
          <ha-alert
            alert-type="error"
            .title=${this.hass.localize(
              "ui.panel.config.cloud.account.overview.expired_title"
            )}
          >
            ${this.hass.localize(
              "ui.panel.config.cloud.account.overview.expired_text"
            )}
            <ha-button
              slot="action"
              size="s"
              href="https://account.nabucasa.com"
              target="_blank"
              rel="noreferrer"
            >
              ${this.hass.localize(
                "ui.panel.config.cloud.account.overview.renew"
              )}
            </ha-button>
          </ha-alert>
        `;
      default:
        // "subscribed" and "unknown" show no alert.
        return nothing;
    }
  }

  private _subscriptionDetail(): string {
    switch (this._accountState) {
      case "unknown":
        return this.hass.localize(
          "ui.panel.config.cloud.account.status_unknown"
        );
      case "expired":
        return this.hass.localize(
          "ui.panel.config.cloud.account.expired_label"
        );
      case "trial":
        return this.hass.localize("ui.panel.config.cloud.account.trial_ends", {
          date: this._renewalDate,
        });
      case "canceled":
        return this.hass.localize("ui.panel.config.cloud.account.access_ends", {
          date: this._renewalDate,
        });
      default:
        // "subscribed"
        return this.hass.localize("ui.panel.config.cloud.account.renews", {
          date: this._renewalDate,
        });
    }
  }

  private _renderAccountCard(): TemplateResult {
    const { email } = this.cloudStatus;
    const at = email.indexOf("@");
    const maskedEmail = at > 0 ? `${"•".repeat(at)}${email.slice(at)}` : email;
    return html`
      <ha-card outlined>
        <div class="account-header">
          <span class="card-title"
            >${this.hass.localize(
              "ui.panel.config.cloud.account.nabu_casa_account"
            )}</span
          >
          <img
            class="nc-logo"
            alt="Nabu Casa"
            src="https://brands.home-assistant.io/_/cloud/${this.hass.themes
              ?.darkMode
              ? "dark_"
              : ""}icon.png"
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
          />
        </div>
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item>
              <span slot="headline"
                >${this.hass.localize(
                  "ui.panel.config.cloud.account.email"
                )}</span
              >
              <span slot="supporting-text" class="email-line">
                <span>${this._emailRevealed ? email : maskedEmail}</span>
                <ha-icon-button
                  .path=${this._emailRevealed ? mdiEyeOff : mdiEye}
                  .label=${this._emailRevealed
                    ? this.hass.localize(
                        "ui.panel.config.cloud.account.hide_email"
                      )
                    : this.hass.localize(
                        "ui.panel.config.cloud.account.show_email"
                      )}
                  @click=${this._toggleEmail}
                ></ha-icon-button>
              </span>
            </ha-md-list-item>
            <ha-md-list-item>
              <span slot="headline"
                >${this.hass.localize(
                  "ui.panel.config.cloud.account.subscription"
                )}</span
              >
              <span slot="supporting-text">${this._subscriptionDetail()}</span>
            </ha-md-list-item>
          </ha-md-list>
        </div>
        <div class="card-actions split">
          <ha-button
            appearance="filled"
            href="https://account.nabucasa.com"
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize(
              "ui.panel.config.cloud.account.manage_account"
            )}
          </ha-button>
          <ha-button
            @click=${this._signOut}
            variant="danger"
            appearance="plain"
          >
            ${this.hass.localize("ui.panel.config.cloud.account.sign_out")}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _renderFeaturesCard(): TemplateResult {
    const cloudhooks = this.cloudStatus.prefs.cloudhooks || {};
    // Distinguish "not loaded yet / unavailable" (undefined) from "zero active"
    // so we don't claim 0 active webhooks before the fetch resolves.
    const webhookStatus =
      this.webhooks === undefined
        ? ""
        : this.hass.localize(
            "ui.panel.config.cloud.account.overview.webhooks_active",
            {
              count: this.webhooks.filter(
                (hook) =>
                  isActiveCloudWebhook(hook) && cloudhooks[hook.webhook_id]
              ).length,
            }
          );
    return html`
      <ha-card outlined>
        <div class="extras-header">
          <h1>
            ${this.hass.localize(
              "ui.panel.config.cloud.account.overview.features_title"
            )}
          </h1>
        </div>
        <div class="extras-content">
          <p>
            ${this.hass.localize(
              "ui.panel.config.cloud.account.overview.features_intro"
            )}
          </p>
          <ha-md-list>
            ${this._featureRow(
              mdiEarth,
              this.hass.localize(
                "ui.panel.config.cloud.account.overview.feature_remote"
              ),
              this._remoteStatus(),
              "/config/cloud/remote"
            )}
            ${this._featureRow(
              mdiBackupRestore,
              this.hass.localize(
                "ui.panel.config.cloud.account.overview.feature_backups"
              ),
              this._renderBackupStatus(),
              "/config/cloud/backup"
            )}
            ${this._featureRow(
              mdiMicrophone,
              this.hass.localize(
                "ui.panel.config.cloud.account.overview.feature_voice"
              ),
              this.hass.localize(
                "ui.panel.config.cloud.account.overview.feature_voice_sub"
              ),
              "/config/cloud/voice-assistants"
            )}
            ${this._featureRow(
              mdiCellphone,
              this.hass.localize(
                "ui.panel.config.cloud.account.overview.feature_companion"
              ),
              this.hass.localize(
                "ui.panel.config.cloud.account.overview.feature_companion_sub"
              ),
              "/config/cloud/companion"
            )}
            ${this._featureRow(
              mdiMicrophoneMessage,
              this.hass.localize(
                "ui.panel.config.cloud.account.overview.feature_alexa_google"
              ),
              this._alexaGoogleStatus(),
              "/config/voice-assistants/assistants?historyBack=1"
            )}
            ${this._featureRow(
              mdiVideo,
              this.hass.localize(
                "ui.panel.config.cloud.account.overview.feature_cameras"
              ),
              this._onOffStatus(
                this.cloudStatus.prefs.cloud_ice_servers_enabled
              ),
              "/config/cloud/webrtc"
            )}
            ${this._featureRow(
              mdiWebhook,
              this.hass.localize(
                "ui.panel.config.cloud.account.overview.feature_webhooks"
              ),
              webhookStatus,
              "/config/cloud/webhooks"
            )}
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  private _featureRow(
    icon: string,
    title: string,
    supporting: string | TemplateResult,
    href: string
  ): TemplateResult {
    return html`
      <ha-md-list-item type="link" href=${href}>
        <ha-svg-icon slot="start" .path=${icon}></ha-svg-icon>
        <span slot="headline">${title}</span>
        <span slot="supporting-text">${supporting}</span>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-md-list-item>
    `;
  }

  private get _subscriptionActive(): boolean {
    return this.cloudStatus.active_subscription;
  }

  private _statusLine(
    dotClass: "enabled" | "warning" | "disabled",
    text: string
  ): TemplateResult {
    return html`
      <span class="status-line">
        <span class="status-dot ${dotClass}"></span>
        ${text}
      </span>
    `;
  }

  private _onOffStatus(enabled: boolean): TemplateResult {
    // An enabled feature only works with an active subscription; otherwise it
    // is configured on but inactive, so show it as such instead of green "On".
    if (enabled && !this._subscriptionActive) {
      return this._statusLine(
        "disabled",
        this.hass.localize("ui.panel.config.cloud.account.overview.inactive")
      );
    }
    return this._statusLine(
      enabled ? "enabled" : "disabled",
      enabled
        ? this.hass.localize("ui.panel.config.cloud.account.overview.on")
        : this.hass.localize("ui.panel.config.cloud.account.overview.off")
    );
  }

  private _remoteStatus(): TemplateResult {
    if (!this.cloudStatus.prefs.remote_enabled) {
      return this._statusLine(
        "disabled",
        this.hass.localize("ui.panel.config.cloud.account.overview.off")
      );
    }
    if (!this._subscriptionActive) {
      return this._statusLine(
        "disabled",
        this.hass.localize("ui.panel.config.cloud.account.overview.inactive")
      );
    }
    // Remote access only actually works once the certificate is ready — reflect
    // the in-progress and error states instead of a misleading green "On".
    switch (this.cloudStatus.remote_certificate_status) {
      case "ready":
        return this._statusLine(
          "enabled",
          this.hass.localize("ui.panel.config.cloud.account.overview.on")
        );
      case "error":
        return this._statusLine(
          "disabled",
          this.hass.localize("ui.panel.config.cloud.account.overview.error")
        );
      default:
        return this._statusLine(
          "warning",
          this.hass.localize("ui.panel.config.cloud.account.overview.preparing")
        );
    }
  }

  private _alexaGoogleStatus(): string {
    const { alexa_registered, google_registered } = this.cloudStatus;
    if (alexa_registered && google_registered) {
      return this.hass.localize(
        "ui.panel.config.cloud.account.overview.alexa_google_both"
      );
    }
    if (alexa_registered) {
      return this.hass.localize(
        "ui.panel.config.cloud.account.overview.alexa_google_alexa"
      );
    }
    if (google_registered) {
      return this.hass.localize(
        "ui.panel.config.cloud.account.overview.alexa_google_google"
      );
    }
    return this.hass.localize(
      "ui.panel.config.cloud.account.overview.alexa_google_none"
    );
  }

  private _renderBackupStatus(): TemplateResult | string {
    // No config yet (still loading, fetch failed, or backup integration not
    // loaded) is "unknown", not "no cloud backup" — leave it blank rather than
    // asserting a state we don't know.
    if (!this.backupConfig) {
      return "";
    }
    if (!cloudBackupEnabled(this.backupConfig)) {
      return this.hass.localize(
        "ui.panel.config.cloud.account.overview.no_cloud_backup"
      );
    }
    // Cloud backup is configured, but without an active subscription future
    // backups won't run — surface that instead of a stale green "last backup".
    if (!this._subscriptionActive) {
      return this._statusLine(
        "disabled",
        this.hass.localize("ui.panel.config.cloud.account.overview.inactive")
      );
    }
    const health = cloudBackupHealth(this.backupConfig);
    if (health === "none") {
      return this.hass.localize(
        "ui.panel.config.cloud.account.overview.no_cloud_backup"
      );
    }
    const dot =
      health === "success"
        ? "enabled"
        : health === "failed"
          ? "disabled"
          : "warning";
    const last = this.backupConfig?.last_completed_automatic_backup;
    const lastBackupRelative = last
      ? relativeTime(new Date(last), this.hass.locale, new Date(), true)
      : undefined;
    const text =
      health === "failed"
        ? this.hass.localize(
            "ui.panel.config.cloud.account.overview.backup_failed"
          )
        : this.hass.localize(
            "ui.panel.config.cloud.account.overview.last_backup",
            { relative: lastBackupRelative ?? "" }
          );
    return this._statusLine(dot, text);
  }

  private get _accountState():
    | "subscribed"
    | "trial"
    | "canceled"
    | "expired"
    | "unknown" {
    const active = this.cloudStatus.active_subscription;
    switch (this.subscription?.subscription?.status) {
      case "trialing":
        return active ? "trial" : "expired";
      case "active":
        return active ? "subscribed" : "expired";
      case "canceled":
        return "canceled";
      case "expired":
        return "expired";
      case "unknown":
        return active ? "unknown" : "expired";
      default:
        return active ? "subscribed" : "expired";
    }
  }

  private get _renewalDate(): string {
    return this.subscription?.plan_renewal_date
      ? formatDate(
          new Date(this.subscription.plan_renewal_date * 1000),
          this.hass.locale,
          this.hass.config
        )
      : this.hass.localize(
          "ui.panel.config.cloud.account.getting_renewal_date"
        );
  }

  private _toggleEmail() {
    this._emailRevealed = !this._emailRevealed;
  }

  private _signOut() {
    fireEvent(this, "cloud-sign-out");
  }

  static get styles() {
    return [
      haStyle,
      css`
        :host {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-6);
        }
        ha-card {
          display: block;
          width: 100%;
          max-width: 600px;
          margin-inline: auto;
        }
        .card-title {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
        }
        .thank-you-header {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
        }
        .thank-you-header svg {
          height: 28px;
          width: auto;
          color: var(--primary-text-color);
        }
        ha-alert {
          display: block;
          margin-top: var(--ha-space-3);
        }
        ha-alert ha-button[slot="action"] {
          width: max-content;
          white-space: nowrap;
        }
        .account-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--ha-space-4) var(--ha-space-4) 0;
        }
        .nc-logo {
          width: 36px;
          height: auto;
        }
        ha-md-list-item {
          --md-item-overflow: visible;
        }
        .muted {
          color: var(--secondary-text-color);
        }
        p.muted {
          margin: var(--ha-space-2) 0 0;
        }
        .status-line {
          display: flex;
          align-items: center;
          gap: var(--ha-space-1);
          font-size: var(--ha-font-size-s);
          color: var(--secondary-text-color);
        }
        .status-dot {
          flex-shrink: 0;
          width: 8px;
          height: 8px;
          border-radius: var(--ha-border-radius-circle);
        }
        .status-dot.enabled {
          background-color: var(--success-color);
        }
        .status-dot.warning {
          background-color: var(--warning-color);
        }
        .status-dot.disabled {
          background-color: var(--error-color);
        }
        ha-md-list {
          padding: 0;
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
        }
        .extras-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--ha-space-3) var(--ha-space-4);
        }
        .extras-header h1 {
          font-size: var(--ha-font-size-2xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-expanded);
          letter-spacing: -0.012em;
          margin: 0;
        }
        .extras-content {
          padding: 0;
          overflow: hidden;
          border-radius: 0 0 var(--ha-card-border-radius, 12px)
            var(--ha-card-border-radius, 12px);
        }
        .extras-content p {
          color: var(--secondary-text-color);
          padding-inline: var(--ha-space-4);
          margin-top: 0;
        }
        .extras-content ha-md-list {
          padding-top: 0;
          --md-list-item-leading-space: var(--ha-space-4);
          --md-list-item-trailing-space: var(--ha-space-4);
        }
        .extras-content ha-md-list-item {
          --md-list-item-top-space: var(--ha-space-2);
          --md-list-item-bottom-space: var(--ha-space-2);
        }
        .extras-content ha-svg-icon[slot="start"],
        .extras-content ha-icon-next {
          color: var(--secondary-text-color);
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--ha-space-2);
          padding: var(--ha-space-2) var(--ha-space-3);
          flex-wrap: wrap;
        }
        .card-actions.split {
          flex-direction: row-reverse;
          justify-content: space-between;
        }
        .email-line {
          display: inline-flex;
          align-items: center;
          gap: var(--ha-space-1);
        }
        .email-line ha-icon-button {
          --ha-icon-button-size: 32px;
          --mdc-icon-size: 18px;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-account-overview": CloudAccountOverview;
  }
  interface HASSDomEvents {
    "cloud-sign-out": undefined;
  }
}

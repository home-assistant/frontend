import { css } from "lit";

export const animationStyles = css`
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes fade-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  @keyframes scale {
    from {
      transform: scale(0);
    }
    to {
      transform: scale(1);
    }
  }
`;

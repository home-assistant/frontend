import { tsParticles } from "tsparticles";
import { featuredDomains } from "./featured-domains";

function icons(domains: string[]): { src: string }[] {
  return domains.map((domain) => ({
    src: "https://brands.home-assistant.io/" + domain + "/icon.png",
  }));
}

export function drawFeaturedParticles() {
  tsParticles.load("particles", {
    fullScreen: {
      enable: true,
      zIndex: -1,
    },
    detectRetina: true,
    fpsLimit: 60,
    motion: {
      disable: false,
      reduce: {
        factor: 4,
        value: true,
      },
    },
    particles: {
      shape: {
        image: icons(featuredDomains),
        type: "image",
      },
      move: {
        enable: true,
        speed: 0.4,
      },
      number: {
        density: {
          enable: true,
          area: 800,
          factor: 1000,
        },
        limit: 0,
        value: featuredDomains.length,
      },
      opacity: {
        random: {
          enable: true,
          minimumValue: 0.3,
        },
        value: 0.5,
      },
      size: {
        random: {
          enable: true,
          minimumValue: 5,
        },
        value: 20,
        animation: {
          destroy: "none",
          enable: true,
          minimumValue: 5,
          speed: 2,
          startValue: "random",
          sync: false,
        },
      },
    },
    pauseOnBlur: true,
  });
}

export function drawConfiguredParticles(domains: string[]) {
  tsParticles.load("particles", {
    fullScreen: {
      enable: true,
      zIndex: -1,
    },
    detectRetina: true,
    fpsLimit: 60,
    motion: {
      disable: false,
      reduce: {
        factor: 4,
        value: true,
      },
    },
    particles: {
      shape: {
        image: icons(domains),
        type: "image",
      },
      links: {
        color: {
          value: "random",
        },
        distance: 400 - domains.length * 10,
        enable: domains.length > 1,
        frequency: 1,
        opacity: 0.7,
        width: 1,
      },
      move: {
        enable: true,
        speed: 0.5,
        outMode: "bounce",
      },
      number: {
        density: {
          enable: true,
          area: 800,
          factor: 1000,
        },
        limit: 0,
        value: domains.length,
      },
      size: {
        value: 25 - domains.length * 0.25,
      },
      collisions: {
        enable: true,
        mode: "bounce",
      },
    },
    interactivity: {
      events: {
        onDiv: {
          selectors: ".content",
          enable: true,
          mode: "bounce",
        },
      },
    },
    pauseOnBlur: true,
  });
}

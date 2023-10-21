import { tsParticles } from "tsparticles-engine";
import { loadLinksPreset } from "tsparticles-preset-links";
import { DEFAULT_PRIMARY_COLOR } from "../resources/styles-data";

loadLinksPreset(tsParticles).then(() => {
  tsParticles.load("particles", {
    preset: "links",
    background: {
      opacity: 0,
    },
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
      color: {
        value: DEFAULT_PRIMARY_COLOR,
      },
      animation: {
        enable: true,
        speed: 50,
        sync: false,
      },
      links: {
        color: {
          value: DEFAULT_PRIMARY_COLOR,
        },
        distance: 100,
        enable: true,
        frequency: 1,
        opacity: 0.7,
        width: 1,
      },
      move: {
        enable: true,
        speed: 0.5,
      },
      number: {
        density: {
          enable: true,
          area: 800,
          factor: 1000,
        },
        limit: 0,
        value: 50,
      },
      opacity: {
        random: {
          enable: true,
          minimumValue: 0.3,
        },
        value: 0.5,
        animation: {
          destroy: "none",
          enable: true,
          minimumValue: 0.3,
          speed: 0.5,
          startValue: "random",
          sync: false,
        },
      },
      size: {
        random: {
          enable: true,
          minimumValue: 1,
        },
        value: 3,
        animation: {
          destroy: "none",
          enable: true,
          minimumValue: 1,
          speed: 3,
          startValue: "random",
          sync: false,
        },
      },
    },
    pauseOnBlur: true,
  });
});

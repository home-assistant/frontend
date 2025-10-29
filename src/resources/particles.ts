import { tsParticles } from "@tsparticles/engine";
import { loadLinksPreset } from "@tsparticles/preset-links";
import { DefaultPrimaryColor } from "./theme/color/color.globals";

loadLinksPreset(tsParticles).then(() => {
  tsParticles.load({
    id: "particles",
    options: {
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
          value: DefaultPrimaryColor,
        },
        links: {
          color: {
            value: DefaultPrimaryColor,
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
          limit: undefined,
          value: 50,
        },
        opacity: {
          value: {
            min: 0.3,
            max: 0.5,
          },
          animation: {
            destroy: "none",
            enable: true,
            speed: 0.5,
            startValue: "random",
            sync: false,
          },
        },
        size: {
          value: {
            min: 1,
            max: 3,
          },
          animation: {
            destroy: "none",
            enable: true,
            speed: 3,
            startValue: "random",
            sync: false,
          },
        },
      },
      pauseOnBlur: true,
    },
  });
});

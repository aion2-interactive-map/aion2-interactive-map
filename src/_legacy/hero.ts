// src/hero.ts
import {heroui, type HeroUIPluginConfig} from '@heroui/react';

const herouiConfig: HeroUIPluginConfig = {
  "themes": {
    "light": {
      "colors": {
        "default": {
          "50": "#fafafa",
          "100": "#f2f2f3",
          "200": "#ebebec",
          "300": "#e3e3e6",
          "400": "#dcdcdf",
          "500": "#d4d4d8",
          "600": "#afafb2",
          "700": "#8a8a8c",
          "800": "#656567",
          "900": "#404041",
          "foreground": "#000",
          "DEFAULT": "#d4d4d8"
        },
        "primary": {
          "50": "#e5f2ff",
          "100": "#c0e0ff",
          "200": "#9cceff",
          "300": "#77bbff",
          "400": "#53a9ff",
          "500": "#2e97ff",
          "600": "#267dd2",
          "700": "#1e62a6",
          "800": "#164879",
          "900": "#0e2d4d",
          "foreground": "#000",
          "DEFAULT": "#2e97ff"
        },
        "secondary": {
          "50": "#eee4f8",
          "100": "#d7bfef",
          "200": "#bf99e5",
          "300": "#a773db",
          "400": "#904ed2",
          "500": "#7828c8",
          "600": "#6321a5",
          "700": "#4e1a82",
          "800": "#39135f",
          "900": "#240c3c",
          "foreground": "#fff",
          "DEFAULT": "#7828c8"
        },
        "success": {
          "50": "#e2f8ec",
          "100": "#b9efd1",
          "200": "#91e5b5",
          "300": "#68dc9a",
          "400": "#40d27f",
          "500": "#17c964",
          "600": "#13a653",
          "700": "#0f8341",
          "800": "#0b5f30",
          "900": "#073c1e",
          "foreground": "#000",
          "DEFAULT": "#17c964"
        },
        "warning": {
          "50": "#fefbf7",
          "100": "#fcf5ec",
          "200": "#faf0e1",
          "300": "#f8ead5",
          "400": "#f6e5ca",
          "500": "#f4dfbf",
          "600": "#c9b89e",
          "700": "#9f917c",
          "800": "#746a5b",
          "900": "#494339",
          "foreground": "#000",
          "DEFAULT": "#f4dfbf"
        },
        "danger": {
          "50": "#fee1eb",
          "100": "#fbb8cf",
          "200": "#f98eb3",
          "300": "#f76598",
          "400": "#f53b7c",
          "500": "#f31260",
          "600": "#c80f4f",
          "700": "#9e0c3e",
          "800": "#73092e",
          "900": "#49051d",
          "foreground": "#000",
          "DEFAULT": "#f31260"
        },
        "background": "#ffffff",
        "foreground": "#000000",
        "content1": {
          "DEFAULT": "#ffffff",
          "foreground": "#000"
        },
        "content2": {
          "DEFAULT": "#f4f4f5",
          "foreground": "#000"
        },
        "content3": {
          "DEFAULT": "#e4e4e7",
          "foreground": "#000"
        },
        "content4": {
          "DEFAULT": "#d4d4d8",
          "foreground": "#000"
        },
        "focus": "#2E97FF",
        "overlay": "#000000"
      }
    },
    "dark": {
      "colors": {
        "default": {
          "50": "#0d0d0e",
          "100": "#19191c",
          "200": "#26262a",
          "300": "#323238",
          "400": "#3f3f46",
          "500": "#65656b",
          "600": "#8c8c90",
          "700": "#b2b2b5",
          "800": "#d9d9da",
          "900": "#ffffff",
          "foreground": "#fff",
          "DEFAULT": "#3f3f46"
        },
        "primary": {
          "50": "#0e2d4d",
          "100": "#164879",
          "200": "#1e62a6",
          "300": "#267dd2",
          "400": "#2e97ff",
          "500": "#53a9ff",
          "600": "#77bbff",
          "700": "#9cceff",
          "800": "#c0e0ff",
          "900": "#e5f2ff",
          "foreground": "#000",
          "DEFAULT": "#2e97ff"
        },
        "secondary": {
          "50": "#240c3c",
          "100": "#39135f",
          "200": "#4e1a82",
          "300": "#6321a5",
          "400": "#7828c8",
          "500": "#904ed2",
          "600": "#a773db",
          "700": "#bf99e5",
          "800": "#d7bfef",
          "900": "#eee4f8",
          "foreground": "#fff",
          "DEFAULT": "#7828c8"
        },
        "success": {
          "50": "#073c1e",
          "100": "#0b5f30",
          "200": "#0f8341",
          "300": "#13a653",
          "400": "#17c964",
          "500": "#40d27f",
          "600": "#68dc9a",
          "700": "#91e5b5",
          "800": "#b9efd1",
          "900": "#e2f8ec",
          "foreground": "#000",
          "DEFAULT": "#17c964"
        },
        "warning": {
          "50": "#494339",
          "100": "#746a5b",
          "200": "#9f917c",
          "300": "#c9b89e",
          "400": "#f4dfbf",
          "500": "#f6e5ca",
          "600": "#f8ead5",
          "700": "#faf0e1",
          "800": "#fcf5ec",
          "900": "#fefbf7",
          "foreground": "#000",
          "DEFAULT": "#f4dfbf"
        },
        "danger": {
          "50": "#49051d",
          "100": "#73092e",
          "200": "#9e0c3e",
          "300": "#c80f4f",
          "400": "#f31260",
          "500": "#f53b7c",
          "600": "#f76598",
          "700": "#f98eb3",
          "800": "#fbb8cf",
          "900": "#fee1eb",
          "foreground": "#000",
          "DEFAULT": "#f31260"
        },
        "background": "#000000",
        "foreground": "#ffffff",
        "content1": {
          "DEFAULT": "#18181b",
          "foreground": "#fff"
        },
        "content2": {
          "DEFAULT": "#27272a",
          "foreground": "#fff"
        },
        "content3": {
          "DEFAULT": "#3f3f46",
          "foreground": "#fff"
        },
        "content4": {
          "DEFAULT": "#52525b",
          "foreground": "#fff"
        },
        "focus": "#2E97FF",
        "overlay": "#ffffff"
      }
    },
    "abyss": {
      "colors": {
        "default": {
          "50": "#0d0d0e",
          "100": "#19191c",
          "200": "#26262a",
          "300": "#323238",
          "400": "#3f3f46",
          "500": "#65656b",
          "600": "#8c8c90",
          "700": "#b2b2b5",
          "800": "#d9d9da",
          "900": "#ffffff",
          "foreground": "#fff",
          "DEFAULT": "#3f3f46"
        },
        "primary": {
          "50": "#0e2d4d",
          "100": "#164879",
          "200": "#1e62a6",
          "300": "#267dd2",
          "400": "#2e97ff",
          "500": "#53a9ff",
          "600": "#77bbff",
          "700": "#9cceff",
          "800": "#c0e0ff",
          "900": "#e5f2ff",
          "foreground": "#000",
          "DEFAULT": "#2e97ff"
        },
        "secondary": {
          "50": "#240c3c",
          "100": "#39135f",
          "200": "#4e1a82",
          "300": "#6321a5",
          "400": "#7828c8",
          "500": "#904ed2",
          "600": "#a773db",
          "700": "#bf99e5",
          "800": "#d7bfef",
          "900": "#eee4f8",
          "foreground": "#fff",
          "DEFAULT": "#7828c8"
        },
        "success": {
          "50": "#073c1e",
          "100": "#0b5f30",
          "200": "#0f8341",
          "300": "#13a653",
          "400": "#17c964",
          "500": "#40d27f",
          "600": "#68dc9a",
          "700": "#91e5b5",
          "800": "#b9efd1",
          "900": "#e2f8ec",
          "foreground": "#000",
          "DEFAULT": "#17c964"
        },
        "warning": {
          "50": "#494339",
          "100": "#746a5b",
          "200": "#9f917c",
          "300": "#c9b89e",
          "400": "#f4dfbf",
          "500": "#f6e5ca",
          "600": "#f8ead5",
          "700": "#faf0e1",
          "800": "#fcf5ec",
          "900": "#fefbf7",
          "foreground": "#000",
          "DEFAULT": "#f4dfbf"
        },
        "danger": {
          "50": "#49051d",
          "100": "#73092e",
          "200": "#9e0c3e",
          "300": "#c80f4f",
          "400": "#f31260",
          "500": "#f53b7c",
          "600": "#f76598",
          "700": "#f98eb3",
          "800": "#fbb8cf",
          "900": "#fee1eb",
          "foreground": "#000",
          "DEFAULT": "#f31260"
        },
        "background": "#000000",
        "foreground": "#ffffff",
        "content1": {
          "DEFAULT": "#18181b",
          "foreground": "#fff"
        },
        "content2": {
          "DEFAULT": "#27272a",
          "foreground": "#fff"
        },
        "content3": {
          "DEFAULT": "#3f3f46",
          "foreground": "#fff"
        },
        "content4": {
          "DEFAULT": "#52525b",
          "foreground": "#fff"
        },
        "focus": "#2E97FF",
        "overlay": "#ffffff"
      }
    }
  },
  "layout": {
    "disabledOpacity": "0.5"
  },
  // defaultTheme: "dark"
}

const config = heroui(herouiConfig);

export default config;

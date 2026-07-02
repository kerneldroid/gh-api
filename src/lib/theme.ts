import { Hct, SchemeTonalSpot, sourceColorFromImage } from "@ktibow/material-color-utilities-nightly";
import { colors, genCSS } from "m3-svelte/etc/colors";

const DEFAULT_SEED_COLOR = 0xFF6750A4;

export function applyThemeFromColor(argb: number) {
  const hct = Hct.fromInt(argb);
  const light = new SchemeTonalSpot(hct, false, 0.0);
  const dark = new SchemeTonalSpot(hct, true, 0.0);
  const css = genCSS(light, dark, colors);
  
  let styleEl = document.getElementById("dynamic-theme");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "dynamic-theme";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}

export function applyDefaultTheme() {
  applyThemeFromColor(DEFAULT_SEED_COLOR);
}

export async function applyThemeFromAvatar(avatarUrl: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = async () => {
      try {
        const argb = await sourceColorFromImage(img);
        applyThemeFromColor(argb);
        resolve(argb);
      } catch (err) {
        console.error(err);
        reject(err);
      }
    };
    
    img.onerror = (err) => {
      console.error(err);
      reject(err);
    };
    
    const separator = avatarUrl.includes("?") ? "&" : "?";
    img.src = `${avatarUrl}${separator}t=${Date.now()}`;
  });
}

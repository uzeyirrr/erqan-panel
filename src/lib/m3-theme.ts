import {
  Hct,
  MaterialDynamicColors,
  SchemeFidelity,
  argbFromHex,
  customColor,
  hexFromArgb,
} from "@material/material-color-utilities"

// Material Design 3 renk sistemi: tüm roller tek bir ana (seed) renkten üretilir.
// https://m3.material.io/styles/color/system/how-the-system-works
// Fidelity şeması: marka renginin tonunu korur (primary, seed'e sadık kalır).

export const DEFAULT_SEED = "#0F91E3" // erqan.com ana rengi

const ROLES = [
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "inversePrimary",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "error",
  "onError",
  "errorContainer",
  "onErrorContainer",
  "surface",
  "onSurface",
  "onSurfaceVariant",
  "surfaceDim",
  "surfaceBright",
  "surfaceContainerLowest",
  "surfaceContainerLow",
  "surfaceContainer",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "inverseSurface",
  "inverseOnSurface",
  "outline",
  "outlineVariant",
  "shadow",
  "scrim",
] as const

// Uygulamaya özel anlamlı renkler (M3 "custom colors"); seed ile uyumlu hale getirilir.
const CUSTOM = {
  gain: "#1E8E3E",
  land: "#3E8E5A",
  home: "#1F6FD1",
  premium: "#7A4FC4",
  villa: "#C27C0E",
} as const

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())

export function m3Vars(seedHex: string, dark: boolean): Record<string, string> {
  let source: number
  try {
    source = argbFromHex(seedHex)
  } catch {
    source = argbFromHex(DEFAULT_SEED)
  }
  const scheme = new SchemeFidelity(Hct.fromInt(source), dark, 0)
  const out: Record<string, string> = {}
  for (const role of ROLES) {
    out[`--md-sys-color-${kebab(role)}`] = hexFromArgb(MaterialDynamicColors[role].getArgb(scheme))
  }
  for (const [name, value] of Object.entries(CUSTOM)) {
    const group = customColor(source, { name, value: argbFromHex(value), blend: true })
    const c = dark ? group.dark : group.light
    out[`--md-custom-${name}`] = hexFromArgb(c.color)
    out[`--md-custom-on-${name}`] = hexFromArgb(c.onColor)
    out[`--md-custom-${name}-container`] = hexFromArgb(c.colorContainer)
    out[`--md-custom-on-${name}-container`] = hexFromArgb(c.onColorContainer)
  }
  return out
}

/** `:root{...} .dark{...}` CSS metni (çalışma zamanında tema rengi değişince enjekte edilir). */
export function m3Css(seedHex: string): string {
  const block = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `${k}:${v};`)
      .join("")
  return `:root{${block(m3Vars(seedHex, false))}}.dark{${block(m3Vars(seedHex, true))}}`
}

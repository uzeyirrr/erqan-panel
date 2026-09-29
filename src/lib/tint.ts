// Apple HIG: uygulamanın vurgu rengi (accent / tint). Butonlar, bağlantılar, seçili sekme ve
// anahtarların dışındaki tüm vurgular bu renkten gelir. Koyu görünümdeki açık tonu CSS üretir
// (globals.css: `.dark { --tint: color-mix(...) }`), bu yüzden burada yalnızca taban renk yazılır.
// https://developer.apple.com/design/human-interface-guidelines/color#App-accent-colors

export const DEFAULT_TINT = "#0F91E3" // erqan.com ana rengi

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** WCAG göreli parlaklığı (0 siyah, 1 beyaz). */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

export function isHexColor(s: string | undefined): s is string {
  return !!s && /^#[0-9a-f]{6}$/i.test(s)
}

/** Admin'in seçtiği marka rengi için CSS; varsayılan renkse veya geçersizse null. */
export function tintCss(hex: string | undefined): string | null {
  if (!isHexColor(hex) || hex.toLowerCase() === DEFAULT_TINT.toLowerCase()) return null
  // Sarı gibi çok açık renklerde, dolu düğme üzerindeki yazı siyah olur.
  const foreground = luminance(hex) > 0.45 ? "#000000" : "#ffffff"
  return `:root{--tint-base:${hex};--tint-foreground:${foreground}}`
}

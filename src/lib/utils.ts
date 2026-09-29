import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// iOS metin stilleri (globals.css > --text-*) yazı boyutudur; tailwind-merge bunları renk
// sanıp `text-tint-foreground` gibi renk sınıflarını silmesin diye tanıtılır.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "large-title",
            "title1",
            "title2",
            "title3",
            "headline",
            "body",
            "callout",
            "subheadline",
            "footnote",
            "caption1",
            "caption2",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

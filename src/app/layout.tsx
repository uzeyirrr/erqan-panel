import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { AppProvider } from "@/components/app-provider"
import { PwaRegister } from "@/components/pwa-register"
import "./globals.css"

// Apple cihazlarda sistem yazı tipi (SF Pro) kullanılır; diğer platformlarda ona en yakın
// açık kaynak yazı tipi olan Inter (optik boyutlandırma ile) devreye girer.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  display: "swap",
})

export const metadata: Metadata = {
  title: { default: "Erqan Panel", template: "%s | Erqan" },
  description: "Sanal emlak yatırımlarınızı yönetin: mülk satın alın, kiraya verin, kazancınızı takip edin.",
  applicationName: "Erqan",
  appleWebApp: { capable: true, title: "Erqan", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  // Çentik ve ana ekran çubuğu altındaki güvenli alanlar env(safe-area-inset-*) ile yönetilir.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full">
        <AppProvider>{children}</AppProvider>
        <PwaRegister />
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from "next"
import { Roboto } from "next/font/google"
import { AppProvider } from "@/components/app-provider"
import { PwaRegister } from "@/components/pwa-register"
import "./globals.css"

// M3 varsayılan yazı tipi (erqan.com da Roboto kullanıyor)
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1419" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${roboto.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <AppProvider>{children}</AppProvider>
        <PwaRegister />
      </body>
    </html>
  )
}

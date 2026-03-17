import type { Metadata } from "next"

import "./globals.css"

export const metadata: Metadata = {
  title: "Local Task Hub",
  description: "Local Task Hub desktop workspace",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" className="dark">
      <body>{children}</body>
    </html>
  )
}

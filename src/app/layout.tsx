import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif } from "next/font/google";
import { DocumentLangSync } from "@/components/DocumentLangSync";
import { LanguageProvider } from "@/context/LanguageContext";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Daedongyeojido | Korea Travel Reviews & Guides",
  description:
    "Your dedicated Korea travel platform — discover top-rated restaurants, Hallyu spots, culture, beauty, and nature with traveler reviews and local tips.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${notoSans.variable} ${notoSerif.variable} h-full`}>
      <body className="min-h-full antialiased">
        <LanguageProvider>
          <DocumentLangSync />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Doto, Hanken_Grotesk } from "next/font/google";
import { AppThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const doto = Doto({ subsets: ["latin"], variable: "--font-doto", display: "swap" });

export const metadata: Metadata = {
  title: "FlexForm — Train with intent",
  description: "A premium fitness system for personalized routines, visual exercise guides, workout tracking, activity, and nutrition.",
};

export const viewport: Viewport = {
  themeColor: "#f5f5f5",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${hanken.variable} ${doto.variable}`} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var a=localStorage.getItem("flexform-accent");if(a)document.documentElement.setAttribute("data-accent",a);}catch(e){}})();`,
          }}
        />
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}

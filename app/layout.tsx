import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ThemeColorInjector } from "@/components/ui/theme-color-injector";
import { getSystemSettings } from "@/app/actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSystemSettings();
  
  return {
    title: settings?.factoryName || "Factory Manager",
    description: "Advanced factory management system",
    icons: settings?.faviconUrl ? {
      icon: settings.faviconUrl,
    } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSystemSettings();
  const themeMode = settings?.themeMode || "system";
  const primaryColor = settings?.primaryColor || "#01cd74";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          forcedTheme={themeMode !== "system" ? themeMode : undefined}
          disableTransitionOnChange
        >
          <ThemeColorInjector color={primaryColor} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

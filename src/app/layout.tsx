import type { Metadata } from "next";
import { Providers } from "@/trpc/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poké Center",
  description: "Pokémon collection tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

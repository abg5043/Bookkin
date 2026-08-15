import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BookkinShell } from "@/components/bookkin-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bookkin — Your family’s next great read",
  description: "A calmer way to remember what worked and find the next library book.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><BookkinShell>{children}</BookkinShell></body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Math Tutor",
  description: "A patient math tutor for grades 4 to 10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

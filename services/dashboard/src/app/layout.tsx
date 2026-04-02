import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secret Scanner Dashboard",
  description: "Monitor secret scanning results across repositories",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

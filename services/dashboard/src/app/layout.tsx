import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

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
      <body className="bg-slate-50">
        <Sidebar />
        <div className="pl-60 min-h-screen flex flex-col">
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

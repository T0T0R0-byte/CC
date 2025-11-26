import "./globals.css";
import Link from "next/link";
import CosmicBackground from "@/components/CosmicBackground";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import FirebaseSetupHelp from "./components/FirebaseSetupHelp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VibeConnect",
  description: "Discover and book amazing workshops & events",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="relative min-h-screen overflow-x-hidden bg-[#050814] text-gray-100 antialiased">
        <AuthProvider>
          <FirebaseSetupHelp />
          <CosmicBackground />
          <Navbar />

          <main className="relative z-10 pt-32">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}

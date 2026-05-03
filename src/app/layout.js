import { Outfit } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata = {
  title: "Arionys Finance | Premium Management",
  description: "Secure financial management for Arionys Ltd",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

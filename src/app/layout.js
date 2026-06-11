import { Outfit } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import NextTopLoader from 'nextjs-toploader';
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
        <NextTopLoader color="#4f46e5" height={3} showSpinner={false} shadow="0 0 10px #4f46e5,0 0 5px #4f46e5" />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

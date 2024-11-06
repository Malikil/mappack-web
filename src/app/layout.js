import { Inter } from "next/font/google";
import "bootstrap/dist/css/bootstrap.css";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import BootstrapClient from "@/components/BootstrapClient";
import Navbar from "@/components/navbar/Navbar";
import { ToastContainer } from "react-toastify";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
   title: "Mappack Challenge",
   description: "Mappack Challenge solo queue website"
};

export default function RootLayout({ children }) {
   return (
      <html lang="en" data-bs-theme="dark">
         <body className={inter.className}>
            <Navbar />
            <div className="container py-2" tabIndex={-1} role="main">
               {children}
            </div>
            <BootstrapClient />
            <ToastContainer position="bottom-center" autoClose={2500} hideProgressBar />
         </body>
      </html>
   );
}

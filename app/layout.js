import { Space_Mono, Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata = {
  title: "TaskFlow — Internal Task Management",
  description: "Secure task management built for internal teams",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${bricolageGrotesque.variable} ${dmSans.variable}`}>
      <body className="antialiased bg-(--bg) bg-[radial-gradient(circle_at_20%_50%,rgba(200,134,10,0.04)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(42,114,195,0.04)_0%,transparent_50%)] text-(--text) font-(family-name:--body) min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}

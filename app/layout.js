import "./globals.css";
import NoticePopup from "@/app/HRM/components/NoticePopup";

export const metadata = {
  title: "Universe One — Internal Workstation",
  description: "Secure workstation built for internal teams",
  icons: {
    icon: "/assets/universe%20one%20favicon.jpg.jpeg",
    shortcut: "/assets/universe%20one%20favicon.jpg.jpeg",
    apple: "/assets/universe%20one%20favicon.jpg.jpeg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="antialiased bg-(--bg) bg-[radial-gradient(circle_at_20%_50%,rgba(200,134,10,0.04)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(42,114,195,0.04)_0%,transparent_50%)] text-(--text) font-(family-name:--body) min-h-screen overflow-x-hidden">
        {children}
        <NoticePopup />
      </body>
    </html>
  );
}

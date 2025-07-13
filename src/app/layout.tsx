import type {Metadata} from 'next';
import { Open_Sans, Roboto_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const openSans = Open_Sans({
  variable: '--font-open-sans',
  subsets: ['latin'],
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GWD Kollam Dashboard', // Updated App Name
  description: 'Dashboard for Ground Water Department, Kollam', // Updated Description
  icons: {
    icon: 'https://placehold.co/64x64/2563EB/FFFFFF.png?text=G',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${openSans.variable} ${robotoMono.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

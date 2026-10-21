import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: { default: "ReferralFlow — Keep opportunities moving", template: "%s · ReferralFlow" }, description: "A calm career CRM to manage job applications, referral contacts, and follow-ups in one place.", applicationName: "ReferralFlow", keywords: ["job tracker", "referrals", "career CRM"] };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f8fc" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><body>{children}</body></html>; }

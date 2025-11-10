"use client";

import React from "react";
import Link from "next/link";

const Container = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 ${className}`}>
    {children}
  </div>
);

export default function SiteFooter() {
  return (
    <footer className="bg-[#6b4f3a] text-[#F9F6F2]">
      <Container className="py-8 space-y-4 text-sm relative">
        {/* keep anchor so /#data still works */}
        <span id="data" className="absolute -top-16 h-0 w-0" aria-hidden />

        <p className="text-center leading-relaxed">
          This website was developed through a Cooperative Agreement with Michigan State University
          and USDA&apos;s Agricultural Marketing Service.
        </p>

        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]"
        >
          <Link href="/definitions" className="hover:underline underline-offset-2">
            Definitions
          </Link>
          <Link href="/privacy" className="hover:underline underline-offset-2">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:underline underline-offset-2">
            Terms of Use and Service
          </Link>
          <Link href="/accessibility" className="hover:underline underline-offset-2">
            Accessibility Statement
          </Link>
        </nav>

        <div className="text-center text-xs leading-relaxed text-[#F3EDE7]">
          <p>
            OMB Number for Agritourism Directory: 0581-0332_Expiration Date: 01/31/2025
          </p>
          <p>
            OMB Number for CSA, Farmers Market, Food Hub and On-farm Market:
            0581-0169_Expiration Date: 01/31/2023
          </p>
        </div>
      </Container>
    </footer>
  );
}

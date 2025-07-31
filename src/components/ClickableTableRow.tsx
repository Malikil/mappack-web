"use client";

import { useRouter } from "next/navigation";
import React from "react";

export default function ClickableTableRow({ href, children }: { href: string; children: React.ReactNode }) {
   const router = useRouter();

   const handleClick = (e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      router.push(href);
   };
   return (
      <tr onClick={handleClick} role="button">
         {children}
      </tr>
   );
}

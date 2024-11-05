"use client";

import { useEffect, useState } from "react";
import { MoonStars, Sun } from "react-bootstrap-icons";

export default function ThemeToggle() {
   const [curTheme, setCurTheme] = useState();
   useEffect(() => setCurTheme(t => t || localStorage.getItem("display-theme") || "dark"), []);
   useEffect(() => document.documentElement.setAttribute("data-bs-theme", curTheme), [curTheme]);

   return (
      <div
         className="rounded-circle px-2 d-flex"
         role="button"
         aria-label="Change Theme"
         onClick={() =>
            setCurTheme(prev => {
               if (prev === "dark") {
                  localStorage.setItem("display-theme", "light");
                  return "light";
               } else {
                  localStorage.setItem("display-theme", "dark");
                  return "dark";
               }
            })
         }
      >
         {curTheme === "dark" ? <MoonStars /> : <Sun />}
      </div>
   );
}

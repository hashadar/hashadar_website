"use client";

import { useEffect } from "react";

export function useSmoothScroll() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      
      if (anchor && anchor.hash) {
        const href = anchor.getAttribute("href");
        const isInPageHash = href === anchor.hash || href?.startsWith("/#");

        if (isInPageHash) {
          e.preventDefault();
          const id = anchor.hash.slice(1);
          const element = document.getElementById(id);
          
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);
}


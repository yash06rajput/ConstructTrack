"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * App-wide toast host. Mounted once in the root layout. Uses the system
 * color scheme via CSS (see globals.css tokens) rather than next-themes,
 * since this project doesn't have a theme switcher.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      richColors
      closeButton
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };

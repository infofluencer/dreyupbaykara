"use client";

import { useEffect, useRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { buildTrackingPath, DEFAULT_SITE } from "@/lib/crm/tracking";

type TrackedWhatsAppLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  children: ReactNode;
  site?: string;
  channel?: string;
  campaign?: string;
};

/**
 * WhatsApp CTA that routes through /r so UTM/GCLID/FBCLID are stored
 * before opening wa.me with a Ref: code in the message.
 */
export function TrackedWhatsAppLink({
  children,
  site = DEFAULT_SITE,
  channel = "website",
  campaign,
  className,
  onClick,
  onPointerDown,
  ...rest
}: TrackedWhatsAppLinkProps) {
  const fallbackHref = `/r?site=${encodeURIComponent(site)}&channel=${encodeURIComponent(channel)}`;
  const anchorRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (anchorRef.current) {
      anchorRef.current.href = buildTrackingPath({ site, channel, campaign });
    }
  }, [site, channel, campaign]);

  return (
    <a
      {...rest}
      ref={anchorRef}
      href={fallbackHref}
      className={className}
      rel={rest.rel ?? "noopener noreferrer"}
      onPointerDown={(event) => {
        event.currentTarget.href = buildTrackingPath({ site, channel, campaign });
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        event.currentTarget.href = buildTrackingPath({ site, channel, campaign });
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}

"use client";

import type {
  AnchorHTMLAttributes,
  MouseEvent,
  PointerEvent,
  ReactNode,
} from "react";
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
  const syncHref = (element: HTMLAnchorElement) => {
    element.href = buildTrackingPath({ site, channel, campaign });
  };

  return (
    <a
      {...rest}
      href={fallbackHref}
      className={className}
      rel={rest.rel ?? "noopener noreferrer"}
      onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
        syncHref(event.currentTarget);
        onPointerDown?.(event);
      }}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        syncHref(event.currentTarget);
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}

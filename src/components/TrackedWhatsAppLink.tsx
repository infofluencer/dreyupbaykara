"use client";

import {
  useLayoutEffect,
  useRef,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { pushDataLayerEvent } from "@/components/analytics/data-layer";
import { trackMetaEvent } from "@/components/analytics/track-meta";
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

function buildFallbackHref(site: string, channel: string) {
  return `/r?site=${encodeURIComponent(site)}&channel=${encodeURIComponent(channel)}`;
}

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
  const fallbackHref = buildFallbackHref(site, channel);
  const anchorRef = useRef<HTMLAnchorElement>(null);

  const syncHref = () =>
    buildTrackingPath({ site, channel, campaign });

  useLayoutEffect(() => {
    if (anchorRef.current) {
      anchorRef.current.href = syncHref();
    }
  }, [site, channel, campaign]);

  return (
    <a
      {...rest}
      ref={anchorRef}
      href={fallbackHref}
      suppressHydrationWarning
      className={className}
      rel={rest.rel ?? "noopener noreferrer"}
      onPointerDown={(event) => {
        event.currentTarget.href = syncHref();
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        event.currentTarget.href = syncHref();
        trackMetaEvent("Contact", { content_name: `whatsapp_${channel}` });
        pushDataLayerEvent("whatsapp_click", { channel });
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}

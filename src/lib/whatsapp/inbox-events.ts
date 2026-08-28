/** Browser event so global WA notifications can refresh the open inbox UI. */
export const WA_INBOX_REFRESH_EVENT = "wa-inbox-refresh";

export type WaInboxRefreshDetail = {
  conversationId: string;
  message?: {
    id: string;
    direction: string;
    body: string | null;
    status?: string;
    automated?: boolean | null;
    created_at?: string;
    media_type?: string | null;
    media_url?: string | null;
    source?: string | null;
  };
};

export function dispatchWaInboxRefresh(detail: WaInboxRefreshDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WA_INBOX_REFRESH_EVENT, { detail }),
  );
}

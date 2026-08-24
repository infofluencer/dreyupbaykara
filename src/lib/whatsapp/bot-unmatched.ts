export type UnmatchedKind = "welcome" | "fallback" | "after_hours" | "silent";

export type UnmatchedSettings = {
  welcome: string;
  fallback: string;
  afterHoursMessage: string;
};

const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000;

/**
 * SSS tutmadığında ne gönderilir.
 * Production bot mesai dışı kilitli: always afterHours=true → after_hours_message.
 * Welcome / fallback yolları test ve geriye dönük uyumluluk için durur.
 * Fallback / mesai dışı tekrarı 30 dk içinde spamlenmez.
 */
export function resolveUnmatchedReply(options: {
  afterHours: boolean;
  inboundCount: number;
  lastAutomatedBody: string | null;
  lastAutomatedAt: number | null;
  welcome: string;
  fallback: string;
  afterHoursMessage: string;
  now?: number;
  cooldownMs?: number;
}): { kind: UnmatchedKind; reply: string | null } {
  const now = options.now ?? Date.now();
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const elapsed =
    options.lastAutomatedAt == null ? Infinity : now - options.lastAutomatedAt;
  const lastBody = options.lastAutomatedBody;

  const lastWasHandoff =
    lastBody === options.fallback || lastBody === options.afterHoursMessage;

  if (lastWasHandoff && elapsed < cooldownMs) {
    return { kind: "silent", reply: null };
  }

  if (options.afterHours) {
    return { kind: "after_hours", reply: options.afterHoursMessage };
  }

  if (lastBody === options.welcome) {
    return { kind: "fallback", reply: options.fallback };
  }

  if (options.inboundCount <= 1) {
    return { kind: "welcome", reply: options.welcome };
  }

  return { kind: "fallback", reply: options.fallback };
}

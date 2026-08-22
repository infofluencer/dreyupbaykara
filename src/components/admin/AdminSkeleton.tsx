import type { HTMLAttributes } from "react";

const pulse = "animate-pulse bg-[#f0f3f1]";

export function Skeleton({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`${pulse} rounded-xl ${className}`}
      aria-hidden
      {...props}
    />
  );
}

export function SkeletonPageHeader({
  titleWidth = "w-36",
  subtitle = true,
}: {
  titleWidth?: string;
  subtitle?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-8 ${titleWidth} sm:h-9`} />
      {subtitle ? (
        <Skeleton className="h-4 w-full max-w-md sm:max-w-lg" />
      ) : null}
    </div>
  );
}

export function SkeletonRows({
  count = 5,
  className = "h-16",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-[#123524]/08 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[#123524]/10 sm:bg-white">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton
          key={index}
          className={`${className} w-full rounded-2xl sm:rounded-none sm:border-0`}
        />
      ))}
    </div>
  );
}

/** Özet */
export function AdminHomeSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Özet yükleniyor">
      <SkeletonPageHeader titleWidth="w-24" />
      <div className="rounded-2xl border border-[#123524]/08 bg-white px-4 py-5 sm:px-5">
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** Talepler / Hastalar benzeri liste */
export function AdminListSkeleton({
  label,
  withFilters = true,
}: {
  label: string;
  withFilters?: boolean;
}) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label={label}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SkeletonPageHeader />
        <Skeleton className="h-11 w-full rounded-full sm:w-32" />
      </div>
      {withFilters ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Skeleton className="h-11 w-full flex-1 rounded-xl" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-20 rounded-full" />
            ))}
          </div>
        </div>
      ) : (
        <Skeleton className="h-12 w-full rounded-xl" />
      )}
      <SkeletonRows count={6} className="h-[4.5rem]" />
    </div>
  );
}

/** Kaynaklar */
export function AdminSourcesSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Kaynaklar yükleniyor">
      <SkeletonPageHeader titleWidth="w-32" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <div className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <div className="space-y-3 sm:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="hidden h-72 w-full rounded-2xl sm:block" />
    </div>
  );
}

/** WhatsApp inbox iki panel */
export function AdminMessagesSkeleton() {
  return (
    <div
      className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-2xl border border-[#123524]/10 bg-white lg:h-[calc(100dvh-5.5rem)] lg:flex-row"
      aria-busy="true"
      aria-label="WhatsApp yükleniyor"
    >
      <aside className="flex w-full min-h-0 flex-col border-[#123524]/10 lg:w-[22rem] lg:shrink-0 lg:border-r">
        <div className="space-y-3 border-b border-[#123524]/08 p-4">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-16 rounded-full" />
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-0 overflow-hidden">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-16 w-full rounded-none border-b border-[#123524]/06"
            />
          ))}
        </div>
      </aside>
      <section className="hidden min-h-0 min-w-0 flex-1 flex-col lg:flex">
        <div className="space-y-3 border-b border-[#123524]/08 p-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="min-h-0 flex-1 space-y-3 bg-[#efe9df] p-4">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton
              key={index}
              className={`h-14 max-w-[70%] rounded-2xl ${
                index % 2 === 0 ? "ml-auto" : ""
              }`}
            />
          ))}
        </div>
        <div className="border-t border-[#123524]/08 p-3 sm:p-4">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </section>
    </div>
  );
}

/** Bot / İçerik / form sayfaları */
export function AdminFormSkeleton({
  label,
  sections = 2,
}: {
  label: string;
  sections?: number;
}) {
  return (
    <div className="space-y-8" aria-busy="true" aria-label={label}>
      <SkeletonPageHeader titleWidth="w-48" />
      {Array.from({ length: sections }, (_, index) => (
        <div
          key={index}
          className="space-y-4 rounded-2xl border border-[#123524]/10 bg-white p-5 sm:p-7"
        >
          <Skeleton className="h-5 w-36" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full sm:col-span-2" />
            <Skeleton className="h-24 w-full sm:col-span-2" />
          </div>
          <Skeleton className="h-11 w-36 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Ekip */
export function AdminTeamSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Ekip yükleniyor">
      <SkeletonPageHeader titleWidth="w-40" />
      <div className="overflow-hidden rounded-2xl border border-[#123524]/10 bg-white">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 border-b border-[#123524]/08 px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Skeleton className="h-11 w-full sm:w-36" />
              <Skeleton className="h-11 w-full rounded-full sm:w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Detay (hasta / lead / randevu) */
export function AdminDetailSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-8" aria-busy="true" aria-label={label}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-56 sm:h-9" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Skeleton className="h-11 w-full rounded-full sm:w-40" />
          <Skeleton className="h-11 w-full rounded-full sm:w-28" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-[#123524]/10 bg-white p-5">
          <Skeleton className="h-5 w-32" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-[#123524]/10 bg-white p-5">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Takvim sayfa kabuğu — CalendarSkeleton ile uyumlu */
export function AdminCalendarPageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Takvim yükleniyor">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SkeletonPageHeader titleWidth="w-28" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-14 rounded-lg sm:h-11 sm:w-16 sm:rounded-xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="space-y-2.5 sm:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[5.5rem] w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="hidden h-[624px] w-full rounded-2xl sm:block" />
    </div>
  );
}

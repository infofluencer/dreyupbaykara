export function CalendarSkeleton({ view }: { view: string }) {
  if (view === "year") {
    return (
      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-4"
        aria-busy="true"
        aria-label="Takvim yükleniyor"
      >
        {Array.from({ length: 12 }, (_, index) => (
          <div
            key={index}
            className="min-h-[4.5rem] animate-pulse rounded-2xl bg-[#f0f3f1] sm:min-h-[13rem]"
          />
        ))}
      </div>
    );
  }

  if (view === "week") {
    return (
      <div
        className="grid grid-cols-1 gap-2 md:grid-cols-7"
        aria-busy="true"
        aria-label="Takvim yükleniyor"
      >
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className="min-h-[7.5rem] animate-pulse rounded-2xl bg-[#f0f3f1] md:aspect-square"
          />
        ))}
      </div>
    );
  }

  if (view === "month") {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Takvim yükleniyor">
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {Array.from({ length: 35 }, (_, index) => (
            <div
              key={index}
              className="min-h-12 animate-pulse rounded-xl bg-[#f0f3f1] md:aspect-square md:rounded-2xl"
            />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-[4.75rem] animate-pulse rounded-xl bg-[#f0f3f1]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div aria-busy="true" aria-label="Takvim yükleniyor">
      <div className="space-y-2.5 sm:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-[5.5rem] animate-pulse rounded-2xl bg-[#f0f3f1]"
          />
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-2xl border border-[#123524]/08 sm:block">
        <div className="h-[624px] animate-pulse bg-[#f0f3f1]" />
      </div>
    </div>
  );
}

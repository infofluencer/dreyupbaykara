export default function AutomationsLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-label="Yükleniyor">
      <div className="h-8 w-64 rounded-lg bg-[#123524]/10" />
      <div className="h-40 rounded-2xl bg-[#123524]/08" />
      <div className="h-40 rounded-2xl bg-[#123524]/08" />
    </div>
  );
}

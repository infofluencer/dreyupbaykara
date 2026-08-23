"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function ClinicalFileCard({
  noteCount,
  children,
}: {
  noteCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#0b6b45]/20 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-[#f7f9f8]"
      >
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold text-[#123524]">
            Klinik dosya{" "}
            <span className="text-sm font-medium text-[#466254]">
              — doktor doldurur
            </span>
          </h2>
          <p className="mt-0.5 text-sm text-[#466254]">
            {noteCount
              ? `${noteCount} not · alerji, özet ve klinik kayıtlar burada`
              : "Alerji, özet ve klinik notlar burada"}
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#0b6b45] transition ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-[#123524]/08 px-5 py-5">{children}</div>
      ) : null}
    </section>
  );
}

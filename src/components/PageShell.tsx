import Link from "next/link";
import { PageHero, type PageHeroCrumb } from "@/components/PageHero";
import { VectorPattern } from "@/components/VectorPattern";

type PageShellProps = {
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  breadcrumb?: PageHeroCrumb[];
  children?: React.ReactNode;
};

/** Krem zeminli iç sayfa kabuğu — üstte ortak PageHero */
export function PageShell({
  title,
  description,
  image,
  imageAlt,
  breadcrumb,
  children,
}: PageShellProps) {
  return (
    <main className="min-h-screen bg-[#f7f1e9]">
      <PageHero
        title={title}
        description={description}
        image={image}
        imageAlt={imageAlt}
        breadcrumb={breadcrumb}
      />
      <section className="relative">
        <VectorPattern tone="light" opacity={0.04} size={400} />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 md:pb-28 md:pt-14 lg:px-10">
          {children}
        </div>
      </section>
    </main>
  );
}

export function PageCta() {
  return (
    <div className="pt-1">
      <Link
        href="/iletisim"
        className="inline-flex items-center justify-center rounded-full bg-[#0b6b45] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#085436]"
      >
        Randevu Al
      </Link>
    </div>
  );
}

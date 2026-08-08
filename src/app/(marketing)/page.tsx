import HomePage from "@/components/home/Home";
import { CmsSections } from "@/components/cms/CmsSections";
import { getPublishedPage } from "@/lib/cms/content";

export default async function Home() {
  const content = await getPublishedPage("/");
  return (
    <main className="bg-bg">
      <HomePage />
      {content?.content_sections.length ? (
        <section className="bg-[#f7f1e9] px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <CmsSections sections={content.content_sections} />
          </div>
        </section>
      ) : null}
    </main>
  );
}

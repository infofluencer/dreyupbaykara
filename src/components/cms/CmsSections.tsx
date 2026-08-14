import Image from "next/image";
import { mediaPublicUrl, type PublicContentSection } from "@/lib/cms/content";

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function CmsSections({
  sections,
}: {
  sections: PublicContentSection[];
}) {
  if (!sections.length) return null;

  return (
    <div className="space-y-10">
      {sections.map((section) => {
        const paragraphs = strings(section.content.paragraphs);
        const items = strings(section.content.items);
        const text =
          typeof section.content.text === "string"
            ? section.content.text
            : null;
        const imagePath =
          typeof section.content.image_path === "string"
            ? section.content.image_path
            : null;
        const imageUrl = mediaPublicUrl(imagePath);
        const imageAlt =
          typeof section.content.image_alt === "string"
            ? section.content.image_alt
            : section.title || "";

        if (section.section_type === "image" && imageUrl) {
          return (
            <figure key={section.id}>
              <Image
                src={imageUrl}
                alt={imageAlt}
                width={1600}
                height={1000}
                sizes="(min-width: 768px) 768px, 92vw"
                className="max-h-[42rem] w-full rounded-[1.5rem] object-cover"
              />
              {section.title ? (
                <figcaption className="mt-2 text-center text-xs text-[#466254]">
                  {section.title}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        return (
          <section
            key={section.id}
            className={
              section.section_type === "callout"
                ? "rounded-[1.5rem] bg-[#e7f5ed] p-6"
                : ""
            }
          >
            {section.title ? (
              <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold text-[#123524]">
                {section.title}
              </h2>
            ) : null}
            <div className="mt-3 space-y-4 text-sm leading-7 text-[#466254] sm:text-[15px]">
              {text ? <p>{text}</p> : null}
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {items.length ? (
                <ul className="list-disc space-y-2 pl-5">
                  {items.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}


export type TreatmentId =
  | "bel-fitigi"
  | "boyun-fitigi"
  | "kanal-darligi";

export interface Treatment {
  id: TreatmentId;
  title: string;
  shortTitle?: string;
  description: string;
  href: string;
  accent: string;
  image?: string;
}

export const TREATMENTS: Treatment[] = [
  {
    id: "bel-fitigi",
    title: "Full Endoskopik Tam Kapalı Bel Fıtığı Ameliyatı",
    shortTitle: "Bel Fıtığı",
    description:
      "Disk kaymasıyla oluşan bel fıtığında küçük kesi, az doku hasarı ve hızlı iyileşme.",
    href: "/tedaviler/bel-fitigi-ameliyati",
    accent: "#0b6b45",
    image: "/hero/belfitigi.webp",
  },
  {
    id: "boyun-fitigi",
    title: "Full Endoskopik Tam Kapalı Boyun Fıtığı Ameliyatı",
    shortTitle: "Boyun Fıtığı",
    description:
      "Boyun ağrısı, kol uyuşması ve baş dönmesinde full endoskopik kapalı tedavi.",
    href: "/tedaviler/boyun-fitigi-ameliyati",
    accent: "#1a8f5c",
    image: "/hero/boyunfitigi.webp",
  },
  {
    id: "kanal-darligi",
    title: "Full Endoskopik Tam Kapalı Kanal Darlığı Ameliyatı",
    shortTitle: "Kanal Darlığı",
    description:
      "Kanal darlığında ağrı, uyuşma ve güç kaybına minimal invaziv çözüm.",
    href: "/tedaviler/kanal-darligi-ameliyati",
    accent: "#0b6b45",
    image: "/hero/kanaldarligi.webp",
  },
];

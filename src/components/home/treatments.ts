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
      "Kalçadan bacağa vuran ağrıya son verin, aynı gün taburcu olun.",
    href: "/tedaviler/bel-fitigi-ameliyati",
    accent: "#0b6b45",
    image: "/hero/belfitigi.webp",
  },
  {
    id: "boyun-fitigi",
    title: "Full Endoskopik Tam Kapalı Boyun Fıtığı Ameliyatı",
    shortTitle: "Boyun Fıtığı",
    description:
      "Kola yayılan boyun ağrısında milimetrik girişle hedefe yönelik tedavi.",
    href: "/tedaviler/boyun-fitigi-ameliyati",
    accent: "#1a8f5c",
    image: "/hero/boyunfitigi.webp",
  },
  {
    id: "kanal-darligi",
    title: "Full Endoskopik Tam Kapalı Kanal Darlığı Ameliyatı",
    shortTitle: "Kanal Darlığı",
    description:
      "Yürüme mesafesini kısaltan kanal darlığında platin olmadan rahatlama.",
    href: "/tedaviler/kanal-darligi-ameliyati",
    accent: "#0b6b45",
    image: "/hero/kanaldarligi.webp",
  },
];

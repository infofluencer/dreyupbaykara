import "server-only";

import { getPublicSettings } from "@/lib/cms/content";
import { mergeHomeSections, type HomeSections } from "@/lib/cms/home";

export async function getHomeSections(): Promise<HomeSections> {
  const settings = await getPublicSettings(["home.sections"]);
  return mergeHomeSections(settings["home.sections"]);
}

import "server-only";

import { cache } from "react";
import {
  getHomeSections as loadHomeSections,
  type HomeSections,
} from "@/lib/cms/home";

export type { HomeSections };

export const getHomeSections = cache(loadHomeSections);

"use client";

import { ExperienceListing } from "@/components/sections/shared/experience-listing";
import type { ExperienceSection } from "@/data/types";

export function ExperienceSection(props: ExperienceSection) {
  return <ExperienceListing {...props} id="experience" />;
}
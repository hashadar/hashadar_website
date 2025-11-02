"use client";

import { ExperienceListing } from "@/components/sections/shared/experience-listing";
import type { ExperienceSection } from "@/data/types";

interface ExperienceSectionProps extends ExperienceSection {}

export function ExperienceSection(props: ExperienceSectionProps) {
  return <ExperienceListing {...props} id="experience" />;
}
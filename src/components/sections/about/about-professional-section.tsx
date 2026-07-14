"use client";

import { ProseSection, type ProseSectionProps } from "@/components/sections/shared/prose-section";

export type AboutProfessionalSectionProps = Omit<ProseSectionProps, "cta" | "id">;

export function AboutProfessionalSection(props: AboutProfessionalSectionProps) {
  return <ProseSection {...props} />;
}

"use client";

import { ProseSection, type ProseSectionProps } from "@/components/sections/shared/prose-section";

export type AboutSectionProps = ProseSectionProps;

export function AboutSection(props: AboutSectionProps) {
  return <ProseSection id="about" {...props} />;
}

"use client";

import {
  Container,
  FooterBackground,
  FooterBrand,
  FooterColumn,
  GitHubIcon,
  LinkedInIcon,
  MotionRevealGroup,
  NavLink,
  SocialLink,
  Text,
} from "@/components/ui";
import { getCommonData } from "@/data";

export function FooterSection() {
  const { footer, navigation, site } = getCommonData();
  const {
    heading,
    description,
    navigationTitle,
    socialTitle,
    email,
    social,
    copyright,
  } = footer.contact;

  return (
    <footer className="relative overflow-hidden bg-[var(--background)] border-t border-[var(--border)]">
      <FooterBackground />

      <Container>
        <div className="py-20 space-y-16">
          <MotionRevealGroup className="grid gap-12 md:grid-cols-3 md:gap-16">
            <FooterColumn title={heading}>
              <Text className="leading-relaxed text-[var(--foreground)]">
                {description}
              </Text>

              <div className="space-y-3">
                <Text className="font-medium text-[var(--primary)]">
                  <a href={`mailto:${email}`} className="hover:underline transition-colors duration-300">
                    {email}
                  </a>
                </Text>
              </div>
            </FooterColumn>

            <FooterColumn title={navigationTitle}>
              <nav className="space-y-3 relative z-10">
                {navigation.links.map((link) => (
                  <NavLink key={link.href} href={link.href}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </FooterColumn>

            <FooterColumn title={socialTitle}>
              <div className="flex gap-4 relative z-10">
                <SocialLink
                  href={social.linkedin}
                  icon={<LinkedInIcon />}
                  label="LinkedIn"
                />
                <SocialLink
                  href={social.github}
                  icon={<GitHubIcon />}
                  label="GitHub"
                />
              </div>
            </FooterColumn>
          </MotionRevealGroup>

          <FooterBrand brandName={site.brandName} copyright={copyright} />
        </div>
      </Container>
    </footer>
  );
}

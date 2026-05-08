"use client";

import {
  Container,
  FooterBackground,
  FooterBrand,
  FooterColumn,
  GitHubIcon,
  LinkedInIcon,
  NavLink,
  SocialLink,
  Text,
} from "@/components/ui";
import { navigation, site } from "@/data";

interface FooterSectionProps {
  heading: string;
  description: string;
  navigationTitle: string;
  socialTitle: string;
  email: string;
  social: {
    github: string;
    linkedin: string;
  };
  copyright: string;
}

export function FooterSection({
  heading,
  description,
  navigationTitle,
  socialTitle,
  email,
  social,
  copyright,
}: FooterSectionProps) {
  return (
    <footer className="relative overflow-hidden bg-[var(--background)] border-t border-[var(--border)]">
      <FooterBackground />
      
      <Container>
        <div className="py-20 space-y-16">
          {/* Main content grid */}
          <div className="grid md:grid-cols-3 gap-12 md:gap-16">
            {/* Contact section */}
            <FooterColumn title={heading} delay={0}>
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

            {/* Navigation links */}
            <FooterColumn title={navigationTitle} delay={0.2}>
              <nav className="space-y-3 relative z-10">
                {navigation.links.map((link) => (
                  <NavLink key={link.href} href={link.href}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </FooterColumn>

            {/* Social links */}
            <FooterColumn title={socialTitle} delay={0.4}>
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
          </div>

          {/* Bottom section with brand name */}
          <FooterBrand brandName={site.brandName} copyright={copyright} />
        </div>
      </Container>
    </footer>
  );
}

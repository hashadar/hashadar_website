"use client";

import { Text, Container } from "@/components/ui";
import { 
  FooterColumn, 
  NavLink, 
  SocialLink, 
  FooterBackground, 
  FooterBrand,
  LinkedInIcon,
  GitHubIcon 
} from "@/components/ui/footer";
import { navigation } from "@/data";

interface FooterSectionProps {
  heading: string;
  description: string;
  email: string;
  social: {
    github: string;
    linkedin: string;
  };
  copyright: string;
}

export function FooterSection({ heading, description, email, social, copyright }: FooterSectionProps) {
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
            <FooterColumn title="Navigation" delay={0.2}>
              <nav className="space-y-3 relative z-10">
                {navigation.links.map((link) => (
                  <NavLink key={link.href} href={link.href}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </FooterColumn>

            {/* Social links */}
            <FooterColumn title="Connect" delay={0.4}>
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
          <FooterBrand brandName="hasha dar" copyright={copyright} />
        </div>
      </Container>
    </footer>
  );
}

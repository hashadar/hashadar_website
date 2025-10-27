"use client";

import { SectionHeader, Heading, Text, Container, Section, SectionBackground } from "@/components/ui";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

interface Role {
  role: string;
  period: string;
  description: string;
}

interface Company {
  name: string;
  location: string;
  roles: Role[];
}

interface ExperienceSectionProps {
  heading: string;
  companies: Company[];
}

export function ExperienceSection({ heading, companies }: ExperienceSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  return (
    <Section id="experience" className="relative overflow-hidden">
      <SectionBackground variant="about-experience" />
      
      <Container>
        <div className="space-y-16">
          {/* Header with angular styling */}
          <SectionHeader showRightAccent showBottomAccent>
            {heading}
          </SectionHeader>
          
          <div className="max-w-4xl mx-auto space-y-16">
            {companies.map((company, companyIndex) => (
              <motion.div
                key={company.name}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, delay: companyIndex * 0.3, ease: "easeOut" }}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Company container */}
                <div className="relative group">
                  {/* Main angular border */}
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-[var(--primary)] opacity-20 transform skew-x-12" />
                  
                  {/* Company header */}
                  <div className="pl-12 pb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
                      <div className="space-y-1">
                        <Heading size="md" as="h2" className="text-[var(--foreground)]">
                          {company.name}
                        </Heading>
                        <Text variant="muted" className="text-sm">
                          {company.location}
                        </Text>
                      </div>
                      
                      {/* Company-level angular accent */}
                      <div className="w-12 h-px bg-gradient-to-r from-[var(--primary)] to-transparent opacity-40" />
                    </div>
                    
                    {/* Roles container */}
                    <div className="space-y-8">
                      {company.roles.map((role, roleIndex) => (
                        <motion.div
                          key={`${company.name}-${role.role}`}
                          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={prefersReducedMotion ? { duration: 0 } : { 
                            duration: 0.6, 
                            delay: (companyIndex * 0.3) + (roleIndex * 0.15), 
                            ease: "easeOut" 
                          }}
                          viewport={{ once: true }}
                          className="relative group/role"
                        >
                          {/* Role connecting line */}
                          {roleIndex > 0 && (
                            <div className="absolute -left-8 top-0 w-px h-8 bg-[var(--primary)] opacity-30" />
                          )}
                          
                          {/* Role content */}
                          <div className="pl-8 space-y-3 relative">
                            {/* Role angular accent */}
                            <div className="absolute -left-6 top-2 w-3 h-3 border border-[var(--primary)] transform rotate-45 opacity-0 group-hover/role:opacity-100 transition-opacity duration-300" />
                            
                            {/* Role header */}
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                              <div className="space-y-1">
                                <Heading size="sm" as="h3" className="text-[var(--foreground)]">
                                  {role.role}
                                </Heading>
                              </div>
                              <div className="text-right">
                                <Text variant="muted" className="text-sm font-medium">
                                  {role.period}
                                </Text>
                              </div>
                            </div>
                            
                            {/* Role description */}
                            <Text className="leading-relaxed text-sm">
                              {role.description}
                            </Text>
                            
                            {/* Bottom accent line */}
                            <div className="w-12 h-px bg-gradient-to-r from-[var(--primary)] to-transparent opacity-20" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
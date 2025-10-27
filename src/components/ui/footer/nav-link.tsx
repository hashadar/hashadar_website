import Link from "next/link";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className="text-[var(--foreground)] hover:text-[var(--primary)] transition-colors duration-300 block cursor-pointer relative z-10"
    >
      {children}
    </Link>
  );
}
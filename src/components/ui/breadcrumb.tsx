import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav 
      aria-label="Breadcrumb" 
      className={`${className}`}
    >
      <ol className="flex items-center gap-2 text-sm text-[var(--foreground)]/60">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-[var(--primary)] transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "text-[var(--foreground)] font-medium" : ""}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <svg
                  className="w-4 h-4 text-[var(--foreground)]/40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


import React from "react";

interface SectionHeaderProps {
  title:     string;
  subtitle?: string;
  action?:   React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, action, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div>
        <h2 className="text-base font-semibold text-content-primary tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-sm text-content-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

import React from "react";

interface CardProps {
  variant?:  "default" | "accent-gold" | "accent-teal" | "accent-blue";
  className?: string;
  children:  React.ReactNode;
  onClick?:  () => void;
}

const variantStyles: Record<NonNullable<CardProps["variant"]>, string> = {
  "default":      "bg-surface-raised border border-surface-border shadow-[var(--shadow-card)]",
  "accent-gold":  "bg-surface-raised border border-gold/30 shadow-[var(--shadow-card-gold)]",
  "accent-teal":  "bg-surface-raised border border-teal/30",
  "accent-blue":  "bg-surface-raised border border-blue-brand/30",
};

export function Card({ variant = "default", className = "", onClick, children }: CardProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className={`rounded-[var(--radius-card)] p-5 ${variantStyles[variant]} ${onClick ? "cursor-pointer transition-transform duration-150 hover:scale-[1.01] text-left w-full" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}

import React from "react";

interface PageContainerProps {
  children:   React.ReactNode;
  className?: string;
  maxWidth?:  "default" | "wide" | "full";
}

const MAX_WIDTH_CLASS = {
  default: "max-w-5xl",
  wide:    "max-w-7xl",
  full:    "max-w-none",
};

export function PageContainer({ children, className = "", maxWidth = "default" }: PageContainerProps) {
  return (
    <div className={`${MAX_WIDTH_CLASS[maxWidth]} mx-auto px-4 md:px-6 py-6 md:py-8 ${className}`}>
      {children}
    </div>
  );
}

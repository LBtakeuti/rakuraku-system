"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type PrintButtonProps = {
  href: string;
  label: string;
};

export function PrintButton({ href, label }: PrintButtonProps) {
  return (
    <Button
      variant="outline"
      size="lg"
      type="button"
      onClick={() => window.open(href, "_blank")}
    >
      <Printer className="h-4 w-4" strokeWidth={2} />
      {label}
    </Button>
  );
}

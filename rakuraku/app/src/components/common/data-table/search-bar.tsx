"use client";

import { Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { TextInput } from "@/components/forms/text-input";

type SearchBarProps = {
  initialValue: string;
  placeholder: string;
  ariaLabel?: string;
  onSearch: (term: string) => void;
};

export function SearchBar({
  initialValue,
  placeholder,
  ariaLabel,
  onSearch,
}: SearchBarProps) {
  const [term, setTerm] = useState(initialValue);

  useEffect(() => {
    setTerm(initialValue);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(term.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <div className="relative flex-1">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
          strokeWidth={2}
        />
        <TextInput
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
          aria-label={ariaLabel ?? placeholder}
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-5 py-2.5 text-[15px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
      >
        検索
      </button>
    </form>
  );
}

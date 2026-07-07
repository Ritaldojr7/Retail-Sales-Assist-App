"use client";

import React, { useState, useCallback, useImperativeHandle, forwardRef } from "react";

export interface ChipGroupProps {
  items: string[];
  isMulti?: boolean;
  onChange?: (value: string | string[]) => void;
  className?: string;
}

export interface ChipGroupRef {
  reset: () => void;
}

const ChipGroup = forwardRef<ChipGroupRef, ChipGroupProps>(
  ({ items, isMulti = false, onChange, className = "" }, ref) => {
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const handleClick = useCallback(
      (item: string) => {
        setSelected((prev) => {
          const next = new Set(prev);
          if (isMulti) {
            if (next.has(item)) {
              next.delete(item);
            } else {
              next.add(item);
            }
            onChange?.(Array.from(next));
          } else {
            next.clear();
            next.add(item);
            onChange?.(item);
          }
          return next;
        });
      },
      [isMulti, onChange]
    );

    useImperativeHandle(ref, () => ({
      reset: () => {
        setSelected(new Set());
      },
    }));

    return (
      <div className={`flex flex-wrap gap-2.5 my-2 mb-4 ${className}`} role="group">
        {items.map((item) => {
          const isSelected = selected.has(item);
          return (
            <button
              key={item}
              type="button"
              className={`px-3.5 py-2 text-sm font-semibold border rounded-xs select-none transition-120 focus-ring cursor-pointer
                ${isSelected
                  ? "bg-brand-yellow/12 border-brand-yellow text-text-primary font-bold shadow-sm"
                  : "bg-bg-secondary border-border text-text-secondary hover:border-border-hover hover:text-text-primary active:scale-[0.98]"
                }`}
              onClick={() => handleClick(item)}
              aria-pressed={isSelected}
            >
              {item}
            </button>
          );
        })}
      </div>
    );
  }
);

ChipGroup.displayName = "ChipGroup";

export default ChipGroup;

"use client";

import { useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { cleanNoteCategory, normalizeNoteCategory } from "@/features/wedding-notes/lib/note-categories";

type NoteCategoryComboboxProps = {
  id: string;
  value: string;
  categories: string[];
  placeholder: string;
  emptyLabel: string;
  createLabel: (category: string) => string;
  onValueChange: (value: string) => void;
};

export function NoteCategoryCombobox({
  id,
  value,
  categories,
  placeholder,
  emptyLabel,
  createLabel,
  onValueChange,
}: NoteCategoryComboboxProps) {
  const [inputValue, setInputValue] = useState(value);
  const portalContainerRef = useRef<HTMLDivElement>(null);

  const cleanedInput = cleanNoteCategory(inputValue);
  const normalizedInput = normalizeNoteCategory(inputValue);
  const matchingCategory = categories.find((category) => normalizeNoteCategory(category) === normalizedInput);
  const items = useMemo(() => {
    const filteredCategories = normalizedInput
      ? categories.filter((category) => normalizeNoteCategory(category).includes(normalizedInput))
      : categories;
    return matchingCategory || !cleanedInput ? filteredCategories : [...filteredCategories, cleanedInput];
  }, [categories, cleanedInput, matchingCategory, normalizedInput]);

  return (
    <div ref={portalContainerRef}>
      <Combobox
        items={items}
        filteredItems={items}
        value={value || null}
        inputValue={inputValue}
        onInputValueChange={(nextValue) => {
          setInputValue(nextValue);
          if (!nextValue) onValueChange("");
        }}
        onValueChange={(nextValue) => {
          const selected = typeof nextValue === "string" ? nextValue : "";
          setInputValue(selected);
          onValueChange(selected);
        }}
        autoHighlight
      >
        <div className="relative">
          <ComboboxInput id={id} placeholder={placeholder} />
          <ComboboxTrigger aria-label={placeholder} />
        </div>
        <ComboboxContent container={portalContainerRef}>
          <ComboboxList>
            {items.map((category) => {
              const isCreate = category === cleanedInput && !matchingCategory;
              return (
                <ComboboxItem key={category} value={category}>
                  {isCreate ? <Plus className="size-4 text-zinc-500" /> : null}
                  {isCreate ? createLabel(category) : category}
                </ComboboxItem>
              );
            })}
          </ComboboxList>
          <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

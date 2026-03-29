"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type SelectFormOption = {
  value: string;
  label: string;
};

type SelectFormFieldProps = {
  id: string;
  name: string;
  value: string;
  options: SelectFormOption[];
  placeholder: string;
  ariaLabel?: string;
  triggerClassName?: string;
};

const EMPTY_VALUE_SENTINEL = "__empty__";

export function SelectFormField({
  id,
  name,
  value,
  options,
  placeholder,
  ariaLabel,
  triggerClassName
}: SelectFormFieldProps) {
  const [selectedValue, setSelectedValue] = useState(value);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const normalizedOptions = useMemo(
    () =>
      options.map((option) => ({
        ...option,
        selectValue: option.value === "" ? EMPTY_VALUE_SENTINEL : option.value
      })),
    [options]
  );

  const selectedSelectValue =
    selectedValue === "" ? EMPTY_VALUE_SENTINEL : selectedValue;

  return (
    <>
      <input type="hidden" name={name} value={selectedValue} />
      <Select
        value={selectedSelectValue}
        onValueChange={(nextValue) => {
          setSelectedValue(nextValue === EMPTY_VALUE_SENTINEL ? "" : nextValue);
        }}
      >
        <SelectTrigger
          id={id}
          aria-label={ariaLabel}
          className={triggerClassName ?? "w-full rounded-md"}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {normalizedOptions.map((option) => (
            <SelectItem
              key={name + "-" + option.selectValue}
              value={option.selectValue}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

import { useState } from "react";

import TextInputThemed from "./TextInputThemed";

/** A numeric input that keeps the typed text while reporting a parsed number. */
export default function NumberDraftInput({
  label,
  value,
  onChange,
  maxLength = 3,
  stack,
  compact = false,
  error,
  editable = true,
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  maxLength?: number;
  stack?: { index: number; size: number };
  compact?: boolean;
  error?: string;
  /** A read-only input shows `value` as given, in muted text. */
  editable?: boolean;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  return (
    <TextInputThemed
      label={label}
      value={editable ? text : value === null ? "" : String(value)}
      editable={editable}
      textInputClassName={editable ? undefined : "text-muted"}
      keyboardType="number-pad"
      numeric
      maxLength={maxLength}
      stack={stack}
      error={error}
      placeholder="0"
      selectTextOnFocus
      cardVariants={compact ? ["square", "small", "transparent"] : ["square"]}
      onChangeText={(next) => {
        setText(next);
        const parsed = next.trim() ? Number(next) : NaN;
        onChange(Number.isFinite(parsed) ? parsed : null);
      }}
      onBlur={() => {
        const parsed = text.trim() ? Number(text) : NaN;
        setText(Number.isFinite(parsed) ? String(parsed) : "");
      }}
    />
  );
}

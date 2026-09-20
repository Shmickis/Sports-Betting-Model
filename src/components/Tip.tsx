"use client";

export function Tip({ text }: { text: string }) {
  return (
    <span className="tip" title={text} aria-label={text}>
      ?
    </span>
  );
}

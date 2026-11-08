// Web: the browser moves the page itself, so there is nothing to add (see KeyboardSpacer.native.tsx).
export function KeyboardSpacer(_: { already?: number }) {
  return null;
}
export function KeyboardRoot({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

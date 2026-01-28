function hashString(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0; // 32-bit
  }
  return Math.abs(h);
}

export function userColorStyle(key: string) {
  const k = String(key || "").trim() || "user";
  const h = hashString(k) % 360;
  const bg = `hsl(${h} 70% 92%)`;
  const border = `hsl(${h} 60% 70%)`;
  const fg = `hsl(${h} 50% 25%)`;
  return {
    backgroundColor: bg,
    borderColor: border,
    color: fg,
  } as const;
}


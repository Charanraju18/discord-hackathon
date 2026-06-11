export function getServerInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 4);
}

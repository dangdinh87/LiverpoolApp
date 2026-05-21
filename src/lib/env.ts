export function getEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function hasEnv(name: string): boolean {
  return !!getEnv(name);
}

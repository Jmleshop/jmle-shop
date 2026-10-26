/** Resolves extensionless relative and `@/` alias imports so Node can run the TypeScript tests. */
const SRC = new URL("../src/", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    specifier = new URL(specifier.slice(2), SRC).href;
  }
  const local =
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier.startsWith("file:");
  if (local && !/\.[a-zA-Z0-9]+$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      try {
        return await nextResolve(`${specifier}.tsx`, context);
      } catch {
        return nextResolve(`${specifier}/index.ts`, context);
      }
    }
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    // Pakete ohne "exports" (z. B. next/cache) brauchen unter ESM die Endung .js
    if (!local && specifier.includes("/") && !/\.[a-zA-Z0-9]+$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context);
    }
    throw err;
  }
}

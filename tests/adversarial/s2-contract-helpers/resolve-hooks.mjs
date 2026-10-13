/** Node module-customisation hook: maps the bundler alias used by content-entry.js to a test stub. */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'beforepay-components') {
    return { url: new URL('./components-stub.mjs', import.meta.url).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

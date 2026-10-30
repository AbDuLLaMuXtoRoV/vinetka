const base = import("@snapbell/config/eslint/base.js");

module.exports = base.then((m) => [
  ...m.default,
  // Nest resolves constructor injection from emitted decorator metadata, so injected
  // classes must stay value imports; "fixing" them to `import type` breaks DI.
  { rules: { "@typescript-eslint/consistent-type-imports": "off" } },
]);

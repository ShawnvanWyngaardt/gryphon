// Vite and Vitest load `file?raw` imports as plain strings. Tests use
// this to read fixture files without Node's `fs`, which src/core may
// not use (ADR 0002).
declare module '*?raw' {
  const content: string;
  export default content;
}

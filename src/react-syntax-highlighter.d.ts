declare module 'react-syntax-highlighter/dist/esm/light' {
  import type { ComponentType } from 'react';
  const Light: ComponentType<Record<string, unknown>>;
  export default Light;
}

declare module 'react-syntax-highlighter/dist/esm/styles/hljs' {
  export const atomOneDark: Record<string, import('react').CSSProperties>;
}

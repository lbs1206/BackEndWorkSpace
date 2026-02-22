import type * as React from "react";

declare global {
  interface ErdEditorElement extends HTMLElement {
    value: string;
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "erd-editor": React.DetailedHTMLProps<
        React.HTMLAttributes<ErdEditorElement>,
        ErdEditorElement
      >;
    }
  }
}

export {};

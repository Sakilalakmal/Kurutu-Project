export type TemplatePreview =
  | {
      id: "flowchart-starter";
      viewBox: string;
      kind: "flowchart";
    }
  | {
      id: "wireframe-starter";
      viewBox: string;
      kind: "wireframe";
    };

export const getTemplatePreview = (templateId: string): TemplatePreview => {
  if (templateId === "wireframe-starter") {
    return {
      id: "wireframe-starter",
      viewBox: "0 0 320 176",
      kind: "wireframe",
    };
  }

  return {
    id: "flowchart-starter",
    viewBox: "0 0 320 176",
    kind: "flowchart",
  };
};

export type TemplatePreview =
  | {
      id: "flowchart-starter";
      viewBox: string;
      kind: "flowchart";
    }
  | {
      id: "data-model-starter";
      viewBox: string;
      kind: "data-model";
    }
  | {
      id: "wireframe-starter";
      viewBox: string;
      kind: "wireframe";
    };

export const getTemplatePreview = (templateId: string): TemplatePreview => {
  if (templateId === "data-model-starter") {
    return {
      id: "data-model-starter",
      viewBox: "0 0 320 176",
      kind: "data-model",
    };
  }

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

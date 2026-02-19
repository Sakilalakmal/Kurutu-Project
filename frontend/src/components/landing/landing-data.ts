export type LandingCapability = {
  title: string;
  description: string;
  highlights: string[];
};

export type LandingWorkflowStep = {
  title: string;
  description: string;
};

export type LandingTemplate = {
  name: string;
  description: string;
  points: string[];
};

export type LandingOutputFeature = {
  title: string;
  description: string;
};

export const capabilityPillars: LandingCapability[] = [
  {
    title: "Shape Toolkit for Product Thinking",
    description:
      "Map ideas quickly with rectangle, ellipse, and sticky nodes that are easy to place, edit, and iterate.",
    highlights: ["Rectangle and ellipse nodes", "Sticky notes for quick context", "Clean drag-and-drop canvas"],
  },
  {
    title: "Connect Logic with Arrowed Flow",
    description:
      "Build meaningful diagrams with connectors, arrowheads, and edge styles so every path is easy to follow.",
    highlights: ["Arrowhead connectors", "Smoothstep and straight styles", "Visual flow that stays readable"],
  },
  {
    title: "Control Every Layer of the Board",
    description:
      "Stay organized while refining details with layers, grid visibility, snap controls, and history shortcuts.",
    highlights: ["Layer visibility and lock controls", "Grid and snap toggles", "Undo and redo across edits"],
  },
];

export const workflowSteps: LandingWorkflowStep[] = [
  {
    title: "Draft structure",
    description: "Start from a blank board or a template and place the first building blocks in seconds.",
  },
  {
    title: "Connect logic",
    description: "Draw links between nodes to describe sequence, branching, and relationships.",
  },
  {
    title: "Organize pages and layers",
    description: "Separate concerns by page and layer so complex diagrams remain easy to navigate.",
  },
  {
    title: "Share and export",
    description: "Publish a viewer link for teammates and export your current page as PNG or SVG.",
  },
];

export const templateHighlights: LandingTemplate[] = [
  {
    name: "Flowchart Starter",
    description: "A structured starter with process, decision, and data steps to speed up planning flows.",
    points: ["Start and end nodes ready", "Decision and branching setup", "Easy to customize labels and pathing"],
  },
  {
    name: "Wireframe Starter",
    description: "A practical layout starter for product screens with common interface blocks pre-placed.",
    points: ["Navigation and sidebar blocks", "Card, input, button, and modal shapes", "Useful base for product UI mapping"],
  },
];

export const outputFeatures: LandingOutputFeature[] = [
  {
    title: "Public Share Links",
    description: "Turn a diagram page public and send a viewer link for review without extra setup.",
  },
  {
    title: "PNG and SVG Export",
    description: "Export the active page in the format that fits your design, docs, or presentation workflow.",
  },
  {
    title: "Save Confidence",
    description: "Use autosave for continuity and manual save controls when you want explicit checkpoints.",
  },
];

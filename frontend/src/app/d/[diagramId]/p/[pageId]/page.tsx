import { ViewerShell } from "@/components/editor/viewer-shell";

const resolveParams = async (
  paramsInput:
    | Promise<{ diagramId: string; pageId: string }>
    | { diagramId: string; pageId: string }
) => {
  const params = await paramsInput;

  return {
    diagramId: params.diagramId,
    pageId: params.pageId,
  };
};

export default async function DiagramViewerPage({
  params,
}: {
  params:
    | Promise<{ diagramId: string; pageId: string }>
    | { diagramId: string; pageId: string };
}) {
  const { diagramId, pageId } = await resolveParams(params);

  return <ViewerShell diagramId={diagramId} pageId={pageId} />;
}

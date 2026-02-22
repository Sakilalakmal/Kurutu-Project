import { NextResponse } from "next/server";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "@/app/lib/prisma";
import {
  DIAGRAM_FILTER_ACTION_TYPES,
  INVITE_FILTER_ACTION_TYPES,
  MEMBER_FILTER_ACTION_TYPES,
  activityQuerySchema,
} from "@/lib/activity/types";
import {
  isWorkspaceAuthzError,
  requireWorkspaceMember,
} from "@/lib/workspace/authz";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsedQuery = activityQuerySchema.safeParse({
    workspaceId: url.searchParams.get("workspaceId") ?? undefined,
    diagramId: url.searchParams.get("diagramId") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    filter: url.searchParams.get("filter") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    actionType: url.searchParams.get("actionType") ?? undefined,
    entityType: url.searchParams.get("entityType") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }

  const {
    workspaceId,
    diagramId,
    cursor,
    filter,
    search,
    actionType,
    entityType,
  } = parsedQuery.data;

  try {
    await requireWorkspaceMember(workspaceId);

    const andClauses: Prisma.WorkspaceActivityWhereInput[] = [];

    if (diagramId) {
      andClauses.push({
        diagramId,
      });
    }

    if (filter === "diagram") {
      andClauses.push({
        actionType: {
          in: DIAGRAM_FILTER_ACTION_TYPES,
        },
      });
    } else if (filter === "members") {
      andClauses.push({
        actionType: {
          in: MEMBER_FILTER_ACTION_TYPES,
        },
      });
    } else if (filter === "invites") {
      andClauses.push({
        actionType: {
          in: INVITE_FILTER_ACTION_TYPES,
        },
      });
    }

    if (actionType) {
      andClauses.push({
        actionType,
      });
    }

    if (entityType) {
      andClauses.push({
        entityType,
      });
    }

    if (search) {
      andClauses.push({
        OR: [
          {
            summary: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            actorUser: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            actorUser: {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        ],
      });
    }

    const where: Prisma.WorkspaceActivityWhereInput = {
      workspaceId,
      ...(andClauses.length > 0 ? { AND: andClauses } : {}),
    };

    const records = await prisma.workspaceActivity.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      ...(cursor
        ? {
            cursor: {
              id: cursor,
            },
            skip: 1,
          }
        : {}),
      include: {
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    const hasMore = records.length > PAGE_SIZE;
    const page = hasMore ? records.slice(0, PAGE_SIZE) : records;

    return NextResponse.json({
      activities: page.map((record) => ({
        id: record.id,
        workspaceId: record.workspaceId,
        diagramId: record.diagramId,
        actorUserId: record.actorUserId,
        actionType: record.actionType,
        entityType: record.entityType,
        entityId: record.entityId,
        summary: record.summary,
        metadata: record.metadata,
        createdAt: record.createdAt.toISOString(),
        actor: {
          id: record.actorUser.id,
          name: record.actorUser.name,
          email: record.actorUser.email,
          image: record.actorUser.image,
        },
      })),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    });
  } catch (error) {
    if (isWorkspaceAuthzError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to load activity logs." }, { status: 500 });
  }
}

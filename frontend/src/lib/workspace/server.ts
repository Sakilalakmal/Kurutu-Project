import "server-only";
import { prisma } from "@/app/lib/prisma";
import type { WorkspaceCardData } from "@/lib/workspace/types";

export const listWorkspaceCardsForUser = async (
  userId: string
): Promise<WorkspaceCardData[]> => {
  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userId,
    },
    orderBy: {
      workspace: {
        updatedAt: "desc",
      },
    },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          description: true,
          emojiIcon: true,
          slug: true,
          updatedAt: true,
          _count: {
            select: {
              diagrams: true,
              members: true,
            },
          },
          members: {
            take: 4,
            orderBy: {
              joinedAt: "asc",
            },
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          activities: {
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
            select: {
              summary: true,
              createdAt: true,
              actorUser: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return memberships.map((membership) => {
    const latestActivity = membership.workspace.activities[0] ?? null;

    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      description: membership.workspace.description,
      emojiIcon: membership.workspace.emojiIcon,
      slug: membership.workspace.slug,
      updatedAt: membership.workspace.updatedAt.toISOString(),
      role: membership.role,
      diagramCount: membership.workspace._count.diagrams,
      memberCount: membership.workspace._count.members,
      membersPreview: membership.workspace.members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        image: member.user.image,
      })),
      lastActivity: latestActivity
        ? {
            summary: latestActivity.summary,
            actorName: latestActivity.actorUser.name,
            createdAt: latestActivity.createdAt.toISOString(),
          }
        : null,
    };
  });
};

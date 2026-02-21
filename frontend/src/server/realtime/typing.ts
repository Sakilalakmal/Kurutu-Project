type TypingUserEntry = {
  socketIds: Set<string>;
};

export class TypingManager {
  private readonly typingByThread = new Map<string, Map<string, TypingUserEntry>>();

  private readonly threadsBySocket = new Map<string, Set<string>>();

  startTyping(threadId: string, userId: string, socketId: string) {
    const usersByThread = this.typingByThread.get(threadId) ?? new Map<string, TypingUserEntry>();
    const userEntry = usersByThread.get(userId) ?? { socketIds: new Set<string>() };
    const alreadyTyping = userEntry.socketIds.size > 0;

    userEntry.socketIds.add(socketId);
    usersByThread.set(userId, userEntry);
    this.typingByThread.set(threadId, usersByThread);

    const socketThreads = this.threadsBySocket.get(socketId) ?? new Set<string>();
    socketThreads.add(threadId);
    this.threadsBySocket.set(socketId, socketThreads);

    return !alreadyTyping;
  }

  stopTyping(threadId: string, userId: string, socketId: string) {
    const usersByThread = this.typingByThread.get(threadId);

    if (!usersByThread) {
      return false;
    }

    const userEntry = usersByThread.get(userId);

    if (!userEntry) {
      return false;
    }

    userEntry.socketIds.delete(socketId);

    const socketThreads = this.threadsBySocket.get(socketId);
    socketThreads?.delete(threadId);

    if (socketThreads && socketThreads.size === 0) {
      this.threadsBySocket.delete(socketId);
    }

    if (userEntry.socketIds.size > 0) {
      return false;
    }

    usersByThread.delete(userId);

    if (usersByThread.size === 0) {
      this.typingByThread.delete(threadId);
    }

    return true;
  }

  stopAllForSocket(socketId: string) {
    const stopped: Array<{ threadId: string; userId: string }> = [];
    const socketThreads = this.threadsBySocket.get(socketId);

    if (!socketThreads) {
      return stopped;
    }

    for (const threadId of socketThreads) {
      const usersByThread = this.typingByThread.get(threadId);

      if (!usersByThread) {
        continue;
      }

      for (const [userId, entry] of usersByThread.entries()) {
        if (!entry.socketIds.has(socketId)) {
          continue;
        }

        entry.socketIds.delete(socketId);

        if (entry.socketIds.size === 0) {
          usersByThread.delete(userId);
          stopped.push({ threadId, userId });
        }
      }

      if (usersByThread.size === 0) {
        this.typingByThread.delete(threadId);
      }
    }

    this.threadsBySocket.delete(socketId);

    return stopped;
  }
}

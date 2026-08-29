export type ClientSessionRecoveryResult = "ready" | "reloaded" | "missing";

type SessionListSnapshot = {
  current?: string;
  ids: readonly string[];
};

type ClientSessionsPort = {
  list: {
    getSnapshot(): SessionListSnapshot;
    subscribe(listener: () => void): () => void;
  };
  binding(sessionId: string): {
    session: { getSnapshot(): { removed?: boolean } };
  } | undefined;
};

type ClientSessionRecoveryOptions = {
  sessionId: string;
  timeoutMs?: number;
  reload(): void;
};

/**
 * Reconcile DSH's resident client Session after a Host runtime removes and
 * republishes the same durable id. rc.7 through 0.1.1-rc.2 keep the old
 * Session instance and its sticky `removed` bit; a fresh page rebuilds the
 * client object layer from the still-authoritative Host Session.
 */
export function recoverRestoredClientSession(
  sessions: ClientSessionsPort,
  options: ClientSessionRecoveryOptions,
): Promise<ClientSessionRecoveryResult> {
  const timeoutMs = options.timeoutMs ?? 2_000;
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe = (): void => {};
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (result: ClientSessionRecoveryResult): void => {
      if (settled) return;
      settled = true;
      unsubscribe();
      if (timer !== undefined) clearTimeout(timer);
      resolve(result);
    };
    const inspect = (): void => {
      const snapshot = sessions.list.getSnapshot();
      if (snapshot.current !== options.sessionId && !snapshot.ids.includes(options.sessionId)) return;
      const binding = sessions.binding(options.sessionId);
      if (binding === undefined) return;
      if (binding.session.getSnapshot().removed === true) {
        options.reload();
        finish("reloaded");
        return;
      }
      finish("ready");
    };

    unsubscribe = sessions.list.subscribe(inspect);
    timer = setTimeout(() => finish("missing"), timeoutMs);
    inspect();
  });
}

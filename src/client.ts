type Playability = "ready" | "degraded" | "blocked";
type CompatibilityRow = { capability: string; disposition: "完整生效" | "等价替代" | "仅保留" | "已禁用" | "已丢失"; evidence: string };
type RichBlock = import("./rich-message.js").RichBlock;
type RichFrameContentMetrics = import("./rich-message.js").RichFrameContentMetrics;
type RichFrameLayoutSnapshot = import("./rich-message.js").RichFrameLayoutSnapshot;
type RichFrameScrollableMetrics = import("./rich-message.js").RichFrameScrollableMetrics;
type RichFrameVisibilityNode = import("./rich-message.js").RichFrameVisibilityNode;
type SillyTavernCompatibilityContext = import("./rich-message.js").SillyTavernCompatibilityContext;
declare function splitRichMessage(text: string): RichBlock[];
declare function alignProjectedRoles(flowRoles: readonly ("user" | "assistant")[], projectedRoles: readonly ("user" | "assistant")[]): Array<number | null> | null;
declare function adaptRealCardFrontendHtml(value: string): string;
declare function adaptTavernHelperScriptSource(value: string): string;
declare function measureRichFrameContentHeight(metrics: RichFrameContentMetrics): number;
declare function measureRichFrameScrollableContentBottom(bodyHeight: number, scrollables: readonly RichFrameScrollableMetrics[]): number;
declare function isRichFrameNodeHiddenByClosedDetails(node: RichFrameVisibilityNode, boundary?: RichFrameVisibilityNode | null): boolean;
declare function isRichFrameViewportCoupled(first: RichFrameLayoutSnapshot, second: RichFrameLayoutSnapshot): boolean;
declare function findRichFrameViewportScrollKeys(first: RichFrameLayoutSnapshot, second: RichFrameLayoutSnapshot): string[];
declare function areRichFrameScrollKeysStable(keys: readonly string[], first: RichFrameLayoutSnapshot, second: RichFrameLayoutSnapshot): boolean;
declare function resolveRichFrameProbeHeight(first: RichFrameLayoutSnapshot, second: RichFrameLayoutSnapshot): number;
declare function resolveRichFrameLayoutHeight(snapshot: RichFrameLayoutSnapshot, viewportCoupled: boolean, releasedScrollKeys?: readonly string[]): number;
declare function clampRichFrameHeight(value: number): number;
declare function buildSillyTavernCompatibilityContext(messageCount: number, currentMessageId: number): SillyTavernCompatibilityContext;
declare function recoverRestoredClientSession(sessions: any, options: { sessionId: string; timeoutMs?: number; reload(): void }): Promise<"ready" | "reloaded" | "missing">;

type ModuleLoader = {
  load(definition: { id: string; factory: (requireModule: (id: string) => any) => Record<string, unknown> }): void;
};

const clientWindow = window as unknown as { __ModuleLoader__: ModuleLoader };

clientWindow.__ModuleLoader__.load({
  id: "@riemannre3/dsh-roleplay",
  factory: (requireModule) => {
    const module: { exports: Record<string, unknown> } = { exports: {} };
    const React = requireModule("react");
    const ReactDOM = requireModule("react-dom");
    const h = React.createElement;
    const {
      IconChevronDownOutline14,
      IconChevronLeftOutline14,
      IconChevronRightOutline14,
      IconAgentPresetOutline16,
      IconChecklistOutline14,
      IconCheckOutline14,
      IconCloseOutline16,
      IconCopyOutline16,
      IconDataOutline16,
      IconEllipsisOutline16,
      IconFolderOpenOutline16,
      IconListPenOutline16,
      IconNewChatOutline16,
      IconPlusOutline16,
      IconProjectAddOutline16,
      IconSearchOutline16,
      IconSkillOutline16,
      IconUserOutline16,
      MarkdownText,
    } = requireModule("@deepseek-ai/dsh-client-ui-primitives");

    type Screen = "library" | "setup";
    type CapabilityId = "worldbook" | "preset" | "regex" | "frontend" | "card" | "persona";
    type WorldbookEntryDetail = {
      id: string; comment: string; content: string; enabled: boolean; sourceEnabled?: boolean; constant: boolean;
      keys: string[]; secondaryKeys: string[]; selective: boolean; selectiveLogic: number;
      order: number; position: string; depth: number; role: string; outletName: string;
      scanDepth: number; scanDepthExplicit: boolean; useRegex: boolean; caseSensitive: boolean;
      matchWholeWords: boolean; probability: number; group: string; groupOverride: boolean;
      groupWeight: number; sticky: number; cooldown: number; delay: number;
      preventRecursion: boolean; excludeRecursion: boolean; delayUntilRecursion: boolean;
    };
    type TavernCardDetail = {
      revisionId: string; sourceName: string; sourceFormat: string; importedAt: string;
      title: string; creator: string; creatorNotes: string; tags: string[]; characterVersion: string;
      description: string; personality: string; scenario: string; systemPrompt: string;
      postHistoryInstructions: string; messageExample: string;
      openings: Array<{ id: string; label: string; message: string }>;
      worldbook: WorldbookEntryDetail[];
      runtime: { sessionCount: number; scriptCount: number; regexCount: number; hasFrontend: boolean; variableFormatCount: number };
      variableDefinition: { initializationFormats: string[]; updateFormats: string[]; worldbookInitvarEntryIds: string[]; openingInitvarIds: string[] };
      messageRegexScripts: Array<{ id: string; name?: string; pattern: string; flags: string; replacement: string; placements: number[]; minDepth: number | null; maxDepth: number | null; runOnEdit: boolean; promptOnly?: boolean }>;
      tavernHelperScripts: Array<{ id: string; name: string; source: string }>;
      frontendDefinition: null | { suiteId: string; caseId: string; cardId: string; runtimeClass: string; container: string; requiredCapabilities: string[]; frontendEntry?: string };
      compatibilityRows: CompatibilityRow[]; unknownFields: string[]; originalUrl: string;
      playability: Playability; statusText: string; statusDetail: string;
    };
    type PersonaAvatarId = "default" | "traveler" | "northern-ranger" | "jianghu-wanderer";
    type PersonaRecord = { id: string; displayName: string; content: string; avatar: PersonaAvatarId; createdAt: string; updatedAt: string };
    type PersonaBindingRecord = { scope: "global" | "card" | "session"; targetId: string; personaId: string; updatedAt: string };
    type PersonaLibraryState = {
      ok: true;
      personas: PersonaRecord[];
      context: { revisionId: string; sessionId: string };
      bindings: { global: PersonaBindingRecord | null; card: PersonaBindingRecord | null; session: PersonaBindingRecord | null };
      effective: null | { personaId: string; scope: "global" | "card" | "session"; targetId: string };
      createdPersonaId?: string | null;
    };
    type CapabilitySnapshot = {
      card: TavernCardDetail;
      session: null | { id: string; revisionId: string; openingId: string; userName: string; provider: string; model: string; createdAt: string; preset: { id?: string; name?: string }; splitMvu: null | { status: string; provider: string; model: string; updatedAt: string; error?: string }; supportsExtraModel: boolean; mvuSettings: { updateMethod: "随 AI 输出" | "额外模型解析"; automaticRequest: boolean; extraModel: { source: "与插头相同" | "自定义"; provider: string; model: string; maxTokens: number } } };
      context: null | { assemblyId: string; capturedAt: string | null; provider: string; model: string; requestDigest: string | null; ejsDiagnostics: Array<{ source: string; id: string; code: string; message: string }>; assembly: null | { summary: any; preset: { id: string; name: string }; stats: any; blocks: any[]; placements: any[]; activation: any[]; messages: any[]; actualRequest?: { system: string; messages: Array<{ role: string; content: string }>; toolCount: number } } };
      regex: { scripts: TavernCardDetail["messageRegexScripts"]; matches: Array<{ seq: number; role: string; before: string; after: string }> };
      frontend: {
        definition: TavernCardDetail["frontendDefinition"];
        companionScripts: TavernCardDetail["tavernHelperScripts"];
        state: Record<string, unknown> | null; stateDigest: string | null; updatedAt: string | null;
        events: any[]; receiptCount: number; capabilities: string[];
        variables: null | { selectedOpeningId: string; state: Record<string, unknown>; digest: string; updatedAt: string; initializationStatus: string; events: any[] };
        compatibilityCatalog: Array<{ surface: string; method: string; dshAction: string; effect: string }>;
        compatibilityCalls: Array<{ sequence: number; surface: string; method: string; dshAction: string; effect: string; capturedAt: string; operationId: string }>;
      };
      persona: { displayName: string; content: string | null; avatar: PersonaAvatarId | null; lorebook: null; bindingScope: "global" | "card" | "session" | null; backendAvailable: true; libraryCount: number };
    };
    type TavernPromptDraft = {
      identifier: string; name: string; role: "system" | "user" | "assistant"; content: string; marker?: string;
      systemPrompt: boolean; injectionPosition: "relative" | "in-chat"; injectionDepth: number; injectionOrder: number; extra: Record<string, unknown>;
    };
    type TavernPresetDraft = {
      id: string; name: string; source: "builtin" | "created" | "imported"; revision: number; createdAt: string; updatedAt: string;
      worldInfoFormat: string;
      settings: { contextTokens: number | null; maxReplyTokens: number | null; stream: boolean; temperature: number; topP: number; frequencyPenalty: number; presencePenalty: number; maxContextUnlocked: boolean };
      prompts: TavernPromptDraft[]; promptOrder: Array<{ identifier: string; enabled: boolean }>; extra: Record<string, unknown>;
    };
    type TavernPresetState = {
      ok: true; activePresetId: string; sessionId: string | null; sessionPresetId: string | null; presets: TavernPresetDraft[];
      runtimeSupport: Record<string, string>; importedPresetId?: string; createdPresetId?: string; savedPresetId?: string;
    };
    type RuntimeDiagnostic = { sessionId: string; token: string; message: string; capturedAt: string };
    type TavernSession = {
      id: string;
      title: string;
      messageCount: number;
      lastActive: string;
      openingId: string;
      sessionId?: string;
    };
    type TavernCard = {
      id: string;
      title: string;
      source: string;
      summary: string;
      coverUrl: string;
      playability: Playability;
      statusText: string;
      statusDetail: string;
      openings: Array<{ id: string; label: string; preview: string; message: string }>;
      sessions: TavernSession[];
      preset: "default" | "recommended" | "required";
      imported?: boolean;
      compatibilityRows?: CompatibilityRow[];
      sourceDigest?: string;
      revisionId?: string;
    };
    type PrototypeState = {
      sidebarMode: "workspace" | "tavern";
      screen: Screen;
      cards: TavernCard[];
      expandedCardId: string | null;
      selectedCardId: string | null;
      selectedSaveId: string | null;
      searchQuery: string;
      userName: string;
      openingId: string;
      presetId: string;
      advancedOpen: boolean;
      compatibilityOpen: boolean;
      importResult: string | null;
      importing: boolean;
      starting: boolean;
      busySaveId: string | null;
      busyCardId: string | null;
      startError: string | null;
      startedSessionId: string | null;
      startedCardId: string | null;
      startedSaveId: string | null;
      activeSessionId: string | null;
      capabilityTargetKey: string | null;
      capabilityLoading: boolean;
      capabilityError: string | null;
      capabilitySnapshot: CapabilitySnapshot | null;
      runtimeDiagnostics: RuntimeDiagnostic[];
    };

    const initialState = (): PrototypeState => ({
      sidebarMode: "tavern",
      screen: "library",
      cards: [],
      expandedCardId: null,
      selectedCardId: null,
      selectedSaveId: null,
      searchQuery: "",
      userName: "旅行者",
      openingId: "",
      presetId: "dsh-default",
      advancedOpen: false,
      compatibilityOpen: false,
      importResult: null,
      importing: false,
      starting: false,
      busySaveId: null,
      busyCardId: null,
      startError: null,
      startedSessionId: null,
      startedCardId: null,
      startedSaveId: null,
      activeSessionId: null,
      capabilityTargetKey: null,
      capabilityLoading: false,
      capabilityError: null,
      capabilitySnapshot: null,
      runtimeDiagnostics: []
    });

    let state = initialState();
    let runtimeContext: any = null;
    const listeners = new Set<() => void>();
    const publish = (next: PrototypeState): void => {
      state = next;
      for (const listener of listeners) listener();
    };
    const patchState = (changes: Partial<PrototypeState>): void => publish({ ...state, ...changes });
    const subscribe = (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };
    const getSnapshot = (): PrototypeState => state;
    const usePrototypeState = (): PrototypeState => React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const selectedCard = (snapshot: PrototypeState): TavernCard | null => snapshot.cards.find((card) => card.id === snapshot.selectedCardId) ?? null;

    function hostCard(value: any): TavernCard {
      return {
        id: `imported-${value.revisionId.slice(0, 16)}`,
        revisionId: value.revisionId,
        title: value.title,
        source: `${value.sourceFormat === "chara_card_v3" ? "角色卡 V3" : "角色卡 V2"}${value.creator ? ` · ${value.creator}` : ""}`,
        summary: value.summary || "卡片已导入；没有可展示的简介。",
        coverUrl: typeof value.sourceName === "string" && value.sourceName.toLocaleLowerCase().endsWith(".png") ? value.originalUrl : "",
        playability: value.playability,
        statusText: value.statusText,
        statusDetail: value.statusDetail,
        openings: value.openings.map((opening: any) => ({ ...opening, message: "" })),
        sessions: value.sessions.map((session: any) => ({ ...session, lastActive: "已保存" })),
        preset: "default",
        imported: true,
        compatibilityRows: value.compatibilityRows,
        sourceDigest: value.revisionId,
      };
    }

    async function loadCapabilitySnapshot(target: { sessionId?: string; revisionId?: string }): Promise<void> {
      const key = target.sessionId === undefined ? `revision:${target.revisionId ?? ""}` : `session:${target.sessionId}`;
      if (key.endsWith(":")) return;
      patchState({ capabilityTargetKey: key, capabilityLoading: true, capabilityError: null });
      try {
        const params = new URLSearchParams();
        if (target.sessionId !== undefined) params.set("sessionId", target.sessionId);
        else params.set("revision", target.revisionId ?? "");
        const response = await fetch(`/dsh-re3-rp/capability-snapshot?${params.toString()}`, { cache: "no-store" });
        const body = await response.json() as { card?: TavernCardDetail; error?: string } & Partial<CapabilitySnapshot>;
        if (!response.ok || body.card === undefined) throw new Error(typeof body.error === "string" ? body.error : "无法读取酒馆能力");
        if (state.capabilityTargetKey !== key) return;
        patchState({ capabilityLoading: false, capabilityError: null, capabilitySnapshot: body as CapabilitySnapshot });
      } catch (error) {
        if (state.capabilityTargetKey !== key) return;
        patchState({ capabilityLoading: false, capabilityError: error instanceof Error ? error.message : "无法读取酒馆能力", capabilitySnapshot: null });
      }
    }

    function syncActiveTavernSession(sessionId: string, revisionId: string): void {
      const card = state.cards.find((candidate) => candidate.revisionId === revisionId);
      if (state.activeSessionId !== sessionId || state.selectedCardId !== card?.id) {
        patchState({
          activeSessionId: sessionId,
          selectedCardId: card?.id ?? state.selectedCardId,
          expandedCardId: card?.id ?? state.expandedCardId,
          selectedSaveId: sessionId,
        });
      }
      void loadCapabilitySnapshot({ sessionId });
    }

    function clearActiveTavernSession(sessionId: string): void {
      if (state.activeSessionId !== sessionId) return;
      const card = state.cards.find((candidate) => candidate.id === state.selectedCardId);
      patchState({ activeSessionId: null });
      if (card?.revisionId !== undefined) void loadCapabilitySnapshot({ revisionId: card.revisionId });
    }

    function recordRuntimeDiagnostic(sessionId: string, token: string, message: string): void {
      const next = [...state.runtimeDiagnostics, { sessionId, token, message, capturedAt: new Date().toISOString() }].slice(-40);
      patchState({ runtimeDiagnostics: next });
    }

    async function refreshHostCards(): Promise<void> {
      const response = await fetch("/dsh-re3-rp/cards", { cache: "no-store" });
      if (!response.ok) throw new Error("无法读取已保存的酒馆卡");
      const body = await response.json() as { cards?: any[] };
      const importedCards = (body.cards ?? []).map(hostCard);
      const importedIds = new Set(importedCards.map((card) => card.id));
      const cards = [...importedCards, ...state.cards.filter((card) => !importedIds.has(card.id) && !card.imported)];
      const selected = cards.find((card) => card.id === state.selectedCardId) ?? cards[0];
      publish({ ...state, cards, selectedCardId: selected?.id ?? null, expandedCardId: state.expandedCardId ?? selected?.id ?? null });
      if (state.activeSessionId === null && selected?.revisionId !== undefined) void loadCapabilitySnapshot({ revisionId: selected.revisionId });
    }

    function openLibrary(): void {
      patchState({ sidebarMode: "tavern", screen: "library", startError: null });
    }

    async function moveCardInLibrary(card: TavernCard, direction: -1 | 1): Promise<void> {
      if (card.revisionId === undefined || state.busyCardId !== null) return;
      const currentIndex = state.cards.findIndex((candidate) => candidate.id === card.id);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= state.cards.length) return;
      const ordered = [...state.cards];
      [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex]!, ordered[currentIndex]!];
      const revisionIds = ordered.flatMap((candidate) => candidate.revisionId === undefined ? [] : [candidate.revisionId]);
      patchState({ busyCardId: card.id, startError: null });
      try {
        const response = await fetch("/dsh-re3-rp/cards", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revisionIds }),
        });
        const body = await response.json() as { error?: string };
        if (!response.ok) throw new Error(body.error ?? "无法调整酒馆卡顺序");
        publish({ ...state, cards: ordered, busyCardId: null });
      } catch (error) {
        patchState({ busyCardId: null, startError: error instanceof Error ? error.message : "无法调整酒馆卡顺序" });
      }
    }

    async function deleteCardFromLibrary(card: TavernCard): Promise<void> {
      if (card.revisionId === undefined || state.busyCardId !== null) return;
      const confirmed = window.confirm(`从卡库删除“${card.title}”？\n\n已有 DSH Session 和原件会保留；重新导入同一原件可以恢复这张卡。`);
      if (!confirmed) return;
      patchState({ busyCardId: card.id, startError: null });
      try {
        const response = await fetch("/dsh-re3-rp/cards", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revisionId: card.revisionId }),
        });
        const body = await response.json() as { error?: string; preservedSessions?: number };
        if (!response.ok) throw new Error(body.error ?? "无法从卡库删除酒馆卡");
        await refreshHostCards();
        patchState({ busyCardId: null, importResult: `已从卡库删除“${card.title}”；保留 ${body.preservedSessions ?? card.sessions.length} 个已有 Session。` });
      } catch (error) {
        patchState({ busyCardId: null, startError: error instanceof Error ? error.message : "无法从卡库删除酒馆卡" });
      }
    }

    function toggleCard(card: TavernCard): void {
      patchState({
        screen: "library",
        expandedCardId: state.expandedCardId === card.id ? null : card.id,
        selectedCardId: card.id,
        startError: null
      });
      if (card.revisionId !== undefined) void loadCapabilitySnapshot({ revisionId: card.revisionId });
    }

    function prepareNewGame(card: TavernCard): void {
      if (card.playability === "blocked") return;
      patchState({
        screen: "setup",
        selectedCardId: card.id,
        expandedCardId: card.id,
        openingId: card.openings[0]?.id ?? "",
        presetId: card.preset === "recommended" || card.preset === "required" ? "deepseek-v4f" : "dsh-default",
        advancedOpen: false,
        compatibilityOpen: false,
        startError: null
      });
    }

    function inspectCompatibility(card: TavernCard): void {
      patchState({
        screen: "setup",
        selectedCardId: card.id,
        expandedCardId: card.id,
        openingId: card.openings[0]?.id ?? "",
        compatibilityOpen: true,
        advancedOpen: false,
        startError: null,
      });
    }

    async function openSavedConversation(card: TavernCard, save: TavernSession): Promise<void> {
      if (runtimeContext === null || state.busySaveId !== null || save.sessionId === undefined) return;
      patchState({ busySaveId: save.id, startError: null, selectedCardId: card.id, expandedCardId: card.id, selectedSaveId: save.id });
      runtimeContext.sessions.open(save.sessionId);
      patchState({
        screen: "library",
        busySaveId: null,
        startedSessionId: save.sessionId,
        startedCardId: card.id,
        startedSaveId: save.id,
        selectedCardId: card.id,
        selectedSaveId: save.id,
        expandedCardId: card.id,
      });
      if (card.revisionId === undefined) void loadCapabilitySnapshot({ sessionId: save.sessionId });
      else syncActiveTavernSession(save.sessionId, card.revisionId);
    }

    async function importFiles(files: File[]): Promise<void> {
      if (files.length === 0 || state.importing) return;
      patchState({ importing: true, importResult: `正在导入并建立 ${files.length} 个原件的运行时索引…`, startError: null });
      try {
        const importedCards: TavernCard[] = [];
        const errors: string[] = [];
        for (const file of files) {
          const response = await fetch("/dsh-re3-rp/import", {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream", "X-Dsh-Re3-Rp-Filename": encodeURIComponent(file.name) },
            body: file,
          });
          const result = await response.json() as { card?: any; error?: string };
          if (response.ok && result.card !== undefined) importedCards.push(hostCard(result.card));
          else errors.push(`${file.name}：${result.error ?? "无法导入"}`);
        }
        if (importedCards.length === 0) throw new Error(errors.join("；") || "没有识别出角色卡");
        const importedIds = new Set(importedCards.map((card) => card.id));
        const cards = [...importedCards, ...state.cards.filter((card) => !importedIds.has(card.id))];
        const selected = importedCards[0];
        publish({
          ...state,
          cards,
          selectedCardId: selected?.id ?? state.selectedCardId,
          expandedCardId: selected?.id ?? state.expandedCardId,
          selectedSaveId: selected === undefined ? state.selectedSaveId : null,
          screen: "library",
          importing: false,
        importResult: `已持久化 ${importedCards.length} 张角色卡及其原件、开场、世界书和脚本索引${errors.length > 0 ? `；${errors.join("；")}` : ""}。启用脚本只在对应 Session 的隔离运行域中启动。`,
        });
        if (selected?.revisionId !== undefined) void loadCapabilitySnapshot({ revisionId: selected.revisionId });
      } catch (error) {
        patchState({ importing: false, importResult: null, startError: error instanceof Error ? error.message : "无法检查这些文件" });
      }
    }

    async function startPlay(card: TavernCard, selectedOpeningId?: string): Promise<void> {
      if (card.playability === "blocked" || state.userName.trim() === "" || runtimeContext === null || state.starting) return;
      patchState({ starting: true, startError: null });
      const opening = card.openings.find((item) => item.id === selectedOpeningId) ?? card.openings[0];
      const save: TavernSession = { id: `play-${Date.now()}`, title: opening?.label ?? "新的故事", messageCount: 0, lastActive: "刚刚", openingId: opening?.id ?? "" };
      if (card.revisionId === undefined) {
        patchState({ starting: false, startError: "这张卡还没有 Host revision，请重新导入原件" });
        return;
      }
      try {
        const response = await fetch("/dsh-re3-rp/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revisionId: card.revisionId, openingId: opening?.id, userName: state.userName }),
        });
        const result = await response.json() as { sessionId?: string; error?: string };
        if (!response.ok || result.sessionId === undefined) throw new Error(result.error ?? "无法创建卡片会话");
        save.sessionId = result.sessionId;
        save.id = result.sessionId;
        save.messageCount = 1;
        const cards = state.cards.map((item) => item.id === card.id ? { ...item, sessions: [save, ...item.sessions] } : item);
        publish({ ...state, cards, screen: "library", expandedCardId: card.id, selectedCardId: card.id, selectedSaveId: save.id, starting: false, startedSessionId: result.sessionId, startedCardId: card.id, startedSaveId: save.id });
        syncActiveTavernSession(result.sessionId, card.revisionId);
        runtimeContext.sessions.open(result.sessionId);
      } catch (error) {
        patchState({ starting: false, startError: error instanceof Error ? error.message : "无法创建卡片会话" });
      }
    }

    function StatusLine({ card }: { card: TavernCard }): any {
      return h("span", { className: `tavern-status-line is-${card.playability}` }, h("i", { "aria-hidden": "true" }), h("strong", null, card.statusText));
    }

    function SessionRow({ card, save }: { card: TavernCard; save: TavernSession }): any {
      const snapshot = usePrototypeState();
      const selected = snapshot.selectedSaveId === save.id && snapshot.expandedCardId === card.id;
      const busy = snapshot.busySaveId === save.id;
      return h("button", { type: "button", className: `tavern-session-row${selected ? " is-selected" : ""}`, "data-tavern-save-id": save.id, disabled: snapshot.busySaveId !== null, onClick: () => void openSavedConversation(card, save) },
        h("span", { className: "tavern-session-icon" }, h(IconNewChatOutline16, { size: 15 })),
        h("span", { className: "tavern-session-copy" }, h("strong", null, busy ? "正在打开…" : save.title), h("small", null, `${save.messageCount} 条消息 · ${save.lastActive}`)),
        h(IconEllipsisOutline16, { className: "tavern-row-more", size: 15 }));
    }

    function CardBranch({ card }: { card: TavernCard }): any {
      const snapshot = usePrototypeState();
      const [menuOpen, setMenuOpen] = React.useState(false);
      const menuRef = React.useRef(null as HTMLDivElement | null);
      const expanded = snapshot.expandedCardId === card.id;
      const cardIndex = snapshot.cards.findIndex((candidate) => candidate.id === card.id);
      const busy = snapshot.busyCardId === card.id;
      React.useEffect(() => {
        if (!menuOpen) return;
        const close = (event: PointerEvent): void => { if (menuRef.current?.contains(event.target as Node) !== true) setMenuOpen(false); };
        const escape = (event: KeyboardEvent): void => { if (event.key === "Escape") setMenuOpen(false); };
        document.addEventListener("pointerdown", close);
        document.addEventListener("keydown", escape);
        return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
      }, [menuOpen]);
      return h("section", { className: `tavern-card-branch${expanded ? " is-expanded" : ""}`, "data-card-id": card.id, "aria-busy": busy },
        h("button", { type: "button", className: "tavern-card-row", title: "右键管理卡片", "aria-expanded": expanded, onClick: () => { setMenuOpen(false); toggleCard(card); }, onContextMenu: (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); setMenuOpen(true); } },
          card.coverUrl === "" ? h("span", { className: "tavern-card-thumb tavern-card-placeholder", "aria-label": "这张 JSON 卡没有随卡封面" }, card.title.slice(0, 1)) : h("img", { className: "tavern-card-thumb", src: card.coverUrl, alt: "" }),
          h("span", { className: "tavern-card-row-copy" },
            h("strong", null, card.title), h("small", null, card.source),
            h("span", { className: "tavern-card-meta" }, h(StatusLine, { card }), h("small", null, `${card.sessions.length} 个会话`))),
          expanded ? h(IconChevronDownOutline14, { className: "tavern-chevron", size: 14 }) : h(IconChevronRightOutline14, { className: "tavern-chevron", size: 14 })),
        menuOpen ? h("div", { ref: menuRef, className: "tavern-card-context-menu", role: "menu", "aria-label": `${card.title} 卡片操作` },
          h("button", { type: "button", role: "menuitem", disabled: busy || cardIndex <= 0, onClick: () => { setMenuOpen(false); void moveCardInLibrary(card, -1); } }, "上移"),
          h("button", { type: "button", role: "menuitem", disabled: busy || cardIndex < 0 || cardIndex >= snapshot.cards.length - 1, onClick: () => { setMenuOpen(false); void moveCardInLibrary(card, 1); } }, "下移"),
          h("span", { role: "separator" }),
          h("button", { type: "button", role: "menuitem", className: "is-danger", disabled: busy || card.revisionId === undefined, onClick: () => { setMenuOpen(false); void deleteCardFromLibrary(card); } }, "从卡库删除")) : null,
        expanded ? h("div", { className: "tavern-session-tree" },
          h("button", { type: "button", className: "tavern-report-row", onClick: (event: Event) => { event.stopPropagation(); inspectCompatibility(card); } }, h(IconSearchOutline16, { size: 15 }), h("span", null, "查看兼容报告")),
          h("button", { type: "button", className: "tavern-new-game-row", disabled: card.playability === "blocked" || snapshot.starting, onClick: (event: Event) => { event.stopPropagation(); prepareNewGame(card); } }, h(IconPlusOutline16, { size: 16 }), h("span", null, card.playability === "blocked" ? "暂不能新建游戏" : snapshot.starting ? "正在准备…" : "新游戏")),
          ...card.sessions.map((save) => h(SessionRow, { card, save, key: save.id }))) : null);
    }

    function LibraryScreen(): any {
      const snapshot = usePrototypeState();
      const inputRef = React.useRef(null);
      const query = snapshot.searchQuery.trim().toLocaleLowerCase("zh-CN");
      const cards = query === "" ? snapshot.cards : snapshot.cards.filter((card) => card.title.toLocaleLowerCase("zh-CN").includes(query));
      return h("div", { className: "tavern-panel-screen", "data-tavern-screen": "library" },
        h("div", { className: "tavern-toolbar" },
          h("label", { className: "tavern-search" }, h(IconSearchOutline16, { size: 16 }), h("input", { value: snapshot.searchQuery, placeholder: "搜索酒馆卡", onChange: (event: { target: { value: string } }) => patchState({ searchQuery: event.target.value }) })),
          h("input", { ref: inputRef, className: "tavern-file-input", type: "file", multiple: true, accept: ".png,.json,image/png,application/json", onChange: (event: { target: { files: FileList | null; value: string } }) => { const files = Array.from(event.target.files ?? []); if (files.length > 0) void importFiles(files); event.target.value = ""; } }),
          h("button", { type: "button", className: "tavern-import-button", disabled: snapshot.importing, onClick: () => inputRef.current?.click() }, h(IconProjectAddOutline16, { size: 16 }), h("span", null, snapshot.importing ? "检查中…" : "导入"))),
        h("div", { className: "tavern-library-label" }, h("strong", null, "酒馆卡"), h("small", null, `${snapshot.cards.length} 张`)),
        snapshot.importResult ? h("div", { className: "tavern-inline-notice", role: "status" }, snapshot.importResult, h("small", null, "原件与运行时索引保存在当前隔离 DSH_HOME；不会执行卡内脚本")) : null,
        snapshot.startError ? h("div", { className: "tavern-start-error", role: "alert" }, snapshot.startError) : null,
        h("div", { className: "tavern-card-list" }, cards.length > 0 ? cards.map((card) => h(CardBranch, { card, key: card.id })) : h("p", { className: "tavern-empty" }, "没有找到酒馆卡")));
    }

    function SetupScreen(): any {
      const snapshot = usePrototypeState();
      const card = selectedCard(snapshot);
      if (card === null) return h(LibraryScreen);
      const blocked = card.playability === "blocked";
      const selectedOpening = card.openings.find((opening) => opening.id === snapshot.openingId) ?? card.openings[0];
      return h("div", { className: "tavern-panel-screen tavern-setup-screen", "data-tavern-screen": "setup" },
        h("button", { type: "button", className: "tavern-back-button", onClick: openLibrary }, h(IconChevronLeftOutline14, { size: 14 }), h("span", null, card.title)),
        h("div", { className: "tavern-card-summary" }, card.coverUrl === "" ? h("span", { className: "tavern-card-thumb tavern-card-placeholder", "aria-label": "这张 JSON 卡没有随卡封面" }, card.title.slice(0, 1)) : h("img", { className: "tavern-card-thumb", src: card.coverUrl, alt: "" }), h("div", null, h("h2", null, snapshot.compatibilityOpen ? "兼容报告" : "新游戏"), h("p", null, card.summary))),
        h("div", { className: `tavern-compatibility is-${card.playability}` }, h(StatusLine, { card }), h("p", null, card.statusDetail), h("button", { type: "button", onClick: () => patchState({ compatibilityOpen: !snapshot.compatibilityOpen }) }, snapshot.compatibilityOpen ? "收起兼容明细" : "查看兼容明细"), snapshot.compatibilityOpen ? h("div", { className: "tavern-technical-note" }, card.compatibilityRows === undefined ? "导入真实 PNG/JSON 后，这里会逐项显示静态兼容证据。" : h("ul", null, ...card.compatibilityRows.map((row, index) => h("li", { key: `${row.capability}-${index}` }, h("strong", null, `${row.capability} · ${row.disposition}`), h("span", null, row.evidence))), card.sourceDigest === undefined ? null : h("p", null, `原件 SHA-256：${card.sourceDigest}`))) : null),
        snapshot.startError ? h("div", { className: "tavern-start-error", role: "alert" }, snapshot.startError) : null,
        blocked ? h("div", { className: "tavern-panel-footer is-blocked" }, h("p", null, "解决必需依赖后才能创建会话")) : h("div", { className: "tavern-form-section" },
          h("label", null, h("span", null, "玩家称呼"), h("input", { value: snapshot.userName, maxLength: 80, onChange: (event: { target: { value: string } }) => patchState({ userName: event.target.value }) })),
          h("fieldset", null, h("legend", null, "选择开场"), ...card.openings.map((opening) => h("label", { className: `tavern-opening${opening.id === selectedOpening?.id ? " is-selected" : ""}`, key: opening.id },
            h("input", { type: "radio", name: `opening-${card.id}`, checked: opening.id === selectedOpening?.id, onChange: () => patchState({ openingId: opening.id }) }),
            h("span", null, h("strong", null, opening.label), h("small", null, opening.preview))))),
          selectedOpening === undefined ? null : h("div", { className: "tavern-opening-preview" }, h("span", null, "将从这里开始"), h("p", null, selectedOpening.preview)),
          h("div", { className: "tavern-panel-footer" }, h("p", null, "创建独立 Session；进入第一轮后开场锁定。"), h("button", { type: "button", className: "tavern-start-button", disabled: snapshot.starting || snapshot.userName.trim() === "" || selectedOpening === undefined, onClick: () => void startPlay(card, snapshot.openingId) }, snapshot.starting ? "正在创建…" : "开始游戏"))));
    }

    type OpeningState = {
      sessionId: string;
      openingId: string;
      currentIndex: number;
      currentMessage: string;
      locked: boolean;
      openings: Array<{ id: string; index: number; label: string; preview: string }>;
    };

    type SurfaceAuditEntry = {
      seq: number;
      time: number | null;
      kind: "assembly" | "worldbook" | "opening" | "context" | "user" | "assistant" | "tool";
      label: string;
      operation: "append" | "replace";
      active: boolean;
      replaces: number[];
      replacedBy: number[];
      sourceEventSeqs: number[];
      trajectoryRowKey: string;
      sectionNames: string[];
      characterCount: number;
      assembly?: AssemblySummary;
    };
    type AssemblySummary = {
      assemblyId: string;
      presetName: string;
      activeEntries: number;
      filteredEntries: number;
      depthInjections: number;
      messageCount: number;
      characterCount: number;
      addedEntryIds: string[];
      removedEntryIds: string[];
      previousAssemblyId: string | null;
      stage?: "prepared" | "request";
    };
    type AssemblyDetail = {
      summary: AssemblySummary;
      preset: { id: string; name: string };
      stats: AssemblySummary;
      blocks: Array<{ id: string; label: string; enabled: boolean; role: string; characterCount: number; entryIds: string[]; messageIndexes: number[]; preview: string }>;
      placements: Array<{ id: string; label: string; order: number; position: string; depth: number; role: string; outletName: string }>;
      activation: Array<{ id: string; label: string; activated: boolean; pass: number; reason: string; matchedPrimaryKeys: string[]; matchedSecondaryKeys: string[]; recursiveParents: string[]; position: string; depth: number; role: string; order: number }>;
      messages: Array<{ role: string; content: string; source: { kind: string; blockId?: string; entryIds?: string[]; position?: string; depth?: number } }>;
      actualRequest?: { system: string; messages: Array<{ role: string; content: string }>; toolCount: number };
    };
    type SurfaceEventDetail = SurfaceAuditEntry & { content: string; sections: Array<{ name: string; text: string }> };
    type SurfaceEventResponse = { event: SurfaceEventDetail; assembly: AssemblyDetail | null; runtime?: { provider: string; model: string } | null };
    type SurfaceAudit = { sessionId: string; currentSurface: number[]; operations: SurfaceAuditEntry[] };

    function trajectoryRowKey(row: Element): string | undefined {
      const key = row.getAttribute("data-trajectory-row-key");
      if (key === null) return undefined;
      try { return decodeURIComponent(key); } catch { return undefined; }
    }

    function trajectoryRow(operation: Pick<SurfaceAuditEntry, "trajectoryRowKey">): HTMLTableRowElement | null {
      for (const row of Array.from(document.querySelectorAll("tr[data-trajectory-row-key]"))) if (trajectoryRowKey(row) === operation.trajectoryRowKey) return row as HTMLTableRowElement;
      return null;
    }

    function TavernTrajectorySurfaceAdapter(props: any): any {
      const sessionId = props.sessionId as string;
      const [audit, setAudit] = React.useState(null as SurfaceAudit | null);
      const sessionRevision = props.useSession((snapshot: any) => `${snapshot.nodes.length}:${snapshot.running}:${snapshot.openState}`);

      React.useEffect(() => {
        const controller = new AbortController();
        void fetch(`/dsh-re3-rp/surface-audit?sessionId=${encodeURIComponent(sessionId)}&optional=1`, { cache: "no-store", signal: controller.signal })
          .then(async (response) => response.status === 204 ? null : response.ok ? await response.json() as SurfaceAudit : null)
          .then((value) => { if (!controller.signal.aborted) setAudit(value); })
          .catch(() => { if (!controller.signal.aborted) setAudit(null); });
        return () => controller.abort();
      }, [sessionId, sessionRevision]);

      React.useEffect(() => {
        if (audit === null) return;
        const assemblies: SurfaceAuditEntry[] = audit.operations.filter((operation: SurfaceAuditEntry) => operation.kind === "assembly");
        let disposed = false;

        const hideAssemblyRows = (): void => {
          if (disposed) return;
          for (const operation of assemblies) {
            const row = trajectoryRow(operation);
            if (row === null) continue;
            row.dataset.tavernAssemblyRow = "true";
            row.hidden = true;
          }
        };

        const observer = new MutationObserver(hideAssemblyRows);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-selected", "data-trajectory-row-key"] });
        hideAssemblyRows();
        return () => {
          disposed = true;
          observer.disconnect();
          document.querySelectorAll<HTMLTableRowElement>("tr[data-tavern-assembly-row]").forEach((row) => {
            row.hidden = false;
            row.removeAttribute("data-tavern-assembly-row");
          });
        };
      }, [audit, sessionId]);

      return null;
    }

    type TavernContextRow = {
      id: string;
      role: string;
      content: string;
      sourceKind: string;
      sourceLabel: string;
      sourceDetail: string;
      entryIds: string[];
      changed: boolean;
      depth?: number;
    };

    function estimateTokens(content: string): number {
      return Math.max(1, Math.ceil(Array.from(content).length / 2));
    }

    function compactNumber(value: number): string {
      return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value.toLocaleString();
    }

    function blockSourceLabel(blockId: string | undefined, kind: string, depth: number | undefined): { label: string; detail: string } {
      if (kind === "chat") return { label: "聊天历史", detail: "原始对话消息" };
      if (kind === "example") return { label: "示例对话", detail: "Example Messages" };
      if (kind === "worldbook" && depth !== undefined) return { label: "世界书 · 深度插入", detail: `@ Depth ${depth}` };
      const labels: Record<string, [string, string]> = {
        "main-prompt": ["主提示词", "Main Prompt"],
        "world-info-before": ["世界书 · 角色定义前", "Before Char Defs"],
        "persona-description": ["玩家设定", "Persona Description"],
        "character-description": ["角色描述", "Character Description"],
        "character-personality": ["角色性格", "Character Personality"],
        scenario: ["场景", "Scenario"],
        "world-info-after": ["世界书 · 角色定义后", "After Char Defs"],
        "example-messages": ["示例对话", "Example Messages"],
        "authors-note": ["作者注释", "Author's Note"],
        "chat-history": ["聊天历史", "Chat History"],
        "post-history-instructions": ["历史后指令", "Post-History Instructions"],
      };
      const match = blockId === undefined ? undefined : labels[blockId];
      return match === undefined ? { label: kind === "worldbook" ? "世界书" : "预设模块", detail: blockId ?? kind } : { label: match[0], detail: match[1] };
    }

    function TavernContextView(props: any): any {
      const sessionId = props.sessionId as string;
      const [audit, setAudit] = React.useState(null as SurfaceAudit | null);
      const [selectedSeq, setSelectedSeq] = React.useState(null as number | null);
      const [detail, setDetail] = React.useState(null as SurfaceEventResponse | null);
      const [selectedRowId, setSelectedRowId] = React.useState(null as string | null);
      const [inspectorTab, setInspectorTab] = React.useState("content" as "content" | "evidence");
      const [query, setQuery] = React.useState("");
      const [onlyChanges, setOnlyChanges] = React.useState(false);
      const [copiedId, setCopiedId] = React.useState(null as string | null);
      const [loading, setLoading] = React.useState(true);
      const sessionRevision = props.useSession((snapshot: any) => `${snapshot.nodes.length}:${snapshot.running}:${snapshot.openState}`);

      React.useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        void fetch(`/dsh-re3-rp/surface-audit?sessionId=${encodeURIComponent(sessionId)}&optional=1`, { cache: "no-store", signal: controller.signal })
          .then(async (response) => response.status === 204 ? null : response.ok ? await response.json() as SurfaceAudit : null)
          .then((value) => {
            if (controller.signal.aborted) return;
            setAudit(value);
            const requests = value?.operations.filter((operation) => operation.kind === "assembly" && operation.assembly?.stage === "request") ?? [];
            const fallback = requests.at(-1) ?? value?.operations.filter((operation) => operation.kind === "assembly").at(-1);
            setSelectedSeq((current: number | null) => current !== null && requests.some((operation) => operation.seq === current) ? current : fallback?.seq ?? null);
            if (fallback === undefined) setLoading(false);
          })
          .catch(() => { if (!controller.signal.aborted) { setAudit(null); setLoading(false); } });
        return () => controller.abort();
      }, [sessionId, sessionRevision]);

      React.useEffect(() => {
        if (selectedSeq === null) { setDetail(null); setLoading(false); return; }
        const controller = new AbortController();
        setLoading(true);
        void fetch(`/dsh-re3-rp/surface-event?sessionId=${encodeURIComponent(sessionId)}&seq=${selectedSeq}`, { cache: "no-store", signal: controller.signal })
          .then(async (response) => response.ok ? await response.json() as SurfaceEventResponse : null)
          .then((value) => { if (!controller.signal.aborted) { setDetail(value); setSelectedRowId(null); setInspectorTab("content"); setLoading(false); } })
          .catch(() => { if (!controller.signal.aborted) { setDetail(null); setLoading(false); } });
        return () => controller.abort();
      }, [sessionId, selectedSeq]);

      const requests: SurfaceAuditEntry[] = audit?.operations.filter((operation: SurfaceAuditEntry) => operation.kind === "assembly" && operation.assembly?.stage === "request") ?? [];
      const selectedIndex = Math.max(0, requests.findIndex((operation) => operation.seq === selectedSeq));
      const assembly: AssemblyDetail | null = detail?.assembly ?? null;
      const addedIds = new Set(assembly?.summary.addedEntryIds ?? []);
      const rows: TavernContextRow[] = (assembly?.messages ?? []).map((message: AssemblyDetail["messages"][number], index: number) => {
        const entryIds = message.source.entryIds ?? [];
        const entryIdSet = new Set(entryIds);
        const entryLabels = assembly?.activation.filter((item) => entryIdSet.has(item.id)).map((item) => item.label) ?? [];
        const basePresentation = blockSourceLabel(message.source.blockId, message.source.kind, message.source.depth);
        const presentation = message.source.kind !== "worldbook" ? basePresentation : {
          label: entryLabels.length === 1 ? `世界书 · ${entryLabels[0]}` : `世界书 · ${entryLabels.length} 条激活`,
          detail: [basePresentation.detail, ...entryLabels.slice(0, 3)].join(" · ") + (entryLabels.length > 3 ? ` 等 ${entryLabels.length} 条` : ""),
        };
        return {
          id: `${index}:${message.source.blockId ?? message.source.kind}:${message.source.depth ?? ""}`,
          role: message.role,
          content: message.content,
          sourceKind: message.source.kind,
          sourceLabel: presentation.label,
          sourceDetail: presentation.detail,
          entryIds,
          changed: entryIds.some((id: string) => addedIds.has(id)),
          depth: message.source.depth,
        };
      });
      const normalizedQuery = query.trim().toLocaleLowerCase();
      const visibleRows = rows.filter((row) => (!onlyChanges || row.changed) && (normalizedQuery.length === 0 || `${row.sourceLabel}\n${row.sourceDetail}\n${row.role}\n${row.content}`.toLocaleLowerCase().includes(normalizedQuery)));
      const activeOperation = requests[selectedIndex];
      const selectedRow = rows.find((row) => row.id === selectedRowId) ?? null;

      const selectRequest = (index: number): void => {
        const operation = requests[index];
        if (operation !== undefined) setSelectedSeq(operation.seq);
      };
      const copyRow = async (row: TavernContextRow): Promise<void> => {
        try {
          await navigator.clipboard.writeText(row.content);
          setCopiedId(row.id);
          window.setTimeout(() => setCopiedId((current: string | null) => current === row.id ? null : current), 1200);
        } catch {
          setCopiedId(null);
        }
      };
      const activationFor = (row: TavernContextRow): AssemblyDetail["activation"] => {
        const ids = new Set(row.entryIds);
        return (assembly?.activation ?? []).filter((item: AssemblyDetail["activation"][number]) => ids.has(item.id));
      };
      const reasonLabel = (reason: string): string => ({ constant: "固定激活", keyword: "关键词命中", regex: "正则命中", "primary-match": "关键词命中", "secondary-match": "次关键词命中", recursive: "递归激活", "recursive-keyword": "递归命中", "probability-miss": "概率未通过", disabled: "已禁用" }[reason] ?? reason);

      if (loading && assembly === null) return h("section", { className: "tavern-context-view is-loading", "data-tavern-context-view": "true" }, h("div", { className: "tavern-context-empty" }, "正在读取酒馆装配…"));
      if (assembly === null) return h("section", { className: "tavern-context-view", "data-tavern-context-view": "true" }, h("div", { className: "tavern-context-empty" }, "发送第一句话后，这里会显示本轮酒馆上下文的装配顺序。"));

      return h("section", { className: "tavern-context-view", "data-tavern-context-view": "true", "aria-label": "酒馆上下文装配" },
        h("header", { className: "tavern-context-toolbar" },
          h("div", { className: "tavern-context-request-nav" },
            h("button", { type: "button", title: "上一次请求", "aria-label": "上一次请求", disabled: selectedIndex <= 0, onClick: () => selectRequest(selectedIndex - 1) }, h(IconChevronLeftOutline14, { size: 14 })),
            h("div", { className: "tavern-context-request-title" },
              h("strong", null, requests.length === 0 ? "已准备" : `请求 ${selectedIndex + 1} / ${requests.length}`),
              h("span", null, activeOperation?.time === null || activeOperation?.time === undefined ? "酒馆语义装配" : new Date(activeOperation.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))),
            h("button", { type: "button", title: "下一次请求", "aria-label": "下一次请求", disabled: selectedIndex >= requests.length - 1, onClick: () => selectRequest(selectedIndex + 1) }, h(IconChevronRightOutline14, { size: 14 }))),
          h("div", { className: "tavern-context-toolbar-meta" },
            h("span", { className: "tavern-context-model", title: detail?.runtime?.provider ?? "" }, detail?.runtime?.model ?? "当前模型")),
          h("label", { className: "tavern-context-search" }, h(IconSearchOutline16, { size: 16 }), h("input", { value: query, onChange: (event: any) => setQuery(event.target.value), placeholder: "搜索本轮上下文", "aria-label": "搜索本轮上下文" })),
          h("label", { className: "tavern-context-change-filter" }, h("input", { type: "checkbox", checked: onlyChanges, onChange: (event: any) => setOnlyChanges(event.target.checked) }), h("span", { className: "tavern-context-check" }, onlyChanges ? h(IconCheckOutline14, { size: 12 }) : null), h("span", null, "只看本轮变化"))),
        h("div", { className: `tavern-context-workbench${selectedRow === null ? "" : " has-inspector"}` },
          h("div", { className: "tavern-context-table", role: "table", "aria-label": "本轮酒馆语义消息栈" },
            h("div", { className: "tavern-context-table-head", role: "row" },
              h("span", { role: "columnheader" }, "顺序"), h("span", { role: "columnheader" }, "角色"), h("span", { role: "columnheader" }, "来源 / 类型"), h("span", { role: "columnheader" }, "Tokens"), h("span", { role: "columnheader" }, "预览"), h("span", { role: "columnheader" }, "操作")),
            ...(visibleRows.length === 0 ? [h("div", { className: "tavern-context-no-results", key: "empty" }, onlyChanges ? "这一轮没有变化的世界书条目。" : "没有找到匹配的上下文。")] : visibleRows.map((row) => {
              const index = rows.indexOf(row);
              const selected = selectedRowId === row.id;
              return h("article", { className: `tavern-context-row${selected ? " is-selected" : ""}${row.sourceKind === "worldbook" ? " is-worldbook" : ""}${row.changed ? " is-changed" : ""}`, role: "row", key: row.id },
                h("button", { type: "button", className: "tavern-context-row-main", "aria-selected": selected, onClick: () => { setSelectedRowId(row.id); setInspectorTab("content"); } },
                  h("span", { className: "tavern-context-order", role: "cell" }, String(index + 1).padStart(2, "0")),
                  h("span", { className: `tavern-context-role is-${row.role}`, role: "cell" }, row.role.toUpperCase()),
                  h("span", { className: "tavern-context-source", role: "cell" }, h("strong", null, row.sourceLabel), h("small", null, row.sourceDetail)),
                  h("span", { className: "tavern-context-tokens", role: "cell" }, `≈ ${compactNumber(estimateTokens(row.content))}`),
                  h("span", { className: "tavern-context-preview", role: "cell" }, row.content.replace(/\s+/gu, " ").trim()),
                  h("span", { className: "tavern-context-expand", role: "cell", "aria-hidden": "true" }, h(IconChevronRightOutline14, { size: 14 }))),
                h("button", { type: "button", className: "tavern-context-row-copy", onClick: () => void copyRow(row), title: "复制这一条", "aria-label": `复制第 ${index + 1} 条上下文` }, copiedId === row.id ? h(IconCheckOutline14, { size: 14 }) : h(IconCopyOutline16, { size: 15 })));
            }))),
          selectedRow === null ? null : h("aside", { className: "tavern-context-inspector", "aria-label": `${selectedRow.sourceLabel}详情` },
            h("header", { className: "tavern-context-inspector-header" },
              h("div", null, h("span", { className: `tavern-context-role is-${selectedRow.role}` }, selectedRow.role.toUpperCase()), h("strong", null, selectedRow.sourceLabel), h("small", null, selectedRow.sourceDetail)),
              h("button", { type: "button", onClick: () => setSelectedRowId(null), title: "关闭详情", "aria-label": "关闭详情" }, h(IconCloseOutline16, { size: 14 }))),
            h("div", { className: "tavern-context-inspector-tabs", role: "tablist", "aria-label": "提示词详情" },
              h("button", { type: "button", role: "tab", "aria-selected": inspectorTab === "content", onClick: () => setInspectorTab("content") }, "正文"),
              h("button", { type: "button", role: "tab", "aria-selected": inspectorTab === "evidence", onClick: () => setInspectorTab("evidence") }, "激活依据")),
            inspectorTab === "content" ? h("div", { className: "tavern-context-inspector-content", role: "tabpanel" },
              h("button", { type: "button", className: "tavern-context-inspector-copy", onClick: () => void copyRow(selectedRow) }, copiedId === selectedRow.id ? h(IconCheckOutline14, { size: 14 }) : h(IconCopyOutline16, { size: 15 }), copiedId === selectedRow.id ? "已复制" : "复制"),
              h("pre", null, selectedRow.content)) : h("div", { className: "tavern-context-inspector-evidence", role: "tabpanel" }, (() => {
                const activations = activationFor(selectedRow);
                return activations.length === 0 ? h("p", null, selectedRow.sourceKind === "chat" ? "这是一条原始对话消息，按聊天历史顺序进入。" : `这部分由当前预设固定放入消息栈：${selectedRow.sourceDetail}。`) :
                  h("div", { className: "tavern-context-activation-cards" }, ...activations.map((item) => h("article", { key: item.id },
                    h("div", null, h("strong", null, item.label), h("span", null, reasonLabel(item.reason))),
                    h("p", null, [item.position === "at_depth" ? `Depth ${item.depth}` : item.position.replaceAll("_", " "), `Order ${item.order}`, ...item.matchedPrimaryKeys.map((key) => `命中“${key}”`), ...item.recursiveParents.map((id) => `由 #${id} 递归激活`)].join(" · ")))));
              })())))
      );
    }

    const capabilityPositionLabel = (position: string): string => ({
      before_char: "角色定义前", after_char: "角色定义后", an_top: "作者注释前", an_bottom: "作者注释后",
      at_depth: "指定深度", before_examples: "示例对话前", after_examples: "示例对话后", outlet: "命名出口",
    } as Record<string, string>)[position] ?? position;

    const capabilityEntryMode = (entry: WorldbookEntryDetail): string => entry.constant ? "常驻" : entry.useRegex ? "正则关键词" : "关键词";

    function openNativeSettings(): boolean {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>('button,a,[role="button"]'));
      const target = candidates.find((candidate) => {
        if (candidate.closest(".tavern-capability-panel") !== null) return false;
        const label = `${candidate.getAttribute("aria-label") ?? ""} ${candidate.getAttribute("title") ?? ""} ${candidate.textContent ?? ""}`.trim();
        return label === "设置" || label.startsWith("设置 ") || label.endsWith(" 设置");
      });
      target?.click();
      return target !== undefined;
    }

    function CapabilityTabs({ value, onChange, items, label }: { value: string; onChange: (value: string) => void; items: Array<{ id: string; label: string }>; label: string }): any {
      return h("div", { className: "tavern-capability-tabs", role: "tablist", "aria-label": label },
        ...items.map((item) => h("button", { type: "button", role: "tab", "aria-selected": value === item.id, onClick: () => onChange(item.id), key: item.id }, item.label)));
    }

    function CapabilityPanelHeader({ title, meta }: { title: string; meta: string }): any {
      return h("header", { className: "tavern-capability-panel-header" }, h("div", null, h("strong", null, title), h("span", null, meta)));
    }

    function WorldbookCapabilityPanel({ snapshot }: { snapshot: CapabilitySnapshot }): any {
      const [mode, setMode] = React.useState(snapshot.context === null ? "all" : "active");
      const [query, setQuery] = React.useState("");
      const [entryId, setEntryId] = React.useState(snapshot.card.worldbook[0]?.id ?? "");
      const [visibleLimit, setVisibleLimit] = React.useState(120);
      const activations = snapshot.context?.assembly?.activation ?? [];
      const activationById = new Map(activations.map((item: any) => [String(item.id), item]));
      const activeCount = activations.filter((item: any) => item.activated === true).length;
      const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
      const visible = snapshot.card.worldbook.filter((entry) => {
        if (mode === "active" && activationById.get(entry.id)?.activated !== true) return false;
        return normalizedQuery === "" || `${entry.comment} ${entry.content} ${entry.keys.join(" ")}`.toLocaleLowerCase("zh-CN").includes(normalizedQuery);
      });
      React.useEffect(() => setVisibleLimit(120), [snapshot.card.revisionId, mode, normalizedQuery]);
      const rendered = visible.slice(0, visibleLimit);
      const selected = rendered.find((entry) => entry.id === entryId) ?? rendered[0];
      const activation = selected === undefined ? undefined : activationById.get(selected.id) as any;
      return h(React.Fragment, null,
        h(CapabilityPanelHeader, { title: "世界书", meta: `${snapshot.card.title} · ${snapshot.card.worldbook.length} 条资料` }),
        h("section", { className: "tavern-worldbook-overview", "aria-label": "世界书概览" },
          h("div", null, h("strong", null, String(snapshot.card.worldbook.length)), h("span", null, "全部条目")),
          h("div", null, h("strong", null, String(activeCount)), h("span", null, "本轮命中")),
          h("div", null, h("strong", null, String(visible.length)), h("span", null, query.trim() === "" ? "当前范围" : "搜索结果"))),
        h("div", { className: "tavern-worldbook-toolbar" },
          h(CapabilityTabs, { value: mode, onChange: setMode, label: "世界书范围", items: [{ id: "active", label: "本轮命中" }, { id: "all", label: "全部条目" }] }),
          h("label", { className: "tavern-capability-search" }, h(IconSearchOutline16, { size: 16 }), h("input", { value: query, placeholder: "搜索标题、正文或关键词", onChange: (event: { target: { value: string } }) => setQuery(event.target.value) }))),
        h("div", { className: "tavern-worldbook-workbench" },
          h("section", { className: "tavern-worldbook-library", "aria-label": "世界书条目列表" },
            h("header", null, h("strong", null, mode === "active" ? "本轮资料" : "资料目录"), h("span", null, `${visible.length} 条`)),
            h("div", { className: "tavern-capability-list", role: "listbox", "aria-label": mode === "active" ? "本轮命中的世界书" : "全部世界书" },
              ...(visible.length === 0 ? [h("p", { className: "tavern-capability-empty", key: "empty" }, snapshot.card.worldbook.length === 0 ? "这张卡没有世界书条目。" : mode === "active" ? "这一轮还没有命中资料。发送一句话后再回来看看。" : "没有找到匹配的资料。")] : rendered.map((entry) => {
                const preview = entry.content.trim().replace(/\s+/gu, " ");
                return h("button", { type: "button", role: "option", "aria-selected": selected?.id === entry.id, onClick: () => setEntryId(entry.id), key: entry.id },
                  h("span", { className: "tavern-worldbook-entry-title" }, entry.comment || "未命名条目"),
                  h("p", null, preview || "（空内容）"),
                  h("footer", null,
                    h("em", { className: entry.enabled ? "is-enabled" : "is-disabled" }, entry.enabled ? capabilityEntryMode(entry) : "已停用"),
                    h("small", null, capabilityPositionLabel(entry.position))));
              }))),
            rendered.length < visible.length ? h("footer", { className: "tavern-worldbook-load-more" },
              h("span", null, `已显示 ${rendered.length} / ${visible.length}`),
              h("button", { type: "button", onClick: () => setVisibleLimit((value: number) => Math.min(value + 120, visible.length)) }, "继续加载")) : null),
          selected === undefined ? null : h("article", { className: "tavern-capability-inspector" },
            h("header", null,
              h("div", null, h("small", null, `世界书条目 · #${selected.id}`), h("h3", null, selected.comment || "未命名条目")),
              h("span", { className: selected.enabled ? "is-enabled" : "is-disabled" }, selected.enabled ? "已启用" : "已停用")),
            h("section", { className: "tavern-worldbook-content" }, h("h4", null, "正文"), h("div", { className: "tavern-capability-prose" }, selected.content.trim() || "（空内容）")),
            h("section", { className: "tavern-worldbook-keywords" },
              h("h4", null, "触发关键词"),
              h("div", null, ...(selected.keys.length > 0 ? selected.keys.map((key) => h("span", { key }, key)) : [h("span", { className: "is-muted", key: "empty" }, selected.constant ? "常驻条目，无需关键词" : "没有设置关键词")]))),
            h("section", { className: "tavern-worldbook-facts" },
              h("div", null, h("span", null, "插入位置"), h("strong", null, `${capabilityPositionLabel(selected.position)} · ${selected.role}${selected.position === "at_depth" ? ` · Depth ${selected.depth}` : ""}`)),
              h("div", null, h("span", null, "执行顺序"), h("strong", null, String(selected.order))),
              h("div", null, h("span", null, "本轮状态"), h("strong", null, activation?.activated === true ? `${activation.reason} · pass ${activation.pass}` : snapshot.context === null ? "等待真实请求" : "本轮未命中")),
              h("div", null, h("span", null, "作用范围"), h("strong", null, selected.sourceEnabled === selected.enabled || selected.sourceEnabled === undefined ? "卡片原件" : "当前 Session 覆盖"))))));
    }

    function PresetCapabilityPanel({ snapshot }: { snapshot: CapabilitySnapshot }): any {

      const sessionId = snapshot.session?.id ?? "";
      const importRef = React.useRef(null as HTMLInputElement | null);
      const [remote, setRemote] = React.useState(null as TavernPresetState | null);
      const [draft, setDraft] = React.useState(null as TavernPresetDraft | null);
      const [selectedPromptId, setSelectedPromptId] = React.useState("");
      const [promptQuery, setPromptQuery] = React.useState("");
      const [unusedPromptQuery, setUnusedPromptQuery] = React.useState("");
      const [addPromptOpen, setAddPromptOpen] = React.useState(false);
      const [draggedPromptId, setDraggedPromptId] = React.useState("");
      const [dropTarget, setDropTarget] = React.useState(null as { identifier: string; position: "before" | "after" } | null);
      const [renaming, setRenaming] = React.useState(false);
      const [renameName, setRenameName] = React.useState("");
      const [busy, setBusy] = React.useState(false);
      const [dirty, setDirty] = React.useState(false);
      const [notice, setNotice] = React.useState("");
      const [error, setError] = React.useState("");

      const adopt = (value: TavernPresetState, preferredId = ""): void => {
        const presetId = preferredId || value.sessionPresetId || value.activePresetId;
        const selected = value.presets.find((preset) => preset.id === presetId) ?? value.presets[0] ?? null;
        setRemote(value);
        setDraft(selected === null ? null : structuredClone(selected));
        const selectedOrderIds = new Set(selected?.promptOrder.map((item) => item.identifier) ?? []);
        setSelectedPromptId((current: string) => selectedOrderIds.has(current) ? current : selected?.promptOrder[0]?.identifier ?? "");
        setUnusedPromptQuery("");
        setAddPromptOpen(false);
        setDraggedPromptId("");
        setDropTarget(null);
        setRenaming(false);
        setDirty(false);
      };

      React.useEffect(() => {
        const controller = new AbortController();
        setBusy(true); setError("");
        void fetch(`/dsh-re3-rp/presets?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store", signal: controller.signal })
          .then(async (response) => {
            const value = await response.json();
            if (!response.ok || value.ok !== true) throw new Error(value.error || "无法读取预设");
            if (!controller.signal.aborted) adopt(value as TavernPresetState);
          })
          .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "无法读取预设"); })
          .finally(() => { if (!controller.signal.aborted) setBusy(false); });
        return () => controller.abort();
      }, [sessionId]);

      const post = async (payload: Record<string, unknown>): Promise<TavernPresetState> => {
        setBusy(true); setError(""); setNotice("");
        try {
          const response = await fetch("/dsh-re3-rp/presets", { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify(payload) });
          const value = await response.json();
          if (!response.ok || value.ok !== true) throw new Error(value.error || "预设操作失败");
          return value as TavernPresetState;
        } finally { setBusy(false); }
      };
      const updateDraft = (mutate: (value: TavernPresetDraft) => void): void => {
        setDraft((current: TavernPresetDraft | null) => {
          if (current === null) return current;
          const next = structuredClone(current);
          mutate(next);
          return next;
        });
        setDirty(true); setNotice("");
      };
      const selectPreset = async (presetId: string): Promise<void> => {
        try {
          const value = await post({ action: sessionId.length > 0 ? "bind" : "activate", presetId, sessionId });
          adopt(value, presetId);
          setNotice(sessionId.length > 0 ? "已切换；下一次回复使用这个预设。" : "已设为新 Session 的默认预设。");
        } catch (reason) { setError(reason instanceof Error ? reason.message : "无法切换预设"); }
      };
      const save = async (): Promise<void> => {
        if (draft === null) return;
        try {
          const value = await post({ action: "save", sessionId, preset: draft });
          adopt(value, value.savedPresetId || draft.id);
          setNotice(draft.source === "builtin" ? "已另存为可编辑副本，并绑定当前 Session。" : "预设已保存；下一次请求使用新 revision。");
        } catch (reason) { setError(reason instanceof Error ? reason.message : "无法保存预设"); }
      };
      const createPreset = async (): Promise<void> => {
        if (draft === null) return;
        try {
          const value = await post({ action: "create", sessionId, basePresetId: draft.id, name: `${draft.name} 副本` });
          adopt(value, value.createdPresetId);
          setNotice("已创建可编辑副本并绑定当前 Session。");
        } catch (reason) { setError(reason instanceof Error ? reason.message : "无法创建预设"); }
      };
      const importPreset = async (file: File): Promise<void> => {
        try {
          const parsed = JSON.parse(await file.text());
          const value = await post({ action: "import", sessionId, name: file.name, preset: parsed });
          adopt(value, value.importedPresetId);
          setNotice(`已真实导入 ${file.name}；未识别字段会原样保留到导出。`);
        } catch (reason) { setError(reason instanceof Error ? reason.message : "预设 JSON 无法导入"); }
        finally { if (importRef.current !== null) importRef.current.value = ""; }
      };
      const deletePreset = async (): Promise<void> => {
        if (draft === null || draft.source === "builtin" || !window.confirm(`删除预设“${draft.name}”？`)) return;
        try {
          const value = await post({ action: "delete", sessionId, presetId: draft.id });
          adopt(value);
          setNotice("预设已删除。");
        } catch (reason) { setError(reason instanceof Error ? reason.message : "无法删除预设"); }
      };
      const movePrompt = (identifier: string, delta: number): void => updateDraft((value) => {
        const index = value.promptOrder.findIndex((item) => item.identifier === identifier);
        const target = Math.max(0, Math.min(value.promptOrder.length - 1, index + delta));
        if (index < 0 || target === index) return;
        const [item] = value.promptOrder.splice(index, 1);
        value.promptOrder.splice(target, 0, item!);
      });
      const reorderPrompt = (sourceIdentifier: string, targetIdentifier: string, position: "before" | "after"): void => {
        if (sourceIdentifier === targetIdentifier) return;
        updateDraft((value) => {
          const sourceIndex = value.promptOrder.findIndex((item) => item.identifier === sourceIdentifier);
          if (sourceIndex < 0) return;
          const [item] = value.promptOrder.splice(sourceIndex, 1);
          const targetIndex = value.promptOrder.findIndex((candidate) => candidate.identifier === targetIdentifier);
          if (item === undefined || targetIndex < 0) return;
          value.promptOrder.splice(targetIndex + (position === "after" ? 1 : 0), 0, item);
        });
        setSelectedPromptId(sourceIdentifier);
      };
      const addPrompt = (): void => {
        const identifier = crypto.randomUUID();
        updateDraft((value) => {
          value.prompts.push({ identifier, name: "新提示词", role: "system", content: "", systemPrompt: false, injectionPosition: "relative", injectionDepth: 4, injectionOrder: 100, extra: {} });
          value.promptOrder.push({ identifier, enabled: true });
        });
        setSelectedPromptId(identifier);
        setAddPromptOpen(false);
      };
      const insertUnusedPrompt = (identifier: string): void => {
        if (identifier.length === 0) return;
        updateDraft((value) => { if (!value.promptOrder.some((item) => item.identifier === identifier)) value.promptOrder.push({ identifier, enabled: true }); });
        setSelectedPromptId(identifier);
        setAddPromptOpen(false);
        setUnusedPromptQuery("");
      };

      if (remote === null || draft === null) return h(React.Fragment, null,
        h(CapabilityPanelHeader, { title: "对话补全预设", meta: "SillyTavern Chat Completion 兼容运行时" }),
        h("div", { className: `tavern-capability-loading${error ? " is-error" : ""}` }, error || "正在读取真实预设…"));

      const definitions = new Map<string, TavernPromptDraft>(draft.prompts.map((prompt: TavernPromptDraft) => [prompt.identifier, prompt]));
      const ordered = draft.promptOrder.map((item: { identifier: string; enabled: boolean }, index: number) => ({ item, index, prompt: definitions.get(item.identifier) })).filter((row: { prompt: TavernPromptDraft | undefined }) => row.prompt !== undefined) as Array<{ item: { identifier: string; enabled: boolean }; index: number; prompt: TavernPromptDraft }>;
      const orderedIds = new Set<string>(draft.promptOrder.map((item: { identifier: string }) => item.identifier));
      const library = draft.prompts.filter((prompt: TavernPromptDraft) => !orderedIds.has(prompt.identifier));
      const normalizedPromptQuery = promptQuery.trim().toLocaleLowerCase();
      const filteredOrdered = normalizedPromptQuery.length === 0 ? ordered : ordered.filter(({ prompt }) => `${prompt.name} ${prompt.role} ${prompt.marker ?? ""}`.toLocaleLowerCase().includes(normalizedPromptQuery));
      const normalizedUnusedPromptQuery = unusedPromptQuery.trim().toLocaleLowerCase();
      const filteredUnusedPrompts = normalizedUnusedPromptQuery.length === 0 ? library : library.filter((prompt: TavernPromptDraft) => `${prompt.name} ${prompt.role} ${prompt.marker ?? ""}`.toLocaleLowerCase().includes(normalizedUnusedPromptQuery));
      const selectedPrompt: TavernPromptDraft | null = definitions.get(selectedPromptId) ?? ordered[0]?.prompt ?? null;
      const selectedOrder = draft.promptOrder.find((item: { identifier: string; enabled: boolean }) => item.identifier === selectedPrompt?.identifier);
      const selectedOrderedIndex = ordered.findIndex(({ prompt }) => prompt.identifier === selectedPrompt?.identifier);
      const pinnedIds = new Set(["main", "worldInfoBefore", "personaDescription", "charDescription", "charPersonality", "scenario", "enhanceDefinitions", "nsfw", "worldInfoAfter", "dialogueExamples", "chatHistory", "jailbreak"]);
      const contentEditable = selectedPrompt !== null && (selectedPrompt.marker === undefined || selectedPrompt.marker === "main-prompt" || selectedPrompt.marker === "post-history-instructions");
      const slider = (key: keyof TavernPresetDraft["settings"], label: string, minimum: number, maximum: number, step: number): any => {
        const value = Number(draft.settings[key]);
        return h("label", { className: "tavern-preset-slider" },
          h("span", null, h("strong", null, label)),
          h("div", null,
            h("input", { type: "range", min: minimum, max: maximum, step, value, onChange: (event: any) => updateDraft((next) => { (next.settings as any)[key] = Number(event.target.value); }) }),
            h("input", { type: "number", min: minimum, max: maximum, step, value, onChange: (event: any) => updateDraft((next) => { (next.settings as any)[key] = Number(event.target.value); }) })));
      };

      return h(React.Fragment, null,
        h("div", { className: "tavern-preset-workbench", "data-tavern-preset-runtime": "true" },
          h("header", { className: "tavern-preset-toolbar" },
            h("div", { className: "tavern-preset-title-block" }, h("h2", null, "对话补全预设"), h("span", null, `${draft.source === "builtin" ? "官方内置" : draft.source === "imported" ? "酒馆 JSON 导入" : "DSH 创建"} · ${sessionId.length > 0 ? "当前 Session" : "新 Session 默认"}`)),
            h("div", { className: "tavern-preset-select-wrap" },
              h("select", { value: draft.id, disabled: busy || dirty, "aria-label": "当前预设", title: dirty ? "请先保存或重新选择以放弃修改" : "切换预设", onChange: (event: any) => void selectPreset(event.target.value) }, ...remote.presets.map((preset: TavernPresetDraft) => h("option", { value: preset.id, key: preset.id }, preset.name))),
              h("span", { className: `tavern-preset-revision${dirty ? " is-dirty" : ""}` }, dirty ? "有未保存修改" : `已保存 revision ${draft.revision}`)),
            h("div", { className: "tavern-preset-actions" },
              h("button", { type: "button", className: "is-primary", disabled: busy || !dirty, onClick: () => void save(), title: draft.source === "builtin" ? "另存为新预设" : "保存预设" }, h(IconCheckOutline14, { size: 14 }), draft.source === "builtin" ? "另存为" : "保存"),
              h("input", { ref: importRef, type: "file", accept: ".json,application/json", hidden: true, onChange: (event: any) => { const file = event.target.files?.[0]; if (file !== undefined) void importPreset(file); } }))),
          h("nav", { className: "tavern-preset-secondary-actions", "aria-label": "预设操作" },
            h("button", { type: "button", disabled: busy || draft.source === "builtin", onClick: () => { setRenameName(draft.name); setRenaming(true); } }, h(IconListPenOutline16, { size: 14 }), "重命名"),
            h("button", { type: "button", disabled: busy, onClick: () => void createPreset() }, h(IconCopyOutline16, { size: 14 }), "副本"),
            h("button", { type: "button", disabled: busy, onClick: () => importRef.current?.click() }, h(IconProjectAddOutline16, { size: 14 }), "导入"),
            h("a", { href: `/dsh-re3-rp/presets?download=${encodeURIComponent(draft.id)}`, title: "导出 SillyTavern 兼容 JSON" }, h(IconFolderOpenOutline16, { size: 14 }), "导出"),
            h("button", { type: "button", className: "is-danger", disabled: busy || draft.source === "builtin", onClick: () => void deletePreset() }, h(IconCloseOutline16, { size: 14 }), "删除")),
          renaming ? h("form", { className: "tavern-preset-rename", onSubmit: (event: any) => { event.preventDefault(); updateDraft((value) => { value.name = renameName.trim() || value.name; }); setRenaming(false); } },
            h("label", null, "重命名预设", h("input", { value: renameName, autoFocus: true, onChange: (event: any) => setRenameName(event.target.value) })),
            h("button", { type: "submit" }, "完成"),
            h("button", { type: "button", onClick: () => setRenaming(false) }, "取消")) : null,
          notice ? h("p", { className: "tavern-preset-notice", role: "status" }, notice) : null,
          error ? h("p", { className: "tavern-preset-error", role: "alert" }, error) : null,
          h("details", { className: "tavern-preset-advanced" },
            h("summary", null, h("strong", null, "高级设置")),
            h("div", { className: "tavern-preset-advanced-body" },
              h("div", { className: "tavern-preset-samplers" },
                slider("temperature", "温度", 0, 2, 0.01),
                slider("topP", "Top P", 0, 1, 0.01)),
              h("button", { type: "button", className: "tavern-preset-reset-sampling", onClick: () => updateDraft((value) => { value.settings.temperature = 1; value.settings.topP = 1; }) }, "恢复默认值"))),
          h("section", { className: "tavern-preset-prompts" },
            h("nav", { className: "tavern-preset-prompt-nav", "aria-label": "提示词" },
              h("header", null,
                h("div", null, h("h3", null, "提示词顺序"), h("p", null, `${ordered.filter(({ item }) => item.enabled).length} 个启用 · 共 ${ordered.length} 个`)),
                h("button", { type: "button", className: "tavern-preset-add-trigger", onClick: () => setAddPromptOpen((open: boolean) => !open), title: "添加提示词", "aria-label": "添加提示词", "aria-expanded": addPromptOpen }, h(IconPlusOutline16, { size: 14 }), "添加")),
              addPromptOpen ? h("section", { className: "tavern-preset-add-popover", "aria-label": "添加提示词" },
                h("header", null, h("div", null, h("strong", null, "添加提示词"), h("span", null, `${library.length} 条尚未加入顺序`)), h("button", { type: "button", onClick: () => setAddPromptOpen(false), title: "关闭", "aria-label": "关闭添加提示词" }, h(IconCloseOutline16, { size: 14 }))),
                h("button", { type: "button", className: "tavern-preset-create-prompt", onClick: addPrompt }, h(IconPlusOutline16, { size: 14 }), h("span", null, h("strong", null, "新建提示词"), h("small", null, "创建空白提示词并加入顺序"))),
                library.length > 0 ? h(React.Fragment, null,
                  h("label", { className: "tavern-preset-unused-search" }, h(IconSearchOutline16, { size: 13 }), h("input", { type: "search", value: unusedPromptQuery, placeholder: "搜索尚未加入的提示词", autoFocus: true, onChange: (event: any) => setUnusedPromptQuery(event.target.value) })),
                  h("div", { className: "tavern-preset-unused-list" }, ...(filteredUnusedPrompts.length === 0
                    ? [h("p", { className: "tavern-preset-list-empty", key: "empty" }, "没有匹配的提示词") as any]
                    : filteredUnusedPrompts.map((prompt: TavernPromptDraft) => h("button", { type: "button", key: prompt.identifier, onClick: () => insertUnusedPrompt(prompt.identifier) },
                      h("span", null, h("strong", null, prompt.name || "未命名提示词"), h("small", null, prompt.role)),
                      h("em", null, "加入"))))))
                  : h("p", { className: "tavern-preset-list-empty" }, "所有提示词都已加入顺序")) : null,
              h("label", { className: "tavern-preset-search" }, h(IconSearchOutline16, { size: 14 }), h("input", { type: "search", value: promptQuery, placeholder: "搜索提示词", onChange: (event: any) => setPromptQuery(event.target.value) })),
              h("div", { className: "tavern-preset-prompt-list" }, ...(filteredOrdered.length === 0 ? [h("p", { className: "tavern-preset-list-empty", key: "empty" }, "没有匹配的提示词") as any] : filteredOrdered.map(({ item, index, prompt }) => h("article", {
                className: `${selectedPrompt?.identifier === prompt.identifier ? " is-selected" : ""}${item.enabled ? "" : " is-disabled"}${draggedPromptId === prompt.identifier ? " is-dragging" : ""}${dropTarget?.identifier === prompt.identifier ? ` is-drop-${dropTarget.position}` : ""}`,
                key: prompt.identifier,
                draggable: true,
                onDragStart: (event: any) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", prompt.identifier); setDraggedPromptId(prompt.identifier); setDropTarget(null); },
                onDragEnd: () => { setDraggedPromptId(""); setDropTarget(null); },
                onDragOver: (event: any) => { if (draggedPromptId.length === 0 || draggedPromptId === prompt.identifier) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; const bounds = event.currentTarget.getBoundingClientRect(); setDropTarget({ identifier: prompt.identifier, position: event.clientY < bounds.top + bounds.height / 2 ? "before" : "after" }); },
                onDrop: (event: any) => { event.preventDefault(); const sourceIdentifier = draggedPromptId || event.dataTransfer.getData("text/plain"); const position = dropTarget?.identifier === prompt.identifier ? dropTarget.position : "before"; reorderPrompt(sourceIdentifier, prompt.identifier, position); setDraggedPromptId(""); setDropTarget(null); },
              },
                h("span", { className: "tavern-preset-order-handle", title: `拖动第 ${index + 1} 条提示词排序`, "aria-hidden": "true" }, h("span", null, String(index + 1).padStart(2, "0")), h(IconEllipsisOutline16, { size: 13 })),
                h("button", { type: "button", className: "tavern-preset-prompt-main", onClick: () => setSelectedPromptId(prompt.identifier) }, h("strong", null, prompt.name || "未命名提示词"), h("small", null, `${prompt.marker ? "动态标记" : prompt.injectionPosition === "in-chat" ? `In-chat · Depth ${prompt.injectionDepth}` : "相对顺序"} · ${prompt.role}`)),
                h("label", { className: "tavern-preset-row-toggle", title: item.enabled ? "已启用" : "已停用" }, h("input", { type: "checkbox", checked: item.enabled, onChange: (event: any) => updateDraft((value) => { const row = value.promptOrder.find((candidate) => candidate.identifier === prompt.identifier); if (row !== undefined) row.enabled = event.target.checked; }) }), h("span", null)),
                h("div", { className: "tavern-preset-move" },
                  h("button", { type: "button", disabled: index === 0, title: "上移", "aria-label": "上移", onClick: () => movePrompt(prompt.identifier, -1) }, h(IconChevronLeftOutline14, { size: 12 })),
                  h("button", { type: "button", disabled: index === ordered.length - 1, title: "下移", "aria-label": "下移", onClick: () => movePrompt(prompt.identifier, 1) }, h(IconChevronRightOutline14, { size: 12 }))))) )),
              ),
            selectedPrompt === null ? h("div", { className: "tavern-preset-prompt-empty" }, "选择一条提示词进行编辑。") : h("aside", { className: "tavern-preset-prompt-editor" },
              h("header", null,
                h("div", null, h("small", null, `提示词顺序 / ${selectedOrderedIndex + 1}`), h("strong", null, selectedPrompt.name || "未命名提示词")),
                h("div", { className: "tavern-preset-editor-actions" },
                  selectedOrder !== undefined ? h("label", { className: "tavern-preset-editor-toggle" }, h("input", { type: "checkbox", checked: selectedOrder.enabled, onChange: (event: any) => updateDraft((value) => { const row = value.promptOrder.find((candidate) => candidate.identifier === selectedPrompt.identifier); if (row !== undefined) row.enabled = event.target.checked; }) }), h("span", null), selectedOrder.enabled ? "已启用" : "已停用") : null,
                  h("button", { type: "button", disabled: selectedOrderedIndex <= 0, title: "上一条", "aria-label": "上一条", onClick: () => setSelectedPromptId(ordered[selectedOrderedIndex - 1]?.prompt.identifier ?? selectedPrompt.identifier) }, h(IconChevronLeftOutline14, { size: 14 })),
                  h("button", { type: "button", disabled: selectedOrderedIndex < 0 || selectedOrderedIndex >= ordered.length - 1, title: "下一条", "aria-label": "下一条", onClick: () => setSelectedPromptId(ordered[selectedOrderedIndex + 1]?.prompt.identifier ?? selectedPrompt.identifier) }, h(IconChevronRightOutline14, { size: 14 })))),
              h("label", null, "名称", h("input", { value: selectedPrompt.name, onChange: (event: any) => updateDraft((value) => { const prompt = value.prompts.find((candidate) => candidate.identifier === selectedPrompt.identifier); if (prompt !== undefined) prompt.name = event.target.value; }) })),
              h("div", { className: "tavern-preset-editor-grid" },
                h("label", null, "角色", h("select", { value: selectedPrompt.role, onChange: (event: any) => updateDraft((value) => { const prompt = value.prompts.find((candidate) => candidate.identifier === selectedPrompt.identifier); if (prompt !== undefined) prompt.role = event.target.value; }) }, h("option", { value: "system" }, "System"), h("option", { value: "user" }, "User"), h("option", { value: "assistant" }, "Assistant"))),
                h("label", null, "位置", h("select", { value: selectedPrompt.injectionPosition, disabled: selectedPrompt.marker !== undefined, onChange: (event: any) => updateDraft((value) => { const prompt = value.prompts.find((candidate) => candidate.identifier === selectedPrompt.identifier); if (prompt !== undefined) prompt.injectionPosition = event.target.value; }) }, h("option", { value: "relative" }, "相对顺序"), h("option", { value: "in-chat" }, "In-chat"))),
                selectedPrompt.injectionPosition === "in-chat" ? h("label", null, "Depth", h("input", { type: "number", min: 0, value: selectedPrompt.injectionDepth, onChange: (event: any) => updateDraft((value) => { const prompt = value.prompts.find((candidate) => candidate.identifier === selectedPrompt.identifier); if (prompt !== undefined) prompt.injectionDepth = Number(event.target.value); }) })) : null,
                selectedPrompt.injectionPosition === "in-chat" ? h("label", null, "Order", h("input", { type: "number", value: selectedPrompt.injectionOrder, onChange: (event: any) => updateDraft((value) => { const prompt = value.prompts.find((candidate) => candidate.identifier === selectedPrompt.identifier); if (prompt !== undefined) prompt.injectionOrder = Number(event.target.value); }) })) : null),
              contentEditable ? h("label", { className: "tavern-preset-content" }, h("span", null, "内容", h("small", null, "支持酒馆变量与模板语法")), h("textarea", { value: selectedPrompt.content, rows: 10, placeholder: "在此输入提示词内容…", onChange: (event: any) => updateDraft((value) => { const prompt = value.prompts.find((candidate) => candidate.identifier === selectedPrompt.identifier); if (prompt !== undefined) prompt.content = event.target.value; }) })) : h("div", { className: "tavern-preset-marker-note" }, h("strong", null, "正文由 Session 动态生成"), h("p", null, "这里在真实请求时替换为角色卡、世界书、Persona、示例或聊天历史；名称、角色、顺序和启用状态仍属于预设。")),
              h("details", { className: "tavern-preset-editor-more" }, h("summary", null, "更多选项"), h("div", null,
                !pinnedIds.has(selectedPrompt.identifier) && selectedOrder !== undefined ? h("button", { type: "button", className: "tavern-preset-remove-prompt", onClick: () => { updateDraft((value) => { value.promptOrder = value.promptOrder.filter((item) => item.identifier !== selectedPrompt.identifier); }); setSelectedPromptId(ordered.find((row) => row.prompt.identifier !== selectedPrompt.identifier)?.prompt.identifier ?? ""); } }, "从顺序中移除") : null,
                h("details", { className: "tavern-preset-card-overrides" }, h("summary", null, "当前角色卡覆盖项"), h("div", null, h("label", null, "System Prompt"), h("pre", null, snapshot.card.systemPrompt.trim() || "（原件未填写，使用预设 Main Prompt）"), h("label", null, "Post-history Instructions"), h("pre", null, snapshot.card.postHistoryInstructions.trim() || "（原件未填写，使用预设 Post-History Instructions）"))))),
              h("footer", { className: "tavern-preset-editor-footer" },
                h("span", { className: dirty ? "is-dirty" : "" }, dirty ? "未保存的更改" : "所有更改已保存"),
                h("button", { type: "button", disabled: busy || !dirty, onClick: () => adopt(remote, draft.id) }, "还原"),
                h("button", { type: "button", className: "is-primary", disabled: busy || !dirty, onClick: () => void save() }, "保存更改"))))));
    }

    function VariableTreeNode({ name, value, depth = 0 }: { name: string; value: unknown; depth?: number }): any {
      const composite = typeof value === "object" && value !== null;
      if (!composite) return h("div", { className: "tavern-variable-leaf" }, h("span", null, name), h("code", null, JSON.stringify(value)));
      const entries = Array.isArray(value) ? value.map((child, index) => [String(index), child] as const) : Object.entries(value as Record<string, unknown>);
      return h("details", { className: "tavern-variable-branch", open: depth < 1 }, h("summary", null, h("strong", null, name), h("span", null, Array.isArray(value) ? `${entries.length} 项` : `${entries.length} 个字段`)), h("div", null, ...entries.map(([key, child]) => h(VariableTreeNode, { name: key, value: child, depth: depth + 1, key }))));
    }


    function FrontendVariableSection({ snapshot }: { snapshot: CapabilitySnapshot }): any {
      const [tab, setTab] = React.useState("tree");
      const variables = snapshot.frontend.variables;
      const events = variables?.events ?? [];
      const lastCommitted = [...events].reverse().find((event: any) => event.phase === "reply" && event.committed === true);
      const lastDigest = lastCommitted?.stateDigestAfter;
      const diffEvents = lastDigest === undefined ? [] : events.filter((event: any) => event.phase === "reply" && event.stateDigestAfter === lastDigest);

      return h(FrontendSettingSection, { title: "变量状态", meta: variables === null ? "等待当前 Session" : `${variables.initializationStatus === "initialized" ? "已初始化" : "初始化失败"} · MVU`, open: variables !== null },
        variables === null ? h("p", { className: "tavern-capability-empty" }, snapshot.card.runtime.variableFormatCount === 0 ? "这张卡没有识别到 MVU / TavernHelper 变量格式。" : "打开这张卡的 Session 后读取变量树。") : h(React.Fragment, null,
          h("section", { className: "tavern-capability-summary" }, h("dl", null,
            h("dt", null, "作用域"), h("dd", null, "当前 Session"),
            h("dt", null, "初始化"), h("dd", null, variables.initializationStatus),
            h("dt", null, "状态摘要"), h("dd", null, variables.digest.slice(0, 12)),
            h("dt", null, "Split MVU"), h("dd", null, snapshot.session?.splitMvu?.status ?? "未启用"))),
          h(CapabilityTabs, { value: tab, onChange: setTab, label: "MVU 查看方式", items: [{ id: "tree", label: "变量树" }, { id: "diff", label: "本轮差异" }, { id: "raw", label: "原始 JSON" }] }),
          tab === "tree" ? h("div", { className: "tavern-variable-tree" }, h(VariableTreeNode, { name: "stat_data", value: variables.state })) : tab === "diff" ? h("div", { className: "tavern-variable-diff" },
            diffEvents.length === 0 ? h("p", { className: "tavern-capability-empty" }, "还没有已提交的本轮变量差异。") : h("ol", null, ...diffEvents.map((event: any, index: number) => h("li", { key: `${event.sequence}-${index}` }, h("strong", null, event.operation ?? event.type), h("span", null, event.path ?? event.diagnostic?.message ?? "状态已提交"))))) : h("pre", { className: "tavern-raw-json" }, JSON.stringify(variables.state, null, 2))));
    }

    function RegexCapabilityPanel({ snapshot }: { snapshot: CapabilitySnapshot }): any {
      const [tab, setTab] = React.useState("settings");
      const [query, setQuery] = React.useState("");
      const [ruleId, setRuleId] = React.useState(snapshot.regex.scripts[0]?.id ?? "");
      const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
      const visibleRules = snapshot.regex.scripts.map((item, index) => ({ item, index })).filter(({ item }) => normalizedQuery === "" || `${item.name ?? ""} ${item.id} ${item.pattern} ${item.replacement}`.toLocaleLowerCase("zh-CN").includes(normalizedQuery));
      const selectedEntry = visibleRules.find(({ item }) => item.id === ruleId) ?? visibleRules[0];
      const rule = selectedEntry?.item;
      const ruleTitle = (item: TavernCardDetail["messageRegexScripts"][number], index: number): string => item.name?.trim() || `正则规则 ${index + 1}`;
      const depthLabel = (item: TavernCardDetail["messageRegexScripts"][number]): string => item.minDepth === null && item.maxDepth === null ? "全部消息深度" : `${item.minDepth ?? "不限"} → ${item.maxDepth ?? "不限"}`;
      const placementLabel = (item: TavernCardDetail["messageRegexScripts"][number]): string => item.placements.includes(1) ? "user + assistant" : "assistant";
      return h(React.Fragment, null,
        h(CapabilityPanelHeader, { title: "正则", meta: `${snapshot.card.title} · ${snapshot.regex.scripts.length} 条当前卡规则` }),
        h(CapabilityTabs, { value: tab, onChange: setTab, label: "正则页面", items: [{ id: "settings", label: "规则设置" }, { id: "evidence", label: `运行证据${snapshot.regex.matches.length > 0 ? ` · ${snapshot.regex.matches.length}` : ""}` }] }),
        tab === "settings" ? h("div", { className: "tavern-regex-settings" },
          h("section", { className: "tavern-regex-overview", "aria-label": "正则概览" },
            h("div", null, h("strong", null, String(snapshot.regex.scripts.length)), h("span", null, "当前卡规则")),
            h("div", null, h("strong", null, String(snapshot.regex.matches.length)), h("span", null, "发生变换的消息")),
            h("div", null, h("strong", null, snapshot.session === null ? "卡片" : "Session"), h("span", null, "当前证据范围"))),
          h("div", { className: "tavern-regex-toolbar" },
            h("label", { className: "tavern-capability-search" }, h(IconSearchOutline16, { size: 16 }), h("input", { value: query, placeholder: "搜索规则名称、表达式或替换内容", onChange: (event: { target: { value: string } }) => setQuery(event.target.value) })),
            h("button", { type: "button", className: "tavern-regex-debug-button", onClick: () => setTab("evidence") }, h(IconChecklistOutline14, { size: 15 }), h("span", null, "调试工具"))),
          h("div", { className: "tavern-regex-scopes" },
            h("section", { className: "tavern-regex-scope is-unavailable" },
              h("header", null, h("div", null, h("strong", null, "全局正则"), h("span", null, "影响所有酒馆卡")), h("em", null, "未接入")),
              h("p", null, "全局规则属于 DSH 设置；当前插件不复制第二套全局配置。")),
            h("section", { className: "tavern-regex-scope is-unavailable" },
              h("header", null, h("div", null, h("strong", null, "预设正则"), h("span", null, "随当前生成预设装配")), h("em", null, "未导入")),
              h("p", null, "当前 Session 没有可管理的外部 Regex 预设。")),
            h("section", { className: "tavern-regex-scope is-current" },
              h("header", null, h("div", null, h("strong", null, "当前卡正则"), h("span", null, "来自卡片原件，仅改变消息显示投影")), h("em", null, `${snapshot.regex.scripts.length} 条可执行`)),
              snapshot.regex.scripts.length === 0 ? h("p", { className: "tavern-capability-empty" }, "这张卡没有可安全执行的 assistant 消息展示 Regex。") : visibleRules.length === 0 ? h("p", { className: "tavern-capability-empty" }, "没有找到匹配的规则。") : h("div", { className: "tavern-regex-rule-list" }, ...visibleRules.map(({ item, index }) => {
                const expanded = item.id === rule?.id;
                const panelId = `tavern-regex-rule-${index}`;
                return h("article", { className: expanded ? "is-expanded" : "", key: item.id },
                  h("button", { type: "button", "aria-expanded": expanded, "aria-controls": panelId, onClick: () => setRuleId(item.id) },
                    h("span", { className: "tavern-regex-order" }, String(index + 1).padStart(2, "0")),
                    h("span", { className: "tavern-regex-rule-copy" }, h("strong", null, ruleTitle(item, index)), h("small", null, `${placementLabel(item)} · ${depthLabel(item)}`)),
                    h("span", { className: "tavern-regex-enabled" }, "已启用"),
                    expanded ? h(IconChevronDownOutline14, { size: 15 }) : h(IconChevronRightOutline14, { size: 15 })),
                  expanded ? h("div", { className: "tavern-regex-rule-detail", id: panelId },
                    h("div", { className: "tavern-regex-rule-facts" },
                      h("div", null, h("span", null, "来源"), h("strong", null, "当前卡扩展")),
                      h("div", null, h("span", null, "执行顺序"), h("strong", null, `第 ${index + 1} 条`)),
                      h("div", null, h("span", null, "DSH 作用层"), h("strong", null, "屏幕显示投影")),
                      h("div", null, h("span", null, "原件声明"), h("strong", null, item.promptOnly === true ? "显示 + Prompt" : "显示")),
                      h("div", null, h("span", null, "正式消息"), h("strong", null, "Session 保持原文")),
                      h("div", null, h("span", null, "编辑时"), h("strong", null, item.runOnEdit ? "允许运行" : "不运行"))),
                    h("label", null, "查找表达式"), h("pre", null, `/${item.pattern}/${item.flags}`),
                    h("label", null, "替换内容"), h("pre", null, item.replacement || "（空字符串：隐藏匹配内容）"),
                    h("small", { className: "tavern-regex-rule-id" }, `规则 ID · ${item.id}`)) : null);
              }))),
            h("aside", { className: "tavern-regex-boundary" }, h("strong", null, "当前管理边界"), h("p", null, "卡片原件保持不可变；这里展示真实顺序和生效范围。全局、预设、新建、导入与批量改写在对应后端接入前不会伪装成可用按钮。")))) :
        h("div", { className: "tavern-regex-evidence" },
          h("section", { className: "tavern-regex-evidence-summary" },
            h("header", null, h("div", null, h("strong", null, "运行边界"), h("span", null, "同一条消息在不同层面可能不同"))),
            h("div", { className: "tavern-regex-plane-grid" },
              h("article", null, h("span", null, "卡片原件"), h("strong", null, `${snapshot.regex.scripts.length} 条规则`), h("small", null, "不可变来源")),
              h("article", null, h("span", null, "Session 持久消息"), h("strong", null, "保持原文"), h("small", null, "不写回替换结果")),
              h("article", null, h("span", null, "最终 Prompt"), h("strong", null, "当前未应用"), h("small", null, "展示 Regex 不进入请求")),
              h("article", { className: snapshot.regex.matches.length > 0 ? "is-active" : "" }, h("span", null, "屏幕显示"), h("strong", null, `${snapshot.regex.matches.length} 条变化`), h("small", null, "可重建只读投影"))),
            h("p", null, "下方是整条消息经过当前卡 Regex 流水线后的最终差异，不把它冒充成逐规则命中记录。")),
          h("section", { className: "tavern-regex-match-section" },
            h("header", null, h("div", null, h("strong", null, "本轮处理结果"), h("span", null, snapshot.session === null ? "等待 Session" : `${snapshot.regex.matches.length} 条消息发生变化`))),
            h("div", { className: "tavern-regex-matches" }, ...(snapshot.regex.matches.length === 0 ? [h("p", { className: "tavern-capability-empty", key: "empty" }, snapshot.session === null ? "打开 Session 后显示实际 Regex 结果。" : "当前可见消息没有发生 Regex 变换。")] : snapshot.regex.matches.map((match) => h("article", { key: match.seq }, h("header", null, h("strong", null, `消息 ${match.seq}`), h("span", null, `${match.role} · 流水线结果`)), h("div", null, h("section", null, h("h4", null, "Session 原文"), h("pre", null, match.before)), h("section", null, h("h4", null, "屏幕显示"), h("pre", null, match.after))))))))));
    }


    function frontendContainerLabel(container: string | undefined): string {
      if (container === "message-html") return "消息内 HTML / CSS";
      if (container === "message-iframe") return "消息内交互 iframe";
      if (container === "standalone") return "独立卡内前端";
      if (container === "required-asset") return "远程资源前端";
      return "未声明独立容器";
    }

    function frontendRuntimeLabel(runtimeClass: string | undefined): string {
      if (runtimeClass === "message_html_css") return "消息样式";
      if (runtimeClass === "message_iframe") return "消息交互";
      if (runtimeClass === "background_script_and_message_iframe") return "后台脚本与消息交互";
      if (runtimeClass === "standalone_app") return "独立前端";
      if (runtimeClass === "cross_origin_required_asset") return "远程资源前端";
      if (runtimeClass === "formal_message_mixed_projection") return "正式消息混合呈现";
      if (runtimeClass === "generated_multi_fragment_projection") return "多段消息呈现";
      return runtimeClass ?? "按实际回复内容识别";
    }

    function FrontendSettingSection({ id, title, meta, open = false, children }: { id?: string; title: string; meta?: string; open?: boolean; children: any }): any {
      return h("details", { className: "tavern-frontend-setting-section", id, open },
        h("summary", null, h("div", null, h("strong", null, title), meta === undefined ? null : h("span", null, meta))),
        h("div", { className: "tavern-frontend-setting-body" }, children));
    }

    function FrontendCapabilityPanel({ snapshot, diagnostics }: { snapshot: CapabilitySnapshot; diagnostics: RuntimeDiagnostic[] }): any {
      const permissionKey = `dsh-re3-rp:companion-permission:${snapshot.card.revisionId}`;
      const [authorized, setAuthorized] = React.useState(window.localStorage.getItem(permissionKey) === "enabled");
      const [mvuSettings, setMvuSettings] = React.useState(snapshot.session?.mvuSettings ?? null);
      const [mvuBusy, setMvuBusy] = React.useState("");
      const [mvuNotice, setMvuNotice] = React.useState(null as null | { kind: "ok" | "error"; text: string });
      const hasVariables = snapshot.frontend.variables !== null || snapshot.card.runtime.variableFormatCount > 0;
      const hasRuntime = snapshot.frontend.definition !== null || snapshot.frontend.companionScripts.length > 0 || hasVariables;
      const hasScripts = snapshot.frontend.companionScripts.length > 0;
      const container = snapshot.frontend.definition?.container;
      const hostedFrontend = container === "standalone" || container === "required-asset";
      const visibleStatus = !hasRuntime ? snapshot.session === null ? "等待 Session 检测" : "未检测到卡内前端" : hasScripts && !authorized ? "等待脚本授权" : "前端可运行";
      const uniqueErrors = diagnostics.filter((item, index, values) => values.findIndex((candidate) => candidate.message === item.message) === index);
      const compatibilityCalls = snapshot.frontend.compatibilityCalls;
      React.useEffect(() => setAuthorized(window.localStorage.getItem(permissionKey) === "enabled"), [permissionKey]);
      React.useEffect(() => setMvuSettings(snapshot.session?.mvuSettings ?? null), [snapshot.session?.mvuSettings]);
      const setPermission = (enabled: boolean): void => {
        if (enabled) window.localStorage.setItem(permissionKey, "enabled");
        else window.localStorage.removeItem(permissionKey);
        setAuthorized(enabled);
        window.dispatchEvent(new Event("dsh-re3-rp:companion-permission"));
      };


      const scripts = hasScripts
        ? snapshot.frontend.companionScripts.map((script) => h("details", { className: "tavern-frontend-script", key: script.id }, h("summary", null, h("strong", null, script.name), h("span", null, `${script.source.length.toLocaleString()} 字符`)), h("pre", null, script.source)))
        : [h("p", { className: "tavern-frontend-empty", key: "empty" }, "这张卡没有常驻 TavernHelper 脚本。")];
      const compatibilityCallRows = compatibilityCalls.slice().reverse().map((call) => h("li", { key: `${call.sequence}:${call.operationId}` },
        h("div", null, h("strong", null, `${call.surface}.${call.method}`), h("span", null, call.effect)),
        h("p", null, call.dshAction),
        h("small", null, new Date(call.capturedAt).toLocaleTimeString("zh-CN"))));
      const runMvuControl = async (action: string, settings?: any): Promise<void> => {
        if (snapshot.session === null || mvuBusy.length > 0) return;
        setMvuBusy(action);
        setMvuNotice(null);
        try {
          const response = await fetch("/dsh-re3-rp/mvu-control", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: snapshot.session.id, action, settings }),
          });
          const body = await response.json() as { error?: string };
          if (!response.ok) throw new Error(body.error ?? "MVU 操作失败");
          setMvuNotice({ kind: "ok", text: action === "updateSettings" ? "MVU 设置已保存" : "操作完成，变量状态已从 Session 重新读取" });
          await loadCapabilitySnapshot({ sessionId: snapshot.session.id });
        } catch (error) {
          setMvuNotice({ kind: "error", text: error instanceof Error ? error.message : "MVU 操作失败" });
        } finally {
          setMvuBusy("");
        }
      };
      const openTool = (target: "context" | "variables" | "diagnostics"): void => {
        if (target === "context") {
          window.dispatchEvent(new CustomEvent("dsh-re3-rp:open-capability", { detail: "context" }));
          return;
        }
        const element = document.getElementById(target === "variables" ? "tavern-frontend-variables" : "tavern-frontend-diagnostics") as HTMLDetailsElement | null;
        if (element !== null) { element.open = true; element.scrollIntoView({ behavior: "smooth", block: "start" }); }
      };
      return h(React.Fragment, null,
        h(CapabilityPanelHeader, { title: "前端", meta: `${snapshot.card.title} · 界面、交互与变量状态` }),
        h("div", { className: "tavern-frontend-settings" },
          h("section", { className: `tavern-frontend-overview ${hasScripts && !authorized ? "is-pending" : hasRuntime ? "is-ready" : "is-idle"}` },
            h("div", { className: "tavern-frontend-overview-copy" },
              h("span", null, "界面、交互与变量状态"),
              h("strong", null, visibleStatus),
              h("small", null, `Revision ${snapshot.card.revisionId.slice(0, 7)} · ${frontendRuntimeLabel(snapshot.frontend.definition?.runtimeClass)}`)),
            h("div", { className: "tavern-frontend-overview-facts" },
              h("div", null, h("strong", null, String(snapshot.frontend.companionScripts.length)), h("span", null, "卡内脚本")),
              h("div", null, h("strong", null, String(snapshot.frontend.events.length)), h("span", null, "运行事件")),
              h("div", null, h("strong", null, String(uniqueErrors.length)), h("span", null, "运行错误")))),
          h(FrontendSettingSection, { title: "当前角色卡配置", meta: frontendContainerLabel(container), open: true },
            h("dl", { className: "tavern-frontend-facts" },
              h("dt", null, "消息 HTML / CSS"), h("dd", null, container === "message-html" ? "当前卡已声明" : "随实际回复内容识别"),
              h("dt", null, "消息 iframe"), h("dd", null, container === "message-iframe" ? "当前卡已声明交互容器" : "按回复中的交互片段挂载"),
              h("dt", null, "后台脚本 iframe"), h("dd", null, hasScripts ? `${snapshot.frontend.companionScripts.length} 个脚本 · ${authorized ? "已运行" : "等待授权"}` : "当前卡未携带"),
              h("dt", null, "独立前端"), h("dd", null, hostedFrontend ? frontendContainerLabel(container) : "当前卡未声明"),
              h("dt", null, "MVU 变量状态"), h("dd", null, hasVariables ? snapshot.frontend.variables === null ? "已识别，等待 Session" : "已接入当前 Session" : "当前卡未识别"),
              h("dt", null, "显示位置"), h("dd", null, "实际游戏 UI 位于 DSH 原生对话消息内"))),
          h(FrontendSettingSection, { title: "变量更新方式", meta: mvuSettings?.updateMethod ?? "等待 Session", open: snapshot.session !== null },
            mvuSettings === null ? h("p", { className: "tavern-frontend-empty" }, "打开 Session 后可设置 MVU 更新方式。") : h(React.Fragment, null,
              h("label", { className: "tavern-mvu-field" }, h("span", null, "变量更新方式"), h("select", { value: mvuSettings.updateMethod, disabled: mvuBusy.length > 0, onChange: (event: any) => setMvuSettings({ ...mvuSettings, updateMethod: event.currentTarget.value }) },
                h("option", { value: "随 AI 输出" }, "随 AI 输出"),
                h("option", { value: "额外模型解析", disabled: snapshot.session?.supportsExtraModel !== true }, "额外模型解析"))),
              mvuSettings.updateMethod === "额外模型解析" ? h("div", { className: "tavern-mvu-advanced" },
                h("label", { className: "tavern-frontend-permission" }, h("input", { type: "checkbox", checked: mvuSettings.automaticRequest, onChange: (event: any) => setMvuSettings({ ...mvuSettings, automaticRequest: event.currentTarget.checked }) }), h("span", null, h("strong", null, "自动请求"), h("small", null, "剧情回复没有携带变量更新时，自动调用额外模型解析。"))),
                h("label", { className: "tavern-mvu-field" }, h("span", null, "模型来源"), h("select", { value: mvuSettings.extraModel.source, onChange: (event: any) => setMvuSettings({ ...mvuSettings, extraModel: { ...mvuSettings.extraModel, source: event.currentTarget.value } }) }, h("option", { value: "与插头相同" }, "与插头相同"), h("option", { value: "自定义" }, "自定义"))),
                mvuSettings.extraModel.source === "自定义" ? h("div", { className: "tavern-mvu-model-grid" },
                  h("label", { className: "tavern-mvu-field" }, h("span", null, "Provider"), h("input", { value: mvuSettings.extraModel.provider, onChange: (event: any) => setMvuSettings({ ...mvuSettings, extraModel: { ...mvuSettings.extraModel, provider: event.currentTarget.value } }) })),
                  h("label", { className: "tavern-mvu-field" }, h("span", null, "Model"), h("input", { value: mvuSettings.extraModel.model, onChange: (event: any) => setMvuSettings({ ...mvuSettings, extraModel: { ...mvuSettings.extraModel, model: event.currentTarget.value } }) }))) : null,
                h("label", { className: "tavern-mvu-field" }, h("span", null, "最大输出 Token"), h("input", { type: "number", min: 256, max: 32768, step: 256, value: mvuSettings.extraModel.maxTokens, onChange: (event: any) => setMvuSettings({ ...mvuSettings, extraModel: { ...mvuSettings.extraModel, maxTokens: Number(event.currentTarget.value) } }) })),
                h("p", { className: "tavern-frontend-note" }, "模型凭据沿用 DSH 的模型配置；这里不另存 API Key。")) : null,
              h("div", { className: "tavern-mvu-actions" }, h("button", { type: "button", disabled: mvuBusy.length > 0, onClick: () => void runMvuControl("updateSettings", mvuSettings) }, mvuBusy === "updateSettings" ? "正在保存…" : "保存设置")),
              mvuNotice === null ? null : h("p", { className: `tavern-mvu-notice is-${mvuNotice.kind}`, role: "status" }, mvuNotice.text))),
          h("div", { id: "tavern-frontend-variables" }, h(FrontendVariableSection, { snapshot })),
          h(FrontendSettingSection, { title: "修复按钮", meta: "只重建当前 Session 的变量投影" },
            h("div", { className: "tavern-mvu-actions" },
              h("button", { type: "button", disabled: snapshot.session === null || mvuBusy.length > 0, onClick: () => void runMvuControl("reprocessVariables") }, "重新处理变量"),
              h("button", { type: "button", disabled: snapshot.session === null || mvuBusy.length > 0, onClick: () => void runMvuControl("reloadInitialVariables") }, "重新读取初始变量"),
              h("button", { type: "button", disabled: snapshot.session === null || mvuSettings?.updateMethod !== "额外模型解析" || mvuBusy.length > 0, onClick: () => void runMvuControl("retryExtraModelParsing") }, "重试额外模型解析")),
            h("p", { className: "tavern-frontend-note" }, "操作会从 DSH Session 的正式消息重新计算变量；校验失败时保留原状态。")),
          h(FrontendSettingSection, { title: "工具", meta: "查看真实请求、变量和运行记录" },
            h("div", { className: "tavern-mvu-actions" },
              h("button", { type: "button", onClick: () => openTool("context") }, "提示词查看器"),
              h("button", { type: "button", onClick: () => openTool("variables") }, "变量管理器"),
              h("button", { type: "button", onClick: () => openTool("diagnostics") }, "日志查看器"))),
          h(FrontendSettingSection, { title: "安全与权限", meta: hasScripts ? authorized ? "当前版本已允许" : "需要你的确认" : "无需授权", open: hasScripts },
            h("label", { className: "tavern-frontend-permission" },
              h("input", { type: "checkbox", checked: hasScripts ? authorized : true, disabled: !hasScripts, onChange: (event: any) => setPermission(event.currentTarget.checked) }),
              h("span", null,
                h("strong", null, hasScripts ? "允许此版本运行卡内脚本" : "当前卡没有需要授权的脚本"),
                h("small", null, hasScripts ? `授权只绑定 Revision ${snapshot.card.revisionId.slice(0, 7)}；卡片更新后需要重新确认。` : "消息 HTML / CSS 仍在隔离的消息容器中呈现。"))),
            hasScripts ? h("p", { className: "tavern-frontend-note" }, "卡内脚本可以读取本 Session 的投影状态，并通过受控 Bridge 提交允许的操作。关闭后，后台脚本 iframe 会立即卸载。") : null),
          h(FrontendSettingSection, { title: "交互与提交", meta: `${snapshot.frontend.events.length} 个事件 · ${snapshot.frontend.receiptCount} 个已确认操作` },
            h("div", { className: "tavern-frontend-metrics" },
              h("div", null, h("span", null, "前端运行事件"), h("strong", null, String(snapshot.frontend.events.length))),
              h("div", null, h("span", null, "Host 已确认操作"), h("strong", null, String(snapshot.frontend.receiptCount)))),
            h("h4", null, "Bridge 能力"),
            snapshot.frontend.capabilities.length === 0
              ? h("p", { className: "tavern-frontend-empty" }, "当前卡没有声明专用 Bridge capability；脚本仍受上方版本授权边界限制。")
              : h("div", { className: "tavern-chip-list" }, ...snapshot.frontend.capabilities.map((capability) => h("span", { key: capability }, capability)))),
          h(FrontendSettingSection, { title: "酒馆助手与 MVU 调用", meta: `${compatibilityCalls.length} 次真实调用`, open: compatibilityCalls.length > 0 },
            compatibilityCalls.length === 0
              ? h("p", { className: "tavern-frontend-empty" }, snapshot.session === null ? "打开 Session 后记录卡内脚本实际调用。" : "当前 Session 尚未观察到酒馆助手或 MVU 兼容调用。")
              : h("ol", { className: "tavern-compatibility-call-list" }, ...compatibilityCallRows)),
          h(FrontendSettingSection, { id: "tavern-frontend-diagnostics", title: "运行诊断", meta: uniqueErrors.length === 0 ? "未发现错误" : `${uniqueErrors.length} 条错误`, open: uniqueErrors.length > 0 },
            uniqueErrors.length === 0
              ? h("p", { className: "tavern-frontend-empty" }, snapshot.session === null ? "打开 Session 后开始采集卡内前端运行错误。" : "本次页面生命周期尚未收到卡内前端运行错误。")
              : h("ul", { className: "tavern-runtime-errors" }, ...uniqueErrors.map((error) => h("li", { key: `${error.token}:${error.message}` }, error.message)))),
          h(FrontendSettingSection, { title: "脚本与资源", meta: `${snapshot.frontend.companionScripts.length} 个脚本` },
            h("div", { className: "tavern-frontend-script-list" }, ...scripts),
            h("div", { className: "tavern-frontend-resource" },
              h("h4", null, "前端资源"),
              h("p", null, snapshot.frontend.definition?.frontendEntry ?? (snapshot.frontend.capabilities.includes("asset.resolve") ? "通过 Host asset.resolve 解析 required 资源" : "当前卡没有声明 required 远程资源"))),
            h("details", { className: "tavern-frontend-state" },
              h("summary", null, "查看前端状态摘要"),
              h("pre", null, snapshot.frontend.state === null ? "（没有前端状态）" : JSON.stringify(snapshot.frontend.state, null, 2))))));
    }

    function CardDocument({ text, empty }: { text: string; empty: string }): any {
      return h("article", { className: "tavern-card-document" }, h(MarkdownText, { text: text.trim() || empty }));
    }

    function CardCapabilityPanel({ snapshot }: { snapshot: CapabilitySnapshot }): any {
      const prototype = usePrototypeState();
      const [tab, setTab] = React.useState("description");
      const [openingIndex, setOpeningIndex] = React.useState(0);
      const [menuOpen, setMenuOpen] = React.useState(false);
      const card = snapshot.card;
      const hostCardValue = prototype.cards.find((candidate) => candidate.revisionId === card.revisionId) ?? null;
      const coverUrl = hostCardValue?.coverUrl || (card.sourceName.toLocaleLowerCase().endsWith(".png") ? card.originalUrl : "");
      const sourceLabel = card.sourceName.toLocaleLowerCase().endsWith(".png") ? "PNG" : "JSON";
      const subtitle = card.tags.filter((tag) => tag.trim() !== "").slice(0, 2).join(" · ") || "酒馆卡 · 角色扮演";
      const canStart = hostCardValue !== null && card.playability !== "blocked";
      const navItems = [
        { id: "description", label: "角色描述" },
        { id: "openings", label: `开场白 ${card.openings.length}` },
        { id: "personality", label: "性格" },
        { id: "scenario", label: "场景" },
      ];
      const selectedOpening = card.openings[Math.min(openingIndex, Math.max(card.openings.length - 1, 0))];
      const panel = tab === "description" ? h(CardDocument, { text: card.description, empty: "（原件中未填写角色描述）" }) :
        tab === "personality" ? h(CardDocument, { text: card.personality, empty: "（原件中未单独填写性格）" }) :
          tab === "scenario" ? h(CardDocument, { text: card.scenario, empty: "（原件中未单独填写场景）" }) :
            tab === "openings" ? h("section", { className: "tavern-card-openings", "aria-label": "开场白" },
              card.openings.length === 0 ? h("p", { className: "tavern-card-empty" }, "这张卡没有可用开场白。") : h(React.Fragment, null,
                h("nav", { className: "tavern-card-opening-tabs", "aria-label": "开场白列表" }, ...card.openings.map((opening, index) => h("button", { type: "button", "aria-pressed": index === openingIndex, onClick: () => setOpeningIndex(index), key: opening.id }, `开场 ${index + 1}`))),
                h(CardDocument, { text: selectedOpening?.message ?? "", empty: "（空白开场）" }))) :
              h("section", { className: "tavern-card-advanced", "aria-label": "兼容报告与原件" },
                h("header", null, h("button", { type: "button", className: "tavern-card-back-to-description", onClick: () => setTab("description") }, h(IconChevronLeftOutline14, { size: 14 }), "返回角色描述"), h("h2", null, "兼容报告与原件")),
                h("section", { className: `tavern-card-playability is-${card.playability}` }, h("strong", null, card.statusText), h("p", null, card.statusDetail)),
                h("div", { className: "tavern-card-compatibility-rows" }, ...card.compatibilityRows.map((row, index) => h("article", { key: `${row.capability}-${index}` }, h("div", null, h("strong", null, row.capability), h("span", null, row.disposition)), h("p", null, row.evidence)))),
                h("section", { className: "tavern-card-source" }, h("h3", null, "原件来源"), h("dl", null,
                  h("dt", null, "文件"), h("dd", null, card.sourceName),
                  h("dt", null, "格式"), h("dd", null, card.sourceFormat),
                  h("dt", null, "Revision"), h("dd", null, card.revisionId),
                  h("dt", null, "导入时间"), h("dd", null, card.importedAt)),
                h("a", { className: "tavern-native-jump", href: card.originalUrl, target: "_blank", rel: "noreferrer" }, "打开原始文件")));
      return h(React.Fragment, null,
        h(CapabilityPanelHeader, { title: "卡片", meta: `${sourceLabel} · ${card.openings.length} 个开场` }),
        h("section", { className: "tavern-card-hero", "aria-label": "当前酒馆卡" },
          coverUrl === "" ? h("span", { className: "tavern-card-hero-cover is-placeholder", "aria-label": "这张 JSON 卡没有随卡封面" }, card.title.slice(0, 1)) : h("img", { className: "tavern-card-hero-cover", src: coverUrl, alt: `${card.title} 封面` }),
          h("div", { className: "tavern-card-hero-copy" },
            h("div", { className: "tavern-card-hero-title" },
              h("h1", null, card.title),
              h("div", { className: "tavern-card-more" },
                h("button", { type: "button", "aria-haspopup": "menu", "aria-expanded": menuOpen, onClick: () => setMenuOpen(!menuOpen) }, "更多…"),
                menuOpen ? h("div", { className: "tavern-card-more-menu", role: "menu" },
                  h("button", { type: "button", role: "menuitem", onClick: () => { setTab("advanced"); setMenuOpen(false); } }, "兼容报告"),
                  h("a", { role: "menuitem", href: card.originalUrl, target: "_blank", rel: "noreferrer", onClick: () => setMenuOpen(false) }, "打开原件")) : null)),
            h("p", null, subtitle),
            h("button", { type: "button", className: "tavern-card-start-session", disabled: !canStart, onClick: () => { if (hostCardValue !== null) prepareNewGame(hostCardValue); } }, card.playability === "blocked" ? "暂不可开始" : "开始新对话"))),
        h("nav", { className: "tavern-card-nav", role: "tablist", "aria-label": "卡片内容" }, ...navItems.map((item) => h("button", { type: "button", role: "tab", "aria-selected": tab === item.id, onClick: () => setTab(item.id), key: item.id }, item.label))),
        h("div", { className: `tavern-card-view is-${tab}`, role: "tabpanel" }, panel));
    }

    function PersonaCapabilityPanel({ snapshot }: { snapshot: CapabilitySnapshot }): any {
      const sessionId = snapshot.session?.id ?? "";
      const revisionId = snapshot.card.revisionId;
      const [library, setLibrary] = React.useState(null as PersonaLibraryState | null);
      const [query, setQuery] = React.useState("");
      const [selectedId, setSelectedId] = React.useState(null as string | null);
      const [displayName, setDisplayName] = React.useState("");
      const [content, setContent] = React.useState("");
      const [avatar, setAvatar] = React.useState("default" as PersonaAvatarId);
      const [dirty, setDirty] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [notice, setNotice] = React.useState(null as string | null);
      const [error, setError] = React.useState(null as string | null);
      const avatarIds: PersonaAvatarId[] = ["default", "traveler", "northern-ranger", "jianghu-wanderer"];
      const avatarUrl = (value: PersonaAvatarId): string => `/dsh-re3-rp/persona-avatar?avatar=${encodeURIComponent(value)}`;
      const queryString = (): string => {
        const params = new URLSearchParams({ revision: revisionId });
        if (sessionId.length > 0) params.set("sessionId", sessionId);
        return params.toString();
      };
      const chooseLibraryPersona = (next: PersonaLibraryState, preferred?: string | null): void => {
        const personaId = preferred ?? next.effective?.personaId ?? next.personas[0]?.id ?? null;
        setLibrary(next);
        setSelectedId(personaId);
      };
      const refreshSnapshot = (): void => {
        void loadCapabilitySnapshot(sessionId.length > 0 ? { sessionId } : { revisionId });
      };
      React.useEffect(() => {
        const controller = new AbortController();
        setError(null);
        void fetch(`/dsh-re3-rp/personas?${queryString()}`, { cache: "no-store", signal: controller.signal })
          .then(async (response) => {
            const body = await response.json() as PersonaLibraryState & { error?: string };
            if (!response.ok) throw new Error(body.error ?? "无法读取 Persona");
            if (!controller.signal.aborted) chooseLibraryPersona(body, body.effective?.personaId);
          })
          .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "无法读取 Persona"); });
        return () => controller.abort();
      }, [revisionId, sessionId]);
      const selected = library?.personas.find((persona: PersonaRecord) => persona.id === selectedId) ?? null;
      React.useEffect(() => {
        if (selected === null) return;
        setDisplayName(selected.displayName);
        setContent(selected.content);
        setAvatar(selected.avatar);
        setDirty(false);
        setNotice(null);
        setError(null);
      }, [selected?.id, selected?.updatedAt]);
      const post = async (payload: Record<string, unknown>): Promise<PersonaLibraryState> => {
        const response = await fetch("/dsh-re3-rp/personas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, revisionId, ...(sessionId.length === 0 ? {} : { sessionId }) }),
        });
        const body = await response.json() as PersonaLibraryState & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Persona 操作失败");
        return body;
      };
      const runAction = async (action: () => Promise<void>): Promise<void> => {
        setBusy(true);
        setError(null);
        setNotice(null);
        try { await action(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Persona 操作失败"); }
        finally { setBusy(false); }
      };
      const createPersona = (): void => { void runAction(async () => {
        const next = await post({ action: "create" });
        chooseLibraryPersona(next, next.createdPersonaId ?? null);
        setNotice("已创建 Persona，可以继续填写并保存。");
      }); };
      const savePersona = (): void => {
        if (selected === null) return;
        void runAction(async () => {
          const next = await post({ action: "update", personaId: selected.id, displayName, content, avatar });
          chooseLibraryPersona(next, selected.id);
          setDirty(false);
          setNotice("修改已保存，已绑定的后续生成会使用新版内容。");
          refreshSnapshot();
        });
      };
      const bindPersona = (scope: "global" | "card" | "session"): void => {
        if (selected === null) return;
        void runAction(async () => {
          const next = await post({ action: "bind", personaId: selected.id, scope });
          chooseLibraryPersona(next, selected.id);
          setNotice(scope === "session" ? "已切换到当前 Session。" : scope === "card" ? "已切换到当前酒馆卡；当前 Session 覆盖已取消。" : "已切换为全局默认；当前酒馆卡与 Session 覆盖已取消。");
          refreshSnapshot();
        });
      };
      const clearEffectiveBinding = (): void => {
        if (library?.effective === null || library?.effective === undefined) return;
        void runAction(async () => {
          const next = await post({ action: "clear", scope: library.effective!.scope });
          chooseLibraryPersona(next, selectedId);
          setNotice("已取消当前生效的 Persona 绑定。");
          refreshSnapshot();
        });
      };
      const visible: PersonaRecord[] = (library?.personas ?? []).filter((persona: PersonaRecord) => `${persona.displayName}\n${persona.content}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
      const effectivePersona = library?.personas.find((persona: PersonaRecord) => persona.id === library.effective?.personaId) ?? null;
      const bindingLabel = (scope: "global" | "card" | "session"): string => scope === "global" ? "全局默认" : scope === "card" ? "当前酒馆卡" : "当前 Session";
      const personaTokenSource = `${displayName}\n${content}`;
      const nonAsciiCharacters = Array.from(personaTokenSource).filter((character) => (character.codePointAt(0) ?? 0) > 0x7f).length;
      const asciiCharacters = personaTokenSource.length - nonAsciiCharacters;
      const tokenEstimate = Math.max(1, nonAsciiCharacters + Math.ceil(asciiCharacters / 4));
      const listRows = library === null
        ? [h("p", { className: "tavern-persona-empty", key: "loading" }, error ?? "正在读取…")]
        : visible.length === 0
          ? [h("p", { className: "tavern-persona-empty", key: "empty" }, library.personas.length === 0 ? "还没有 Persona。\n点击上方新建。" : "没有匹配的 Persona。")]
          : visible.map((persona: PersonaRecord) => h("button", {
            type: "button",
            key: persona.id,
            role: "option",
            "aria-selected": persona.id === selectedId,
            onClick: () => setSelectedId(persona.id),
          }, h("img", { src: avatarUrl(persona.avatar), alt: "" }), h("span", null, persona.displayName), library.effective?.personaId === persona.id ? h(IconCheckOutline14, { size: 14 }) : null));
      const scopeButtons = (["global", "card", "session"] as const).map((scope) => h("button", {
        type: "button",
        key: scope,
        disabled: busy || (scope === "session" && sessionId.length === 0),
        "aria-pressed": library?.effective?.scope === scope && library.effective.personaId === selected?.id,
        onClick: () => bindPersona(scope),
      }, bindingLabel(scope)));
      const editorContent = selected === null
        ? h("div", { className: "tavern-persona-empty is-roomy" }, library?.personas.length === 0 ? "新建 Persona 后，可在这里填写名字与描述。" : "选择一个 Persona 进行编辑。")
        : h(React.Fragment, null,
          h("div", { className: "tavern-persona-identity" },
            h("button", { type: "button", className: "tavern-persona-avatar", title: "更换头像", onClick: () => { setAvatar(avatarIds[(avatarIds.indexOf(avatar) + 1) % avatarIds.length]!); setDirty(true); } }, h("img", { src: avatarUrl(avatar), alt: `${displayName || "Persona"} 头像` })),
            h("label", null, h("span", null, "名称"), h("input", { value: displayName, maxLength: 64, onChange: (event: { target: { value: string } }) => { setDisplayName(event.target.value); setDirty(true); } })),
          ),
          h("label", { className: "tavern-persona-description" }, h("span", null, "描述（角色设定、性格、背景等）"), h("textarea", { value: content, maxLength: 12000, placeholder: "例如：你是一位习惯独自旅行的江湖客……", onChange: (event: { target: { value: string } }) => { setContent(event.target.value); setDirty(true); } })),
          h("div", { className: "tavern-persona-save-row" }, h("span", null, `约 ${tokenEstimate} Token`), h("div", null, h("small", { className: dirty ? "is-dirty" : "is-saved" }, dirty ? null : h(IconCheckOutline14, { size: 14 }), dirty ? "尚未保存" : "已保存"), h("button", { type: "button", disabled: busy || !dirty || displayName.trim().length === 0, onClick: savePersona }, "保存"))),
          h("section", { className: "tavern-persona-binding" },
            h("header", null, h("strong", null, "生效范围"), library?.effective == null ? null : h("button", { type: "button", disabled: busy, onClick: clearEffectiveBinding }, "取消当前绑定")),
            h("div", { className: "tavern-persona-scope", role: "group", "aria-label": "Persona 生效范围" }, ...scopeButtons),
            h("div", { className: "tavern-persona-session" }, h("span", null, "当前 Session"), h("strong", null, sessionId.length === 0 ? "打开 Session 后可单独绑定" : snapshot.card.title)),
            h("p", { className: "tavern-persona-priority" }, "优先级：当前 Session > 当前酒馆卡 > 全局默认"),
            h("p", { className: "tavern-persona-guidance" }, "卡片设定优先；主动启用后才注入详细人设。"),
            h("p", { className: effectivePersona === null ? "tavern-persona-effective is-empty" : "tavern-persona-effective" }, effectivePersona === null ? "未选择 Persona，将沿用开局填写的玩家名字。" : `当前生效：${effectivePersona.displayName} · ${bindingLabel(library.effective.scope)}`),
          ),
          notice === null ? null : h("p", { className: "tavern-persona-notice", role: "status" }, notice),
          error === null ? null : h("p", { className: "tavern-persona-error", role: "alert" }, error),
        );
      const libraryPane = h("aside", { className: "tavern-persona-library", "aria-label": "Persona 列表" },
        h("button", { type: "button", className: "tavern-persona-create", disabled: busy, onClick: createPersona }, h(IconPlusOutline16, { size: 16 }), h("span", null, "新建")),
        h("label", { className: "tavern-persona-search" }, h(IconSearchOutline16, { size: 15 }), h("input", { value: query, placeholder: "搜索 Persona", onChange: (event: { target: { value: string } }) => setQuery(event.target.value) })),
        h("div", { className: "tavern-persona-list", role: "listbox", "aria-label": "可用 Persona" }, ...listRows),
      );
      return h(React.Fragment, null,
        h(CapabilityPanelHeader, { title: "Persona", meta: "管理玩家身份与当前会话绑定" }),
        h("div", { className: "tavern-persona-workbench" }, libraryPane, h("section", { className: "tavern-persona-editor" }, editorContent)),
      );
    }

    function CapabilityPanel({ capability, snapshot, diagnostics }: { capability: CapabilityId; snapshot: CapabilitySnapshot; diagnostics: RuntimeDiagnostic[] }): any {
      if (capability === "worldbook") return h(WorldbookCapabilityPanel, { snapshot });
      if (capability === "preset") return h(PresetCapabilityPanel, { snapshot });

      if (capability === "regex") return h(RegexCapabilityPanel, { snapshot });
      if (capability === "frontend") return h(FrontendCapabilityPanel, { snapshot, diagnostics });
      if (capability === "card") return h(CardCapabilityPanel, { snapshot });
      return h(PersonaCapabilityPanel, { snapshot });
    }

    function CapabilityRail(): any {
      const stateSnapshot = usePrototypeState();
      const [capability, setCapability] = React.useState("worldbook" as CapabilityId);
      const [panelOpen, setPanelOpen] = React.useState(false);

      React.useEffect(() => {
        const open = (event: Event): void => {
          const next = (event as CustomEvent).detail as CapabilityId;
          if (["worldbook", "preset", "regex", "frontend", "card", "persona"].includes(next)) {
            setCapability(next);
            setPanelOpen(true);
          }
        };
        window.addEventListener("dsh-re3-rp:open-capability", open);
        return () => window.removeEventListener("dsh-re3-rp:open-capability", open);
      }, []);
      if (stateSnapshot.sidebarMode !== "tavern") return null;
      const data = stateSnapshot.capabilitySnapshot;
      const loadedTargetKey = data === null
        ? ""
        : data.session === null
          ? `revision:${data.card.revisionId}`
          : `session:${data.session.id}`;
      const loadingDifferentTarget = stateSnapshot.capabilityLoading && loadedTargetKey !== stateSnapshot.capabilityTargetKey;
      const items: Array<{ id: CapabilityId; label: string; icon: any; group: number }> = [
        { id: "worldbook", label: "世界书", icon: IconDataOutline16, group: 0 },
        { id: "preset", label: "预设", icon: IconAgentPresetOutline16, group: 0 },

        { id: "regex", label: "Regex", icon: IconSkillOutline16, group: 1 },
        { id: "frontend", label: "前端", icon: IconProjectAddOutline16, group: 1 },
        { id: "card", label: "卡片", icon: IconFolderOpenOutline16, group: 2 },
        { id: "persona", label: "Persona", icon: IconUserOutline16, group: 2 },
      ];
      const selectCapability = (next: CapabilityId): void => {
        if (next === capability && panelOpen) { setPanelOpen(false); return; }
        setCapability(next);
        setPanelOpen(true);
      };
      const diagnostics = stateSnapshot.runtimeDiagnostics.filter((item) => item.sessionId === data?.session?.id);
      const railButtons = items.map((item, index) => h("button", {
        type: "button",
        className: `${capability === item.id && panelOpen ? "is-active" : ""}${index > 0 && item.group !== items[index - 1]?.group ? " is-group-start" : ""}`,
        "aria-pressed": capability === item.id && panelOpen,
        onClick: () => selectCapability(item.id),
        key: item.id,
      }, h(item.icon, { size: 20 }), h("span", null, item.label)));
      return h(React.Fragment, null,
        h("aside", { className: `tavern-capability-panel ${panelOpen ? "is-open" : "is-closed"}`, id: "tavern-capability-panel", "data-capability": capability, "aria-hidden": !panelOpen, "aria-label": `${items.find((item) => item.id === capability)?.label ?? "酒馆"}能力面板` },

          loadingDifferentTarget ? h("div", { className: "tavern-capability-loading", "aria-live": "polite" }, "正在读取真实卡片与 Session 数据…") : stateSnapshot.capabilityError !== null ? h("div", { className: "tavern-capability-loading is-error", role: "alert" }, stateSnapshot.capabilityError) : data === null ? h("div", { className: "tavern-capability-loading" }, "选择一张酒馆卡后查看能力。") : h(CapabilityPanel, { capability, snapshot: data, diagnostics, key: `${capability}:${data.card.revisionId}:${data.session?.id ?? "card"}` })),
        h("nav", { className: "tavern-card-capability-rail", "aria-label": "酒馆能力", "data-panel-open": String(panelOpen) },
          h("button", { type: "button", className: "tavern-capability-handle", "aria-controls": "tavern-capability-panel", "aria-expanded": panelOpen, "aria-label": panelOpen ? "收起能力窗口" : "展开能力窗口", title: panelOpen ? "收起能力窗口" : "展开能力窗口", onClick: () => setPanelOpen(!panelOpen) }, panelOpen ? h(IconChevronRightOutline14, { size: 18 }) : h(IconChevronLeftOutline14, { size: 18 })),
          ...railButtons));
    }

    function TavernOpeningSwitcher(props: any): any {
      const sessionId = props.sessionId as string;
      const [openingState, setOpeningState] = React.useState(undefined as OpeningState | null | undefined);
      const [expanded, setExpanded] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState(null as string | null);

      React.useEffect(() => {
        const controller = new AbortController();
        void fetch(`/dsh-re3-rp/opening?sessionId=${encodeURIComponent(sessionId)}&optional=1`, { cache: "no-store", signal: controller.signal })
          .then(async (response) => response.status === 204 ? null : response.ok ? await response.json() as OpeningState : null)
          .then((value) => { if (!controller.signal.aborted) setOpeningState(value); })
          .catch(() => { if (!controller.signal.aborted) setOpeningState(null); });
        return () => controller.abort();
      }, [sessionId, props.session]);

      React.useLayoutEffect(() => {
        if (openingState === null || openingState === undefined || openingState.currentIndex === 0) return;
        const applyOpeningRender = (): void => {
          const openingFlow = document.querySelector('[data-chat-flow-key$=":assistant-step1:1"]');
          const paragraph = openingFlow?.querySelector("p");
          const original = paragraph?.parentElement as HTMLElement | undefined;
          if (original === undefined || original.dataset.tavernOpeningSource === "true") return;
          original.dataset.tavernOpeningSource = "true";
          original.hidden = true;
          const replacement = document.createElement("div");
          replacement.className = "tavern-opening-message";
          replacement.dataset.tavernOpeningRender = sessionId;
          replacement.textContent = openingState.currentMessage;
          original.before(replacement);
        };
        const clearOpeningRender = (): void => {
          document.querySelectorAll(`[data-tavern-opening-render="${CSS.escape(sessionId)}"]`).forEach((node) => node.remove());
          document.querySelectorAll('[data-tavern-opening-source="true"]').forEach((node) => {
            (node as HTMLElement).hidden = false;
            delete (node as HTMLElement).dataset.tavernOpeningSource;
          });
        };
        clearOpeningRender();
        applyOpeningRender();
        const observer = new MutationObserver(applyOpeningRender);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => { observer.disconnect(); clearOpeningRender(); };
      }, [sessionId, openingState?.currentIndex, openingState?.currentMessage]);

      const choose = async (openingId: string): Promise<void> => {
        if (openingState === null || openingState === undefined || openingState.locked || busy || openingId === openingState.openingId) return;
        setBusy(true);
        setError(null);
        try {
          const response = await fetch("/dsh-re3-rp/opening", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, openingId }),
          });
          const result = await response.json() as OpeningState & { error?: string };
          if (!response.ok) throw new Error(result.error ?? "无法切换开场");
          setOpeningState(result);
          setExpanded(false);
          await refreshHostCards();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "无法切换开场");
        } finally {
          setBusy(false);
        }
      };

      if (openingState === null || openingState === undefined || openingState.openings.length <= 1) return null;
      const adjacent = (offset: number): string => openingState.openings[(openingState.currentIndex + offset + openingState.openings.length) % openingState.openings.length]!.id;
      return h("section", { className: "tavern-opening-dock", "data-tavern-opening-switcher": openingState.locked ? "locked" : "draft", "aria-label": "开场选择" },
        h("div", { className: "tavern-opening-dock-panel" },
          h("div", { className: "tavern-opening-dock-toolbar" },
            h("span", { className: "tavern-opening-toolbar-spacer", "aria-hidden": "true" }),
            h("div", { className: "tavern-opening-navigation" },
              h("button", { type: "button", title: "上一个开场", "aria-label": "上一个开场", disabled: openingState.locked || busy, onClick: () => void choose(adjacent(-1)) }, h(IconChevronLeftOutline14, { size: 14 })),
              h("span", { className: "tavern-opening-current" }, openingState.locked ? "开场已锁定" : `开场 ${openingState.currentIndex + 1} / ${openingState.openings.length}`),
              h("button", { type: "button", title: "下一个开场", "aria-label": "下一个开场", disabled: openingState.locked || busy, onClick: () => void choose(adjacent(1)) }, h(IconChevronRightOutline14, { size: 14 }))),
            h("button", { type: "button", className: `tavern-opening-disclosure${expanded ? " is-expanded" : ""}`, title: expanded ? "收起开场列表" : "展开开场列表", "aria-label": expanded ? "收起开场列表" : "展开开场列表", "aria-expanded": expanded, disabled: busy, onClick: () => setExpanded(!expanded) }, h(IconChevronDownOutline14, { size: 14 }))),
          expanded ? h("div", { className: "tavern-opening-menu", role: "listbox", "aria-label": "选择备选开场" },
            ...openingState.openings.map((opening: OpeningState["openings"][number]) => h("button", { type: "button", role: "option", "aria-selected": opening.id === openingState.openingId, disabled: openingState.locked || busy, key: opening.id, onClick: () => void choose(opening.id) },
              h("span", { className: "tavern-opening-option-copy" }, h("strong", null, `${opening.index + 1}.`), h("small", null, opening.preview))))) : null,
          error === null ? null : h("p", { className: "tavern-opening-error", role: "alert" }, error)));
    }

    type ProjectedMessage = { seq: number; role: "user" | "assistant"; text: string; rawText?: string };
    type CompanionScript = { id: string; name: string; source: string };
    type HostedFrontend = { caseId: string; container: "standalone" | "required-asset"; entryUrl: string };
    type ConversationProjection = { revisionId: string; title: string; messages: ProjectedMessage[]; variableState?: Record<string, unknown>; frontendStorage?: Record<string, string>; companionScripts?: CompanionScript[]; frontend?: HostedFrontend | null };

    // Keep DSH's native conversation renderer and project only card-generated
    // rich documents into an already-bound Tavern Session. This DOM seam is
    // isolated so a future conditional message slot can replace it without
    // touching the card, Session, or runtime contracts.
    type NativeRichMount = { item: HTMLElement; original: HTMLElement; display: HTMLElement; root: any; signature: string; messageSeq: number };
    type RichFrameProbePhase = "idle" | "first" | "second" | "verify" | "verify-second" | "refresh" | "settled";
    type RichFrameSizingState = {
      probeId: number;
      phase: RichFrameProbePhase;
      expectedHeight: number;
      baseHeight: number;
      committedHeight: number;
      first?: RichFrameLayoutSnapshot;
      verificationFirst?: RichFrameLayoutSnapshot;
      layoutVersion?: number;
      viewportCoupled: boolean;
      releasedScrollKeys: string[];
      releaseBasisKeys: string[];
      verificationAttempts: number;
      cycleStartedAt?: number;
      restartAttempts: number;
      timer?: number;
      publishFrame?: number;
      measurementTimer?: number;
      fallbackRetryTimer?: number;
      pendingProbe: boolean;
      pendingReason?: string;
      pendingLayoutVersion?: number;
      scheduledReason?: string;
      settled: boolean;
      fallbackLatched: boolean;
      suppressResizeUntil: number;
    };
    type RichFrameRegistration = {
      token: string;
      frame: HTMLIFrameElement;
      sessionId: string;
      readonly revisionId: string;
      documentEpoch?: string;
      sizing?: RichFrameSizingState;
    };

    function nativeRichSrcDoc(content: string, token: string, variableState: Record<string, unknown>, frontendStorage: Record<string, string>, cardTitle: string, messageCount: number, revisionId = ""): string {
      const adapted = adaptRealCardFrontendHtml(content)
        .replaceAll("window.parent.frontendTestHost", "window.__dshGameHost")
        .replaceAll("window.parent.frontendTestStateHost", "window.__dshGameStateHost");
      const encodedToken = JSON.stringify(token).replace(/<\//gu, "<\\/");
      const encodedState = JSON.stringify(variableState).replace(/</gu, "\\u003c").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");
      const encodedStorage = JSON.stringify(frontendStorage).replace(/</gu, "\\u003c").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");
      const encodedTitle = JSON.stringify(cardTitle).replace(/</gu, "\\u003c");
      const encodedRevision = JSON.stringify(revisionId).replace(/</gu, "\\u003c");
      const encodedHeightMeasure = measureRichFrameContentHeight.toString().replace(/<\//gu, "<\\/");
      const encodedScrollableMeasure = measureRichFrameScrollableContentBottom.toString().replace(/<\//gu, "<\\/");
      const encodedClosedDetailsVisibility = isRichFrameNodeHiddenByClosedDetails.toString().replace(/<\//gu, "<\\/");
      const encodedContextBuilder = buildSillyTavernCompatibilityContext.toString().replace(/<\//gu, "<\\/");
      const baseHref = new URL(".", window.location.href).href.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      const messageId = Number(token.split(":", 1)[0]) || -1;
      const bootstrap = `<script>(()=>{
 const token=${encodedToken};
 const cardTitle=${encodedTitle};
 const cardRevision=${encodedRevision};
 let currentMessageId=${messageId};
 let messageCount=${messageCount};
 const companion=token.startsWith('companion:');
 const hostWindow=globalThis;
 const window=hostWindow;
 const document=hostWindow.document;
 document.documentElement.dataset.dshRevision=cardRevision;
 const parent=hostWindow.parent;
 const performance=hostWindow.performance;
 const crypto=hostWindow.crypto;
 const console=hostWindow.console;
 const requestAnimationFrame=hostWindow.requestAnimationFrame.bind(hostWindow);
 const setTimeout=hostWindow.setTimeout.bind(hostWindow);
 const clearTimeout=hostWindow.clearTimeout.bind(hostWindow);
 const setInterval=hostWindow.setInterval.bind(hostWindow);
 const addEventListener=hostWindow.addEventListener.bind(hostWindow);
 const getComputedStyle=hostWindow.getComputedStyle.bind(hostWindow);
 const structuredClone=hostWindow.structuredClone.bind(hostWindow);
 const {Array,Blob,CustomEvent,Error,Event,EventTarget,JSON,Map,Math,MutationObserver,NodeFilter,Number,Object,Promise,RegExp,ResizeObserver,Set,String,URL,WeakMap}=hostWindow;
 let cardState=${encodedState};
const storageEntries=new Map(Object.entries(${encodedStorage}));
const runtimeEpoch=crypto.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2);
let nextId=0;
const pending=new Map();
const measureRichFrameContentHeight=${encodedHeightMeasure};
const measureRichFrameScrollableContentBottom=${encodedScrollableMeasure};
const isRichFrameNodeHiddenByClosedDetails=${encodedClosedDetailsVisibility};
const buildSillyTavernCompatibilityContext=${encodedContextBuilder};
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const merge=(left,right)=>{const out=clone(left||{});for(const [key,value] of Object.entries(right||{})){out[key]=value&&typeof value==='object'&&!Array.isArray(value)&&out[key]&&typeof out[key]==='object'&&!Array.isArray(out[key])?merge(out[key],value):clone(value)}return out};
const pathParts=path=>(Array.isArray(path)?path:String(path??'').split('[').join('.').split(']').join('').split('.')).map(part=>String(part).replace(/^['"]|['"]$/gu,'')).filter(Boolean);
const safePath=parts=>parts.every(part=>part!=='__proto__'&&part!=='prototype'&&part!=='constructor');
const lodash=Object.freeze({
  get(object,path,defaultValue){const parts=pathParts(path);if(!safePath(parts))return defaultValue;let cursor=object;for(const part of parts){if(cursor==null)return defaultValue;cursor=cursor[part]}return cursor===undefined?defaultValue:cursor},
  has(object,path){const parts=pathParts(path);if(!safePath(parts))return false;let cursor=object;for(const part of parts){if(cursor==null||!Object.prototype.hasOwnProperty.call(Object(cursor),part))return false;cursor=cursor[part]}return true},
  set(object,path,value){const parts=pathParts(path);if(object==null||parts.length===0||!safePath(parts))return object;let cursor=object;for(let index=0;index<parts.length-1;index++){const part=parts[index];const next=parts[index+1];if(cursor[part]==null||typeof cursor[part]!=='object')cursor[part]=/^\d+$/u.test(next)?[]:{};cursor=cursor[part]}cursor[parts.at(-1)]=value;return object},
  unset(object,path){const parts=pathParts(path);if(object==null||parts.length===0||!safePath(parts))return false;let cursor=object;for(const part of parts.slice(0,-1)){if(cursor==null||typeof cursor!=='object')return true;cursor=cursor[part]}if(cursor==null||typeof cursor!=='object')return true;return delete cursor[parts.at(-1)]},
  omit(object,paths){const out=clone(object||{});for(const path of Array.isArray(paths)?paths:[paths])lodash.unset(out,path);return out},
  cloneDeep(value){return clone(value)},
  isPlainObject(value){if(value===null||typeof value!=='object')return false;const prototype=Object.getPrototypeOf(value);return prototype===Object.prototype||prototype===null},
  isEqual(left,right){if(Object.is(left,right))return true;if(typeof left!==typeof right||left===null||right===null||typeof left!=='object')return false;if(Array.isArray(left)!==Array.isArray(right))return false;const leftKeys=Object.keys(left);const rightKeys=Object.keys(right);return leftKeys.length===rightKeys.length&&leftKeys.every(key=>Object.prototype.hasOwnProperty.call(right,key)&&lodash.isEqual(left[key],right[key]))}
});
const selectNodes=selector=>{const selected=String(selector).includes('option:selected');const normalized=selected?String(selector).split('option:selected').join('option'):String(selector);const nodes=[...document.querySelectorAll(normalized)];return selected?nodes.filter(node=>node.selected):nodes};
const miniEventRegistry=new WeakMap();
class MiniQuery{
  constructor(nodes){this.nodes=[...new Set(nodes.filter(Boolean))];this.length=this.nodes.length;this.nodes.forEach((node,index)=>{this[index]=node})}
  each(callback){this.nodes.forEach((node,index)=>callback.call(node,index,node));return this}
  on(events,selectorOrHandler,maybeHandler){const delegated=typeof selectorOrHandler==='string';const handler=delegated?maybeHandler:selectorOrHandler;for(const eventName of String(events).split(' ').filter(Boolean)){const [type,...namespaceParts]=eventName.split('.');if(!type)continue;const namespace=namespaceParts.join('.');this.each((_index,node)=>{const wrapped=event=>{try{if(!('originalEvent' in event))Object.defineProperty(event,'originalEvent',{value:event})}catch{}if(!delegated)return handler.call(node,event);const target=event.target?.closest?.(selectorOrHandler);if(target&&node.contains(target))return handler.call(target,event)};node.addEventListener(type,wrapped);const records=miniEventRegistry.get(node)||[];records.push({type,namespace,handler,wrapped});miniEventRegistry.set(node,records)})}return this}
  off(events){const filters=events===undefined?[]:String(events).split(' ').filter(Boolean).map(value=>{const [type,...parts]=value.split('.');return{type,namespace:parts.join('.')}});return this.each((_index,node)=>{const records=miniEventRegistry.get(node)||[];const keep=[];for(const record of records){const matched=filters.length===0||filters.some(filter=>(!filter.type||filter.type===record.type)&&(!filter.namespace||filter.namespace===record.namespace));if(matched)node.removeEventListener(record.type,record.wrapped);else keep.push(record)}miniEventRegistry.set(node,keep)})}
  trigger(eventName){return this.each((_index,node)=>node.dispatchEvent(new Event(String(eventName),{bubbles:true,cancelable:true})))}
  click(handler){return handler===undefined?this.trigger('click'):this.on('click',handler)}
  change(handler){return handler===undefined?this.trigger('change'):this.on('change',handler)}
  html(value){if(value===undefined)return this.nodes[0]?.innerHTML;return this.each((_index,node)=>{node.innerHTML=String(value??'')})}
  text(value){if(value===undefined)return this.nodes[0]?.textContent??'';return this.each((_index,node)=>{node.textContent=String(value??'')})}
  val(value){const node=this.nodes[0];if(value===undefined)return node?.value;return this.each((_index,item)=>{item.value=String(value??'')})}
  attr(name,value){if(value===undefined&&typeof name==='string')return this.nodes[0]?.getAttribute(name);if(name&&typeof name==='object')return this.each((_index,node)=>{for(const [key,item] of Object.entries(name))node.setAttribute(key,String(item))});return this.each((_index,node)=>node.setAttribute(String(name),String(value)))}
  prop(name,value){if(value===undefined)return this.nodes[0]?.[name];return this.each((_index,node)=>{node[name]=value})}
  data(name,value){const node=this.nodes[0];const key=String(name).replace(/-([a-z])/gu,(_match,letter)=>letter.toUpperCase());if(value!==undefined)return this.each((_index,item)=>{item.dataset[key]=String(value)});const raw=node?.dataset?.[key];if(raw===undefined)return undefined;if(raw==='true'||raw==='false')return raw==='true';if(raw!==''&&!Number.isNaN(Number(raw)))return Number(raw);try{return JSON.parse(raw)}catch{return raw}}
  css(name,value){if(name&&typeof name==='object')return this.each((_index,node)=>{for(const [key,item] of Object.entries(name)){if(String(key).includes('-'))node.style.setProperty(key,String(item));else node.style[key]=String(item)}});if(value===undefined)return getComputedStyle(this.nodes[0]||document.documentElement).getPropertyValue(String(name));return this.each((_index,node)=>{if(String(name).includes('-'))node.style.setProperty(String(name),String(value));else node.style[name]=String(value)})}
  addClass(names){const parts=String(names).split(' ').filter(Boolean);return this.each((_index,node)=>node.classList.add(...parts))}
  removeClass(names){const parts=String(names??'').split(' ').filter(Boolean);return this.each((_index,node)=>parts.length?node.classList.remove(...parts):node.removeAttribute('class'))}
  hasClass(name){return this.nodes[0]?.classList.contains(String(name))===true}
  hide(){return this.css('display','none')}
  show(){return this.each((_index,node)=>{node.style.display='';if(getComputedStyle(node).display==='none')node.style.display='block'})}
  remove(){return this.each((_index,node)=>node.remove())}
  is(selector){const node=this.nodes[0];if(!node)return false;if(selector===':checked')return node.checked===true;if(selector===':visible')return getComputedStyle(node).display!=='none'&&getComputedStyle(node).visibility!=='hidden';return node.matches(String(selector))}
  closest(selector){return new MiniQuery(this.nodes.map(node=>node.closest?.(selector)))}
  siblings(selector){const nodes=this.nodes.flatMap(node=>[...(node.parentElement?.children||[])].filter(item=>item!==node&&(!selector||item.matches(selector))));return new MiniQuery(nodes)}
  find(selector){return new MiniQuery(this.nodes.flatMap(node=>[...node.querySelectorAll(selector)]))}
  next(selector){return new MiniQuery(this.nodes.map(node=>node.nextElementSibling).filter(node=>node&&(!selector||node.matches(selector))))}
  append(value){return this.each((_index,node)=>{if(typeof value==='string')node.insertAdjacentHTML('beforeend',value);else if(value?.nodeType)node.append(value.cloneNode(true))})}
  prepend(value){return this.each((_index,node)=>{if(typeof value==='string')node.insertAdjacentHTML('afterbegin',value);else if(value?.nodeType)node.prepend(value.cloneNode(true))})}
  toggle(force){return this.each((_index,node)=>{const show=force===undefined?getComputedStyle(node).display==='none':Boolean(force);node.style.display=show?'':'none'})}
  slideToggle(){return this.toggle()}
  scrollTop(value){const node=this.nodes[0];if(value===undefined)return node?.scrollTop??0;return this.each((_index,item)=>{item.scrollTop=Number(value)||0})}
}
function miniDollar(input){if(typeof input==='function'){const run=()=>input(miniDollar);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else queueMicrotask(run);return new MiniQuery([])}if(input instanceof MiniQuery)return input;if(typeof input==='string')return new MiniQuery(selectNodes(input));if(input==null)return new MiniQuery([]);return new MiniQuery(Array.isArray(input)?input:[input])}
const operation=kind=>'card-ui:'+kind+':'+(crypto.randomUUID?.()||Date.now()+':'+(++nextId));
function send(action,payload={}){const id=runtimeEpoch+':'+(++nextId);parent.postMessage({source:'dsh-re3-rp-rich-frame',token,kind:'request',id,action,payload},'*');return new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));}
const observeCompatibilityCall=(surface,method)=>{void send('reportCompatibilityCall',{surface,method,operationId:operation('compat-call')}).catch(()=>{})};
let storageTimer;
let storageWriteVersion=0;
let storageAckVersion=0;
let storageInFlightVersion=0;
let storagePendingWrite;
const applyCanonicalStorage=entries=>{storageEntries.clear();for(const [key,value] of Object.entries(entries||{}))storageEntries.set(String(key),String(value))};
const runStorageWrite=()=>{if(storageInFlightVersion!==0||!storagePendingWrite)return;const write=storagePendingWrite;storagePendingWrite=undefined;storageInFlightVersion=write.version;void send('replaceCardStorage',{mutations:write.mutations}).then(result=>{storageAckVersion=Math.max(storageAckVersion,write.version);if(write.version===storageWriteVersion)applyCanonicalStorage(result?.entries)}).catch(()=>{if(write.attempt<3){const retry={...write,attempt:write.attempt+1};storagePendingWrite=storagePendingWrite?{version:storagePendingWrite.version,mutations:[...retry.mutations,...storagePendingWrite.mutations],attempt:Math.max(retry.attempt,storagePendingWrite.attempt)}:retry}}).finally(()=>{storageInFlightVersion=0;if(storagePendingWrite){clearTimeout(storageTimer);storageTimer=setTimeout(runStorageWrite,storagePendingWrite.attempt>0?120:0)}})};
const flushStorage=()=>{clearTimeout(storageTimer);storageTimer=undefined;runStorageWrite()};
const persistStorage=mutation=>{storageWriteVersion+=1;storagePendingWrite=storagePendingWrite?{...storagePendingWrite,version:storageWriteVersion,mutations:[...storagePendingWrite.mutations,mutation]}:{version:storageWriteVersion,mutations:[mutation],attempt:0};clearTimeout(storageTimer);storageTimer=setTimeout(flushStorage,40)};
const memoryStorage=Object.freeze({get length(){return storageEntries.size},key(index){return [...storageEntries.keys()][Number(index)]??null},getItem(key){const value=storageEntries.get(String(key));return value===undefined?null:value},setItem(key,value){const normalizedKey=String(key);const normalizedValue=String(value);storageEntries.set(normalizedKey,normalizedValue);persistStorage({kind:'set',key:normalizedKey,value:normalizedValue})},removeItem(key){const normalizedKey=String(key);storageEntries.delete(normalizedKey);persistStorage({kind:'remove',key:normalizedKey})},clear(){storageEntries.clear();persistStorage({kind:'clear'})}});
try{Object.defineProperty(window,'localStorage',{value:memoryStorage,configurable:false})}catch{}
addEventListener('pagehide',()=>{if(storageAckVersion>=storageWriteVersion)return;flushStorage();if(storagePendingWrite){const write=storagePendingWrite;storagePendingWrite=undefined;void send('replaceCardStorage',{mutations:write.mutations}).catch(()=>{})}});
addEventListener('message',event=>{const data=event.data;if(event.source!==parent||data?.source!=='dsh-re3-rp-rich-host'||data.token!==token||data.kind!=='response')return;const task=pending.get(data.id);if(!task)return;pending.delete(data.id);if(data.ok)task.resolve(data.result);else task.reject(Object.assign(new Error(data.error?.message||'Bridge unavailable'),{code:data.error?.code||'bridge_unavailable'}));});
let lastReportedHeight=0;
const visibleFixedNode=node=>{const style=getComputedStyle(node);const rect=node.getBoundingClientRect();return style.position==='fixed'&&style.display!=='none'&&style.visibility!=='hidden'&&style.pointerEvents!=='none'&&rect.width>0&&rect.height>0};
const fixedCompanionNodes=()=>[...document.body.querySelectorAll('*')].filter(visibleFixedNode);
const hasFixedAncestor=node=>{let parent=node.parentElement;while(parent&&parent!==document.body){if(getComputedStyle(parent).position==='fixed')return true;parent=parent.parentElement}return false};
const fixedNodeScore=node=>{const rect=node.getBoundingClientRect();const z=Number.parseInt(getComputedStyle(node).zIndex,10)||0;return z*100000000+rect.width*rect.height};
const discoverCompanionTarget=()=>{const explicit=document.querySelector('[data-dsh-companion-root]');if(explicit)return explicit;const viewportArea=Math.max(1,innerWidth*innerHeight);return fixedCompanionNodes().filter(node=>!hasFixedAncestor(node)).filter(node=>{const rect=node.getBoundingClientRect();const viewportCoverage=rect.width*rect.height/viewportArea;return viewportCoverage<0.98&&(rect.width<innerWidth*0.95||rect.height<innerHeight*0.95)}).sort((left,right)=>fixedNodeScore(right)-fixedNodeScore(left))[0]};
const discoverCompanionDragLayer=target=>{const explicit=document.querySelector('[data-dsh-drag-overlay]');if(explicit)return explicit;return fixedCompanionNodes().filter(node=>node!==target).filter(node=>{const rect=node.getBoundingClientRect();return rect.width>=innerWidth*0.9&&rect.height>=innerHeight*0.9}).sort((left,right)=>fixedNodeScore(right)-fixedNodeScore(left))[0]};
const reportCompanion=()=>{const target=discoverCompanionTarget();const rect=target?.getBoundingClientRect();const dragOverlay=discoverCompanionDragLayer(target);const dragRect=dragOverlay?.getBoundingClientRect();const active=target!==null&&target!==undefined&&rect!==undefined&&visibleFixedNode(target);const dragging=dragOverlay!==null&&dragOverlay!==undefined&&dragRect!==undefined&&visibleFixedNode(dragOverlay);const x=active?Math.floor(rect.left):0;const y=active?Math.floor(rect.top):0;const width=active?Math.ceil(rect.width):0;const height=active?Math.ceil(rect.height):0;const signature=(active?'on:':'off:')+(dragging?'drag:':'rest:')+x+':'+y+':'+width+':'+height;if(signature===lastReportedHeight)return;lastReportedHeight=signature;parent.postMessage({source:'dsh-re3-rp-rich-frame',token,kind:'overlay',active,dragging,x,y,width,height},'*')};
let companionReportFrame;
const scheduleCompanionReport=()=>{if(companionReportFrame!==undefined)return;companionReportFrame=requestAnimationFrame(()=>{companionReportFrame=undefined;reportCompanion()})};
let layoutVersion=0;
let invalidationTimer;
let invalidationReason='resize';
const scheduleLayoutInvalidation=reason=>{if(companion)return;invalidationReason=reason==='resize'&&invalidationReason!=='resize'?invalidationReason:reason;if(invalidationTimer!==undefined)return;invalidationTimer=setTimeout(()=>{invalidationTimer=undefined;const currentReason=invalidationReason;invalidationReason='resize';const snapshot=collectLayoutSnapshot();parent.postMessage({source:'dsh-re3-rp-rich-frame',token,kind:'layout-invalidated',reason:currentReason,layoutVersion,height:snapshot.contentBottom,snapshot},'*')},0)};
const report=()=>companion?reportCompanion():scheduleLayoutInvalidation('mutation');
const scheduleReport=()=>companion?scheduleCompanionReport():scheduleLayoutInvalidation('mutation');
const scrollNodeIds=new WeakMap();
let nextScrollNodeId=0;
const scrollNodeKey=node=>{let id=scrollNodeIds.get(node);if(id===undefined){id=++nextScrollNodeId;scrollNodeIds.set(node,id)}return String(id)};
const visibleLayoutNode=(node,style,rect)=>!isRichFrameNodeHiddenByClosedDetails(node,document.body)&&style.display!=='none'&&style.visibility!=='hidden'&&style.visibility!=='collapse'&&style.contentVisibility!=='hidden'&&style.position!=='fixed'&&node.getClientRects().length>0&&(rect.width>0||rect.height>0);
const collectScrollableOwners=(node,styleFor)=>{const owners=[];let parent=node.parentElement;let depth=0;while(parent&&parent!==document.body&&parent!==document.documentElement&&depth<100){const style=styleFor(parent);if(style.position==='fixed')owners.push({key:scrollNodeKey(parent),kind:'fixed',clientHeight:Number(parent.clientHeight)||0});if(style.overflowY==='hidden'||style.overflowY==='clip')owners.push({key:scrollNodeKey(parent),kind:'clip',clientHeight:Number(parent.clientHeight)||0});if(style.overflowY==='auto'||style.overflowY==='scroll')owners.push({key:scrollNodeKey(parent),kind:'scroll',clientHeight:Number(parent.clientHeight)||0});parent=parent.parentElement;depth+=1}return owners.slice(0,100)};
const collectLayoutSnapshot=()=>{const body=document.body;const rect=body.getBoundingClientRect();const bodyMetrics={bodyScrollHeight:body.scrollHeight,bodyOffsetHeight:body.offsetHeight,bodyRectTop:rect.top,bodyRectBottom:rect.bottom};const bodyHeight=measureRichFrameContentHeight(bodyMetrics);const styleCache=new Map();const styleFor=node=>{let style=styleCache.get(node);if(style===undefined){style=getComputedStyle(node);styleCache.set(node,style)}return style};const nodes=[];const walker=document.createTreeWalker(body,NodeFilter.SHOW_ELEMENT);while(nodes.length<5000){const node=walker.nextNode();if(node===null)break;nodes.push(node)}const scrollables=[];for(const node of nodes){const style=styleFor(node);if(!(style.overflowY==='auto'||style.overflowY==='scroll'))continue;const nodeRect=node.getBoundingClientRect();const visible=visibleLayoutNode(node,style,nodeRect);scrollables.push({key:scrollNodeKey(node),visible,top:nodeRect.top-rect.top,clientHeight:Number(node.clientHeight)||0,scrollHeight:Number(node.scrollHeight)||0,owners:collectScrollableOwners(node,styleFor)})}const scrollableBottom=measureRichFrameScrollableContentBottom(bodyHeight,scrollables);const nestedScrollableOverflowHeight=Math.max(0,scrollableBottom-bodyHeight);const contentBottom=measureRichFrameContentHeight({...bodyMetrics,nestedScrollableOverflowHeight});return{viewportHeight:innerHeight,bodyHeight,contentBottom,layoutVersion,scrollables}};
const postLayoutMeasure=(probeId,phase,expectedViewportHeight)=>{setTimeout(()=>{const snapshot=collectLayoutSnapshot();parent.postMessage({source:'dsh-re3-rp-rich-frame',token,kind:'resize',probeId,phase,expectedViewportHeight,height:snapshot.contentBottom,snapshot},'*')},0)};
addEventListener('message',event=>{const data=event.data;if(event.source!==parent||data?.source!=='dsh-re3-rp-rich-host'||data.token!==token||data.kind!=='measure-layout')return;const probeId=Number(data.probeId);const expectedViewportHeight=Number(data.expectedViewportHeight);if(!Number.isSafeInteger(probeId)||!Number.isFinite(expectedViewportHeight))return;postLayoutMeasure(probeId,data.phase,expectedViewportHeight)});
addEventListener('message',event=>{const data=event.data;if(event.source!==parent||data?.source!=='dsh-re3-rp-rich-host'||data.token!==token||data.kind!=='set-overflow-mode')return;document.documentElement.dataset.dshOverflowMode=data.mode==='inner'?'inner':'outer'});
addEventListener('message',event=>{const data=event.data;if(event.source!==parent||data?.source!=='dsh-re3-rp-rich-host'||data.token!==token||data.kind!=='host-ready')return;scheduleLayoutInvalidation('load')});
addEventListener('load',()=>{if(companion){scheduleCompanionReport();parent.postMessage({source:'dsh-re3-rp-rich-frame',token,kind:'frame-ready',epoch:runtimeEpoch},'*');return}const snapshot=collectLayoutSnapshot();parent.postMessage({source:'dsh-re3-rp-rich-frame',token,kind:'frame-ready',epoch:runtimeEpoch,height:snapshot.contentBottom,snapshot},'*');scheduleLayoutInvalidation('load')});
if(companion)setInterval(report,120);
else{
  let observedViewportHeight=innerHeight;
  let mutationTimer;
  let mutationBurstStartedAt=0;
  const scheduleMutationInvalidation=()=>{const now=performance.now();if(mutationBurstStartedAt===0)mutationBurstStartedAt=now;clearTimeout(mutationTimer);const delay=now-mutationBurstStartedAt>=750?0:96;mutationTimer=setTimeout(()=>{mutationTimer=undefined;mutationBurstStartedAt=0;layoutVersion+=1;scheduleLayoutInvalidation('mutation')},delay)};
  new ResizeObserver(()=>{const viewportHeight=innerHeight;const viewportChanged=Math.abs(viewportHeight-observedViewportHeight)>2;observedViewportHeight=viewportHeight;if(!viewportChanged)layoutVersion+=1;scheduleLayoutInvalidation(viewportChanged?'resize':'content')}).observe(document.body);
  new MutationObserver(records=>{if(records.every(record=>record.target===document.documentElement&&record.type==='attributes'&&record.attributeName==='data-dsh-overflow-mode'))return;scheduleMutationInvalidation()}).observe(document.documentElement,{attributes:true,characterData:true,childList:true,subtree:true});
  document.addEventListener('load',event=>{if(event.target!==document){layoutVersion+=1;scheduleLayoutInvalidation('load')}},true);
  document.fonts?.addEventListener?.('loadingdone',()=>{layoutVersion+=1;scheduleLayoutInvalidation('font')});
}
const setDraft=text=>send('setDraft',{text:String(text??'')});
const submitTurn=text=>send('submitTurn',{text:String(text??''),operationId:operation('turn')});
let draft='';
const textarea={get value(){return draft},set value(value){draft=String(value??'')},focus(){},dispatchEvent(event){if(event?.type==='input'||event?.type==='change')void setDraft(draft);return true}};
const sendButton={click(){if(draft.trim())void submitTurn(draft)}};
const compatDocument=Object.freeze({querySelector(selector){return selector==='#send_textarea'?textarea:selector==='#send_but'?sendButton:null},getElementById(id){return id==='send_textarea'?textarea:id==='send_but'?sendButton:null}});
async function triggerSlash(command){observeCompatibilityCall('TavernHelper','triggerSlash');const source=String(command??'');const set=/^\\/setinput\\s+([\\s\\S]*)$/u.exec(source);if(set)return setDraft(set[1]);const submit=/^\\/send\\s+([\\s\\S]*?)(?:\\s*\\|\\/trigger\\s*)?$/u.exec(source);if(submit)return submitTurn(submit[1]);throw Object.assign(new Error('Unsupported Tavern slash command'),{code:'capability_denied'});}
async function generate(config={}){observeCompatibilityCall('TavernHelper','generate');const operationId=operation('generate');const source=config&&typeof config==='object'?config:{};const signal=source.signal;const payload={...source,operationId};delete payload.signal;const cancel=()=>{void send('cancelGenerate',{operationId}).catch(()=>{})};if(signal?.aborted)throw Object.assign(new Error('Auxiliary generation cancelled'),{code:'generation_cancelled'});signal?.addEventListener?.('abort',cancel,{once:true});try{const result=await send('generate',payload);return String(result?.text??'')}finally{signal?.removeEventListener?.('abort',cancel)}}
async function refreshState(){const result=await send('getCardState');cardState=clone(result.state||{});return clone(cardState)}
const cardEvents=new EventTarget();
const tavernEvents=Object.freeze({MESSAGE_RECEIVED:'message_received'});
const mvuEvents=Object.freeze({VARIABLE_UPDATE_ENDED:'mvu:variable-update-ended'});
const eventOn=(name,handler)=>{observeCompatibilityCall('TavernHelper','eventOn');const listener=event=>handler(event.detail);cardEvents.addEventListener(String(name),listener);return()=>cardEvents.removeEventListener(String(name),listener)};
const eventEmit=(name,payload)=>{observeCompatibilityCall('TavernHelper','eventEmit');return cardEvents.dispatchEvent(new CustomEvent(String(name),{detail:payload}))};
async function replaceVariables(value){observeCompatibilityCall('TavernHelper','replaceVariables');cardState=clone(value||{});const result=await send('replaceCardState',{state:cardState,operationId:operation('replace-state')});cardState=clone(result.state||cardState);eventEmit(mvuEvents.VARIABLE_UPDATE_ENDED,{stat_data:clone(cardState)});return clone(cardState)}
async function insertOrAssignVariables(value){observeCompatibilityCall('TavernHelper','insertOrAssignVariables');cardState=merge(cardState,value||{});const result=await send('replaceCardState',{state:cardState,operationId:operation('merge-state')});cardState=clone(result.state||cardState);eventEmit(mvuEvents.VARIABLE_UPDATE_ENDED,{stat_data:clone(cardState)});return clone(cardState)}
async function getChatMessages(){observeCompatibilityCall('TavernHelper','getChatMessages');try{await refreshState()}catch{}const stat_data=clone(cardState);return[{data:{stat_data},extra:{stat_data}}]}
async function setChatMessages(messages){observeCompatibilityCall('TavernHelper','setChatMessages');return send('selectOpening',{messages,operationId:operation('opening')})}
const getVariables=()=>{observeCompatibilityCall('TavernHelper','getVariables');return clone(cardState)};
const getAllVariables=()=>{observeCompatibilityCall('TavernHelper','getAllVariables');return{stat_data:clone(cardState)}};
const mvu=Object.freeze({events:mvuEvents,get variables(){observeCompatibilityCall('MVU','variables');return clone(cardState)},getMvuData(){observeCompatibilityCall('MVU','getMvuData');return{stat_data:clone(cardState)}},async replaceMvuData(value){observeCompatibilityCall('MVU','replaceMvuData');await replaceVariables(value?.stat_data||{});return{stat_data:clone(cardState)}}});
const globalName=name=>{const value=String(name);if(!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value))throw new Error('Invalid global name: '+value);return value};
const initializeGlobal=(name,value)=>{observeCompatibilityCall('TavernHelper','initializeGlobal');const key=globalName(name);window[key]=value;const registered=new Set(String(document.documentElement.dataset.dshGlobalRegistered||'').split(',').filter(Boolean));registered.add(key);document.documentElement.dataset.dshGlobalRegistered=[...registered].join(',');if(companion){try{parent.postMessage({source:'dsh-re3-rp-rich-frame',token,kind:'global-registered',name:key,value:structuredClone(value)},'*')}catch{}}return value};
const waitGlobalInitialized=async name=>{observeCompatibilityCall('TavernHelper','waitGlobalInitialized');if(String(name)==='Mvu')return mvu;for(let attempt=0;attempt<300;attempt++){if(String(name) in window)return window[String(name)];if(!companion){try{const remote=await send('getCompanionGlobal',{name:String(name)});if(remote?.found){const key=globalName(name);window[key]=remote.value;return remote.value}}catch{}}await new Promise(resolve=>setTimeout(resolve,100))}throw new Error('Global unavailable: '+String(name))};
const errorCatched=callback=>async function(...args){try{return await callback.apply(this,args)}catch(error){console.error(error);return undefined}};
const getWorldbook=name=>{observeCompatibilityCall('TavernHelper','getWorldbook');return send('getWorldbook',{name})};
async function updateWorldbookWith(name,updater){observeCompatibilityCall('TavernHelper','updateWorldbookWith');const before=await getWorldbook(name);const after=await updater(clone(before));const updates=(after||[]).map(entry=>({id:String(entry.id??entry.uid??''),name:String(entry.name??entry.comment??''),enabled:entry.enabled===true}));await send('updateWorldbook',{updates,operationId:operation('worldbook')});return after}
async function replaceWorldbook(name,entries){observeCompatibilityCall('TavernHelper','replaceWorldbook');const updates=(entries||[]).map(entry=>({id:String(entry.id??entry.uid??''),name:String(entry.name??entry.comment??''),enabled:entry.enabled===true}));await send('updateWorldbook',{updates,operationId:operation('worldbook')});return entries}
const getCharWorldbookNames=()=>{observeCompatibilityCall('TavernHelper','getCharWorldbookNames');return{primary:cardTitle,additional:[]}};
const getWorldbookNames=()=>{observeCompatibilityCall('TavernHelper','getWorldbookNames');return[cardTitle]};
const rebindCharWorldbooks=async(_target,binding)=>{observeCompatibilityCall('TavernHelper','rebindCharWorldbooks');return binding};
const createWorldbookEntries=async(_name,entries)=>{observeCompatibilityCall('TavernHelper','createWorldbookEntries');return entries};
const helper=Object.freeze({getAllVariables,getVariables,replaceVariables,insertOrAssignVariables,getChatMessages,setChatMessages,generate,getWorldbook,getWorldbookNames,getCharWorldbookNames,updateWorldbookWith,replaceWorldbook,rebindCharWorldbooks,createWorldbookEntries,eventOn,eventEmit,initializeGlobal,waitGlobalInitialized,errorCatched});
const sillyContext=buildSillyTavernCompatibilityContext(messageCount,currentMessageId);
const silly=Object.freeze({get chat(){return sillyContext.chat},get chatId(){return sillyContext.chatId},get extensionSettings(){return sillyContext.extensionSettings},getContext:()=>{observeCompatibilityCall('SillyTavern','getContext');return sillyContext},app:{chat:{sendMessage:text=>{observeCompatibilityCall('SillyTavern','sendMessage');return submitTurn(text)}}}});
const audioSettings={bgm:{enabled:false}};
const getAudioSettings=channel=>clone(audioSettings[String(channel)]||{});
const setAudioSettings=(channel,value)=>{audioSettings[String(channel)]=merge(audioSettings[String(channel)]||{},value||{});return getAudioSettings(channel)};
Object.assign(window,{_:lodash,$:miniDollar,jQuery:miniDollar,__dshCompatDocument:compatDocument,__dshSillyTavern:silly,__dshTavernHelper:helper,__dshMvu:mvu,TavernHelper:helper,SillyTavern:silly,Mvu:mvu,tavern_events:tavernEvents,triggerSlash,_triggerSlash:triggerSlash,generate,initializeGlobal,waitGlobalInitialized,errorCatched,eventOn,eventEmit,getAllVariables,getVariables,replaceVariables,insertOrAssignVariables,getChatMessages,setChatMessages,getCurrentMessageId:()=>currentMessageId,getWorldbook,getWorldbookNames,getCharWorldbookNames,updateWorldbookWith,replaceWorldbook,rebindCharWorldbooks,createWorldbookEntries,getTavernVersion:()=> '1.18.0',getTavernHelperVersion:()=> '4.9.3-dsh.1',getAudioSettings,setAudioSettings,replaceAudioList:async()=>{},playAudio:async()=>{},toastr:{success(){},error(){},warning(){},info(){}}});
addEventListener('message',event=>{const data=event.data;if(event.source!==parent||data?.source!=='dsh-re3-rp-rich-host'||data.token!==token||data.kind!=='projection')return;cardState=clone(data.state||{});if(storageAckVersion>=storageWriteVersion&&data.storage&&typeof data.storage==='object')applyCanonicalStorage(data.storage);const nextMessageCount=Number(data.messageCount);if(Number.isSafeInteger(nextMessageCount)&&nextMessageCount>=0)messageCount=nextMessageCount;const nextMessageId=Number(data.currentMessageId);if(Number.isSafeInteger(nextMessageId))currentMessageId=nextMessageId;sillyContext.chat=Array.from({length:Math.max(0,messageCount)},()=>({}));sillyContext.chatId=currentMessageId;eventEmit(tavernEvents.MESSAGE_RECEIVED,{message_id:currentMessageId});eventEmit(mvuEvents.VARIABLE_UPDATE_ENDED,{stat_data:clone(cardState)});scheduleReport()});
addEventListener('message',event=>{const data=event.data;if(event.source!==parent||data?.source!=='dsh-re3-rp-rich-host'||data.token!==token||data.kind!=='global-published'||typeof data.name!=='string')return;try{const key=globalName(data.name);window[key]=data.value;document.documentElement.dataset.dshGlobalResolved=key}catch{}});
addEventListener('message',event=>{const data=event.data;if(!companion||event.source!==parent||data?.source!=='dsh-re3-rp-rich-host'||data.token!==token||data.kind!=='global-read')return;const name=String(data.name??'');let found=false;let value;try{if(name in window){value=window[name];found=true}else if(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)){value=eval(name);found=true}value=found?structuredClone(value):undefined}catch{found=false;value=undefined}parent.postMessage({source:'dsh-re3-rp-rich-frame',token,kind:'global-value',id:data.id,requesterToken:data.requesterToken,found,value},'*')});
window.__dshGameHost=Object.freeze({submitTurn:payload=>send('submitTurn',payload)});
window.__dshGameStateHost=Object.freeze({async getProjection(){const value=await send('getProjection');return{...value.state,state_digest:value.stateDigest}},subscribe(){return()=>{}},submitStateAction:payload=>send('submitStateAction',payload)});
addEventListener('click',async event=>{const button=event.target.closest?.('[data-mm-action="ring-east-bell"]');if(!button)return;const status=button.closest('[data-mm-marker]')?.querySelector('[data-mm-status]');button.disabled=true;if(status)status.textContent='正在提交正式行动…';try{const receipt=await window.__dshGameHost.submitTurn({text:'我握住铜钥匙，拉响东塔警铃。',operationId:'mm-watch-u1'});if(status){status.dataset.committed=String(receipt.committed===true);status.textContent=receipt.committed?'行动与新回复已进入同一聊天。':'宿主未确认提交。'}}catch(error){if(status){status.dataset.error=error.code||'bridge_unavailable';status.textContent='提交失败：'+status.dataset.error}}finally{button.disabled=false;scheduleReport()}});
})();<\/script>`;
      // TavernHelper cards commonly compile Vue applications as external-global
      // bundles. SillyTavern provides these globals at page scope; each DSH card
      // document has an isolated realm, so provide the same generic runtime set
      // before the card bootstrap executes. This is deliberately card-agnostic:
      // authored frontends still decide whether to use any of these libraries.
      const commonFrontendGlobals = `<script src="https://testingcf.jsdelivr.net/npm/vue@3.5.21/dist/vue.global.prod.js"><\/script><script src="https://testingcf.jsdelivr.net/npm/vue-router@4.5.1/dist/vue-router.global.prod.js"><\/script><script src="https://testingcf.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"><\/script><script>if(window.jsyaml&&!window.YAML)window.YAML=Object.freeze({...window.jsyaml,parse:window.jsyaml.load,stringify:window.jsyaml.dump});<\/script>`;
      const runtimeDiagnostics = `<script>(()=>{const token=${encodedToken};const record=value=>{const message=String(value);const write=()=>{const node=document.createElement('pre');node.hidden=true;node.dataset.dshRuntimeError='';node.textContent=message;document.body.appendChild(node)};document.body?write():addEventListener('DOMContentLoaded',write,{once:true});parent.postMessage({source:'dsh-re3-rp-rich-frame',token,kind:'runtime-error',message},'*')};const originalError=console.error.bind(console);console.error=(...values)=>{originalError(...values);record(values.map(value=>value?.stack||value).join(' '))};addEventListener('error',event=>record(event.message||event.error||'Card script error'),true);addEventListener('unhandledrejection',event=>record(event.reason||'Unhandled card rejection'))})();<\/script>`;
      return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><base href="${baseHref}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{height:auto!important;min-height:0!important;margin:0;overflow-x:hidden!important;overflow-y:hidden!important;max-width:100%!important;background:transparent;color-scheme:light dark}body{height:auto!important;min-height:0!important;margin:0;overflow-x:hidden!important;overflow-y:hidden!important;max-width:100%!important;background:transparent;font-family:system-ui,-apple-system,"Segoe UI","PingFang SC",sans-serif}html[data-dsh-overflow-mode="inner"],html[data-dsh-overflow-mode="inner"] body{overflow-y:auto!important}</style>${runtimeDiagnostics}${commonFrontendGlobals}</head><body>${bootstrap}${adapted}</body></html>`;
    }

    function postRichFrameReady(frame: HTMLIFrameElement, token: string): void {
      frame.contentWindow?.postMessage({
        source: "dsh-re3-rp-rich-host",
        token,
        kind: "host-ready",
      }, "*");
    }

    function createRichFrameSizingState(): RichFrameSizingState {
      return {
        probeId: 0,
        phase: "idle",
        expectedHeight: 72,
        baseHeight: 72,
        committedHeight: 72,
        viewportCoupled: false,
        releasedScrollKeys: [],
        releaseBasisKeys: [],
        verificationAttempts: 0,
        restartAttempts: 0,
        pendingProbe: false,
        settled: false,
        fallbackLatched: false,
        suppressResizeUntil: 0,
      };
    }

    function disposeRichFrameSizing(registration: RichFrameRegistration | undefined): void {
      const sizing = registration?.sizing;
      if (sizing === undefined) return;
      if (sizing.timer !== undefined) window.clearTimeout(sizing.timer);
      if (sizing.publishFrame !== undefined) cancelAnimationFrame(sizing.publishFrame);
      if (sizing.measurementTimer !== undefined) window.clearTimeout(sizing.measurementTimer);
      if (sizing.fallbackRetryTimer !== undefined) window.clearTimeout(sizing.fallbackRetryTimer);
    }

    function getRichFrameShell(registration: RichFrameRegistration): HTMLElement | null {
      const shell = registration.frame.parentElement;
      return shell instanceof HTMLElement && shell.classList.contains("tavern-native-rich-frame-shell") ? shell : null;
    }

    function lockRichFrameShell(registration: RichFrameRegistration): void {
      const sizing = registration.sizing;
      const shell = getRichFrameShell(registration);
      if (sizing === undefined || shell === null || !sizing.settled) return;
      shell.style.height = `${clampRichFrameHeight(shell.getBoundingClientRect().height)}px`;
      shell.dataset.tavernRichShell = "probing";
    }

    function commitRichFrameShellHeight(registration: RichFrameRegistration, height: number): void {
      const sizing = registration.sizing;
      const shell = getRichFrameShell(registration);
      if (sizing === undefined || shell === null) return;
      const currentHeight = clampRichFrameHeight(shell.getBoundingClientRect().height);
      const targetHeight = clampRichFrameHeight(height);
      shell.style.height = `${currentHeight}px`;
      shell.dataset.tavernRichShell = "ready";
      void shell.offsetHeight;
      shell.style.height = `${targetHeight}px`;
    }

    function postRichFrameOverflowMode(registration: RichFrameRegistration, mode: "outer" | "inner"): void {
      if (mode === "inner") registration.frame.removeAttribute("scrolling");
      else registration.frame.setAttribute("scrolling", "no");
      registration.frame.contentWindow?.postMessage({
        source: "dsh-re3-rp-rich-host",
        token: registration.token,
        kind: "set-overflow-mode",
        mode,
      }, "*");
    }

    function settleRichFrameSizing(
      registration: RichFrameRegistration,
      height: number,
      disposition: "intrinsic" | "viewport" | "inner-scroll" | "fallback",
    ): void {
      const sizing = registration.sizing;
      if (sizing === undefined) return;
      const measuredLayoutVersion = sizing.layoutVersion;
      const pendingProbe = sizing.pendingProbe && (
        sizing.pendingReason === "viewport"
        || sizing.pendingLayoutVersion === undefined
        || measuredLayoutVersion === undefined
        || sizing.pendingLayoutVersion > measuredLayoutVersion
      );
      const pendingReason = sizing.pendingReason ?? "mutation";
      const pendingLayoutVersion = sizing.pendingLayoutVersion;
      sizing.phase = "settled";
      sizing.expectedHeight = clampRichFrameHeight(height);
      sizing.committedHeight = sizing.expectedHeight;
      sizing.first = undefined;
      sizing.verificationFirst = undefined;
      sizing.layoutVersion = undefined;
      sizing.pendingProbe = false;
      sizing.pendingReason = undefined;
      sizing.pendingLayoutVersion = undefined;
      sizing.settled = true;
      if (disposition !== "inner-scroll") {
        sizing.fallbackLatched = false;
        if (sizing.fallbackRetryTimer !== undefined) window.clearTimeout(sizing.fallbackRetryTimer);
        sizing.fallbackRetryTimer = undefined;
      }
      sizing.cycleStartedAt = undefined;
      sizing.restartAttempts = 0;
      sizing.suppressResizeUntil = performance.now() + 250;
      registration.frame.style.height = `${sizing.expectedHeight}px`;
      commitRichFrameShellHeight(registration, sizing.expectedHeight);
      registration.frame.style.removeProperty("visibility");
      registration.frame.dataset.tavernRichSizing = disposition;
      if (pendingProbe) scheduleRichFrameProbe(registration, pendingReason, pendingLayoutVersion);
    }

    function fallbackRichFrameSizing(registration: RichFrameRegistration): void {
      const sizing = registration.sizing;
      if (sizing === undefined) return;
      sizing.pendingProbe = false;
      sizing.fallbackLatched = true;
      postRichFrameOverflowMode(registration, "inner");
      const fallbackHeight = sizing.settled ? sizing.committedHeight : (sizing.first?.bodyHeight ?? sizing.baseHeight);
      settleRichFrameSizing(registration, fallbackHeight, "inner-scroll");
    }

    function restartRichFrameProbe(registration: RichFrameRegistration): void {
      const sizing = registration.sizing;
      if (sizing === undefined) return;
      const elapsed = performance.now() - (sizing.cycleStartedAt ?? performance.now());
      if (sizing.restartAttempts >= 4 || elapsed >= 2_500) {
        fallbackRichFrameSizing(registration);
        return;
      }
      sizing.restartAttempts += 1;
      sizing.phase = "idle";
      scheduleRichFrameProbe(registration, "retry");
    }

    function restartRichFrameAfterLoad(registration: RichFrameRegistration): void {
      const sizing = registration.sizing;
      if (sizing === undefined) return;
      if (sizing.timer !== undefined) window.clearTimeout(sizing.timer);
      if (sizing.publishFrame !== undefined) cancelAnimationFrame(sizing.publishFrame);
      if (sizing.measurementTimer !== undefined) window.clearTimeout(sizing.measurementTimer);
      if (sizing.fallbackRetryTimer !== undefined) window.clearTimeout(sizing.fallbackRetryTimer);
      sizing.timer = undefined;
      sizing.publishFrame = undefined;
      sizing.measurementTimer = undefined;
      sizing.fallbackRetryTimer = undefined;
      sizing.probeId += 1;
      sizing.phase = "idle";
      sizing.expectedHeight = sizing.committedHeight;
      sizing.first = undefined;
      sizing.verificationFirst = undefined;
      sizing.layoutVersion = undefined;
      sizing.viewportCoupled = false;
      sizing.releasedScrollKeys = [];
      sizing.releaseBasisKeys = [];
      sizing.verificationAttempts = 0;
      sizing.cycleStartedAt = undefined;
      sizing.restartAttempts = 0;
      sizing.pendingProbe = false;
      sizing.pendingReason = undefined;
      sizing.pendingLayoutVersion = undefined;
      sizing.scheduledReason = undefined;
      sizing.fallbackLatched = false;
      sizing.suppressResizeUntil = 0;
      registration.frame.style.visibility = "hidden";
      scheduleRichFrameProbe(registration, "load");
    }

    function requestRichFrameMeasure(registration: RichFrameRegistration, phase: "first" | "second" | "verify" | "verify-second" | "refresh", height: number): void {
      const sizing = registration.sizing;
      if (sizing === undefined) return;
      if (sizing.publishFrame !== undefined) cancelAnimationFrame(sizing.publishFrame);
      if (sizing.measurementTimer !== undefined) window.clearTimeout(sizing.measurementTimer);
      sizing.phase = phase;
      sizing.expectedHeight = clampRichFrameHeight(height);
      registration.frame.style.height = `${sizing.expectedHeight}px`;
      sizing.publishFrame = requestAnimationFrame(() => {
        sizing.publishFrame = undefined;
        if (sizing.phase !== phase) return;
        registration.frame.contentWindow?.postMessage({
          source: "dsh-re3-rp-rich-host",
          token: registration.token,
          kind: "measure-layout",
          probeId: sizing.probeId,
          phase,
          expectedViewportHeight: sizing.expectedHeight,
        }, "*");
        sizing.measurementTimer = window.setTimeout(() => {
          if (sizing.phase !== phase) return;
          sizing.measurementTimer = undefined;
          fallbackRichFrameSizing(registration);
        }, 1_500);
      });
    }

    function beginRichFrameRefresh(registration: RichFrameRegistration): void {
      const sizing = registration.sizing;
      if (sizing === undefined || registration.frame.isConnected !== true) return;
      if (sizing.timer !== undefined) window.clearTimeout(sizing.timer);
      sizing.timer = undefined;
      sizing.probeId += 1;
      sizing.first = undefined;
      sizing.verificationFirst = undefined;
      sizing.layoutVersion = undefined;
      sizing.pendingProbe = false;
      sizing.pendingReason = undefined;
      sizing.pendingLayoutVersion = undefined;
      lockRichFrameShell(registration);
      registration.frame.dataset.tavernRichSizing = "refreshing";
      requestRichFrameMeasure(registration, "refresh", sizing.committedHeight);
    }

    function beginRichFrameProbe(registration: RichFrameRegistration, reason: string): void {
      const sizing = registration.sizing;
      if (sizing === undefined || registration.frame.isConnected !== true) return;
      if (sizing.settled && reason !== "load" && reason !== "retry" && reason !== "viewport") {
        beginRichFrameRefresh(registration);
        return;
      }
      if (sizing.timer !== undefined) window.clearTimeout(sizing.timer);
      sizing.timer = undefined;
      if (sizing.cycleStartedAt === undefined) sizing.cycleStartedAt = performance.now();
      sizing.probeId += 1;
      sizing.first = undefined;
      sizing.verificationFirst = undefined;
      sizing.layoutVersion = undefined;
      sizing.viewportCoupled = false;
      sizing.releasedScrollKeys = [];
      sizing.releaseBasisKeys = [];
      sizing.verificationAttempts = 0;
      sizing.pendingProbe = false;
      sizing.pendingReason = undefined;
      sizing.pendingLayoutVersion = undefined;
      lockRichFrameShell(registration);
      if (!sizing.settled) registration.frame.style.visibility = "hidden";
      registration.frame.dataset.tavernRichSizing = "probing";
      postRichFrameOverflowMode(registration, "outer");
      const baseHeight = clampRichFrameHeight(window.visualViewport?.height ?? window.innerHeight);
      sizing.baseHeight = baseHeight;
      requestRichFrameMeasure(registration, "first", baseHeight);
    }

    function scheduleRichFrameProbe(registration: RichFrameRegistration, reason: string, layoutVersion?: number): void {
      const sizing = registration.sizing;
      if (sizing === undefined) return;
      const suppressesFallbackFeedback = performance.now() < sizing.suppressResizeUntil
        && (reason === "resize" || reason === "content");
      if (sizing.fallbackLatched) {
        if (suppressesFallbackFeedback) return;
        if (reason === "viewport") {
          sizing.fallbackLatched = false;
          if (sizing.fallbackRetryTimer !== undefined) window.clearTimeout(sizing.fallbackRetryTimer);
          sizing.fallbackRetryTimer = undefined;
        } else {
          if (reason === "resize") return;
          if (sizing.fallbackRetryTimer !== undefined) window.clearTimeout(sizing.fallbackRetryTimer);
          sizing.fallbackRetryTimer = window.setTimeout(() => {
            sizing.fallbackRetryTimer = undefined;
            sizing.fallbackLatched = false;
            scheduleRichFrameProbe(registration, "retry");
          }, 500);
          return;
        }
      }
      if (reason === "resize" && (sizing.phase !== "settled" || performance.now() < sizing.suppressResizeUntil)) return;
      if (sizing.cycleStartedAt === undefined) {
        sizing.cycleStartedAt = performance.now();
        sizing.restartAttempts = 0;
      }
      if (sizing.phase === "first" || sizing.phase === "second" || sizing.phase === "verify" || sizing.phase === "verify-second" || sizing.phase === "refresh") {
        sizing.pendingProbe = true;
        sizing.pendingReason = sizing.pendingReason === "viewport" || reason !== "viewport" ? (sizing.pendingReason ?? reason) : "viewport";
        if (Number.isSafeInteger(layoutVersion)) sizing.pendingLayoutVersion = Math.max(sizing.pendingLayoutVersion ?? -1, Number(layoutVersion));
        return;
      }
      if (sizing.timer !== undefined) {
        if (reason === "viewport") sizing.scheduledReason = "viewport";
        return;
      }
      sizing.scheduledReason = reason;
      sizing.timer = window.setTimeout(() => {
        const scheduledReason = sizing.scheduledReason ?? reason;
        sizing.scheduledReason = undefined;
        beginRichFrameProbe(registration, scheduledReason);
      }, reason === "load" ? 0 : 48);
    }

    function normalizeRichFrameSnapshot(value: any): RichFrameLayoutSnapshot | null {
      if (value === null || typeof value !== "object" || !Array.isArray(value.scrollables)) return null;
      const finite = (candidate: unknown): number | null => {
        return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
      };
      const viewportHeight = finite(value.viewportHeight);
      const bodyHeight = finite(value.bodyHeight);
      const contentBottom = finite(value.contentBottom);
      const layoutVersion = typeof value.layoutVersion === "number" ? value.layoutVersion : Number.NaN;
      if (viewportHeight === null || viewportHeight <= 0 || bodyHeight === null || bodyHeight < 0 || contentBottom === null || contentBottom < 0 || !Number.isSafeInteger(layoutVersion) || layoutVersion < 0) return null;
      if (value.scrollables.length > 5_000) return null;
      const scrollables: RichFrameScrollableMetrics[] = [];
      for (let itemIndex = 0; itemIndex < value.scrollables.length; itemIndex += 1) {
        const item = value.scrollables[itemIndex];
        if (item === null || typeof item !== "object" || typeof item.key !== "string" || item.key.length > 256 || !Array.isArray(item.owners)) continue;
        const top = finite(item.top);
        const clientHeight = finite(item.clientHeight);
        const scrollHeight = finite(item.scrollHeight);
        if (top === null || clientHeight === null || clientHeight < 0 || scrollHeight === null || scrollHeight < 0) continue;
        if (item.owners.length > 100) continue;
        const owners: NonNullable<RichFrameScrollableMetrics["owners"]> = [];
        let validOwners = true;
        for (let ownerIndex = 0; ownerIndex < item.owners.length; ownerIndex += 1) {
          const owner = item.owners[ownerIndex];
          if (owner === null || typeof owner !== "object" || typeof owner.key !== "string" || owner.key.length > 256 || (owner.kind !== "fixed" && owner.kind !== "clip" && owner.kind !== "scroll")) {
            validOwners = false;
            break;
          }
          const ownerHeight = finite(owner.clientHeight);
          if (ownerHeight === null || ownerHeight < 0) {
            validOwners = false;
            break;
          }
          owners.push({ key: owner.key, kind: owner.kind, clientHeight: ownerHeight });
        }
        if (!validOwners) continue;
        scrollables.push({ key: item.key, visible: item.visible === true, top, clientHeight, scrollHeight, owners });
      }
      return { viewportHeight, bodyHeight, contentBottom, layoutVersion, scrollables };
    }

    function NativeRichFrame(props: { content: string; token: string; revisionId: string; variableState: Record<string, unknown>; frontendStorage: Record<string, string>; cardTitle: string; messageCount: number; register: (token: string, frame: HTMLIFrameElement | null, registeredFrame?: HTMLIFrameElement) => void; ready: (token: string, frame: HTMLIFrameElement) => void }): any {
      const frameRef = React.useRef(null as HTMLIFrameElement | null);
      // Authored content plus the immutable card revision identify the iframe
      // document. Session state and message count remain live Bridge data, so
      // ordinary projection refreshes do not navigate an existing realm.
      const source = React.useMemo(
        () => `data:text/html;charset=utf-8,${encodeURIComponent(nativeRichSrcDoc(props.content, props.token, props.variableState, props.frontendStorage, props.cardTitle, props.messageCount, props.revisionId))}`,
        [props.content, props.token, props.cardTitle, props.revisionId],
      );
      const pushProjection = (): void => {
        const currentMessageId = Number(props.token.split(":", 1)[0]) || -1;
        frameRef.current?.contentWindow?.postMessage({
          source: "dsh-re3-rp-rich-host",
          token: props.token,
          kind: "projection",
          state: props.variableState,
          storage: props.frontendStorage,
          messageCount: props.messageCount,
          currentMessageId,
        }, "*");
      };
      React.useEffect(() => { pushProjection(); }, [props.variableState, props.frontendStorage, props.messageCount]);
      const registerFrame = React.useCallback((frame: HTMLIFrameElement | null): void => {
        const registeredFrame = frameRef.current ?? undefined;
        frameRef.current = frame;
        props.register(props.token, frame, registeredFrame);
      }, [props.register, props.token]);
      return h("div", { className: "tavern-native-rich-frame-shell", "data-tavern-rich-shell": "loading" },
        h("iframe", {
          className: "tavern-native-rich-frame",
          title: "卡片生成的消息前端",
          // A data document keeps a unique opaque origin while allow-same-origin
          // restores the inline handlers and Web Storage semantics used by real
          // Tavern card UIs. The card still cannot read the DSH parent document.
          // Real Tavern setup UIs commonly gate their final submit behind
          // confirm(). Keep the frame isolated from the Host while allowing that
          // explicit player confirmation to unblock the narrow Bridge action.
          sandbox: "allow-scripts allow-same-origin allow-modals",
          scrolling: "no",
          src: source,
          referrerPolicy: "no-referrer",
          "data-tavern-rich-token": props.token,
          onLoad: (event: Event) => {
            pushProjection();
            const frame = event.currentTarget as HTMLIFrameElement;
            const readyEpoch = frame.dataset.tavernRichReadyEpoch;
            window.setTimeout(() => {
              if (frame.isConnected && frame.dataset.tavernRichReadyEpoch === readyEpoch) props.ready(props.token, frame);
            }, 120);
          },
          ref: registerFrame,
        }));
    }

    function companionSrcDoc(scripts: readonly CompanionScript[], token: string, frontendStorage: Record<string, string>, cardTitle: string): string {
      const encodedSources = JSON.stringify(scripts.map((script) => ({ id: script.id, name: script.name, source: adaptTavernHelperScriptSource(script.source) })))
        .replace(/</gu, "\\u003c").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");
      const runner = `<script>(async()=>{document.documentElement.dataset.dshCompanionRunner='started';const scripts=${encodedSources};for(const script of scripts){const url=URL.createObjectURL(new Blob([script.source],{type:'text/javascript'}));try{await import(url)}catch(error){console.error('[DSH Re3 RPHelper] '+script.name,error);const diagnostic=document.createElement('pre');diagnostic.hidden=true;diagnostic.dataset.dshRuntimeError='';diagnostic.textContent='[DSH Re3 RPHelper] '+script.name+': '+(error?.stack||error);document.body.appendChild(diagnostic)}finally{URL.revokeObjectURL(url)}}document.documentElement.dataset.dshCompanionRunner='complete'})();<\/script>`;
      return nativeRichSrcDoc(runner, token, {}, frontendStorage, cardTitle, 0);
    }

    function NativeCompanionRuntime(props: { sessionId: string; revisionId: string; scripts: readonly CompanionScript[]; variableState: Record<string, unknown>; frontendStorage: Record<string, string>; cardTitle: string; messages: readonly ProjectedMessage[]; register: (token: string, frame: HTMLIFrameElement | null, registeredFrame?: HTMLIFrameElement) => void }): any {
      const token = `companion:${props.sessionId}:${props.revisionId}`;
      const frameRef = React.useRef(null as HTMLIFrameElement | null);
      // Real TavernHelper bundles regularly exceed one megabyte. Percent-
      // encoding those bundles into a data URL crosses browser URL limits and
      // fails as an empty frame without a useful error. srcdoc carries the same
      // isolated document without a URL-size ceiling.
      const scriptsIdentity = props.scripts.map((script) => `${script.id}\u0000${script.name}\u0000${script.source}`).join("\u0001");
      const sourceDocument = React.useMemo(
        () => companionSrcDoc(props.scripts, token, props.frontendStorage, props.cardTitle),
        [scriptsIdentity, token, props.cardTitle],
      );
      const pushProjection = (): void => {
        const currentMessageId = props.messages.filter((message) => message.role === "assistant").at(-1)?.seq ?? -1;
        frameRef.current?.contentWindow?.postMessage({ source: "dsh-re3-rp-rich-host", token, kind: "projection", state: props.variableState, storage: props.frontendStorage, messageCount: props.messages.length, currentMessageId }, "*");
      };
      React.useEffect(() => { pushProjection(); }, [props.variableState, props.frontendStorage, props.messages.length]);
      const registerFrame = React.useCallback((frame: HTMLIFrameElement | null): void => {
        const registeredFrame = frameRef.current ?? undefined;
        frameRef.current = frame;
        props.register(token, frame, registeredFrame);
      }, [props.register, token]);
      return h("iframe", {
        className: "tavern-native-companion-frame",
        title: "卡片 TavernHelper 伴随前端",
        sandbox: "allow-scripts allow-modals",
        srcDoc: sourceDocument,
        referrerPolicy: "no-referrer",
        "data-tavern-companion-runtime": props.revisionId,
        onLoad: pushProjection,
        ref: registerFrame,
      });
    }

    function NativeHostedFrontend(props: { frontend: HostedFrontend }): any {
      return h("iframe", {
        className: `tavern-native-hosted-frame is-${props.frontend.container}`,
        title: "卡片声明的宿主前端",
        sandbox: "allow-scripts allow-same-origin",
        src: props.frontend.entryUrl,
        referrerPolicy: "no-referrer",
        "data-tavern-hosted-frontend": props.frontend.caseId,
      });
    }

    function NativeRichMessage(props: { message: ProjectedMessage; revisionId: string; frontend?: HostedFrontend; variableState: Record<string, unknown>; frontendStorage: Record<string, string>; cardTitle: string; messageCount: number; register: (token: string, frame: HTMLIFrameElement | null, registeredFrame?: HTMLIFrameElement) => void; ready: (token: string, frame: HTMLIFrameElement) => void }): any {
      const blocks = splitRichMessage(props.message.text);
      const content = blocks.map((block, index) => block.kind === "prose"
        ? h(MarkdownText, { text: block.content, key: `prose:${index}` })
        : h(NativeRichFrame, { content: block.content, token: `${props.message.seq}:${index}`, revisionId: props.revisionId, variableState: props.variableState, frontendStorage: props.frontendStorage, cardTitle: props.cardTitle, messageCount: props.messageCount, register: props.register, ready: props.ready, key: `html:${props.revisionId}:${index}` }));
      if (props.frontend !== undefined) content.push(h(NativeHostedFrontend, { frontend: props.frontend, key: "hosted-frontend" }));
      return h("div", { className: "tavern-native-message" }, ...content);
    }

    function TavernNativeMessageAdapter(props: any): any {
      const sessionId = props.sessionId as string;
      const [projectionState, setProjectionState] = React.useState({ sessionId, value: undefined as ConversationProjection | null | undefined });
      const projection = projectionState.sessionId === sessionId ? projectionState.value : undefined;
      const [, refreshPermission] = React.useReducer((value: number) => value + 1, 0);
      const anchorRef = React.useRef(null as HTMLSpanElement | null);
      const mountsRef = React.useRef(new Map<HTMLElement, NativeRichMount>());
      const framesRef = React.useRef(new Map<string, RichFrameRegistration>());
      const retiredFramesRef = React.useRef(new Map<Window, { token: string; sessionId: string; revisionId: string; expiresAt: number }>());
      const projectionRef = React.useRef(projection);
      projectionRef.current = projection;
      const activeRevisionIdRef = React.useRef(projection?.revisionId ?? "");
      activeRevisionIdRef.current = projection?.revisionId ?? "";
      const scheduleScanRef = React.useRef(undefined as (() => void) | undefined);
      const [projectionRevision, refreshProjection] = React.useReducer((value: number) => value + 1, 0);
      const register = React.useCallback((token: string, frame: HTMLIFrameElement | null, registeredFrame?: HTMLIFrameElement): void => {
        const previous = framesRef.current.get(token);
        if (frame === null) {
          if (registeredFrame === undefined || previous?.frame !== registeredFrame) return;
          const source = registeredFrame.contentWindow;
          if (source !== null) {
            const retired = { token, sessionId: previous.sessionId, revisionId: previous.revisionId, expiresAt: performance.now() + 1_000 };
            retiredFramesRef.current.set(source, retired);
            window.setTimeout(() => {
              if (retiredFramesRef.current.get(source) === retired) retiredFramesRef.current.delete(source);
            }, 1_000);
          }
          disposeRichFrameSizing(previous);
          framesRef.current.delete(token);
          return;
        }
        if (previous?.frame === frame) {
          previous.sessionId = sessionId;
          return;
        }
        disposeRichFrameSizing(previous);
        framesRef.current.set(token, {
          token,
          frame,
          sessionId,
          revisionId: activeRevisionIdRef.current,
          sizing: token.startsWith("companion:") ? undefined : createRichFrameSizingState(),
        });
      }, [sessionId]);
      const sessionRevision = props.useSession((snapshot: any) => `${snapshot.nodes.length}:${snapshot.running}:${snapshot.openState}`);

      React.useEffect(() => {
        const controller = new AbortController();
        void fetch(`/dsh-re3-rp/conversation-projection?sessionId=${encodeURIComponent(sessionId)}&optional=1`, { cache: "no-store", signal: controller.signal })
          .then(async (response) => {
            if (response.status === 204) return null;
            if (!response.ok) throw new Error(`conversation projection failed: ${response.status}`);
            return await response.json() as ConversationProjection;
          })
          .then((value) => {
            if (controller.signal.aborted) return;
            setProjectionState({ sessionId, value });
            if (value === null) clearActiveTavernSession(sessionId);
            else syncActiveTavernSession(sessionId, value.revisionId);
          })
          .catch(() => {
            if (controller.signal.aborted) return;
            // A transient transport failure is not authoritative deletion.
            // Keep the last-known-good projection and its live iframe realms;
            // only an explicit 204 tears the adapter down.
          });
        return () => controller.abort();
      }, [sessionId, sessionRevision, projectionRevision]);

      React.useEffect(() => {
        const refresh = (event: Event): void => {
          if ((event as CustomEvent<{ sessionId?: string }>).detail?.sessionId === sessionId) refreshProjection();
        };
        window.addEventListener("dsh-re3-rp:projection-changed", refresh);
        return () => window.removeEventListener("dsh-re3-rp:projection-changed", refresh);
      }, [sessionId]);

      React.useEffect(() => {
        const refresh = (): void => refreshPermission();
        window.addEventListener("dsh-re3-rp:companion-permission", refresh);
        return () => window.removeEventListener("dsh-re3-rp:companion-permission", refresh);
      }, []);

      React.useEffect(() => {
        let viewportFrame: number | undefined;
        const publishViewport = (): void => {
          viewportFrame = undefined;
          for (const registration of framesRef.current.values()) scheduleRichFrameProbe(registration, "viewport");
        };
        const scheduleViewport = (): void => {
          if (viewportFrame === undefined) viewportFrame = requestAnimationFrame(publishViewport);
        };
        window.addEventListener("resize", scheduleViewport);
        window.visualViewport?.addEventListener("resize", scheduleViewport);
        scheduleViewport();
        return () => {
          window.removeEventListener("resize", scheduleViewport);
          window.visualViewport?.removeEventListener("resize", scheduleViewport);
          if (viewportFrame !== undefined) cancelAnimationFrame(viewportFrame);
        };
      }, []);

      React.useLayoutEffect(() => {
        const scroll = anchorRef.current?.closest('[data-conversation-scroll]') as HTMLElement | null;
        if (scroll === null) return;
        const mounts = mountsRef.current;
        const frames = framesRef.current;
        let viewportAnchor: { element: HTMLElement; offset: number } | undefined;
        let viewportAnchorFrame: number | undefined;
        let viewportAnchorCaptureFrame: number | undefined;
        let viewportAnchorDeadline = 0;
        let viewportAnchorSuppressedUntil = 0;
        let restoringViewportAnchor = false;
        const captureViewportAnchor = (): void => {
          const scrollRect = scroll.getBoundingClientRect();
          if (scrollRect.width <= 0 || scrollRect.height <= 0) return;
          const visibleShell = Array.from(scroll.querySelectorAll<HTMLElement>(".tavern-native-rich-frame-shell"))
            .find((candidate) => {
              const rect = candidate.getBoundingClientRect();
              return rect.bottom > scrollRect.top + 1 && rect.top < scrollRect.bottom - 1;
            });
          const point = visibleShell ?? document.elementFromPoint(
            Math.min(scrollRect.right - 1, scrollRect.left + Math.min(48, scrollRect.width / 2)),
            Math.min(scrollRect.bottom - 1, scrollRect.top + Math.min(48, scrollRect.height / 2)),
          );
          const element = point instanceof HTMLElement && point !== scroll && scroll.contains(point) ? point : undefined;
          if (element === undefined) return;
          viewportAnchor = { element, offset: element.getBoundingClientRect().top - scrollRect.top };
        };
        const scheduleViewportAnchorCapture = (): void => {
          if (restoringViewportAnchor || performance.now() < viewportAnchorDeadline || viewportAnchorCaptureFrame !== undefined) return;
          viewportAnchorCaptureFrame = requestAnimationFrame(() => {
            viewportAnchorCaptureFrame = undefined;
            captureViewportAnchor();
          });
        };
        const scheduleUserViewportAnchorCapture = (): void => {
          if (restoringViewportAnchor || viewportAnchorCaptureFrame !== undefined) return;
          viewportAnchorCaptureFrame = requestAnimationFrame(() => {
            viewportAnchorCaptureFrame = undefined;
            captureViewportAnchor();
          });
        };
        const restoreViewportAnchor = (): void => {
          const anchor = viewportAnchor;
          if (anchor === undefined || !anchor.element.isConnected || !scroll.contains(anchor.element)) {
            captureViewportAnchor();
            return;
          }
          const delta = anchor.element.getBoundingClientRect().top - scroll.getBoundingClientRect().top - anchor.offset;
          if (!Number.isFinite(delta) || Math.abs(delta) <= 0.5) return;
          restoringViewportAnchor = true;
          const previousScrollBehavior = scroll.style.scrollBehavior;
          scroll.style.scrollBehavior = "auto";
          scroll.scrollTop += delta;
          scroll.style.scrollBehavior = previousScrollBehavior;
          restoringViewportAnchor = false;
        };
        const runViewportAnchorStabilization = (): void => {
          restoreViewportAnchor();
          if (performance.now() < viewportAnchorDeadline) {
            viewportAnchorFrame = requestAnimationFrame(runViewportAnchorStabilization);
            return;
          }
          viewportAnchorFrame = undefined;
          captureViewportAnchor();
        };
        const stabilizeViewportAnchor = (): void => {
          if (performance.now() < viewportAnchorSuppressedUntil) return;
          if (viewportAnchor === undefined) captureViewportAnchor();
          viewportAnchorDeadline = performance.now() + 450;
          if (viewportAnchorFrame === undefined) viewportAnchorFrame = requestAnimationFrame(runViewportAnchorStabilization);
        };
        const cancelViewportAnchorForUserInput = (): void => {
          viewportAnchorSuppressedUntil = performance.now() + 750;
          viewportAnchorDeadline = 0;
          viewportAnchor = undefined;
          if (viewportAnchorFrame !== undefined) cancelAnimationFrame(viewportAnchorFrame);
          viewportAnchorFrame = undefined;
        };
        const handleConversationScroll = (): void => {
          if (restoringViewportAnchor) return;
          if (performance.now() < viewportAnchorSuppressedUntil) scheduleUserViewportAnchorCapture();
          else if (performance.now() >= viewportAnchorDeadline) scheduleViewportAnchorCapture();
        };
        const handleViewportNavigationKey = (event: KeyboardEvent): void => {
          if (["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "].includes(event.key)) cancelViewportAnchorForUserInput();
        };
        const viewportResizeObserver = new ResizeObserver(stabilizeViewportAnchor);
        viewportResizeObserver.observe(scroll);
        scroll.addEventListener("scroll", handleConversationScroll, { passive: true });
        scroll.addEventListener("wheel", cancelViewportAnchorForUserInput, { passive: true });
        scroll.addEventListener("touchstart", cancelViewportAnchorForUserInput, { passive: true });
        scroll.addEventListener("pointerdown", cancelViewportAnchorForUserInput, { passive: true });
        window.addEventListener("keydown", handleViewportNavigationKey);
        window.addEventListener("resize", stabilizeViewportAnchor);
        window.visualViewport?.addEventListener("resize", stabilizeViewportAnchor);
        const ready = (token: string, frame: HTMLIFrameElement): void => {
          const registration = frames.get(token);
          if (registration === undefined || registration.frame !== frame) return;
          const currentProjection = projectionRef.current;
          if (currentProjection !== undefined && currentProjection !== null && registration.revisionId === currentProjection.revisionId) {
            const latestAssistantSeq = currentProjection.messages.filter((message: ProjectedMessage) => message.role === "assistant").at(-1)?.seq ?? -1;
            const ownMessageId = Number(token.split(":", 1)[0]);
            frame.contentWindow?.postMessage({
              source: "dsh-re3-rp-rich-host",
              token,
              kind: "projection",
              state: currentProjection.variableState ?? {},
              storage: currentProjection.frontendStorage ?? {},
              messageCount: currentProjection.messages.length,
              currentMessageId: Number.isSafeInteger(ownMessageId) ? ownMessageId : latestAssistantSeq,
            }, "*");
          }
          postRichFrameReady(frame, token);
          restartRichFrameAfterLoad(registration);
          scheduleViewportAnchorCapture();
        };
        const companionGlobals = new Map<string, Map<string, unknown>>();
        const hiddenThoughts = new Map<HTMLElement, string>();
        let scanFrame: number | undefined;
        const restore = (mount: NativeRichMount): void => {
          mount.original.style.removeProperty("display");
          mount.root.unmount();
          mount.display.remove();
          mounts.delete(mount.item);
          delete mount.item.dataset.tavernRichMessage;
        };
        const restoreThought = (thought: HTMLElement): void => {
          const display = hiddenThoughts.get(thought);
          if (display === undefined) return;
          if (display.length === 0) thought.style.removeProperty("display");
          else thought.style.display = display;
          hiddenThoughts.delete(thought);
        };
        const scan = (): void => {
          const currentProjection = projectionRef.current;
          if (currentProjection === undefined) return;
          if (currentProjection === null) {
            for (const mount of [...mounts.values()]) restore(mount);
            for (const thought of [...hiddenThoughts.keys()]) restoreThought(thought);
            return;
          }
          const flowItems = Array.from(scroll.querySelectorAll<HTMLElement>('[data-chat-flow-kind="user"], [data-chat-flow-kind="assistant-step"]'));
          const liveThoughts = new Set<HTMLElement>();
          for (const item of flowItems) {
            if (item.dataset.chatFlowKind !== "assistant-step") continue;
            for (const thought of Array.from(item.querySelectorAll<HTMLElement>('[data-variant="think"]'))) {
              liveThoughts.add(thought);
              if (!hiddenThoughts.has(thought)) hiddenThoughts.set(thought, thought.style.display);
              thought.style.display = "none";
            }
          }
          for (const thought of [...hiddenThoughts.keys()]) if (!liveThoughts.has(thought) || !thought.isConnected) restoreThought(thought);
          const projectedAssistantSeqs = new Set(currentProjection.messages.filter((message: ProjectedMessage) => message.role === "assistant").map((message: ProjectedMessage) => message.seq));
          for (const mount of [...mounts.values()]) {
            if (!mount.item.isConnected || !scroll.contains(mount.item) || !projectedAssistantSeqs.has(mount.messageSeq)) restore(mount);
          }
          const aligned = alignProjectedRoles(
            flowItems.map((item) => item.dataset.chatFlowKind === "user" ? "user" : "assistant"),
            currentProjection.messages.map((message: ProjectedMessage) => message.role),
          );
          if (aligned === null) return;
          const liveItems = new Set<HTMLElement>();
          const hostedMessageSeq = currentProjection.frontend?.entryUrl === undefined ? undefined : currentProjection.messages.find((candidate: ProjectedMessage) => candidate.role === "assistant")?.seq;
          flowItems.forEach((item, index) => {
            if (item.dataset.chatFlowKind !== "assistant-step") return;
            const projectedIndex = aligned[index];
            const message = projectedIndex === null ? undefined : currentProjection.messages[projectedIndex];
            const hostedFrontend = message?.seq === hostedMessageSeq ? currentProjection.frontend ?? undefined : undefined;
            if (message === undefined || (!splitRichMessage(message.text).some((block) => block.kind === "html") && hostedFrontend === undefined && message.rawText === undefined)) return;
            const signature = `${currentProjection.revisionId}:${message.seq}:${message.text}:${hostedFrontend?.entryUrl ?? ""}`;
            let mount = mounts.get(item);
            const original = Array.from(item.children).find((child) => child !== mount?.display) as HTMLElement | undefined;
            if (original === undefined) {
              if (mount !== undefined) liveItems.add(item);
              return;
            }
            liveItems.add(item);
            if (mount === undefined) {
              const display = document.createElement("div");
              display.className = "tavern-native-rich-display";
              item.insertBefore(display, original.nextSibling);
              mount = { item, original, display, root: ReactDOM.createRoot(display), signature: "", messageSeq: message.seq };
              mounts.set(item, mount);
              item.dataset.tavernRichMessage = "true";
            } else {
              if (mount.display.parentElement !== item) item.insertBefore(mount.display, original.nextSibling);
              if (mount.original !== original) {
                mount.original.style.removeProperty("display");
                mount.original = original;
              }
            }
            if (mount.signature === signature) {
              original.style.display = "none";
              return;
            }
            mount.signature = signature;
            mount.messageSeq = message.seq;
            original.style.removeProperty("display");
            mount.root.render(h(NativeRichMessage, { message, revisionId: currentProjection.revisionId, frontend: hostedFrontend, variableState: currentProjection.variableState ?? {}, frontendStorage: currentProjection.frontendStorage ?? {}, cardTitle: currentProjection.title, messageCount: currentProjection.messages.length, register, ready }));
            requestAnimationFrame(() => { if (mounts.get(item) === mount) original.style.display = "none"; });
          });
          for (const mount of [...mounts.values()]) if (!liveItems.has(mount.item) || !mount.item.isConnected) restore(mount);
          scheduleViewportAnchorCapture();
        };
        const schedule = (): void => {
          if (scanFrame !== undefined) return;
          scanFrame = requestAnimationFrame(() => { scanFrame = undefined; scan(); });
        };
        const onMessage = (event: MessageEvent): void => {
          const message = event.data as any;
          if (message?.source !== "dsh-re3-rp-rich-frame" || typeof message.token !== "string") return;
          const registration = frames.get(message.token);
          if (registration === undefined || registration.sessionId !== sessionId || registration.revisionId !== activeRevisionIdRef.current || event.source !== registration.frame.contentWindow) {
            const retired = event.source === null ? undefined : retiredFramesRef.current.get(event.source as Window);
            if (retired === undefined
              || retired.token !== message.token
              || retired.sessionId !== sessionId
              || retired.revisionId !== activeRevisionIdRef.current
              || retired.expiresAt < performance.now()
              || message.kind !== "request"
              || message.action !== "replaceCardStorage") return;
            void fetch("/dsh-re3-rp/bridge", {
              method: "POST",
              headers: { "content-type": "application/json; charset=utf-8" },
              body: JSON.stringify({ sessionId, method: message.action, payload: message.payload ?? {} }),
            }).then((response) => {
              if (response.ok) window.dispatchEvent(new CustomEvent("dsh-re3-rp:projection-changed", { detail: { sessionId } }));
            }).catch(() => {});
            return;
          }
          const frame = registration.frame;
          if (message.kind === "runtime-error" && typeof message.message === "string") {
            recordRuntimeDiagnostic(sessionId, message.token, message.message);
            return;
          }
          if (message.kind === "frame-ready") {
            if (registration.sizing === undefined || typeof message.epoch !== "string" || message.epoch.length === 0 || message.epoch.length > 256 || registration.documentEpoch === message.epoch) return;
            registration.documentEpoch = message.epoch;
            registration.frame.dataset.tavernRichReadyEpoch = message.epoch;
            ready(message.token, registration.frame);
            const snapshot = normalizeRichFrameSnapshot(message.snapshot);
            const receiptHeight = typeof message.height === "number" && Number.isFinite(message.height) ? clampRichFrameHeight(Number(message.height)) : undefined;
            if (snapshot !== null && receiptHeight === clampRichFrameHeight(snapshot.contentBottom)) {
              const sizing = registration.sizing;
              if (sizing.timer !== undefined) window.clearTimeout(sizing.timer);
              if (sizing.publishFrame !== undefined) cancelAnimationFrame(sizing.publishFrame);
              if (sizing.measurementTimer !== undefined) window.clearTimeout(sizing.measurementTimer);
              sizing.timer = undefined;
              sizing.publishFrame = undefined;
              sizing.measurementTimer = undefined;
              sizing.layoutVersion = snapshot.layoutVersion;
              postRichFrameOverflowMode(registration, "outer");
              settleRichFrameSizing(registration, resolveRichFrameLayoutHeight(snapshot, false), "intrinsic");
              scheduleRichFrameProbe(registration, "retry");
            }
            return;
          }
          if (message.kind === "global-registered" && message.token.startsWith("companion:") && typeof message.name === "string") {
            let globals = companionGlobals.get(message.token);
            if (globals === undefined) {
              globals = new Map<string, unknown>();
              companionGlobals.set(message.token, globals);
            }
            globals.set(message.name, message.value);
            for (const [requesterToken, requester] of frames.entries()) {
              if (requesterToken.startsWith("companion:") || requester.sessionId !== sessionId || requester.revisionId !== activeRevisionIdRef.current) continue;
              requester.frame.contentWindow?.postMessage({ source: "dsh-re3-rp-rich-host", token: requesterToken, kind: "global-published", name: message.name, value: message.value }, "*");
            }
            return;
          }
          if (message.kind === "global-value" && message.token.startsWith("companion:") && typeof message.requesterToken === "string") {
            const requester = frames.get(message.requesterToken);
            if (requester === undefined || requester.sessionId !== sessionId || requester.revisionId !== activeRevisionIdRef.current) return;
            requester.frame.contentWindow?.postMessage({ source: "dsh-re3-rp-rich-host", token: message.requesterToken, kind: "response", id: message.id, ok: true, result: { found: message.found === true, value: message.value } }, "*");
            return;
          }
          if (message.kind === "overlay" && message.token.startsWith("companion:")) {
            frame.style.pointerEvents = message.active === false ? "none" : "auto";
            frame.style.width = `${window.innerWidth}px`;
            frame.style.height = `${window.innerHeight}px`;
            if (message.active === false) frame.style.clipPath = "inset(0 100% 100% 0)";
            else if (message.dragging === true) frame.style.clipPath = "none";
            else {
              const left = Math.max(0, Math.min(window.innerWidth, Math.floor(Number(message.x) || 0)));
              const top = Math.max(0, Math.min(window.innerHeight, Math.floor(Number(message.y) || 0)));
              const width = Math.max(1, Math.min(window.innerWidth - left, Math.ceil(Number(message.width) || 1)));
              const height = Math.max(1, Math.min(window.innerHeight - top, Math.ceil(Number(message.height) || 1)));
              frame.style.clipPath = `inset(${top}px ${Math.max(0, window.innerWidth - left - width)}px ${Math.max(0, window.innerHeight - top - height)}px ${left}px)`;
            }
            return;
          }
          if (message.kind === "layout-invalidated") {
            const layoutVersion = Number.isSafeInteger(message.layoutVersion) ? Number(message.layoutVersion) : undefined;
            if (message.reason === "resize") stabilizeViewportAnchor();
            const sizing = registration.sizing;
            const snapshot = normalizeRichFrameSnapshot(message.snapshot);
            const receiptHeight = typeof message.height === "number" && Number.isFinite(message.height) ? clampRichFrameHeight(Number(message.height)) : undefined;
            if (sizing?.phase === "settled" && snapshot !== null && receiptHeight === clampRichFrameHeight(snapshot.contentBottom)) {
              sizing.layoutVersion = snapshot.layoutVersion;
              postRichFrameOverflowMode(registration, "outer");
              settleRichFrameSizing(registration, resolveRichFrameLayoutHeight(snapshot, sizing.viewportCoupled, sizing.releasedScrollKeys), sizing.viewportCoupled ? "viewport" : "intrinsic");
              return;
            }
            scheduleRichFrameProbe(registration, typeof message.reason === "string" ? message.reason : "mutation", layoutVersion);
            return;
          }
          if (message.kind === "resize") {
            const sizing = registration.sizing;
            if (sizing === undefined || !Number.isSafeInteger(message.probeId) || message.probeId !== sizing.probeId || message.phase !== sizing.phase) return;
            const snapshot = normalizeRichFrameSnapshot(message.snapshot);
            if (snapshot === null || Math.abs(snapshot.viewportHeight - sizing.expectedHeight) > 2) return;
            if (typeof message.height !== "number" || !Number.isFinite(message.height)) return;
            const receiptHeight = clampRichFrameHeight(Number(message.height));
            if (receiptHeight !== clampRichFrameHeight(snapshot.contentBottom)) return;
            if (sizing.measurementTimer !== undefined) window.clearTimeout(sizing.measurementTimer);
            sizing.measurementTimer = undefined;
            if (sizing.phase === "refresh") {
              sizing.layoutVersion = snapshot.layoutVersion;
              const height = resolveRichFrameLayoutHeight(snapshot, sizing.viewportCoupled, sizing.releasedScrollKeys);
              settleRichFrameSizing(registration, height, sizing.viewportCoupled ? "viewport" : "intrinsic");
              return;
            }
            if (sizing.phase === "first") {
              sizing.first = snapshot;
              requestRichFrameMeasure(registration, "second", sizing.expectedHeight + 160);
              return;
            }
            const first = sizing.first;
            if (first === undefined) return;
            if (sizing.phase === "second") {
              if (first.layoutVersion !== snapshot.layoutVersion) {
                restartRichFrameProbe(registration);
                return;
              }
              sizing.viewportCoupled = isRichFrameViewportCoupled(first, snapshot);
              sizing.releasedScrollKeys = findRichFrameViewportScrollKeys(first, snapshot);
              sizing.releaseBasisKeys = [...sizing.releasedScrollKeys];
              sizing.layoutVersion = snapshot.layoutVersion;
              sizing.verificationAttempts = 0;
              requestRichFrameMeasure(registration, "verify", resolveRichFrameProbeHeight(first, snapshot));
              return;
            }
            if (sizing.phase === "verify") {
              if (sizing.layoutVersion !== snapshot.layoutVersion) {
                restartRichFrameProbe(registration);
                return;
              }
              sizing.verificationFirst = snapshot;
              requestRichFrameMeasure(registration, "verify-second", sizing.expectedHeight + 160);
              return;
            }
            const verificationFirst = sizing.verificationFirst;
            if (verificationFirst === undefined || verificationFirst.layoutVersion !== snapshot.layoutVersion) {
              restartRichFrameProbe(registration);
              return;
            }
            sizing.viewportCoupled = isRichFrameViewportCoupled(verificationFirst, snapshot);
            sizing.releasedScrollKeys = findRichFrameViewportScrollKeys(verificationFirst, snapshot);
            sizing.layoutVersion = snapshot.layoutVersion;
            const releaseBasisStable = sizing.releaseBasisKeys.length === 0
              || (sizing.viewportCoupled && areRichFrameScrollKeysStable(sizing.releaseBasisKeys, verificationFirst, snapshot));
            const height = releaseBasisStable
              ? resolveRichFrameProbeHeight(verificationFirst, snapshot)
              : sizing.baseHeight;
            if (Math.abs(height - verificationFirst.viewportHeight) <= 2) {
              postRichFrameOverflowMode(registration, "outer");
              settleRichFrameSizing(registration, height, sizing.viewportCoupled ? "viewport" : "intrinsic");
              return;
            }
            if (sizing.verificationAttempts < 4) {
              sizing.verificationAttempts += 1;
              sizing.verificationFirst = undefined;
              requestRichFrameMeasure(registration, "verify", height);
              return;
            }
            fallbackRichFrameSizing(registration);
            return;
          }
          if (message.kind !== "request" || (typeof message.id !== "number" && typeof message.id !== "string")) return;
          if (message.action === "setDraft") {
            const composer = document.querySelector<HTMLTextAreaElement>("textarea[data-phase]");
            if (composer === null || typeof message.payload?.text !== "string") {
              frame.contentWindow?.postMessage({ source: "dsh-re3-rp-rich-host", token: message.token, kind: "response", id: message.id, ok: false, error: { code: "bridge_unavailable", message: "找不到当前 DSH 输入框" } }, "*");
              return;
            }
            const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
            if (setter !== undefined) setter.call(composer, message.payload.text);
            else composer.value = message.payload.text;
            composer.dispatchEvent(new Event("input", { bubbles: true }));
            composer.focus();
            frame.contentWindow?.postMessage({ source: "dsh-re3-rp-rich-host", token: message.token, kind: "response", id: message.id, ok: true, result: { draftSet: true } }, "*");
            return;
          }
          if (message.action === "getCompanionGlobal" && typeof message.payload?.name === "string") {
            const companionEntry = [...frames.entries()].find(([candidateToken, candidate]) => candidateToken.startsWith(`companion:${sessionId}:`) && candidate.revisionId === activeRevisionIdRef.current);
            if (companionEntry === undefined) {
              frame.contentWindow?.postMessage({ source: "dsh-re3-rp-rich-host", token: message.token, kind: "response", id: message.id, ok: false, error: { code: "bridge_unavailable", message: "卡内常驻脚本尚未就绪" } }, "*");
              return;
            }
            const [companionToken, companionRegistration] = companionEntry;
            const globals = companionGlobals.get(companionToken);
            if (globals?.has(message.payload.name)) {
              frame.contentWindow?.postMessage({ source: "dsh-re3-rp-rich-host", token: message.token, kind: "response", id: message.id, ok: true, result: { found: true, value: globals.get(message.payload.name) } }, "*");
              return;
            }
            companionRegistration.frame.contentWindow?.postMessage({ source: "dsh-re3-rp-rich-host", token: companionToken, kind: "global-read", id: message.id, requesterToken: message.token, name: message.payload.name }, "*");
            return;
          }
          if (!["reportCompatibilityCall", "selectOpening", "generate", "cancelGenerate", "submitTurn", "getProjection", "submitStateAction", "getCardState", "replaceCardState", "replaceCardStorage", "getWorldbook", "updateWorldbook"].includes(message.action)) return;
          void fetch("/dsh-re3-rp/bridge", { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify({ sessionId, method: message.action, payload: message.payload ?? {}, operationId: message.payload?.operationId }) })
            .then(async (response) => {
              const body = await response.json().catch(() => ({}));
              if (!response.ok || body.ok !== true) throw Object.assign(new Error(body?.error?.message ?? "Bridge unavailable"), { code: body?.error?.code ?? "bridge_unavailable" });
              if (message.action === "reportCompatibilityCall") void loadCapabilitySnapshot({ sessionId });
              if (message.action === "selectOpening" || message.action === "replaceCardStorage") window.dispatchEvent(new CustomEvent("dsh-re3-rp:projection-changed", { detail: { sessionId } }));
              frame.contentWindow?.postMessage({ source: "dsh-re3-rp-rich-host", token: message.token, kind: "response", id: message.id, ok: true, result: body.result }, "*");
            })
            .catch((error) => frame.contentWindow?.postMessage({ source: "dsh-re3-rp-rich-host", token: message.token, kind: "response", id: message.id, ok: false, error: { code: error?.code ?? "bridge_unavailable", message: error?.message ?? "Bridge unavailable" } }, "*"));
        };
        window.addEventListener("message", onMessage);
        const observer = new MutationObserver(schedule);
        observer.observe(scroll, { childList: true, subtree: true });
        scheduleScanRef.current = schedule;
        scan();
        scheduleViewportAnchorCapture();
        return () => {
          if (scheduleScanRef.current === schedule) scheduleScanRef.current = undefined;
          observer.disconnect();
          viewportResizeObserver.disconnect();
          scroll.removeEventListener("scroll", handleConversationScroll);
          scroll.removeEventListener("wheel", cancelViewportAnchorForUserInput);
          scroll.removeEventListener("touchstart", cancelViewportAnchorForUserInput);
          scroll.removeEventListener("pointerdown", cancelViewportAnchorForUserInput);
          window.removeEventListener("keydown", handleViewportNavigationKey);
          window.removeEventListener("resize", stabilizeViewportAnchor);
          window.visualViewport?.removeEventListener("resize", stabilizeViewportAnchor);
          window.removeEventListener("message", onMessage);
          if (scanFrame !== undefined) cancelAnimationFrame(scanFrame);
          if (viewportAnchorFrame !== undefined) cancelAnimationFrame(viewportAnchorFrame);
          if (viewportAnchorCaptureFrame !== undefined) cancelAnimationFrame(viewportAnchorCaptureFrame);
          for (const mount of [...mounts.values()]) restore(mount);
          for (const thought of [...hiddenThoughts.keys()]) restoreThought(thought);
          for (const registration of frames.values()) disposeRichFrameSizing(registration);
          frames.clear();
          retiredFramesRef.current.clear();
        };
      }, [sessionId]);

      React.useLayoutEffect(() => {
        const currentProjection = projectionRef.current;
        if (currentProjection !== undefined && currentProjection !== null) {
          const latestAssistantSeq = currentProjection.messages.filter((message: ProjectedMessage) => message.role === "assistant").at(-1)?.seq ?? -1;
          for (const registration of framesRef.current.values()) {
            registration.sessionId = sessionId;
            if (registration.revisionId !== currentProjection.revisionId) continue;
            const ownMessageId = Number(registration.token.split(":", 1)[0]);
            registration.frame.contentWindow?.postMessage({
              source: "dsh-re3-rp-rich-host",
              token: registration.token,
              kind: "projection",
              state: currentProjection.variableState ?? {},
              storage: currentProjection.frontendStorage ?? {},
              messageCount: currentProjection.messages.length,
              currentMessageId: Number.isSafeInteger(ownMessageId) ? ownMessageId : latestAssistantSeq,
            }, "*");
          }
        }
        scheduleScanRef.current?.();
      }, [sessionId, projection]);

      if (projection === null) return h("span", { ref: anchorRef, hidden: true, "data-tavern-native-message-adapter": "inactive" });
      const anchor = h("span", { ref: anchorRef, hidden: true, "data-tavern-native-message-adapter": projection === undefined ? "loading" : "active" });
      if (projection === undefined || (projection.companionScripts?.length ?? 0) === 0) return anchor;
      const permissionKey = `dsh-re3-rp:companion-permission:${projection.revisionId}`;
      const companionEnabled = window.localStorage.getItem(permissionKey) === "enabled";
      const setCompanionPermission = (enabled: boolean): void => {
        if (enabled) window.localStorage.setItem(permissionKey, "enabled");
        else window.localStorage.removeItem(permissionKey);
        refreshPermission();
        window.dispatchEvent(new Event("dsh-re3-rp:companion-permission"));
      };
      if (!companionEnabled) return h(React.Fragment, null,
        h("aside", { className: "tavern-companion-permission", role: "alert" },
          h("strong", null, `此卡包含 ${projection.companionScripts?.length ?? 0} 个可执行脚本`),
          h("span", null, "启用后脚本可联网，并可通过受限 Bridge 修改本卡状态、世界书、草稿或提交回合。仅对可信卡启用。"),
          h("button", { type: "button", onClick: () => setCompanionPermission(true) }, "启用此版本卡内脚本")),
        anchor);
      return h(React.Fragment, null,
        h(NativeCompanionRuntime, { sessionId, revisionId: projection.revisionId, scripts: projection.companionScripts ?? [], variableState: projection.variableState ?? {}, frontendStorage: projection.frontendStorage ?? {}, cardTitle: projection.title, messages: projection.messages, register }),
        anchor);
    }

    function TavernModeTabs(): any {
      const snapshot = usePrototypeState();
      return h("div", { className: "tavern-tabs", role: "tablist", "aria-label": "侧栏内容" },
        h("button", { type: "button", role: "tab", title: "工作区", "aria-label": "工作区", "aria-selected": snapshot.sidebarMode === "workspace", onClick: () => patchState({ sidebarMode: "workspace", screen: "library", startError: null }) }, h(IconFolderOpenOutline16, { size: 16 }), h("span", { className: "tavern-tab-label" }, "工作区")),
        h("button", { type: "button", role: "tab", title: "酒馆", "aria-label": "酒馆", "aria-selected": snapshot.sidebarMode === "tavern", onClick: openLibrary }, h(IconUserOutline16, { size: 16 }), h("span", { className: "tavern-tab-label" }, "酒馆")));
    }

    function TavernSidebar(): any {
      const snapshot = usePrototypeState();
      return h("section", { className: "tavern-sidebar-content", "data-tavern-panel": "true", "aria-label": "酒馆卡与会话" },
        h(TavernModeTabs),
        snapshot.screen === "library" ? h(LibraryScreen) : h(SetupScreen));
    }

    function applySidebarMode(slot: HTMLElement, host: HTMLElement, mode: "workspace" | "tavern"): void {
      slot.dataset.tavernMode = mode;
      for (const child of Array.from(slot.children) as HTMLElement[]) {
        // Narrative owns data-nwh-native-workspace and data-nwh-sidebar-mode-host;
        // exclude its host so Tavern only labels the native DSH Workspace browser.
        const isNativeWorkspace = child !== host && !child.hasAttribute("data-nwh-sidebar-mode-host");
        if (isNativeWorkspace) child.setAttribute("data-tavern-native-workspace", "true");
        else child.removeAttribute("data-tavern-native-workspace");
      }
    }

    function useSidebarModeHost(mode: "workspace" | "tavern"): HTMLElement | null {
      const [host, setHost] = React.useState(null as HTMLElement | null);
      const modeRef = React.useRef(mode);
      modeRef.current = mode;
      React.useLayoutEffect(() => {
        let slot: HTMLElement | null = null;
        let mount: HTMLElement | null = null;
        const attach = (): boolean => {
          const nextSlot = document.querySelector('[data-slot="sidebar.workspaces"]') as HTMLElement | null;
          if (nextSlot === null) return false;
          if (slot !== nextSlot || mount?.isConnected !== true) {
            if (slot !== null) {
              delete slot.dataset.tavernMode;
              for (const child of Array.from(slot.children) as HTMLElement[]) delete child.dataset.tavernNativeWorkspace;
            }
            mount?.remove();
            slot = nextSlot;
            mount = document.createElement("div");
            mount.dataset.tavernSidebarHost = "true";
            slot.prepend(mount);
            setHost(mount);
          }
          applySidebarMode(slot, mount, modeRef.current);
          return true;
        };
        const observer = new MutationObserver(attach);
        observer.observe(document.body, { childList: true, subtree: true });
        attach();
        return () => {
          observer.disconnect();
          if (slot !== null) {
            delete slot.dataset.tavernMode;
            for (const child of Array.from(slot.children) as HTMLElement[]) delete child.dataset.tavernNativeWorkspace;
          }
          mount?.remove();
          setHost(null);
        };
      }, []);
      React.useLayoutEffect(() => {
        if (host?.parentElement !== null && host?.parentElement !== undefined) applySidebarMode(host.parentElement, host, mode);
      }, [host, mode]);
      return host;
    }

    function SidebarIntegration(): any {
      const snapshot = usePrototypeState();
      const host = useSidebarModeHost(snapshot.sidebarMode);
      if (host === null) return null;
      return h(React.Fragment, null,
        ReactDOM.createPortal(snapshot.sidebarMode === "tavern" ? h(TavernSidebar) : h(TavernModeTabs), host),
        ReactDOM.createPortal(h(CapabilityRail), document.body));
    }

    const STYLE = `
[data-slot="conversation.view"]:has(>.tavern-context-view){display:flex;min-height:0;flex:1;overflow:hidden}
.tavern-context-view{display:flex;box-sizing:border-box;width:100%;height:100%;min-height:0;flex-direction:column;overflow:hidden;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#20242a);font-family:inherit}.tavern-context-view.is-loading{justify-content:center}.tavern-context-empty{margin:auto;padding:28px;color:var(--dsw-alias-label-tertiary,#858c96);font-size:12px;text-align:center}
.tavern-context-toolbar{display:grid;grid-template-columns:minmax(178px,230px) minmax(280px,1fr) minmax(170px,250px);grid-template-rows:42px 24px;align-items:center;column-gap:14px;min-height:82px;box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l1,#e2e5e9);padding:8px 22px;background:color-mix(in srgb,var(--dsw-alias-bg-base,#fff) 96%,var(--dsw-alias-bg-subtle,#f6f7f9) 4%)}.tavern-context-request-nav{display:grid;grid-column:1;grid-row:1;grid-template-columns:28px minmax(86px,auto) 28px;align-items:center;justify-content:start;gap:3px}.tavern-context-request-nav>button{display:grid;width:28px;height:28px;place-items:center;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#646d79);cursor:pointer}.tavern-context-request-nav>button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#eef0f3)}.tavern-context-request-nav>button:disabled{cursor:default;opacity:.3}.tavern-context-request-title{display:flex;min-width:0;flex-direction:column;align-items:center;gap:2px}.tavern-context-request-title strong{font-size:12px;font-weight:650;white-space:nowrap}.tavern-context-request-title span{color:var(--dsw-alias-label-tertiary,#858c96);font-size:9px;white-space:nowrap}
.tavern-context-toolbar-meta{display:flex;min-width:0;grid-column:2;grid-row:1;align-items:center;justify-content:center;gap:6px}.tavern-context-toolbar-meta>span{overflow:hidden;border:1px solid var(--dsw-alias-border-l1,#dfe3e8);border-radius:7px;padding:5px 8px;background:var(--dsw-alias-bg-subtle,#f8f9fa);color:var(--dsw-alias-label-secondary,#626b78);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.tavern-context-model{max-width:150px}.tavern-context-preset{max-width:205px}.tavern-context-token-total{flex:none;font-variant-numeric:tabular-nums}.tavern-context-search{display:flex;min-width:0;height:32px;box-sizing:border-box;grid-column:3;grid-row:1;align-items:center;gap:7px;border:1px solid var(--dsw-alias-border-l2,#d5d9df);border-radius:8px;padding:0 9px;color:var(--dsw-alias-label-tertiary,#858c96);background:var(--dsw-alias-bg-base,#fff)}.tavern-context-search:focus-within{border-color:#8daadd;box-shadow:0 0 0 2px rgba(75,119,192,.1)}.tavern-context-search input{min-width:0;width:100%;border:0;outline:0;background:transparent;color:var(--dsw-alias-label-primary,#20242a);font:400 10px/1 inherit}
.tavern-context-change-filter{display:flex;grid-column:1;grid-row:2;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary,#626b78);cursor:pointer;font-size:9px;white-space:nowrap}.tavern-context-change-filter input{position:absolute;opacity:0;pointer-events:none}.tavern-context-check{display:grid;width:15px;height:15px;box-sizing:border-box;place-items:center;border:1px solid var(--dsw-alias-border-l2,#cfd4db);border-radius:4px;background:var(--dsw-alias-bg-base,#fff);color:#fff}.tavern-context-change-filter input:checked+.tavern-context-check{border-color:#3475d5;background:#3475d5}
.tavern-context-table{min-height:0;flex:1;overflow:auto}.tavern-context-table-head,.tavern-context-row-main{display:grid;grid-template-columns:54px 92px minmax(190px,260px) 78px minmax(240px,1fr) 68px;align-items:center}.tavern-context-table-head{position:sticky;z-index:3;top:0;height:34px;border-bottom:1px solid var(--dsw-alias-border-l1,#e2e5e9);background:color-mix(in srgb,var(--dsw-alias-bg-subtle,#f6f7f9) 90%,var(--dsw-alias-bg-base,#fff) 10%);color:var(--dsw-alias-label-tertiary,#7f8792);font-size:9px}.tavern-context-table-head>span{box-sizing:border-box;padding:0 10px}.tavern-context-row{position:relative;border-bottom:1px solid var(--dsw-alias-border-l1,#e5e7ea);background:var(--dsw-alias-bg-base,#fff)}.tavern-context-row.is-worldbook::before{position:absolute;z-index:2;top:0;bottom:0;left:0;width:3px;background:#8b6cc4;content:""}.tavern-context-row.is-changed{background:color-mix(in srgb,#8b6cc4 4%,var(--dsw-alias-bg-base,#fff) 96%)}
.tavern-context-row-main{width:100%;min-height:52px;border:0;padding:0;outline:none;background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left}.tavern-context-row-main:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f4f6)}.tavern-context-row-main:focus-visible{outline:2px solid #7894c8;outline-offset:-2px}.tavern-context-row-main>span{min-width:0;box-sizing:border-box;padding:0 10px}.tavern-context-order{color:var(--dsw-alias-label-tertiary,#8b929b);font:500 9px/1 ui-monospace,SFMono-Regular,Consolas,monospace;text-align:center}.tavern-context-role{justify-self:start;border-radius:5px;padding:3px 6px!important;font-size:9px;font-weight:700;letter-spacing:.02em}.tavern-context-role.is-system{background:#edf0f4;color:#536070}.tavern-context-role.is-user{background:#eaf2ff;color:#3972c9}.tavern-context-role.is-assistant{background:#f2edff;color:#7758b3}.tavern-context-source{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1px 7px}.tavern-context-source strong{overflow:hidden;font-size:11px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.tavern-context-source small{grid-column:1;color:var(--dsw-alias-label-tertiary,#858c96);font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tavern-context-source em{grid-column:2;grid-row:1/3;align-self:center;border-radius:999px;padding:2px 5px;background:#eee8f8;color:#7656aa;font-size:8px;font-style:normal;white-space:nowrap}.tavern-context-tokens{color:var(--dsw-alias-label-secondary,#68717e);font:500 9px/1 ui-monospace,SFMono-Regular,Consolas,monospace;text-align:right}.tavern-context-preview{overflow:hidden;color:var(--dsw-alias-label-secondary,#5e6672);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.tavern-context-expand{display:grid;place-items:center;padding-right:28px!important;color:var(--dsw-alias-label-tertiary,#858c96)}.tavern-context-expand svg{transition:transform .16s ease}.tavern-context-expand.is-expanded svg{transform:rotate(180deg)}.tavern-context-row-copy{position:absolute;z-index:2;top:13px;right:8px;display:grid;width:26px;height:26px;place-items:center;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary,#7e8793);cursor:pointer}.tavern-context-row-copy:hover{background:var(--dsw-alias-interactive-bg-hover,#e9ebee);color:var(--dsw-alias-label-primary,#20242a)}
.tavern-context-row-detail{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(250px,.85fr);gap:12px;border-top:1px solid var(--dsw-alias-border-l1,#e3e6ea);padding:12px 18px 16px 54px;background:color-mix(in srgb,var(--dsw-alias-bg-subtle,#f6f7f9) 72%,var(--dsw-alias-bg-base,#fff) 28%)}.tavern-context-content,.tavern-context-inspector{min-width:0;overflow:hidden;border:1px solid var(--dsw-alias-border-l1,#dfe3e8);border-radius:9px;background:var(--dsw-alias-bg-base,#fff)}.tavern-context-content>header,.tavern-context-inspector>header{display:flex;height:34px;box-sizing:border-box;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid var(--dsw-alias-border-l1,#e5e7ea);padding:0 10px}.tavern-context-content>header strong,.tavern-context-inspector>header strong{font-size:10px;font-weight:650}.tavern-context-content>header button{display:flex;align-items:center;gap:5px;border:0;border-radius:6px;padding:4px 6px;background:transparent;color:var(--dsw-alias-label-secondary,#626b78);cursor:pointer;font:500 9px/1 inherit}.tavern-context-content>header button:hover{background:var(--dsw-alias-interactive-bg-hover,#eef0f3)}.tavern-context-content pre{max-height:min(310px,28vh);margin:0;overflow:auto;padding:11px 12px;color:var(--dsw-alias-label-primary,#25292f);font:10px/1.62 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.tavern-context-inspector>header span{color:var(--dsw-alias-label-tertiary,#858c96);font-size:9px}.tavern-context-inspector-empty{margin:0;padding:12px;color:var(--dsw-alias-label-secondary,#68717e);font-size:9px;line-height:1.55}.tavern-context-activation-cards{display:grid;max-height:min(310px,28vh);gap:6px;overflow:auto;padding:8px}.tavern-context-activation-cards article{border:1px solid var(--dsw-alias-border-l1,#e2e5e9);border-left:3px solid #8b6cc4;border-radius:7px;padding:8px 9px;background:var(--dsw-alias-bg-base,#fff)}.tavern-context-activation-cards article>div{display:flex;align-items:center;justify-content:space-between;gap:8px}.tavern-context-activation-cards strong{overflow:hidden;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.tavern-context-activation-cards span{flex:none;color:#7656aa;font-size:8px}.tavern-context-activation-cards p{margin:5px 0 0;color:var(--dsw-alias-label-secondary,#68717e);font-size:8px;line-height:1.45}.tavern-context-no-results{padding:34px;color:var(--dsw-alias-label-tertiary,#858c96);font-size:11px;text-align:center}
@media(max-width:980px){.tavern-context-toolbar{grid-template-columns:minmax(170px,210px) minmax(120px,1fr) minmax(170px,220px)}.tavern-context-table-head,.tavern-context-row-main{grid-template-columns:42px 82px minmax(150px,220px) 66px minmax(160px,1fr) 54px}}@media(max-width:720px){.tavern-context-toolbar{grid-template-columns:1fr auto;grid-template-rows:auto auto auto;padding:8px 12px}.tavern-context-request-nav{grid-column:1;grid-row:1}.tavern-context-change-filter{grid-column:2;grid-row:1}.tavern-context-toolbar-meta{grid-column:1/-1;grid-row:2;justify-content:flex-start}.tavern-context-search{grid-column:1/-1;grid-row:3}.tavern-context-table-head,.tavern-context-row-main{grid-template-columns:36px 76px minmax(130px,1fr) 58px 46px}.tavern-context-table-head>span:nth-child(5),.tavern-context-preview{display:none}}
.tavern-context-toolbar{grid-template-columns:minmax(178px,230px) minmax(120px,1fr) minmax(170px,250px)}.tavern-context-toolbar-meta{gap:0}.tavern-context-model{max-width:180px}
.tavern-context-workbench{position:relative;display:grid;min-height:0;flex:1;grid-template-columns:minmax(0,1fr);overflow:hidden}.tavern-context-workbench.has-inspector{grid-template-columns:minmax(0,1fr) minmax(310px,360px)}.tavern-context-workbench>.tavern-context-table{min-width:0;min-height:0;flex:none;overflow:auto}.tavern-context-workbench.has-inspector .tavern-context-table-head,.tavern-context-workbench.has-inspector .tavern-context-row-main{grid-template-columns:42px 76px minmax(135px,1fr) 58px 48px}.tavern-context-workbench.has-inspector .tavern-context-table-head>span:nth-child(5),.tavern-context-workbench.has-inspector .tavern-context-preview{display:none}
.tavern-context-row.is-selected{background:color-mix(in srgb,#4c79c9 8%,var(--dsw-alias-bg-base,#fff) 92%)}.tavern-context-row.is-selected .tavern-context-expand{color:#3f70c0}.tavern-context-source{grid-template-columns:minmax(0,1fr);gap:1px}.tavern-context-source small{grid-column:1}.tavern-context-expand svg{transition:none}
.tavern-context-workbench>.tavern-context-inspector{display:flex;min-width:0;min-height:0;flex-direction:column;overflow:hidden;border:0;border-left:1px solid var(--dsw-alias-border-l1,#dfe3e8);border-radius:0;background:color-mix(in srgb,var(--dsw-alias-bg-base,#fff) 97%,#edf3fc 3%);box-shadow:-8px 0 24px rgba(34,48,72,.04)}.tavern-context-inspector-header{display:flex;min-height:70px;box-sizing:border-box;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid var(--dsw-alias-border-l1,#e2e5e9);padding:15px 14px 12px 16px}.tavern-context-inspector-header>div{display:grid;min-width:0;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:5px 8px}.tavern-context-inspector-header strong{overflow:hidden;font-size:13px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.tavern-context-inspector-header small{grid-column:2;color:var(--dsw-alias-label-tertiary,#858c96);font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tavern-context-inspector-header>button{display:grid;width:26px;height:26px;flex:none;place-items:center;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#68717e);cursor:pointer;font:400 20px/1 inherit}.tavern-context-inspector-header>button:hover{background:var(--dsw-alias-interactive-bg-hover,#eef0f3)}
.tavern-context-inspector-tabs{display:flex;height:39px;flex:none;gap:20px;border-bottom:1px solid var(--dsw-alias-border-l1,#e2e5e9);padding:0 16px}.tavern-context-inspector-tabs button{position:relative;border:0;padding:0;background:transparent;color:var(--dsw-alias-label-secondary,#68717e);cursor:pointer;font:500 10px/39px inherit}.tavern-context-inspector-tabs button[aria-selected=true]{color:#245fb7;font-weight:650}.tavern-context-inspector-tabs button[aria-selected=true]::after{position:absolute;right:0;bottom:-1px;left:0;height:2px;border-radius:2px;background:#3475d5;content:""}.tavern-context-inspector-content,.tavern-context-inspector-evidence{position:relative;min-height:0;flex:1;overflow:auto}.tavern-context-inspector-content pre{max-height:none;margin:0;padding:20px 18px 60px;color:var(--dsw-alias-label-primary,#25292f);font:11px/1.75 inherit;white-space:pre-wrap;overflow-wrap:anywhere}.tavern-context-inspector-copy{position:sticky;z-index:2;top:12px;float:right;display:flex;height:28px;align-items:center;gap:5px;margin:12px 12px 0 8px;border:1px solid var(--dsw-alias-border-l1,#dfe3e8);border-radius:7px;padding:0 8px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-secondary,#626b78);cursor:pointer;font:500 9px/1 inherit}.tavern-context-inspector-evidence>p{margin:0;padding:20px 18px;color:var(--dsw-alias-label-secondary,#68717e);font-size:10px;line-height:1.65}.tavern-context-workbench .tavern-context-activation-cards{max-height:none;gap:8px;padding:14px}.tavern-context-workbench .tavern-context-activation-cards article{border-radius:8px;padding:10px 11px}.tavern-context-workbench .tavern-context-activation-cards p{font-size:9px;line-height:1.55}
@media(max-width:980px){.tavern-context-workbench.has-inspector{grid-template-columns:minmax(0,1fr) 310px}}@media(max-width:720px){.tavern-context-workbench.has-inspector{display:block}.tavern-context-workbench.has-inspector .tavern-context-table-head,.tavern-context-workbench.has-inspector .tavern-context-row-main{grid-template-columns:36px 76px minmax(130px,1fr) 58px 46px}.tavern-context-inspector{position:absolute;z-index:8;inset:0 0 0 auto;width:min(88%,360px);box-shadow:-12px 0 32px rgba(25,39,64,.18)}}
/* Scheme 02: align the Tavern context viewer with DSH Trajectory while retaining a little more room for Chinese text. */
.tavern-context-view{color:#0f1115;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Helvetica Neue",Helvetica,Arial,sans-serif}
.tavern-context-toolbar{grid-template-columns:190px minmax(120px,1fr) 250px;grid-template-rows:56px 27px;column-gap:12px;min-height:83px;border-bottom:1px solid #dfe2e5;padding:0 18px;background:#fff}.tavern-context-request-nav{grid-template-columns:28px minmax(92px,auto) 28px;gap:4px}.tavern-context-request-nav>button{border-radius:4px;color:#777f87}.tavern-context-request-title{gap:1px}.tavern-context-request-title strong{color:#0f1115;font-size:12px;font-weight:600}.tavern-context-request-title span{color:#8f949a;font:10px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace}.tavern-context-toolbar-meta>span{border:1px solid #dfe2e5;border-radius:7px;padding:5px 9px;background:#fafafa;color:#61666b;font-size:10px}.tavern-context-model{max-width:180px}.tavern-context-search{height:30px;border-color:#dcdfe2;border-radius:6px;padding:0 9px;color:#8b9095}.tavern-context-search input{color:#0f1115;font-size:12px}.tavern-context-change-filter{height:27px;align-self:stretch;color:#61666b;font-size:10px}.tavern-context-check{width:14px;height:14px;border-color:#d5d8dc;border-radius:3px}
.tavern-context-table-head,.tavern-context-row-main{grid-template-columns:50px 92px minmax(180px,270px) 70px minmax(190px,1fr) 52px}.tavern-context-table-head{height:30px;border-bottom-color:#dfe2e5;background:#fafafa;color:#8b9095;font-size:10px}.tavern-context-table-head>span,.tavern-context-row-main>span{padding:0 9px}.tavern-context-row{border-bottom-color:#eff0f1;background:#fff}.tavern-context-row.is-worldbook::before{display:none}.tavern-context-row.is-changed{background:#fff}.tavern-context-row.is-selected{background:#e8eaed}.tavern-context-row.is-selected::before{position:absolute;z-index:2;top:0;bottom:0;left:0;display:block;width:3px;background:#3478f6;content:""}.tavern-context-row-main{height:38px;min-height:38px}.tavern-context-row-main:hover{background:#f4f5f6}.tavern-context-row-main:focus-visible{outline-color:#3478f6}.tavern-context-order{color:#8f949a;font-size:10px;font-weight:400}.tavern-context-role{border-radius:4px;padding:3px 7px!important;font-size:10px;font-weight:650;letter-spacing:0}.tavern-context-role.is-system{background:#eef0f2;color:#3f4b56}.tavern-context-role.is-user{background:#e8f0ff;color:#3371d6}.tavern-context-role.is-assistant{background:#f2ecfa;color:#7b58b5}.tavern-context-source{gap:0}.tavern-context-source strong{font-size:12px;font-weight:600}.tavern-context-source small{color:#8f949a;font-size:9px;line-height:1.25}.tavern-context-tokens{color:#61666b;font-size:10px;font-weight:400}.tavern-context-preview{color:#394047;font-size:12px}.tavern-context-expand{padding-right:20px!important;color:#777f87}.tavern-context-row-copy{top:6px;right:4px;width:26px;height:26px;border-radius:4px;color:#777f87}
.tavern-context-workbench.has-inspector{grid-template-columns:minmax(0,1fr) 386px}.tavern-context-workbench.has-inspector .tavern-context-table-head,.tavern-context-workbench.has-inspector .tavern-context-row-main{grid-template-columns:46px 82px minmax(145px,1fr) 58px 42px}.tavern-context-workbench>.tavern-context-inspector{border-left:1px solid #dfe2e5;background:#fdfdfd;box-shadow:none}.tavern-context-inspector-header{min-height:54px;align-items:center;border-bottom-color:#dfe2e5;padding:0 16px}.tavern-context-inspector-header>div{grid-template-columns:auto minmax(0,1fr);gap:2px 9px}.tavern-context-inspector-header strong{font-size:13px;font-weight:600}.tavern-context-inspector-header small{color:#61666b;font:10px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace}.tavern-context-inspector-header>button{width:28px;height:28px;border-radius:4px;color:#61666b}.tavern-context-inspector-tabs{height:42px;gap:28px;border-bottom-color:#dfe2e5;padding:0 16px}.tavern-context-inspector-tabs button{height:42px;color:#61666b;font:400 13px/42px inherit}.tavern-context-inspector-tabs button[aria-selected=true]{color:#3478f6;font-weight:400}.tavern-context-inspector-tabs button[aria-selected=true]::after{background:#3478f6}.tavern-context-inspector-content pre{padding:16px 18px 60px;color:#0f1115;font-family:inherit;font-size:14px;font-weight:400;line-height:1.72}.tavern-context-inspector-copy{top:10px;height:26px;margin:10px 12px 0 8px;border:0;border-radius:4px;padding:0 6px;background:transparent;color:#61666b;font-size:10px}.tavern-context-inspector-evidence>p{padding:16px 18px;color:#61666b;font-size:12px;line-height:1.65}.tavern-context-workbench .tavern-context-activation-cards{gap:10px;padding:16px 18px}.tavern-context-workbench .tavern-context-activation-cards article{border:0;border-left:3px solid #2aa65a;border-radius:0;padding:8px 11px;background:#f7faf8}.tavern-context-workbench .tavern-context-activation-cards strong{font-size:12px}.tavern-context-workbench .tavern-context-activation-cards span{color:#2a7d49;font-size:9px}.tavern-context-workbench .tavern-context-activation-cards p{color:#61666b;font-size:11px;line-height:1.5}
@media(max-width:980px){.tavern-context-toolbar{grid-template-columns:180px minmax(100px,1fr) 220px}.tavern-context-workbench.has-inspector{grid-template-columns:minmax(0,1fr) 340px}}@media(max-width:720px){.tavern-context-toolbar{grid-template-columns:1fr auto;grid-template-rows:auto auto auto;padding:8px 12px}.tavern-context-workbench.has-inspector{display:block}.tavern-context-workbench.has-inspector .tavern-context-table-head,.tavern-context-workbench.has-inspector .tavern-context-row-main{grid-template-columns:36px 76px minmax(130px,1fr) 58px 46px}.tavern-context-inspector{position:absolute;z-index:8;inset:0 0 0 auto;width:min(88%,360px);box-shadow:-12px 0 32px rgba(25,39,64,.18)}}
[data-tavern-sidebar-host="true"],.tavern-sidebar-content{box-sizing:border-box;min-width:0;color:var(--dsw-alias-label-primary,#17191d);font-family:inherit}
[data-tavern-sidebar-host="true"]{flex:none;padding:2px 8px 8px 4px}[data-slot="sidebar.workspaces"][data-tavern-mode="tavern"]>[data-tavern-sidebar-host="true"]{display:flex;flex:1;min-height:0;padding-bottom:0}[data-slot="sidebar.workspaces"][data-tavern-mode="tavern"]>[data-tavern-native-workspace="true"]{display:none!important}[data-slot="sidebar.workspaces"][data-tavern-mode="tavern"][data-nwh-mode="chat"]>[data-nwh-sidebar-mode-host="true"]{display:none!important}.tavern-sidebar-content{display:flex;flex:1;min-height:0;flex-direction:column;animation:tavern-content-in .16s ease-out}@keyframes tavern-content-in{from{opacity:.45;transform:translateX(4px)}to{opacity:1;transform:none}}
.tavern-panel-screen{min-height:0;flex:1;overflow:auto;padding:10px 4px 14px}.tavern-tabs{display:flex;flex:none;height:40px;border-bottom:1px solid var(--dsw-alias-border-l1,#e4e6e9);gap:22px;padding:0 8px}.tavern-tabs button{position:relative;display:flex;align-items:center;gap:6px;border:0;padding:0;background:transparent;color:var(--dsw-alias-label-secondary,#727985);cursor:pointer;font:500 14px/40px inherit}.tavern-tabs button[aria-selected=true]{color:#1757b8;font-weight:650}.tavern-tabs button[aria-selected=true]::after{position:absolute;right:0;bottom:-1px;left:0;height:2px;border-radius:2px;background:#2d69c9;content:""}
[data-sidebar-collapsed] [data-tavern-sidebar-host="true"]{padding:0 0 10px}[data-sidebar-collapsed] [data-slot="sidebar.workspaces"][data-tavern-mode="tavern"]>[data-tavern-sidebar-host="true"]{flex:none;min-height:auto;padding-bottom:10px}[data-sidebar-collapsed] .tavern-sidebar-content{flex:none}[data-sidebar-collapsed] .tavern-panel-screen{display:none}[data-sidebar-collapsed] .tavern-tabs{width:36px;height:auto;box-sizing:border-box;flex-direction:column;gap:2px;border:1px solid var(--dsw-alias-border-l2,#d7dbe1);border-radius:10px;padding:3px;background:color-mix(in srgb,var(--dsw-specific-sidebar-fill,#f7f8fa) 82%,var(--dsw-alias-bg-base,#fff) 18%)}[data-sidebar-collapsed] .tavern-tabs button{display:grid;width:28px;height:28px;place-items:center;border-radius:7px;padding:0;line-height:1}[data-sidebar-collapsed] .tavern-tabs button:hover{background:var(--dsw-alias-interactive-bg-hover,#eef0f3);color:var(--dsw-alias-label-primary,#17191d)}[data-sidebar-collapsed] .tavern-tabs button[aria-selected=true]{background:var(--dsw-alias-bg-base,#fff);box-shadow:0 1px 4px rgba(25,36,60,.1)}[data-sidebar-collapsed] .tavern-tabs button[aria-selected=true]::after{display:none}[data-sidebar-collapsed] .tavern-tab-label{display:none}
.tavern-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;margin:14px 2px 15px}.tavern-search{display:flex;align-items:center;gap:7px;height:34px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2,#d6d9de);border-radius:8px;padding:0 9px;color:var(--dsw-alias-label-tertiary,#858b95);background:var(--dsw-alias-bg-base,#fff)}.tavern-search:focus-within{border-color:#8daadd;box-shadow:0 0 0 2px rgba(75,119,192,.1)}.tavern-search input{min-width:0;width:100%;border:0;outline:0;background:transparent;color:inherit;font:400 12px/1 inherit}.tavern-import-button{display:flex;align-items:center;gap:5px;height:34px;border:0;border-radius:8px;padding:0 8px;background:transparent;color:inherit;cursor:pointer;font:550 12px/1 inherit}.tavern-import-button:hover{background:var(--dsw-alias-interactive-bg-hover,#f0f1f3)}.tavern-import-button:disabled{cursor:wait;opacity:.55}.tavern-file-input{display:none}.tavern-library-label{display:flex;align-items:center;justify-content:space-between;margin:0 5px 4px}.tavern-library-label strong{font-size:12px}.tavern-library-label small{color:var(--dsw-alias-label-tertiary,#8a909a);font-size:10px}
.tavern-inline-notice,.tavern-start-error{margin:8px 2px;border-radius:7px;padding:8px 9px;font-size:10px;line-height:1.45}.tavern-inline-notice{display:flex;flex-direction:column;background:var(--dsw-alias-interactive-bg-hover,#f0f1f3);color:var(--dsw-alias-label-secondary,#555d69)}.tavern-inline-notice small{margin-top:2px;color:var(--dsw-alias-label-tertiary,#858b95)}.tavern-start-error{background:#fff1f1;color:#923b3b}
.tavern-card-list{display:flex;flex-direction:column;gap:6px}.tavern-card-branch{position:relative;overflow:visible;border:1px solid transparent;border-radius:10px}.tavern-card-branch.is-expanded{border-color:var(--dsw-alias-border-l1,#e3e6eb);background:color-mix(in srgb,var(--dsw-alias-interactive-bg-hover,#edf2f9) 48%,transparent)}.tavern-card-row{display:grid;grid-template-columns:54px minmax(0,1fr) 16px;align-items:center;gap:9px;width:100%;border:0;border-radius:9px;padding:8px;background:transparent;color:inherit;cursor:pointer;text-align:left}.tavern-card-row:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f4f5)}.tavern-card-thumb{display:block;width:54px;height:54px;object-fit:cover;border:1px solid var(--dsw-alias-border-l2,#d6d9de);border-radius:9px;background:#eef0f3}.tavern-card-placeholder{display:grid;box-sizing:border-box;place-items:center;background:linear-gradient(145deg,#e8edf5,#d8e0ec);color:#52647f;font-size:20px;font-weight:700}.tavern-card-row-copy{display:flex;min-width:0;flex-direction:column}.tavern-card-row-copy>strong{overflow:hidden;font-size:12px;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}.tavern-card-row-copy>small{margin-top:1px;color:var(--dsw-alias-label-tertiary,#868c96);font-size:10px}.tavern-card-meta{display:flex;align-items:flex-end;justify-content:space-between;gap:4px}.tavern-card-meta>small{color:var(--dsw-alias-label-tertiary,#878d97);font-size:9px;white-space:nowrap}.tavern-chevron{color:var(--dsw-alias-label-tertiary,#8f959f)}.tavern-status-line{display:flex;align-items:center;gap:5px;margin-top:4px;color:#1e8a55;font-size:9px;min-width:0}.tavern-status-line i{width:5px;height:5px;flex:none;border-radius:50%;background:currentColor}.tavern-status-line strong{overflow:hidden;font-weight:550;text-overflow:ellipsis;white-space:nowrap}.tavern-status-line.is-degraded{color:#98731f}.tavern-status-line.is-blocked{color:#b33d49}
.tavern-card-context-menu{position:absolute;z-index:20;top:10px;right:10px;display:flex;width:136px;box-sizing:border-box;flex-direction:column;border:1px solid var(--dsw-alias-border-l2,#d5dae1);border-radius:9px;padding:5px;background:var(--dsw-alias-bg-base,#fff);box-shadow:0 10px 28px rgba(25,37,58,.2)}.tavern-card-context-menu button{appearance:none;display:flex;height:32px;align-items:center;border:0;border-radius:6px;padding:0 9px;background:transparent;color:var(--dsw-alias-label-primary,#30363d);cursor:pointer;font-family:inherit;font-size:11px;font-weight:500;line-height:1;text-align:left}.tavern-card-context-menu button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#eef2f7)}.tavern-card-context-menu button:disabled{cursor:not-allowed;opacity:.35}.tavern-card-context-menu button.is-danger{color:#a43d48}.tavern-card-context-menu>[role=separator]{height:1px;margin:4px;background:var(--dsw-alias-border-l1,#e5e8ec)}
.tavern-session-tree{position:relative;margin:0 7px 8px 10px;padding-left:14px}.tavern-session-tree::before{position:absolute;top:0;bottom:10px;left:0;border-left:1px dashed var(--dsw-alias-border-l2,#cfd5dd);content:""}.tavern-report-row,.tavern-new-game-row,.tavern-session-row{position:relative;display:grid;align-items:center;width:100%;border:0;border-radius:7px;background:transparent;color:inherit;cursor:pointer;text-align:left}.tavern-report-row::before,.tavern-new-game-row::before,.tavern-session-row::before{position:absolute;left:-14px;width:10px;border-top:1px dashed var(--dsw-alias-border-l2,#cfd5dd);content:""}.tavern-report-row,.tavern-new-game-row{grid-template-columns:22px 1fr;gap:4px;height:34px;color:var(--dsw-alias-label-secondary,#59616d);font:550 12px/1 inherit}.tavern-report-row:hover,.tavern-new-game-row:hover{background:rgba(255,255,255,.7);color:#215eb7}.tavern-new-game-row:disabled{cursor:not-allowed;color:var(--dsw-alias-label-tertiary,#9aa0aa)}.tavern-session-row{grid-template-columns:22px minmax(0,1fr) 16px;gap:4px;min-height:46px;padding:5px 6px}.tavern-session-row:hover{background:rgba(255,255,255,.72)}.tavern-session-row.is-selected{background:#e7eef9;color:#172f55}.tavern-session-row:disabled{cursor:wait}.tavern-session-icon{display:grid;place-items:center;color:var(--dsw-alias-label-secondary,#677080)}.tavern-session-copy{display:flex;min-width:0;flex-direction:column}.tavern-session-copy strong{overflow:hidden;font-size:12px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.tavern-session-copy small{margin-top:2px;color:var(--dsw-alias-label-tertiary,#838b97);font-size:10px}.tavern-row-more{color:var(--dsw-alias-label-tertiary,#8b929c);opacity:0}.tavern-session-row:hover .tavern-row-more,.tavern-session-row.is-selected .tavern-row-more{opacity:1}.tavern-empty{margin:25px 0;color:var(--dsw-alias-label-tertiary,#8b929c);font-size:11px;text-align:center}
.tavern-back-button{display:flex;align-items:center;gap:5px;max-width:100%;border:0;padding:3px 2px;background:transparent;color:var(--dsw-alias-label-secondary,#5a6270);cursor:pointer;font:550 11px/1.3 inherit}.tavern-back-button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tavern-card-summary{display:grid;grid-template-columns:64px 1fr;gap:12px;margin:18px 2px 14px}.tavern-card-summary h2{margin:1px 0 0;font-size:16px}.tavern-card-summary p{margin:4px 0 0;color:var(--dsw-alias-label-secondary,#626a77);font-size:10px;line-height:1.5}.tavern-compatibility{border:1px solid var(--dsw-alias-border-l1,#e2e4e7);border-radius:8px;padding:10px 11px;background:var(--dsw-alias-bg-subtle,#fafafa)}.tavern-compatibility>.tavern-status-line{margin-top:0}.tavern-compatibility>p{margin:6px 0 0;color:var(--dsw-alias-label-secondary,#606875);font-size:10px;line-height:1.5}.tavern-compatibility>button{margin:7px 0 0;border:0;padding:0;background:transparent;color:var(--dsw-alias-label-tertiary,#7e858f);cursor:pointer;font:500 10px/1 inherit}.tavern-technical-note{margin-top:8px;border-top:1px solid var(--dsw-alias-border-l1,#e4e6e9);padding-top:8px;color:var(--dsw-alias-label-tertiary,#838995);font-size:9px;line-height:1.45}.tavern-technical-note ul{display:flex;flex-direction:column;gap:7px;margin:0;padding:0;list-style:none}.tavern-technical-note li{display:flex;flex-direction:column;gap:1px}.tavern-technical-note li strong{color:var(--dsw-alias-label-secondary,#626a77);font-size:9px}.tavern-technical-note p{overflow-wrap:anywhere;margin:8px 0 0;border-top:1px dashed var(--dsw-alias-border-l2,#d4d7dc);padding-top:6px}
.tavern-form-section{display:flex;flex-direction:column;gap:13px;margin-top:16px}.tavern-form-section>label,.tavern-form-section fieldset{display:flex;flex-direction:column;gap:6px;border:0;margin:0;padding:0}.tavern-form-section>label>span,.tavern-form-section legend{color:var(--dsw-alias-label-secondary,#565e6b);font-size:10px;font-weight:600}.tavern-form-section input:not([type=radio]),.tavern-form-section select,.tavern-form-section textarea{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2,#d5d8dd);border-radius:7px;padding:8px 9px;background:var(--dsw-alias-bg-base,#fff);color:inherit;font:400 11px/1.45 inherit;outline:none}.tavern-form-section input:focus,.tavern-form-section select:focus,.tavern-form-section textarea:focus{border-color:#8ca9d8;box-shadow:0 0 0 2px rgba(91,135,205,.12)}.tavern-opening{display:grid;grid-template-columns:16px 1fr;gap:6px;border:1px solid var(--dsw-alias-border-l1,#e2e4e7);border-radius:7px;padding:8px;background:var(--dsw-alias-bg-base,#fff);cursor:pointer}.tavern-opening.is-selected{border-color:#9db5d9;background:#f6f8fc}.tavern-opening input{margin:2px 0 0}.tavern-opening span{display:flex;min-width:0;flex-direction:column}.tavern-opening strong{font-size:10px}.tavern-opening small{display:-webkit-box;margin-top:3px;overflow:hidden;color:var(--dsw-alias-label-secondary,#68707c);font-size:9px;line-height:1.4;-webkit-box-orient:vertical;-webkit-line-clamp:2}.tavern-opening-preview{border-radius:7px;padding:9px 10px;background:var(--dsw-alias-interactive-bg-hover,#f1f2f4)}.tavern-opening-preview span{font-size:10px;font-weight:600}.tavern-opening-preview p{margin:4px 0 0;color:var(--dsw-alias-label-secondary,#626a77);font-size:9px;line-height:1.5}.tavern-advanced-button{height:32px;border:1px dashed var(--dsw-alias-border-l2,#cfd3d9);border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#646c78);cursor:pointer;font:500 10px/1 inherit}
.tavern-panel-footer{position:sticky;bottom:-14px;display:flex;align-items:center;justify-content:space-between;gap:10px;margin:18px -4px -14px;border-top:1px solid var(--dsw-alias-border-l1,#e3e5e8);padding:10px 12px;background:color-mix(in srgb,var(--dsw-alias-bg-base,#fff) 96%,transparent);backdrop-filter:blur(8px)}.tavern-panel-footer.is-blocked{position:static;margin-top:16px;background:var(--dsw-alias-bg-subtle,#fafafa);backdrop-filter:none}.tavern-panel-footer p{margin:0;color:var(--dsw-alias-label-tertiary,#7e858f);font-size:9px}.tavern-start-button{flex:none;height:34px;border:0;border-radius:7px;padding:0 13px;background:#215eb7;color:#fff;cursor:pointer;font:600 11px/1 inherit}.tavern-start-button:hover{background:#194f9e}.tavern-start-button:disabled{background:var(--dsw-alias-interactive-bg-hover,#e4e6e9);color:var(--dsw-alias-label-tertiary,#999ea6);cursor:not-allowed}
.tavern-opening-dock{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance,20px) * 2);max-width:calc(var(--dsh-composer-card-max-width,850px) - 24px);margin:0 auto -6px;padding:0 12px;position:relative;z-index:2}.tavern-opening-dock-panel{overflow:hidden;border:1px solid var(--dsw-alias-border-l1,#dfe3e8);border-radius:14px 14px 8px 8px;background:color-mix(in srgb,var(--dsw-alias-bg-subtle,#f7f8fa) 82%,var(--dsw-alias-bg-base,#fff) 18%);box-shadow:0 1px 3px rgba(25,36,60,.045)}.tavern-opening-dock-toolbar{display:grid;grid-template-columns:34px minmax(0,1fr) 34px;align-items:center;min-height:40px;padding:2px 8px}.tavern-opening-navigation{display:grid;grid-template-columns:28px auto 28px;align-items:center;justify-content:center;gap:3px}.tavern-opening-navigation button,.tavern-opening-disclosure{display:grid;width:28px;height:28px;place-items:center;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#626b78);cursor:pointer}.tavern-opening-navigation button:hover:not(:disabled),.tavern-opening-disclosure:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#eef0f3)}.tavern-opening-navigation button:disabled,.tavern-opening-disclosure:disabled{cursor:default;opacity:.42}.tavern-opening-current{min-width:84px;padding:0 4px;color:var(--dsw-alias-label-primary,#20242a);font-size:12px;font-weight:550;text-align:center;white-space:nowrap}.tavern-opening-disclosure{justify-self:end}.tavern-opening-disclosure svg{transition:transform .16s ease}.tavern-opening-disclosure.is-expanded svg{transform:rotate(180deg)}.tavern-opening-menu{max-height:210px;overflow:auto;border-top:1px solid var(--dsw-alias-border-l1,#e1e4e8);padding:5px;background:var(--dsw-alias-bg-base,#fff)}.tavern-opening-menu button{display:flex;width:100%;box-sizing:border-box;flex-direction:column;gap:2px;border:0;border-radius:7px;padding:7px 9px;background:transparent;color:inherit;cursor:pointer;text-align:left}.tavern-opening-menu button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#eef0f3)}.tavern-opening-menu button[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover,#eef0f3);color:var(--dsw-alias-label-primary,#20242a)}.tavern-opening-menu span{font-size:12px;font-weight:500}.tavern-opening-menu small{overflow:hidden;color:var(--dsw-alias-label-secondary,#68717e);font-size:11px;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}.tavern-opening-error{margin:0;border-top:1px solid var(--dsw-alias-border-l1,#e5e7ea);padding:6px 12px;color:#a43d48;background:#fff4f4;font-size:10px;line-height:1.35}
.tavern-opening-dock{z-index:0}.tavern-opening-dock-panel{border-bottom:0;border-radius:14px 14px 0 0;box-shadow:0 -1px 3px rgba(25,36,60,.035)}
.tavern-opening-option-copy{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:baseline;gap:5px;min-width:0}.tavern-opening-option-copy strong{font-size:12px;font-weight:600}.tavern-opening-menu .tavern-opening-option-copy small{display:block;min-width:0;font-size:11px;font-weight:400}
.tavern-opening-message{color:inherit;font:inherit;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}
.tavern-surface-update-event.is-narrow{align-items:flex-start;flex-direction:column;justify-content:center;gap:1px}.tavern-surface-update-event.is-narrow strong{width:100%;flex:none}.tavern-surface-update-event.is-narrow>span{font-size:9px}
.tavern-surface-version-meta{display:block;margin-top:3px;color:#3d72c8;font:500 10px/1.35 inherit}.tavern-surface-update-event{position:absolute;inset:0;display:flex;box-sizing:border-box;align-items:center;justify-content:space-between;gap:8px;padding:0 12px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#25292f);pointer-events:none}.tavern-surface-update-event strong{min-width:0;flex:1;overflow:hidden;font-size:12px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.tavern-surface-update-event>span{flex:none;color:var(--dsw-alias-label-secondary,#68717e);font:500 10px/1.3 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:nowrap}td[data-tavern-surface-update-cell="true"]{position:relative;min-height:42px;color:transparent!important}tr[data-selected="true"] .tavern-surface-update-event,tr[data-tavern-relation="current"] .tavern-surface-update-event{background:color-mix(in srgb,var(--dsw-alias-interactive-bg-selected,#e9f0fb) 76%,var(--dsw-alias-bg-base,#fff) 24%)}tr[data-tavern-relation="history"]{opacity:.78}tr[data-tavern-locate-pulse="true"]{animation:tavern-surface-locate .6s ease-out}@keyframes tavern-surface-locate{0%,100%{outline-color:transparent}35%{outline:2px solid #6e86ca;outline-offset:-2px}}.tavern-surface-version-stem{position:fixed;z-index:9998;width:1px;pointer-events:none;background:repeating-linear-gradient(180deg,#b9c5d8 0 3px,transparent 3px 7px)}#trajectory-detail-panel[data-tavern-surface-detail-active="true"]>:not([data-tavern-surface-detail]){display:none!important}.tavern-surface-detail{box-sizing:border-box;margin:0;padding:13px 15px 16px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#25292f);animation:tavern-surface-detail-in .2s ease-out}@keyframes tavern-surface-detail-in{from{opacity:.35;transform:translateY(-3px)}to{opacity:1;transform:none}}.tavern-surface-detail-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;border-bottom:1px solid var(--dsw-alias-border-l1,#e1e4e8);padding-bottom:11px}.tavern-surface-detail-heading strong{font-size:13px;font-weight:650}.tavern-surface-detail-heading p{margin:4px 0 0;color:var(--dsw-alias-label-secondary,#68717e);font-size:10px;line-height:1.5}.tavern-surface-version-history{position:relative;display:grid;gap:0;margin:10px 0;border-bottom:1px solid var(--dsw-alias-border-l1,#e1e4e8);padding-bottom:8px}.tavern-surface-version-history>*{display:flex;flex-direction:column;gap:2px;border:0;border-left:2px solid transparent;padding:6px 9px;background:transparent;color:inherit;text-align:left}.tavern-surface-version-history button{cursor:pointer}.tavern-surface-version-history button:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f4f6)}.tavern-surface-version-history .is-history{color:var(--dsw-alias-label-secondary,#68717e)}.tavern-surface-version-history .is-current{border-left-color:#5685dc;background:color-mix(in srgb,var(--dsw-alias-interactive-bg-selected,#e9f0fb) 54%,transparent);color:#2f68c5}.tavern-surface-version-history strong{font-size:10px;font-weight:600}.tavern-surface-version-history span{font-size:9px;line-height:1.4}.tavern-surface-change-summary{margin:0 0 7px;color:var(--dsw-alias-label-secondary,#68717e);font-size:9px;font-weight:550}.tavern-surface-comparison{display:grid;gap:8px}.tavern-surface-comparison article{min-width:0;overflow:hidden;border:1px solid var(--dsw-alias-border-l1,#dfe3e8);border-radius:8px;background:var(--dsw-alias-bg-subtle,#f8f9fa)}.tavern-surface-comparison header{border-bottom:1px solid var(--dsw-alias-border-l1,#e3e6ea);padding:6px 8px;color:var(--dsw-alias-label-secondary,#68717e);font-size:9px;font-weight:600}.tavern-surface-comparison pre{max-height:178px;margin:0;overflow:auto;padding:8px;color:var(--dsw-alias-label-primary,#25292f);font:9px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.tavern-surface-comparison article:first-child{opacity:.78}.tavern-surface-version-chain{margin:8px 0 0;color:var(--dsw-alias-label-tertiary,#7e858f);font:9px/1.3 ui-monospace,SFMono-Regular,Consolas,monospace}.tavern-surface-technical{margin-top:9px;color:var(--dsw-alias-label-secondary,#68717e);font-size:9px}.tavern-surface-technical summary{cursor:pointer}.tavern-surface-technical pre{overflow:auto;border-radius:7px;padding:7px;background:var(--dsw-alias-bg-subtle,#f5f6f8);font:9px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}@media (prefers-reduced-motion:reduce){tr[data-tavern-locate-pulse="true"],.tavern-surface-detail{animation:none!important}}
.tavern-assembly-event{position:absolute;inset:0;display:grid;box-sizing:border-box;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;gap:8px;padding:0 12px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#25292f);pointer-events:none}.tavern-assembly-icon{display:grid;width:20px;height:20px;place-items:center;border-radius:6px;background:color-mix(in srgb,#5685dc 12%,transparent);color:#5685dc;font-size:14px}.tavern-assembly-copy{display:flex;min-width:0;flex-direction:column;gap:2px}.tavern-assembly-copy strong{overflow:hidden;font-size:12px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.tavern-assembly-copy>span{overflow:hidden;color:var(--dsw-alias-label-secondary,#68717e);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.tavern-assembly-delta{color:var(--dsw-alias-label-secondary,#68717e);font:550 9px/1 ui-monospace,SFMono-Regular,Consolas,monospace}td[data-tavern-assembly-cell="true"]{position:relative;min-height:42px;color:transparent!important}tr[data-selected="true"] .tavern-assembly-event{background:color-mix(in srgb,var(--dsw-alias-interactive-bg-selected,#e9f0fb) 76%,var(--dsw-alias-bg-base,#fff) 24%)}tr[data-tavern-relation="history"]{background:color-mix(in srgb,#5685dc 8%,transparent)}#trajectory-detail-panel[data-tavern-assembly-detail-active="true"]>:not([data-tavern-assembly-detail]){display:none!important}.tavern-assembly-detail{box-sizing:border-box;height:100%;overflow:auto;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#25292f);animation:tavern-surface-detail-in .2s ease-out}.tavern-assembly-detail-heading{padding:14px 16px 11px;border-bottom:1px solid var(--dsw-alias-border-l1,#e1e4e8)}.tavern-assembly-detail-heading strong{font-size:13px;font-weight:650}.tavern-assembly-detail-heading p{margin:4px 0 0;color:var(--dsw-alias-label-secondary,#68717e);font-size:10px}.tavern-assembly-tabs{display:flex;height:38px;align-items:end;gap:18px;border-bottom:1px solid var(--dsw-alias-border-l1,#e1e4e8);padding:0 16px}.tavern-assembly-tabs button{height:38px;border:0;border-bottom:2px solid transparent;padding:0 1px;background:transparent;color:var(--dsw-alias-label-secondary,#68717e);cursor:pointer;font:500 11px/1 inherit}.tavern-assembly-tabs button.is-active{border-bottom-color:#3978df;color:#3978df}.tavern-assembly-tab-body{padding:14px 16px 20px}.tavern-assembly-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.tavern-assembly-stat{display:flex;min-width:0;flex-direction:column;gap:3px;border:1px solid var(--dsw-alias-border-l1,#e1e4e8);border-radius:9px;padding:10px;background:var(--dsw-alias-bg-subtle,#f7f8fa)}.tavern-assembly-stat strong{font-size:17px;font-weight:600}.tavern-assembly-stat span{color:var(--dsw-alias-label-secondary,#68717e);font-size:9px}.tavern-assembly-section{margin-top:16px}.tavern-assembly-section h4{margin:0 0 8px;font-size:10px;font-weight:650}.tavern-assembly-changes{display:flex;flex-wrap:wrap;gap:5px}.tavern-assembly-changes span{border-radius:999px;padding:3px 7px;background:var(--dsw-alias-bg-subtle,#f1f3f5);font-size:9px}.tavern-assembly-changes .is-added{background:#edf8f1;color:#27844d}.tavern-assembly-changes .is-removed{background:#fff0f0;color:#aa4751}.tavern-assembly-changes .is-quiet{color:var(--dsw-alias-label-secondary,#68717e)}.tavern-assembly-previous{margin-top:10px;border:0;padding:0;background:transparent;color:#3978df;cursor:pointer;font:500 9px/1 inherit}.tavern-activation-list,.tavern-layout-list,.tavern-request-list{display:grid;gap:7px}.tavern-activation-item,.tavern-layout-block,.tavern-request-message{min-width:0;border:1px solid var(--dsw-alias-border-l1,#e1e4e8);border-radius:8px;background:var(--dsw-alias-bg-base,#fff)}.tavern-activation-item{border-left:3px solid #55aa73;padding:8px 9px}.tavern-activation-item.is-filtered{border-left-color:#c6cbd2;opacity:.72}.tavern-activation-item>div{display:flex;align-items:center;justify-content:space-between;gap:8px}.tavern-activation-item strong{overflow:hidden;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.tavern-activation-item span,.tavern-activation-item p{color:var(--dsw-alias-label-secondary,#68717e);font-size:8px}.tavern-activation-item p{margin:5px 0 0;line-height:1.45}.tavern-layout-block{display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px}.tavern-layout-block.is-disabled{opacity:.48}.tavern-layout-index{color:var(--dsw-alias-label-tertiary,#8a919b);font:500 9px/1 ui-monospace,SFMono-Regular,Consolas,monospace}.tavern-layout-block strong{font-size:10px}.tavern-layout-block p{display:-webkit-box;margin:3px 0 0;overflow:hidden;color:var(--dsw-alias-label-secondary,#68717e);font-size:8px;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:2}.tavern-layout-meta{color:var(--dsw-alias-label-tertiary,#858c96);font-size:8px;white-space:nowrap}.tavern-layout-injection{margin:-3px 8px 0 31px;border-left:2px solid #8ba9dd;padding:4px 8px;color:#3d72c8;background:color-mix(in srgb,#5685dc 7%,transparent);font-size:8px}.tavern-request-message{overflow:hidden}.tavern-request-message header{display:flex;align-items:center;gap:7px;border-bottom:1px solid var(--dsw-alias-border-l1,#e1e4e8);padding:6px 8px;color:var(--dsw-alias-label-secondary,#68717e);font-size:8px}.tavern-request-message header span:first-child{border-radius:4px;padding:2px 5px;font-weight:650}.tavern-request-message header .is-system{background:#edf0f4;color:#536070}.tavern-request-message header .is-user{background:#eaf2ff;color:#3972c9}.tavern-request-message header .is-assistant{background:#f2edff;color:#7758b3}.tavern-request-message pre{max-height:155px;margin:0;overflow:auto;padding:8px;color:var(--dsw-alias-label-primary,#25292f);font:9px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}@media (prefers-reduced-motion:reduce){.tavern-assembly-detail,tr[data-tavern-locate-pulse="true"]{animation:none!important}}
tr[data-tavern-assembly-row="true"]{display:none!important}
@media (prefers-reduced-motion:reduce){.tavern-sidebar-content{animation:none}.tavern-capability-panel,body:has(.tavern-card-capability-rail){transition:none!important}}@media (max-width:760px){.tavern-toolbar{grid-template-columns:minmax(0,1fr) auto}}
.tavern-native-rich-display{min-width:0;width:100%}.tavern-native-message{display:flex;min-width:0;flex-direction:column;gap:16px;color:var(--dsw-alias-label-primary,#25292f);font-size:16px;line-height:28px}.tavern-native-rich-frame-shell{position:relative;display:block;box-sizing:border-box;width:100%;height:72px;overflow:hidden;overflow-anchor:none}.tavern-native-rich-frame-shell[data-tavern-rich-shell=ready]{transition:height .18s cubic-bezier(.4,0,.2,1)}.tavern-native-rich-frame{position:absolute;top:0;left:0;display:block;box-sizing:border-box;width:100%;height:72px;border:0;background:transparent}.tavern-native-hosted-frame{display:block;box-sizing:border-box;width:100%;height:min(520px,60vh);border:1px solid var(--dsw-alias-border-l1,#dfe3e8);border-radius:14px;background:var(--dsw-alias-bg-subtle,#f7f8fa)}.tavern-native-hosted-frame.is-required-asset{height:360px}@media (prefers-reduced-motion:reduce){.tavern-native-rich-frame-shell[data-tavern-rich-shell=ready]{transition:none}}
.tavern-native-companion-frame{position:fixed;z-index:90;top:0;left:0;display:block;width:100vw;height:100vh;border:0;clip-path:inset(0 100% 100% 0);pointer-events:none;background:transparent;opacity:1;filter:none;mix-blend-mode:normal;color-scheme:light dark}
.tavern-companion-permission{position:fixed;z-index:98;top:72px;left:16px;display:grid;max-width:360px;gap:8px;padding:14px;border:1px solid #e4a11b;border-radius:12px;background:#fff8e8;color:#3a2b12;box-shadow:0 12px 32px #0003;font-size:13px;line-height:20px}.tavern-companion-permission button{cursor:pointer;justify-self:start;border:0;border-radius:999px;padding:8px 14px;background:#1f6feb;color:#fff;font-weight:700}
:root{--tavern-capability-rail-width:64px;--tavern-capability-panel-width:clamp(460px,35vw,560px)}
body:has(.tavern-card-capability-rail){box-sizing:border-box;padding-right:var(--tavern-capability-rail-width);transition:padding-right .2s cubic-bezier(.2,.7,.2,1)}body:has(.tavern-capability-panel.is-open){padding-right:calc(var(--tavern-capability-rail-width) + var(--tavern-capability-panel-width))}
.tavern-card-capability-rail,.tavern-capability-panel{color:#17191d;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
.tavern-card-capability-rail{position:fixed;z-index:125;top:0;right:0;bottom:0;display:flex;width:var(--tavern-capability-rail-width);box-sizing:border-box;flex-direction:column;align-items:stretch;border-left:1px solid #dfe2e5;background:#fafbfc}.tavern-card-capability-rail>button{position:relative;display:flex;height:49px;box-sizing:border-box;flex:none;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;border-radius:0;background:transparent;color:#5f6770;cursor:pointer;font:500 10px/1 inherit}.tavern-card-capability-rail>button:hover{background:#f0f3f7;color:#2468c7}.tavern-card-capability-rail>button.is-active{background:#edf4ff;color:#1767d8}.tavern-card-capability-rail>button.is-active::before{position:absolute;top:7px;bottom:7px;left:0;width:2px;border-radius:0 2px 2px 0;background:#2877eb;content:""}.tavern-card-capability-rail>button.is-group-start{margin-top:7px;border-top:1px solid #e2e5e9;padding-top:7px}.tavern-card-capability-rail>.tavern-capability-handle{height:42px;margin-bottom:5px;border-bottom:1px solid #e2e5e9}.tavern-card-capability-rail>.tavern-capability-handle::before{display:none}
.tavern-capability-panel{position:fixed;z-index:124;top:0;right:var(--tavern-capability-rail-width);bottom:0;display:flex;width:var(--tavern-capability-panel-width);min-width:0;box-sizing:border-box;flex-direction:column;overflow:hidden;border-left:1px solid #dfe2e5;background:#fff;box-shadow:-12px 0 32px rgba(26,38,58,.08);transform:translateX(calc(100% + var(--tavern-capability-rail-width)));visibility:hidden;pointer-events:none;transition:transform .2s cubic-bezier(.2,.7,.2,1),visibility 0s linear .2s}.tavern-capability-panel.is-open{transform:translateX(0);visibility:visible;pointer-events:auto;transition:transform .2s cubic-bezier(.2,.7,.2,1),visibility 0s}.tavern-capability-panel-header{display:flex;min-height:64px;box-sizing:border-box;flex:none;align-items:center;border-bottom:1px solid #e1e4e8;padding:12px 18px}.tavern-capability-panel-header>div{display:flex;min-width:0;flex-direction:column;gap:4px}.tavern-capability-panel-header strong{font-size:17px;font-weight:650}.tavern-capability-panel-header span{overflow:hidden;color:#747c86;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.tavern-capability-loading{display:grid;min-height:0;flex:1;place-items:center;padding:28px;color:#747c86;font-size:12px;text-align:center}.tavern-capability-loading.is-error{color:#a94450}
.tavern-capability-tabs{display:flex;height:42px;flex:none;align-items:flex-end;gap:22px;overflow-x:auto;border-bottom:1px solid #e1e4e8;padding:0 18px}.tavern-capability-tabs button{position:relative;height:42px;flex:none;border:0;padding:0;background:transparent;color:#69717b;cursor:pointer;font:500 11px/42px inherit}.tavern-capability-tabs button[aria-selected=true]{color:#1767d8}.tavern-capability-tabs button[aria-selected=true]::after{position:absolute;right:0;bottom:-1px;left:0;height:2px;background:#2877eb;content:""}.tavern-capability-search{display:flex;height:36px;box-sizing:border-box;flex:none;align-items:center;gap:7px;margin:12px 14px;border:1px solid #d9dde2;border-radius:7px;padding:0 10px;color:#858c95}.tavern-capability-search:focus-within{border-color:#8aa8d9;box-shadow:0 0 0 2px #3478f617}.tavern-capability-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#17191d;font:400 11px/1 inherit}
.tavern-worldbook-workbench,.tavern-regex-workbench{display:grid;min-height:0;flex:1;grid-template-columns:minmax(155px,40%) minmax(0,1fr);overflow:hidden;border-top:1px solid #eef0f2}.tavern-capability-list{min-height:0;overflow:auto;border-right:1px solid #e1e4e8;background:#fafbfc}.tavern-capability-list>button{position:relative;display:flex;width:100%;min-width:0;min-height:48px;box-sizing:border-box;flex-direction:column;justify-content:center;gap:3px;border:0;border-bottom:1px solid #eceef1;padding:7px 12px;background:transparent;color:#25292f;cursor:pointer;text-align:left}.tavern-capability-list>button:hover{background:#f1f4f8}.tavern-capability-list>button[aria-selected=true]{background:#eaf2ff;color:#1f61be}.tavern-capability-list>button span,.tavern-capability-list>button small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tavern-capability-list>button span{font-size:11px;font-weight:600}.tavern-capability-list>button small{color:#7c848e;font-size:9px}.tavern-capability-empty{margin:0;padding:24px;color:#7c848e;font-size:11px;line-height:1.6;text-align:center}.tavern-capability-empty.is-roomy{display:grid;min-height:0;flex:1;place-items:center}.tavern-capability-inspector{min-width:0;min-height:0;overflow:auto;padding:18px}.tavern-capability-inspector>header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.tavern-capability-inspector>header small{color:#8a919a;font:8px/1 ui-monospace,SFMono-Regular,Consolas,monospace}.tavern-capability-inspector h3{margin:4px 0 0;font-size:14px}.tavern-capability-inspector>header>span{border-radius:999px;padding:3px 7px;background:#eef0f2;color:#727a84;font-size:8px}.tavern-capability-inspector>header>span.is-enabled{background:#eaf7ef;color:#26794a}.tavern-capability-prose{margin:15px 0;border-left:3px solid #6f91c9;padding:10px 11px;background:#f7f8fa;font-size:11px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}.tavern-capability-inspector dl,.tavern-capability-summary dl,.tavern-capability-sections dl{display:grid;grid-template-columns:94px minmax(0,1fr);gap:0;margin:0;border-top:1px solid #e3e6e9;font-size:10px}.tavern-capability-inspector dt,.tavern-capability-inspector dd,.tavern-capability-summary dt,.tavern-capability-summary dd,.tavern-capability-sections dt,.tavern-capability-sections dd{margin:0;border-bottom:1px solid #e8eaed;padding:8px}.tavern-capability-inspector dt,.tavern-capability-summary dt,.tavern-capability-sections dt{color:#7a828c}.tavern-capability-inspector dd,.tavern-capability-summary dd,.tavern-capability-sections dd{overflow-wrap:anywhere;color:#343a41}
.tavern-worldbook-overview{display:grid;flex:none;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;border-bottom:1px solid #e8ebef;padding:12px 16px;background:#f7f9fc}.tavern-worldbook-overview>div{display:flex;min-width:0;flex-direction:column;gap:2px;border:1px solid #e2e6eb;border-radius:9px;padding:9px 10px;background:#fff}.tavern-worldbook-overview strong{color:#20252b;font-size:17px;line-height:1.15}.tavern-worldbook-overview span{overflow:hidden;color:#7b838d;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.tavern-worldbook-toolbar{flex:none;border-bottom:1px solid #e3e7eb;padding:10px 16px 12px;background:#fff}.tavern-worldbook-toolbar .tavern-capability-tabs{height:34px;align-items:center;gap:2px;border:0;border-radius:8px;padding:3px;background:#eff2f6}.tavern-worldbook-toolbar .tavern-capability-tabs>button{height:28px;flex:1;border:0;border-radius:6px;padding:0 10px;color:#68717c;font-size:10px;line-height:28px}.tavern-worldbook-toolbar .tavern-capability-tabs>button[aria-selected=true]{background:#fff;color:#1e65c6;box-shadow:0 1px 3px #15253d1f}.tavern-worldbook-toolbar .tavern-capability-tabs>button[aria-selected=true]::after{display:none}.tavern-worldbook-toolbar .tavern-capability-search{margin:10px 0 0}.tavern-worldbook-workbench{grid-template-columns:minmax(190px,43%) minmax(0,1fr);border-top:0;background:#f5f7fa}.tavern-worldbook-library{display:flex;min-width:0;min-height:0;flex-direction:column;border-right:1px solid #e1e5ea;background:#f4f6f9}.tavern-worldbook-library>header{display:flex;flex:none;align-items:center;justify-content:space-between;padding:12px 12px 7px;color:#30363d}.tavern-worldbook-library>header strong{font-size:11px}.tavern-worldbook-library>header span{color:#858d97;font-size:9px}.tavern-worldbook-library>.tavern-capability-list{flex:1;border:0;padding:0 8px 12px;background:transparent}.tavern-worldbook-library .tavern-capability-list>button{min-height:82px;gap:5px;margin:5px 0;border:1px solid #e1e5ea;border-radius:9px;padding:10px;background:#fff;box-shadow:0 1px 2px #182a4212}.tavern-worldbook-library .tavern-capability-list>button:hover{border-color:#c7d7eb;background:#fff}.tavern-worldbook-library .tavern-capability-list>button[aria-selected=true]{border-color:#7ba7e2;background:#f7fbff;box-shadow:0 0 0 1px #80ace73d,0 2px 6px #1f4d8917;color:#205da9}.tavern-worldbook-entry-title{font-size:11px!important}.tavern-worldbook-library .tavern-capability-list>button p{display:-webkit-box;min-height:28px;margin:0;overflow:hidden;color:#68727d;font-size:9.5px;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.tavern-worldbook-library .tavern-capability-list>button footer{display:flex;align-items:center;justify-content:space-between;gap:8px}.tavern-worldbook-library .tavern-capability-list>button footer em{overflow:hidden;border-radius:999px;padding:2px 6px;background:#edf5ff;color:#376ba9;font-size:8px;font-style:normal;text-overflow:ellipsis;white-space:nowrap}.tavern-worldbook-library .tavern-capability-list>button footer em.is-disabled{background:#f0f1f3;color:#818892}.tavern-worldbook-library .tavern-capability-list>button footer small{min-width:0;color:#88919b;font-size:8px}.tavern-worldbook-load-more{display:flex;flex:none;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #e0e5ea;padding:8px 10px;background:#fff}.tavern-worldbook-load-more span{color:#7f8892;font-size:8px}.tavern-worldbook-load-more button{border:1px solid #cad8e9;border-radius:7px;padding:5px 8px;background:#f6faff;color:#2867b4;cursor:pointer;font:600 9px/1 inherit}.tavern-worldbook-load-more button:hover{background:#edf5ff}.tavern-worldbook-workbench>.tavern-capability-inspector{padding:20px 20px 48px;background:#fff}.tavern-worldbook-workbench>.tavern-capability-inspector>header{padding-bottom:16px;border-bottom:1px solid #e6e9ed}.tavern-worldbook-workbench>.tavern-capability-inspector>header small{color:#85909c;font:9px/1.3 inherit}.tavern-worldbook-workbench>.tavern-capability-inspector h3{margin-top:5px;color:#20252b;font-size:16px;line-height:1.35}.tavern-worldbook-content,.tavern-worldbook-keywords{margin-top:18px}.tavern-worldbook-content h4,.tavern-worldbook-keywords h4{margin:0 0 7px;color:#68727d;font-size:9px;font-weight:700;letter-spacing:.08em}.tavern-worldbook-content .tavern-capability-prose{margin:0;border:1px solid #e4e8ed;border-radius:9px;padding:13px 14px;background:#f8fafc;color:#303840;font-size:11px;line-height:1.75}.tavern-worldbook-keywords>div{display:flex;flex-wrap:wrap;gap:5px}.tavern-worldbook-keywords>div>span{max-width:100%;overflow:hidden;border:1px solid #dce6f3;border-radius:999px;padding:4px 8px;background:#f4f8fd;color:#3a689d;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.tavern-worldbook-keywords>div>span.is-muted{border-color:#e5e7ea;background:#f6f7f8;color:#868d96}.tavern-worldbook-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:18px}.tavern-worldbook-facts>div{display:flex;min-width:0;flex-direction:column;gap:4px;border:1px solid #e5e8ec;border-radius:8px;padding:9px 10px;background:#fafbfc}.tavern-worldbook-facts span{color:#838b95;font-size:8px}.tavern-worldbook-facts strong{overflow-wrap:anywhere;color:#343b43;font-size:9px;line-height:1.45}
.tavern-capability-summary{flex:none;border-bottom:1px solid #e1e4e8;padding:13px 16px}.tavern-capability-summary dl{margin-bottom:10px}.tavern-native-jump{display:inline-flex;min-height:30px;box-sizing:border-box;align-items:center;justify-content:center;border:1px solid #b8c9e4;border-radius:7px;padding:0 11px;background:#f5f8fd;color:#2465bd;cursor:pointer;font:550 10px/1 inherit;text-decoration:none}.tavern-native-jump:hover{background:#eaf2ff}.tavern-native-jump.is-danger{border-color:#e5b7bb;background:#fff7f7;color:#a94450}.tavern-capability-warning{margin:8px 0 0;color:#a66b13;font-size:9px}.tavern-context-block-list,.tavern-final-request,.tavern-capability-sections,.tavern-card-profile,.tavern-opening-documents,.tavern-compatibility-list,.tavern-variable-tree,.tavern-variable-diff,.tavern-regex-matches,.tavern-script-list{min-height:0;flex:1;overflow:auto}.tavern-context-block-list{padding:8px 12px}.tavern-context-block-list article{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:8px;border-bottom:1px solid #eceef1;padding:9px 4px}.tavern-context-block-list article.is-disabled{opacity:.48}.tavern-context-block-list article>span{color:#8a9199;font:9px/1 ui-monospace,SFMono-Regular,Consolas,monospace}.tavern-context-block-list strong{font-size:11px}.tavern-context-block-list p{display:-webkit-box;margin:3px 0 0;overflow:hidden;color:#66707b;font-size:9px;line-height:1.4;-webkit-box-orient:vertical;-webkit-line-clamp:2}.tavern-context-block-list small{color:#858c95;font-size:8px;white-space:nowrap}.tavern-final-request{padding:12px 14px 40px}.tavern-final-request section{margin-bottom:12px;border:1px solid #e1e4e8;border-radius:8px;overflow:hidden}.tavern-final-request h3{margin:0;border-bottom:1px solid #e5e7ea;padding:7px 9px;background:#f7f8fa;font-size:9px;text-transform:uppercase}.tavern-final-request pre,.tavern-capability-sections pre,.tavern-capability-inspector pre,.tavern-card-profile pre,.tavern-script-list pre,.tavern-regex-matches pre,.tavern-raw-json{margin:0;overflow:auto;padding:10px;color:#25292f;background:#fafbfc;font:9px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
.tavern-capability-sections{padding:14px 16px 48px}.tavern-capability-sections>section{margin-bottom:18px}.tavern-capability-sections h3,.tavern-card-profile h3{margin:0 0 9px;font-size:12px}.tavern-capability-sections p,.tavern-card-profile p{margin:7px 0;color:#5f6873;font-size:10px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}.tavern-capability-sections label,.tavern-capability-inspector>label{display:block;margin:10px 0 5px;color:#737b85;font-size:9px;font-weight:600}.tavern-preset-row{display:flex;align-items:center;gap:8px;border:1px solid #e1e4e8;border-radius:8px;padding:9px}.tavern-preset-row>div{display:flex;min-width:0;flex-direction:column;gap:2px}.tavern-preset-row strong{font-size:10px}.tavern-preset-row span{color:#7b838d;font-size:8px}

.tavern-variable-tree{padding:12px 14px 50px}.tavern-variable-branch{margin:4px 0;border-left:1px solid #dfe3e8;padding-left:10px}.tavern-variable-branch summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0;cursor:pointer}.tavern-variable-branch summary strong{font:600 10px/1.3 ui-monospace,SFMono-Regular,Consolas,monospace}.tavern-variable-branch summary span{color:#858c95;font-size:8px}.tavern-variable-branch>div{padding-left:7px}.tavern-variable-leaf{display:grid;grid-template-columns:minmax(90px,.8fr) minmax(0,1.2fr);gap:8px;border-bottom:1px dotted #e2e5e8;padding:5px 0;font-size:9px}.tavern-variable-leaf span{overflow-wrap:anywhere;color:#59636e}.tavern-variable-leaf code{overflow-wrap:anywhere;color:#2b61a8}.tavern-variable-diff{padding:12px 16px}.tavern-variable-diff ol{margin:0;padding-left:20px}.tavern-variable-diff li{margin-bottom:7px;font-size:9px}.tavern-variable-diff strong,.tavern-variable-diff span{display:block}.tavern-variable-diff span{margin-top:2px;color:#6f7882}.tavern-raw-json{min-height:0;flex:1;padding:16px!important}
.tavern-regex-workbench .tavern-capability-inspector>pre{margin-top:5px}.tavern-regex-matches{padding:12px}.tavern-regex-matches>article{margin-bottom:12px;border:1px solid #dfe3e8;border-radius:8px;overflow:hidden}.tavern-regex-matches>article>header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7ea;padding:7px 9px;background:#f7f8fa;font-size:9px}.tavern-regex-matches>article>div{display:grid;grid-template-columns:1fr 1fr}.tavern-regex-matches section+section{border-left:1px solid #e5e7ea}.tavern-regex-matches h4{margin:0;padding:6px 8px;color:#6e7781;font-size:8px}.tavern-regex-matches pre{max-height:220px}.tavern-runtime-errors{margin:0;padding-left:18px;color:#a94450;font-size:9px;line-height:1.5}.tavern-script-list{padding:12px 14px}.tavern-script-list details{margin-bottom:8px;border:1px solid #dfe3e8;border-radius:8px;overflow:hidden}.tavern-script-list summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;cursor:pointer}.tavern-script-list summary strong{font-size:10px}.tavern-script-list summary span{color:#818994;font-size:8px}.tavern-script-list pre{max-height:420px;border-top:1px solid #e5e7ea}.tavern-chip-list{display:flex;flex-wrap:wrap;gap:5px}.tavern-chip-list span{border-radius:999px;padding:4px 7px;background:#edf3fc;color:#2d67ba;font:8px/1 ui-monospace,SFMono-Regular,Consolas,monospace}
.tavern-regex-settings,.tavern-regex-evidence{min-height:0;flex:1;overflow:auto;background:#f5f7fa}.tavern-regex-overview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;border-bottom:1px solid #e3e7eb;padding:12px 16px;background:#f7f9fc}.tavern-regex-overview>div{display:flex;min-width:0;flex-direction:column;gap:3px;border:1px solid #e2e6eb;border-radius:9px;padding:9px 10px;background:#fff}.tavern-regex-overview strong{overflow:hidden;color:#20252b;font-size:16px;line-height:1.15;text-overflow:ellipsis;white-space:nowrap}.tavern-regex-overview span{overflow:hidden;color:#7c848d;font-size:8px;text-overflow:ellipsis;white-space:nowrap}.tavern-regex-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;border-bottom:1px solid #e3e7eb;padding:10px 16px;background:#fff}.tavern-regex-toolbar .tavern-capability-search{height:34px;margin:0}.tavern-regex-debug-button{display:inline-flex;height:34px;align-items:center;gap:6px;border:1px solid #cbd9eb;border-radius:7px;padding:0 10px;background:#f6f9fd;color:#2b65ad;cursor:pointer;font:600 9px/1 inherit}.tavern-regex-debug-button:hover{border-color:#9ebbe0;background:#edf4fd}.tavern-regex-scopes{padding:12px 14px 48px}.tavern-regex-scope{margin-bottom:10px;border:1px solid #dfe4e9;border-radius:10px;background:#fff;box-shadow:0 1px 2px #1b2d4510;overflow:hidden}.tavern-regex-scope>header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px}.tavern-regex-scope>header>div{display:flex;min-width:0;flex-direction:column;gap:3px}.tavern-regex-scope>header strong{color:#2b3138;font-size:11px}.tavern-regex-scope>header span{overflow:hidden;color:#7d8690;font-size:8.5px;text-overflow:ellipsis;white-space:nowrap}.tavern-regex-scope>header em{flex:none;border-radius:999px;padding:3px 7px;background:#eef1f4;color:#747d87;font-size:8px;font-style:normal}.tavern-regex-scope>p{margin:0;border-top:1px solid #edf0f2;padding:9px 12px;color:#7d858e;font-size:9px;line-height:1.55}.tavern-regex-scope.is-unavailable{background:#fafbfc}.tavern-regex-scope.is-unavailable>header{opacity:.75}.tavern-regex-scope.is-current{border-color:#cad9ec}.tavern-regex-scope.is-current>header{background:#f7faff}.tavern-regex-scope.is-current>header em{background:#e7f1ff;color:#2464b5}.tavern-regex-rule-list{border-top:1px solid #e4e9ef}.tavern-regex-rule-list>article+article{border-top:1px solid #e8ecf0}.tavern-regex-rule-list>article>button{display:grid;width:100%;min-height:58px;box-sizing:border-box;grid-template-columns:28px minmax(0,1fr) auto 16px;align-items:center;gap:8px;border:0;padding:8px 10px;background:#fff;color:#30363d;cursor:pointer;text-align:left}.tavern-regex-rule-list>article>button:hover{background:#f7faff}.tavern-regex-rule-list>article.is-expanded>button{background:#eef5ff;color:#205fae}.tavern-regex-order{display:grid;width:25px;height:25px;place-items:center;border-radius:7px;background:#f0f2f5;color:#737c86;font:650 8px/1 ui-monospace,SFMono-Regular,Consolas,monospace}.tavern-regex-rule-list>article.is-expanded .tavern-regex-order{background:#dcecff;color:#1d61b7}.tavern-regex-rule-copy{display:flex;min-width:0;flex-direction:column;gap:4px}.tavern-regex-rule-copy strong,.tavern-regex-rule-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tavern-regex-rule-copy strong{font-size:10.5px}.tavern-regex-rule-copy small{color:#7a838d;font-size:8px}.tavern-regex-enabled{border-radius:999px;padding:3px 7px;background:#eaf7ef;color:#277949;font-size:8px;white-space:nowrap}.tavern-regex-rule-detail{border-top:1px solid #dfe8f2;padding:12px;background:#fbfdff}.tavern-regex-rule-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-bottom:12px}.tavern-regex-rule-facts>div{display:flex;min-width:0;flex-direction:column;gap:3px;border:1px solid #e5eaf0;border-radius:7px;padding:7px 8px;background:#fff}.tavern-regex-rule-facts span{color:#828b95;font-size:7.5px}.tavern-regex-rule-facts strong{overflow-wrap:anywhere;color:#343b43;font-size:8.5px;line-height:1.4}.tavern-regex-rule-detail>label{display:block;margin:10px 0 5px;color:#6f7882;font-size:8px;font-weight:650}.tavern-regex-rule-detail>pre{max-height:180px;margin:0;overflow:auto;border:1px solid #e2e7ed;border-radius:7px;padding:9px;background:#f6f8fa;color:#293039;font:8.5px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.tavern-regex-rule-id{display:block;margin-top:10px;overflow:hidden;color:#9098a1;font:7.5px/1.3 ui-monospace,SFMono-Regular,Consolas,monospace;text-overflow:ellipsis;white-space:nowrap}.tavern-regex-boundary{margin-top:12px;border-left:3px solid #d69a34;border-radius:0 8px 8px 0;padding:9px 10px;background:#fff9ee}.tavern-regex-boundary strong{color:#684814;font-size:9px}.tavern-regex-boundary p{margin:4px 0 0;color:#806333;font-size:8.5px;line-height:1.55}.tavern-regex-evidence{padding-bottom:48px}.tavern-regex-evidence-summary{border-bottom:1px solid #e1e6eb;padding:14px 16px;background:#fff}.tavern-regex-evidence-summary>header,.tavern-regex-match-section>header{display:flex;align-items:center;justify-content:space-between;gap:10px}.tavern-regex-evidence-summary>header>div,.tavern-regex-match-section>header>div{display:flex;min-width:0;flex-direction:column;gap:3px}.tavern-regex-evidence-summary>header strong,.tavern-regex-match-section>header strong{font-size:11px}.tavern-regex-evidence-summary>header span,.tavern-regex-match-section>header span{color:#7d858f;font-size:8px}.tavern-regex-plane-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:11px}.tavern-regex-plane-grid>article{display:flex;min-width:0;flex-direction:column;gap:3px;border:1px solid #e2e7ec;border-radius:8px;padding:9px;background:#fafbfc}.tavern-regex-plane-grid>article.is-active{border-color:#aac7ec;background:#f1f7ff}.tavern-regex-plane-grid span{color:#7c858f;font-size:7.5px}.tavern-regex-plane-grid strong{overflow:hidden;color:#343b43;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.tavern-regex-plane-grid small{color:#8b939c;font-size:7.5px}.tavern-regex-evidence-summary>p{margin:10px 0 0;color:#69737d;font-size:8.5px;line-height:1.55}.tavern-regex-match-section{padding:14px}.tavern-regex-match-section>.tavern-regex-matches{padding:10px 0 0}.tavern-regex-matches>article{background:#fff;box-shadow:0 1px 2px #182a4210}.tavern-regex-matches>article>header{padding:8px 10px}.tavern-regex-matches>article>header span{color:#7f8892}.tavern-regex-matches pre{font-size:8.5px;line-height:1.6}

.tavern-frontend-settings{min-height:0;flex:1;overflow:auto;padding:14px 14px 48px;background:#f6f8fa}.tavern-frontend-overview{margin-bottom:10px;border:1px solid #dfe4ea;border-left:3px solid #9aa4af;border-radius:10px;background:#fff;box-shadow:0 1px 2px #182a4212}.tavern-frontend-overview.is-ready{border-left-color:#2f9e61}.tavern-frontend-overview.is-pending{border-left-color:#d5932f}.tavern-frontend-overview-copy{display:flex;flex-direction:column;gap:4px;padding:14px 15px 13px}.tavern-frontend-overview-copy>span{color:#7c858f;font-size:10px;font-weight:650}.tavern-frontend-overview-copy>strong{color:#22272e;font-size:17px;line-height:1.25}.tavern-frontend-overview-copy>small{overflow:hidden;color:#6f7883;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.tavern-frontend-overview-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid #e8ebef;background:#fafbfd}.tavern-frontend-overview-facts>div{display:flex;min-width:0;flex-direction:column;gap:2px;padding:10px 12px}.tavern-frontend-overview-facts>div+div{border-left:1px solid #e8ebef}.tavern-frontend-overview-facts strong{color:#262c33;font-size:15px}.tavern-frontend-overview-facts span{color:#858e98;font-size:9px}.tavern-frontend-setting-section{margin-bottom:8px;border:1px solid #dfe4ea;border-radius:10px;overflow:hidden;background:#fff}.tavern-frontend-setting-section>summary{display:flex;min-height:48px;box-sizing:border-box;align-items:center;padding:10px 13px;cursor:pointer;color:#2c3239}.tavern-frontend-setting-section>summary::marker{color:#77818c}.tavern-frontend-setting-section>summary>div{display:flex;min-width:0;flex:1;align-items:center;justify-content:space-between;gap:12px}.tavern-frontend-setting-section>summary strong{font-size:12px;font-weight:650}.tavern-frontend-setting-section>summary span{overflow:hidden;color:#7d8691;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.tavern-frontend-setting-section[open]>summary{border-bottom:1px solid #e7eaee;background:#fbfcfd}.tavern-frontend-setting-body{padding:13px 14px}.tavern-frontend-facts{display:grid;grid-template-columns:116px minmax(0,1fr);gap:0;margin:0;font-size:10px}.tavern-frontend-facts dt,.tavern-frontend-facts dd{margin:0;border-bottom:1px solid #eceef1;padding:9px 4px}.tavern-frontend-facts dt{color:#7b848e}.tavern-frontend-facts dd{overflow-wrap:anywhere;color:#30373e}.tavern-frontend-permission{display:flex!important;align-items:flex-start;gap:10px;margin:0!important;color:#2d333a!important}.tavern-frontend-permission input{width:16px;height:16px;flex:none;margin:1px 0 0;accent-color:#2877eb}.tavern-frontend-permission>span{display:flex;min-width:0;flex-direction:column;gap:4px}.tavern-frontend-permission strong{font-size:11px}.tavern-frontend-permission small{color:#737d88;font-size:9.5px;font-weight:400;line-height:1.55}.tavern-frontend-note,.tavern-frontend-empty,.tavern-frontend-resource p{margin:10px 0 0;color:#66717c;font-size:10px;line-height:1.6}.tavern-frontend-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.tavern-frontend-metrics>div{display:flex;min-width:0;flex-direction:column;gap:4px;border:1px solid #e5e8ec;border-radius:8px;padding:10px;background:#fafbfd}.tavern-frontend-metrics span{color:#7b858f;font-size:9px}.tavern-frontend-metrics strong{color:#2d343b;font-size:15px}.tavern-frontend-setting-body h4{margin:13px 0 7px;color:#68727d;font-size:9px;font-weight:700;letter-spacing:.06em}.tavern-frontend-script-list{display:flex;flex-direction:column;gap:7px}.tavern-frontend-script{border:1px solid #e1e5e9;border-radius:8px;overflow:hidden}.tavern-frontend-script>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;cursor:pointer}.tavern-frontend-script>summary strong{overflow:hidden;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.tavern-frontend-script>summary span{flex:none;color:#818a94;font-size:9px}.tavern-frontend-script pre{max-height:360px;border-top:1px solid #e6e9ed}.tavern-frontend-resource{margin-top:12px;border-top:1px solid #e8ebee;padding-top:1px}.tavern-frontend-state{margin-top:10px;border-top:1px solid #e8ebee;padding-top:9px}.tavern-frontend-state>summary{cursor:pointer;color:#3969a7;font-size:10px}.tavern-frontend-state>pre{max-height:260px;margin-top:8px!important;border:1px solid #e4e7eb;border-radius:7px}.tavern-frontend-settings .tavern-runtime-errors{margin:0;font-size:10px}.tavern-frontend-settings .tavern-chip-list{margin-top:6px}
.tavern-card-profile{padding:14px 16px 48px}.tavern-card-profile section{margin-bottom:20px}.tavern-card-profile p{color:#343a41;font-size:11px}.tavern-opening-documents{padding:12px 14px}.tavern-opening-documents article{margin-bottom:10px;border:1px solid #dfe3e8;border-radius:8px;overflow:hidden}.tavern-opening-documents header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7ea;padding:8px 10px;background:#f7f8fa}.tavern-opening-documents header strong{font-size:10px}.tavern-opening-documents header span{color:#2d6cc7;font-size:8px}.tavern-opening-documents p{margin:0;padding:11px;color:#343a41;font-size:11px;line-height:1.7;white-space:pre-wrap}.tavern-compatibility-list{padding:12px 14px}.tavern-compatibility-list>section,.tavern-compatibility-list>article{margin-bottom:8px;border:1px solid #dfe3e8;border-radius:8px;padding:10px}.tavern-compatibility-list>section.is-ready{border-left:3px solid #25a45b}.tavern-compatibility-list>section.is-degraded{border-left:3px solid #e3a52b}.tavern-compatibility-list>section.is-blocked{border-left:3px solid #c94d59}.tavern-compatibility-list header{display:flex;align-items:center;justify-content:space-between;gap:8px}.tavern-compatibility-list strong{font-size:10px}.tavern-compatibility-list span{color:#6e7781;font-size:8px}.tavern-compatibility-list p{margin:5px 0 0;color:#606a75;font-size:9px;line-height:1.5}.tavern-capability-boundary{border-left:3px solid #e3a52b;padding:9px 10px;background:#fffaf0}.tavern-capability-boundary strong{font-size:10px}
@media(max-width:1050px){:root{--tavern-capability-panel-width:440px}.tavern-worldbook-workbench{grid-template-columns:180px minmax(0,1fr)}.tavern-regex-workbench{grid-template-columns:155px minmax(0,1fr)}}@media(max-width:760px){:root{--tavern-capability-panel-width:calc(100vw - var(--tavern-capability-rail-width))}body:has(.tavern-card-capability-rail),body:has(.tavern-capability-panel){padding-right:var(--tavern-capability-rail-width)}.tavern-capability-panel{box-shadow:-16px 0 40px #0002}.tavern-worldbook-workbench{grid-template-columns:170px minmax(0,1fr)}.tavern-regex-workbench{grid-template-columns:145px minmax(0,1fr)}}
`;

    const FRONTEND_CALL_STYLE = `
.tavern-compatibility-call-list{display:flex;flex-direction:column;gap:7px;margin:0;padding:0;list-style:none}
.tavern-compatibility-call-list li{border:1px solid #e2e6eb;border-radius:8px;padding:9px 10px;background:#fafbfd}
.tavern-compatibility-call-list li>div{display:flex;align-items:center;justify-content:space-between;gap:8px}
.tavern-compatibility-call-list strong{overflow-wrap:anywhere;color:#2e3741;font:600 9.5px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace}
.tavern-compatibility-call-list span{flex:none;border-radius:999px;padding:3px 6px;background:#edf3fc;color:#2d67ba;font-size:8px}
.tavern-compatibility-call-list p{margin:6px 0 0;color:#596570;font-size:9px;line-height:1.5}
.tavern-compatibility-call-list small{display:block;margin-top:5px;color:#8a929b;font-size:8px}
.tavern-mvu-field{display:flex!important;align-items:center;justify-content:space-between;gap:12px;margin:0 0 10px!important;color:#30373e!important;font-size:10px!important}.tavern-mvu-field>span{flex:none}.tavern-mvu-field select,.tavern-mvu-field input{width:min(230px,60%);box-sizing:border-box;border:1px solid #d9dee4;border-radius:7px;padding:7px 9px;background:#fff;color:#28313a;font:10px/1.3 inherit}.tavern-mvu-advanced{margin:10px 0;border:1px solid #e4e8ec;border-radius:8px;padding:11px;background:#fafbfd}.tavern-mvu-model-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tavern-mvu-model-grid .tavern-mvu-field{display:block!important}.tavern-mvu-model-grid .tavern-mvu-field>span{display:block;margin-bottom:5px}.tavern-mvu-model-grid .tavern-mvu-field input{width:100%}.tavern-mvu-actions{display:flex;flex-wrap:wrap;gap:7px}.tavern-mvu-actions button{border:1px solid #cad7e6;border-radius:7px;padding:7px 10px;background:#f5f9ff;color:#2d63a5;cursor:pointer;font:600 9px/1.3 inherit}.tavern-mvu-actions button:hover:not(:disabled){border-color:#9eb9da;background:#edf5ff}.tavern-mvu-actions button:disabled{cursor:not-allowed;opacity:.48}.tavern-mvu-notice{margin:9px 0 0;font-size:9px}.tavern-mvu-notice.is-ok{color:#287949}.tavern-mvu-notice.is-error{color:#aa3f4b}
.tavern-frontend-settings{min-height:0;flex:1;overflow:auto;padding:14px 14px 48px;background:#f6f8fa}.tavern-frontend-overview{margin-bottom:10px;border:1px solid #dfe4ea;border-left:3px solid #9aa4af;border-radius:10px;background:#fff;box-shadow:0 1px 2px #182a4212}.tavern-frontend-overview.is-ready{border-left-color:#2f9e61}.tavern-frontend-overview.is-pending{border-left-color:#d5932f}.tavern-frontend-overview-copy{display:flex;flex-direction:column;gap:4px;padding:14px 15px 13px}.tavern-frontend-overview-copy>span{color:#7c858f;font-size:9px;font-weight:650}.tavern-frontend-overview-copy>strong{color:#22272e;font-size:16px;line-height:1.25}.tavern-frontend-overview-copy>small{overflow:hidden;color:#6f7883;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.tavern-frontend-overview-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid #e8ebef;background:#fafbfd}.tavern-frontend-overview-facts>div{display:flex;min-width:0;flex-direction:column;gap:2px;padding:10px 12px}.tavern-frontend-overview-facts>div+div{border-left:1px solid #e8ebef}.tavern-frontend-overview-facts strong{color:#262c33;font-size:14px}.tavern-frontend-overview-facts span{color:#858e98;font-size:8px}.tavern-frontend-setting-section{margin-bottom:8px;border:1px solid #dfe4ea;border-radius:10px;overflow:hidden;background:#fff}.tavern-frontend-setting-section>summary{display:flex;min-height:48px;box-sizing:border-box;align-items:center;padding:10px 13px;cursor:pointer;color:#2c3239}.tavern-frontend-setting-section>summary::marker{color:#77818c}.tavern-frontend-setting-section>summary>div{display:flex;min-width:0;flex:1;align-items:center;justify-content:space-between;gap:12px}.tavern-frontend-setting-section>summary strong{font-size:11px;font-weight:650}.tavern-frontend-setting-section>summary span{overflow:hidden;color:#7d8691;font-size:8px;text-overflow:ellipsis;white-space:nowrap}.tavern-frontend-setting-section[open]>summary{border-bottom:1px solid #e7eaee;background:#fbfcfd}.tavern-frontend-setting-body{padding:13px 14px}.tavern-frontend-facts{display:grid;grid-template-columns:116px minmax(0,1fr);gap:0;margin:0;font-size:9px}.tavern-frontend-facts dt,.tavern-frontend-facts dd{margin:0;border-bottom:1px solid #eceef1;padding:8px 4px}.tavern-frontend-facts dt{color:#7b848e}.tavern-frontend-facts dd{overflow-wrap:anywhere;color:#30373e}.tavern-frontend-permission{display:flex!important;align-items:flex-start;gap:10px;margin:0!important;color:#2d333a!important}.tavern-frontend-permission input{width:16px;height:16px;flex:none;margin:1px 0 0;accent-color:#2877eb}.tavern-frontend-permission>span{display:flex;min-width:0;flex-direction:column;gap:4px}.tavern-frontend-permission strong{font-size:10px}.tavern-frontend-permission small{color:#737d88;font-size:8.5px;font-weight:400;line-height:1.55}.tavern-frontend-note,.tavern-frontend-empty,.tavern-frontend-resource p{margin:10px 0 0;color:#66717c;font-size:9px;line-height:1.6}.tavern-frontend-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.tavern-frontend-metrics>div{display:flex;min-width:0;flex-direction:column;gap:4px;border:1px solid #e5e8ec;border-radius:8px;padding:10px;background:#fafbfd}.tavern-frontend-metrics span{color:#7b858f;font-size:8px}.tavern-frontend-metrics strong{color:#2d343b;font-size:14px}.tavern-frontend-setting-body h4{margin:13px 0 7px;color:#68727d;font-size:8px;font-weight:700;letter-spacing:.06em}.tavern-frontend-script-list{display:flex;flex-direction:column;gap:7px}.tavern-frontend-script{border:1px solid #e1e5e9;border-radius:8px;overflow:hidden}.tavern-frontend-script>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;cursor:pointer}.tavern-frontend-script>summary strong{overflow:hidden;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.tavern-frontend-script>summary span{flex:none;color:#818a94;font-size:8px}.tavern-frontend-script pre{max-height:360px;border-top:1px solid #e6e9ed}.tavern-frontend-resource{margin-top:12px;border-top:1px solid #e8ebee;padding-top:1px}.tavern-frontend-state{margin-top:10px;border-top:1px solid #e8ebee;padding-top:9px}.tavern-frontend-state>summary{cursor:pointer;color:#3969a7;font-size:9px}.tavern-frontend-state>pre{max-height:260px;margin-top:8px!important;border:1px solid #e4e7eb;border-radius:7px}.tavern-frontend-settings .tavern-runtime-errors{margin:0}.tavern-frontend-settings .tavern-chip-list{margin-top:6px}
.tavern-card-hero{display:grid;flex:none;grid-template-columns:96px minmax(0,1fr);align-items:center;gap:14px;border-bottom:1px solid #edf0f3;padding:16px 18px}.tavern-card-hero-cover{display:block;width:96px;height:96px;border-radius:9px;object-fit:cover;background:#f1f3f6}.tavern-card-hero-cover.is-placeholder{display:grid;place-items:center;color:#6c7480;font-size:28px;font-weight:650}.tavern-card-hero-copy{display:flex;min-width:0;align-items:flex-start;flex-direction:column}.tavern-card-hero-title{display:flex;width:100%;min-width:0;align-items:center;justify-content:space-between;gap:8px}.tavern-card-hero-title h1{min-width:0;margin:0;overflow:hidden;color:#1d2228;font-size:18px;font-weight:680;line-height:1.3;text-overflow:ellipsis;white-space:nowrap}.tavern-card-hero-copy>p{max-width:100%;margin:5px 0 0;overflow:hidden;color:#727b86;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.tavern-card-start-session{min-height:34px;margin-top:10px;border:0;border-radius:7px;padding:0 14px;background:#176ff2;color:#fff;cursor:pointer;font:600 11px/1 inherit}.tavern-card-start-session:hover{background:#0e63e3}.tavern-card-start-session:focus-visible,.tavern-card-nav button:focus-visible,.tavern-card-more>button:focus-visible,.tavern-card-opening-tabs button:focus-visible,.tavern-card-back-to-description:focus-visible{outline:2px solid #82abe6;outline-offset:2px}.tavern-card-start-session:disabled{cursor:not-allowed;background:#b7c3d1;color:#f7f9fb}.tavern-card-more{position:relative;flex:none}.tavern-card-more>button{height:28px;border:1px solid #dfe3e8;border-radius:6px;padding:0 9px;background:#fff;color:#59636f;cursor:pointer;font:550 10px/1 inherit}.tavern-card-more>button:hover,.tavern-card-more>button[aria-expanded=true]{border-color:#b9c9df;background:#f5f8fc;color:#2464b5}.tavern-card-more-menu{position:absolute;z-index:5;top:34px;right:0;display:grid;width:124px;overflow:hidden;border:1px solid #dfe3e8;border-radius:8px;background:#fff;box-shadow:0 10px 28px rgba(25,39,64,.16)}.tavern-card-more-menu>*{display:flex;min-height:36px;box-sizing:border-box;align-items:center;border:0;padding:0 11px;background:#fff;color:#303841;cursor:pointer;font:500 10px/1 inherit;text-align:left;text-decoration:none}.tavern-card-more-menu>*+*{border-top:1px solid #edf0f2}.tavern-card-more-menu>*:hover{background:#f3f6fa;color:#1f61b7}.tavern-card-nav{display:flex;height:44px;flex:none;align-items:flex-end;justify-content:flex-start;gap:20px;overflow-x:auto;border-bottom:1px solid #e1e5e9;padding:0 18px}.tavern-card-nav button{position:relative;height:44px;min-width:max-content;border:0;padding:0 2px;background:transparent;color:#69727d;cursor:pointer;font:550 11px/44px inherit;white-space:nowrap}.tavern-card-nav button[aria-selected=true]{color:#1767d8}.tavern-card-nav button[aria-selected=true]::after{position:absolute;right:2px;bottom:-1px;left:2px;height:2px;background:#2877eb;content:""}.tavern-card-view{min-height:0;flex:1;overflow:auto;background:var(--dsw-alias-bg-base,#fff)}.tavern-card-document{box-sizing:border-box;min-height:100%;padding:18px 20px 48px;color:var(--dsw-alias-label-primary,#25292f);font-size:13px;line-height:1.78;overflow-wrap:anywhere}.tavern-card-document>:first-child,.tavern-card-document>div>:first-child{margin-top:0}.tavern-card-document>:last-child,.tavern-card-document>div>:last-child{margin-bottom:0}.tavern-card-document h1,.tavern-card-document h2,.tavern-card-document h3,.tavern-card-document h4{margin:1.25em 0 .55em;color:var(--dsw-alias-label-primary,#20252b);font-weight:650;line-height:1.4}.tavern-card-document h1{font-size:17px}.tavern-card-document h2{font-size:15px}.tavern-card-document h3,.tavern-card-document h4{font-size:13px}.tavern-card-document p{margin:.65em 0}.tavern-card-document ul,.tavern-card-document ol{margin:.65em 0;padding-left:1.6em}.tavern-card-document li+li{margin-top:.25em}.tavern-card-document blockquote{margin:.9em 0;border-left:3px solid #a9b9cd;padding:3px 0 3px 12px;color:var(--dsw-alias-label-secondary,#66717e)}.tavern-card-document pre{max-width:100%;overflow:auto;border:1px solid #e0e5ea;border-radius:7px;padding:10px 11px;background:#f6f8fa;color:#2e363f;font:11px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap}.tavern-card-document code{border-radius:4px;padding:1px 4px;background:#f0f2f5;font:11px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}.tavern-card-document a{color:#1767d8}.tavern-card-document table{width:100%;border-collapse:collapse;font-size:11px}.tavern-card-document th,.tavern-card-document td{border:1px solid #e0e4e8;padding:6px 7px;text-align:left}.tavern-card-openings{min-height:100%}.tavern-card-opening-tabs{position:sticky;z-index:2;top:0;display:flex;gap:6px;overflow-x:auto;border-bottom:1px solid #e4e8ec;padding:10px 18px;background:color-mix(in srgb,var(--dsw-alias-bg-base,#fff) 96%,transparent)}.tavern-card-opening-tabs button{min-width:max-content;height:28px;border:1px solid #dfe3e8;border-radius:6px;padding:0 9px;background:#fff;color:#69727d;cursor:pointer;font:550 10px/1 inherit}.tavern-card-opening-tabs button[aria-pressed=true]{border-color:#99b8e2;background:#edf5ff;color:#2465b7}.tavern-card-empty{margin:0;padding:24px 20px;color:#7d8690;font-size:11px}.tavern-card-advanced{padding:18px 20px 40px}.tavern-card-advanced>header{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}.tavern-card-advanced h2{margin:0;color:#242a31;font-size:16px;line-height:1.35}.tavern-card-back-to-description{display:inline-flex;align-self:flex-start;align-items:center;gap:4px;border:0;padding:0;background:transparent;color:#3971b3;cursor:pointer;font:550 10px/1 inherit}.tavern-card-playability{margin-bottom:12px;border-left:3px solid #2f9e61;border-radius:0 8px 8px 0;padding:11px 12px;background:#f3faf6}.tavern-card-playability.is-degraded{border-left-color:#d69a34;background:#fff9ee}.tavern-card-playability.is-blocked{border-left-color:#c94d59;background:#fff4f5}.tavern-card-playability strong{font-size:10.5px}.tavern-card-playability p{margin:5px 0 0;color:#5e6873;font-size:9px;line-height:1.6}.tavern-card-compatibility-rows{border-top:1px solid #e2e6ea}.tavern-card-compatibility-rows>article{padding:11px 2px;border-bottom:1px solid #e7eaed}.tavern-card-compatibility-rows>article>div{display:flex;align-items:center;justify-content:space-between;gap:10px}.tavern-card-compatibility-rows strong{font-size:10px}.tavern-card-compatibility-rows span{color:#3971b3;font-size:8px}.tavern-card-compatibility-rows p{margin:5px 0 0;color:#69737d;font-size:9px;line-height:1.55}.tavern-card-source{margin-top:19px}.tavern-card-source h3{margin:0 0 8px;font-size:11px}.tavern-card-source dl{display:grid;grid-template-columns:84px minmax(0,1fr);margin:0 0 12px;border-top:1px solid #e2e6ea;font-size:9px}.tavern-card-source dt,.tavern-card-source dd{margin:0;border-bottom:1px solid #e7eaed;padding:8px 4px}.tavern-card-source dt{color:#7a838d}.tavern-card-source dd{overflow-wrap:anywhere;color:#343b43}.tavern-capability-boundary{border-left:3px solid #e3a52b;padding:9px 10px;background:#fffaf0}.tavern-capability-boundary strong{font-size:10px}
.tavern-card-more-menu>*{appearance:none;font-family:inherit;font-size:13px;font-weight:500;line-height:1}
.tavern-frontend-overview-copy>span{font-size:10px}.tavern-frontend-overview-copy>strong{font-size:17px}.tavern-frontend-overview-copy>small{font-size:10px}.tavern-frontend-overview-facts strong{font-size:15px}.tavern-frontend-overview-facts span{font-size:9px}.tavern-frontend-setting-section>summary strong{font-size:12px}.tavern-frontend-setting-section>summary span{font-size:9px}.tavern-frontend-facts{font-size:10px}.tavern-frontend-facts dt,.tavern-frontend-facts dd{padding:9px 4px}.tavern-frontend-permission strong{font-size:11px}.tavern-frontend-permission small{font-size:9.5px}.tavern-frontend-note,.tavern-frontend-empty,.tavern-frontend-resource p{font-size:10px}.tavern-frontend-metrics span{font-size:9px}.tavern-frontend-metrics strong{font-size:15px}.tavern-frontend-setting-body h4{font-size:9px}.tavern-frontend-script>summary strong{font-size:10px}.tavern-frontend-script>summary span{font-size:9px}.tavern-frontend-state>summary{font-size:10px}

.tavern-persona-workbench{display:grid;min-height:0;flex:1;grid-template-columns:minmax(150px,34%) minmax(0,1fr);overflow:hidden;background:#fff}.tavern-persona-library{display:flex;min-width:0;min-height:0;flex-direction:column;border-right:1px solid #e1e5ea;background:#f6f8fb}.tavern-persona-create{display:flex;height:36px;flex:none;align-items:center;justify-content:center;gap:6px;margin:12px 10px 8px;border:1px solid #1767d8;border-radius:7px;background:#1767d8;color:#fff;cursor:pointer;font:600 10px/1 inherit}.tavern-persona-create:hover{background:#0e58c0}.tavern-persona-create:disabled{cursor:wait;opacity:.58}.tavern-persona-search{display:flex;height:34px;box-sizing:border-box;flex:none;align-items:center;gap:6px;margin:0 10px 8px;border:1px solid #dce1e7;border-radius:7px;padding:0 8px;background:#fff;color:#8b929b}.tavern-persona-search:focus-within{border-color:#8aa8d9;box-shadow:0 0 0 2px #3478f617}.tavern-persona-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#242a31;font:400 9px/1 inherit}.tavern-persona-list{min-height:0;flex:1;overflow:auto;padding:0 7px 10px}.tavern-persona-list>button{display:grid;width:100%;height:54px;box-sizing:border-box;grid-template-columns:34px minmax(0,1fr) 16px;align-items:center;gap:7px;margin:4px 0;border:1px solid transparent;border-radius:8px;padding:6px;background:transparent;color:#303740;cursor:pointer;text-align:left}.tavern-persona-list>button:hover{background:#edf2f8}.tavern-persona-list>button[aria-selected=true]{border-color:#76a5e6;background:#f5f9ff;color:#1e62bc;box-shadow:0 0 0 1px #6fa4e933}.tavern-persona-list img{width:34px;height:34px;border-radius:50%;object-fit:cover}.tavern-persona-list>button>span{overflow:hidden;font-size:10px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.tavern-persona-list>button>svg{color:#1767d8}.tavern-persona-empty{margin:0;padding:20px 10px;color:#808994;font-size:9px;line-height:1.65;text-align:center;white-space:pre-line}.tavern-persona-empty.is-roomy{display:grid;min-height:240px;place-items:center}.tavern-persona-editor{min-width:0;min-height:0;overflow:auto;padding:18px 16px 48px}.tavern-persona-identity{display:grid;grid-template-columns:68px minmax(0,1fr);align-items:center;gap:12px}.tavern-persona-avatar{width:68px;height:68px;overflow:hidden;border:1px solid #dbe1e7;border-radius:50%;padding:0;background:#fff;cursor:pointer}.tavern-persona-avatar:hover{border-color:#76a5e6;box-shadow:0 0 0 3px #3478f614}.tavern-persona-avatar img{display:block;width:100%;height:100%;object-fit:cover}.tavern-persona-identity label,.tavern-persona-description{display:flex;min-width:0;flex-direction:column;gap:6px}.tavern-persona-identity label>span,.tavern-persona-description>span{color:#5d6671;font-size:9px;font-weight:650}.tavern-persona-identity input,.tavern-persona-description textarea{width:100%;box-sizing:border-box;border:1px solid #dce1e7;border-radius:7px;outline:0;background:#fff;color:#252b32;font:400 11px/1.55 inherit}.tavern-persona-identity input{height:36px;padding:0 10px}.tavern-persona-description{margin-top:16px}.tavern-persona-description textarea{min-height:190px;resize:vertical;padding:10px 11px}.tavern-persona-identity input:focus,.tavern-persona-description textarea:focus{border-color:#7ba6df;box-shadow:0 0 0 2px #3478f617}.tavern-persona-save-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px}.tavern-persona-save-row>span{color:#7f8791;font-size:8px}.tavern-persona-save-row>div{display:flex;align-items:center;gap:9px}.tavern-persona-save-row small{font-size:8px}.tavern-persona-save-row small.is-saved{color:#28794c}.tavern-persona-save-row small.is-dirty{color:#a56a12}.tavern-persona-save-row button{height:32px;border:1px solid #1767d8;border-radius:7px;padding:0 16px;background:#1767d8;color:#fff;cursor:pointer;font:600 9px/1 inherit}.tavern-persona-save-row button:disabled{border-color:#d8dde3;background:#e8ebef;color:#979ea7;cursor:not-allowed}.tavern-persona-binding{margin-top:18px;border-top:1px solid #e5e8ec;padding-top:16px}.tavern-persona-binding>header{display:flex;align-items:center;justify-content:space-between;gap:8px}.tavern-persona-binding>header strong{font-size:10px}.tavern-persona-binding>header button{border:0;padding:0;background:transparent;color:#687789;cursor:pointer;font:500 8px/1 inherit}.tavern-persona-binding>header button:hover{color:#1e62bc}.tavern-persona-scope{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:9px;border:1px solid #dce1e7;border-radius:7px;overflow:hidden}.tavern-persona-scope button{height:32px;border:0;border-right:1px solid #e1e5e9;background:#f7f8fa;color:#5f6873;cursor:pointer;font:500 8.5px/1 inherit}.tavern-persona-scope button:last-child{border-right:0}.tavern-persona-scope button[aria-pressed=true]{background:#eaf3ff;color:#1767d8;font-weight:650;box-shadow:inset 0 0 0 1px #74a5e8}.tavern-persona-scope button:disabled{cursor:not-allowed;opacity:.45}.tavern-persona-session{display:flex;min-width:0;flex-direction:column;gap:4px;margin-top:12px;border:1px solid #e2e6eb;border-radius:7px;padding:9px 10px;background:#fafbfc}.tavern-persona-session span{color:#838b95;font-size:8px}.tavern-persona-session strong{overflow:hidden;color:#343b43;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.tavern-persona-priority{margin:10px 0 0;color:#7b848e;font-size:8px}.tavern-persona-guidance{margin:10px 0 0;border-left:3px solid #6e9edc;padding:8px 9px;background:#f1f7ff;color:#356eaf;font-size:8.5px;line-height:1.55}.tavern-persona-effective{margin:9px 0 0;padding:8px 9px;background:#edf7f1;color:#28754a;font-size:8.5px;line-height:1.5}.tavern-persona-effective.is-empty{background:#f4f5f7;color:#78818b}.tavern-persona-notice,.tavern-persona-error{margin:10px 0 0;font-size:8.5px;line-height:1.5}.tavern-persona-notice{color:#28754a}.tavern-persona-error{color:#a94450}
.tavern-card-profile{padding:14px 16px 48px}.tavern-card-profile section{margin-bottom:20px}.tavern-card-profile p{color:#343a41;font-size:11px}.tavern-opening-documents{padding:12px 14px}.tavern-opening-documents article{margin-bottom:10px;border:1px solid #dfe3e8;border-radius:8px;overflow:hidden}.tavern-opening-documents header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7ea;padding:8px 10px;background:#f7f8fa}.tavern-opening-documents header strong{font-size:10px}.tavern-opening-documents header span{color:#2d6cc7;font-size:8px}.tavern-opening-documents p{margin:0;padding:11px;color:#343a41;font-size:11px;line-height:1.7;white-space:pre-wrap}.tavern-compatibility-list{padding:12px 14px}.tavern-compatibility-list>section,.tavern-compatibility-list>article{margin-bottom:8px;border:1px solid #dfe3e8;border-radius:8px;padding:10px}.tavern-compatibility-list>section.is-ready{border-left:3px solid #25a45b}.tavern-compatibility-list>section.is-degraded{border-left:3px solid #e3a52b}.tavern-compatibility-list>section.is-blocked{border-left:3px solid #c94d59}.tavern-compatibility-list header{display:flex;align-items:center;justify-content:space-between;gap:8px}.tavern-compatibility-list strong{font-size:10px}.tavern-compatibility-list span{color:#6e7781;font-size:8px}.tavern-compatibility-list p{margin:5px 0 0;color:#606a75;font-size:9px;line-height:1.5}.tavern-capability-boundary{border-left:3px solid #e3a52b;padding:9px 10px;background:#fffaf0}.tavern-capability-boundary strong{font-size:10px}
.tavern-capability-panel[data-capability="persona"] .tavern-capability-panel-header{min-height:76px;padding:15px 18px}.tavern-capability-panel[data-capability="persona"] .tavern-capability-panel-header strong{font-size:20px}.tavern-capability-panel[data-capability="persona"] .tavern-capability-panel-header span{font-size:11px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-workbench{grid-template-columns:minmax(165px,36%) minmax(0,1fr)}
.tavern-capability-panel[data-capability="persona"] .tavern-persona-create{height:42px;margin:14px 10px 10px;font-size:13px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-search{height:40px;margin-bottom:10px;padding:0 10px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-search input{font-size:12px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-list>button{height:64px;grid-template-columns:42px minmax(0,1fr) 18px;gap:9px;padding:7px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-list img{width:42px;height:42px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-list>button>span{font-size:12px}
.tavern-capability-panel[data-capability="persona"] .tavern-persona-editor{padding:22px 18px 60px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-identity{grid-template-columns:78px minmax(0,1fr);gap:14px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-avatar{width:78px;height:78px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-identity label>span,.tavern-capability-panel[data-capability="persona"] .tavern-persona-description>span{font-size:11px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-identity input,.tavern-capability-panel[data-capability="persona"] .tavern-persona-description textarea{font-size:13px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-identity input{height:42px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-description{margin-top:18px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-description textarea{min-height:230px;padding:12px 13px;line-height:1.65}
.tavern-capability-panel[data-capability="persona"] .tavern-persona-save-row{margin-top:10px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-save-row>span,.tavern-capability-panel[data-capability="persona"] .tavern-persona-save-row small{font-size:10px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-save-row button{height:36px;padding:0 18px;font-size:11px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-binding{margin-top:22px;padding-top:18px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-binding>header strong{font-size:12px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-binding>header button{font-size:10px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-scope{margin-top:10px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-scope button{height:38px;font-size:10.5px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-session{margin-top:14px;padding:11px 12px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-session span{font-size:9.5px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-session strong{font-size:11px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-priority{margin-top:12px;font-size:10px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-guidance,.tavern-capability-panel[data-capability="persona"] .tavern-persona-effective{margin-top:11px;padding:10px 11px;font-size:10px}.tavern-capability-panel[data-capability="persona"] .tavern-persona-notice,.tavern-capability-panel[data-capability="persona"] .tavern-persona-error{font-size:10px}
.tavern-capability-panel[data-capability="persona"] .tavern-persona-list>button{border-color:#e1e5ea;outline:0;background:#fff;box-shadow:0 1px 2px #182a4212}.tavern-capability-panel[data-capability="persona"] .tavern-persona-list>button:focus-visible{outline:0;box-shadow:0 0 0 2px #2877eb55}.tavern-capability-panel[data-capability="persona"] .tavern-persona-save-row small{display:inline-flex;align-items:center;gap:4px}
.tavern-capability-panel[data-capability="persona"] .tavern-persona-list>button[aria-selected=true]{border-color:#76a5e6;background:#f5f9ff;box-shadow:0 0 0 1px #6fa4e933,0 2px 5px #182a4214}
@media(max-width:1050px){:root{--tavern-capability-panel-width:440px}.tavern-worldbook-workbench{grid-template-columns:180px minmax(0,1fr)}.tavern-regex-workbench{grid-template-columns:155px minmax(0,1fr)}}@media(max-width:760px){:root{--tavern-capability-panel-width:calc(100vw - var(--tavern-capability-rail-width))}body:has(.tavern-card-capability-rail),body:has(.tavern-capability-panel){padding-right:var(--tavern-capability-rail-width)}.tavern-capability-panel{box-shadow:-16px 0 40px #0002}.tavern-worldbook-workbench{grid-template-columns:170px minmax(0,1fr)}.tavern-regex-workbench{grid-template-columns:145px minmax(0,1fr)}}

body:has(.tavern-capability-panel[data-capability="preset"]){--tavern-capability-panel-width:clamp(700px,58vw,960px)}.tavern-preset-workbench{min-height:0;flex:1;overflow:auto;background:#f4f6f8;padding-bottom:48px}.tavern-preset-workbench button,.tavern-preset-workbench input,.tavern-preset-workbench select,.tavern-preset-workbench textarea{box-sizing:border-box;font:inherit}.tavern-preset-toolbar{position:sticky;z-index:3;top:0;display:flex;align-items:flex-end;justify-content:space-between;gap:14px;border-bottom:1px solid #dfe4e9;padding:12px 16px;background:#fff}.tavern-preset-select-wrap{display:grid;min-width:280px;flex:1;grid-template-columns:minmax(160px,1fr) minmax(140px,.8fr);gap:7px}.tavern-preset-select-wrap>label{grid-column:1/-1;color:#747d87;font-size:8px;font-weight:700;letter-spacing:.06em}.tavern-preset-select-wrap select,.tavern-preset-select-wrap input,.tavern-preset-library select,.tavern-preset-prompt-editor input,.tavern-preset-prompt-editor select,.tavern-preset-budget-grid input[type=number],.tavern-preset-slider input[type=number]{height:32px;min-width:0;border:1px solid #d5dae0;border-radius:7px;padding:0 9px;background:#fff;color:#262b31;font-size:10px;outline:none}.tavern-preset-select-wrap select:focus,.tavern-preset-select-wrap input:focus,.tavern-preset-library select:focus,.tavern-preset-prompt-editor input:focus,.tavern-preset-prompt-editor select:focus,.tavern-preset-prompt-editor textarea:focus{border-color:#6e9cdc;box-shadow:0 0 0 2px #357bd51a}.tavern-preset-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}.tavern-preset-actions button,.tavern-preset-action-link,.tavern-preset-prompts>header button,.tavern-preset-library button{display:inline-flex;height:31px;box-sizing:border-box;align-items:center;justify-content:center;gap:5px;border:1px solid #cfd6de;border-radius:7px;padding:0 9px;background:#fff;color:#44505d;cursor:pointer;font-size:9px;font-weight:600;text-decoration:none}.tavern-preset-actions button:hover:not(:disabled),.tavern-preset-action-link:hover,.tavern-preset-prompts>header button:hover,.tavern-preset-library button:hover:not(:disabled){border-color:#9db8dd;background:#f3f7fd;color:#2366bd}.tavern-preset-actions button:disabled,.tavern-preset-library button:disabled{cursor:not-allowed;opacity:.45}.tavern-preset-actions .is-danger{color:#a34851}.tavern-preset-binding{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;border-bottom:1px solid #e1e6eb;padding:8px 16px;background:#fafbfc;color:#6e7781;font-size:8.5px}.tavern-preset-binding strong{color:#4b5560;font-size:9px}.tavern-preset-binding.is-session{background:#f2f7ff;color:#4b6d98}.tavern-preset-binding.is-session strong{color:#245eaa}.tavern-preset-binding em{color:#a46b18;font-style:normal;font-weight:650}.tavern-preset-notice,.tavern-preset-error{margin:0;border-bottom:1px solid;padding:8px 16px;font-size:9px;line-height:1.45}.tavern-preset-notice{border-color:#cfe6d7;background:#f2fbf5;color:#287148}.tavern-preset-error{border-color:#edc9cd;background:#fff5f5;color:#a13d48}.tavern-preset-generation,.tavern-preset-prompts{margin:14px 16px 0;border:1px solid #dfe4e9;border-radius:10px;background:#fff;box-shadow:0 1px 2px #182a4210}.tavern-preset-generation{padding:14px}.tavern-preset-generation>header,.tavern-preset-prompts>header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.tavern-preset-generation h3,.tavern-preset-prompts h3{margin:0;color:#252b32;font-size:13px}.tavern-preset-generation p,.tavern-preset-prompts p{margin:4px 0 0;color:#78818b;font-size:8.5px;line-height:1.5}.tavern-preset-switch,.tavern-preset-stream{display:flex;align-items:center;gap:7px;color:#4f5964;font-size:9px;font-weight:600}.tavern-preset-switch input,.tavern-preset-stream input,.tavern-preset-prompt-list input{position:absolute;width:1px;height:1px;opacity:0}.tavern-preset-switch>span,.tavern-preset-stream>span{position:relative;width:30px;height:17px;flex:none;border-radius:999px;background:#c9cfd6;transition:background .15s ease}.tavern-preset-switch>span::after,.tavern-preset-stream>span::after{position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:#fff;box-shadow:0 1px 2px #0003;content:"";transition:transform .15s ease}.tavern-preset-switch input:checked+span,.tavern-preset-stream input:checked+span{background:#3378d3}.tavern-preset-switch input:checked+span::after,.tavern-preset-stream input:checked+span::after{transform:translateX(13px)}.tavern-preset-budget-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(180px,.55fr);gap:12px;margin-top:14px}.tavern-preset-budget-grid>label,.tavern-preset-slider{display:flex;min-width:0;flex-direction:column;gap:7px;color:#4e5863;font-size:9px;font-weight:600}.tavern-preset-budget-grid>label>span,.tavern-preset-slider>span{display:flex;align-items:center;justify-content:space-between;gap:8px}.tavern-preset-budget-grid em,.tavern-preset-slider em{color:#2f76ce;font-size:7.5px;font-style:normal;font-weight:600}.tavern-preset-budget-grid>label>div,.tavern-preset-slider>div{display:grid;grid-template-columns:minmax(80px,1fr) 92px;align-items:center;gap:8px}.tavern-preset-budget-grid input[type=range],.tavern-preset-slider input[type=range]{width:100%;accent-color:#357bd5}.tavern-preset-stream{margin-top:14px;border-top:1px solid #e8ebef;padding-top:12px}.tavern-preset-stream>div{display:flex;flex-direction:column;gap:2px}.tavern-preset-stream small{color:#7a838d;font-size:8px;font-weight:400}.tavern-preset-samplers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 18px;margin-top:14px;border-top:1px solid #e8ebef;padding-top:14px}.tavern-preset-slider.is-stored em{color:#91691d}.tavern-preset-prompts{overflow:hidden}.tavern-preset-prompts>header{align-items:center;border-bottom:1px solid #e4e8ec;padding:12px 14px}.tavern-preset-library{display:flex;align-items:center;gap:7px;border-bottom:1px solid #e3e7eb;padding:8px 12px;background:#f8fafc}.tavern-preset-library select{flex:1}.tavern-preset-prompt-layout{display:grid;min-height:430px;grid-template-columns:minmax(280px,.9fr) minmax(300px,1.1fr)}.tavern-preset-prompt-list{max-height:560px;overflow:auto;border-right:1px solid #e1e5e9;background:#f5f7f9}.tavern-preset-prompt-list article{display:grid;min-height:52px;grid-template-columns:27px 23px minmax(0,1fr) 25px;align-items:center;gap:5px;border-bottom:1px solid #e3e7eb;padding:5px 7px;background:#fff;color:#353c44}.tavern-preset-prompt-list article:hover{background:#f8fbff}.tavern-preset-prompt-list article.is-selected{position:relative;background:#eef5ff;color:#1f5fae}.tavern-preset-prompt-list article.is-selected::before{position:absolute;inset:0 auto 0 0;width:3px;background:#367bd2;content:""}.tavern-preset-prompt-list article.is-disabled{opacity:.55}.tavern-preset-order{color:#8b939d;font:600 8px/1 ui-monospace,SFMono-Regular,Consolas,monospace;text-align:center}.tavern-preset-prompt-list label{display:grid;width:17px;height:17px;place-items:center;border:1px solid #bcc5ce;border-radius:4px;background:#fff}.tavern-preset-prompt-list label span{display:none;width:8px;height:4px;border-bottom:2px solid #fff;border-left:2px solid #fff;transform:rotate(-45deg) translateY(-1px)}.tavern-preset-prompt-list label:has(input:checked){border-color:#3277d0;background:#3277d0}.tavern-preset-prompt-list label:has(input:checked) span{display:block}.tavern-preset-prompt-main{display:flex;min-width:0;flex-direction:column;gap:3px;border:0;padding:5px 3px;background:transparent;color:inherit;cursor:pointer;text-align:left}.tavern-preset-prompt-main strong,.tavern-preset-prompt-main small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tavern-preset-prompt-main strong{font-size:10px}.tavern-preset-prompt-main small{color:#7d8690;font-size:7.5px}.tavern-preset-move{display:flex;flex-direction:column}.tavern-preset-move button{width:22px;height:19px;border:0;border-radius:4px;background:transparent;color:#7b8590;cursor:pointer;font-size:10px;line-height:1}.tavern-preset-move button:hover:not(:disabled){background:#e5edf8;color:#2569bd}.tavern-preset-move button:disabled{opacity:.28}.tavern-preset-prompt-editor{min-width:0;padding:15px 16px 24px;background:#fff}.tavern-preset-prompt-editor>header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px}.tavern-preset-prompt-editor>header>div{display:flex;min-width:0;flex-direction:column;gap:3px}.tavern-preset-prompt-editor>header small{color:#818a94;font-size:8px}.tavern-preset-prompt-editor>header strong{overflow:hidden;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.tavern-preset-prompt-editor>header em{border-radius:999px;padding:3px 7px;background:#eef0f3;color:#737c86;font-size:8px;font-style:normal}.tavern-preset-prompt-editor>label,.tavern-preset-editor-grid label,.tavern-preset-content{display:flex;min-width:0;flex-direction:column;gap:5px;color:#69737e;font-size:8.5px;font-weight:650}.tavern-preset-editor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:10px}.tavern-preset-content{margin-top:11px}.tavern-preset-prompt-editor textarea{width:100%;resize:vertical;border:1px solid #d5dae0;border-radius:8px;padding:10px;background:#fbfcfd;color:#303840;font:9px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;outline:none}.tavern-preset-marker-note{margin-top:12px;border-left:3px solid #4d86d1;padding:9px 10px;background:#f2f7fd}.tavern-preset-marker-note strong{color:#315f99;font-size:9px}.tavern-preset-marker-note p{margin:4px 0 0;color:#687a90;font-size:8.5px;line-height:1.55}.tavern-preset-remove-prompt{margin-top:12px;border:1px solid #e3bfc3;border-radius:7px;padding:6px 9px;background:#fff8f8;color:#a34852;cursor:pointer;font-size:8.5px}.tavern-preset-prompt-empty{display:grid;place-items:center;padding:24px;color:#7f8892;font-size:9px}.tavern-preset-card-overrides{margin:12px 16px 0;border:1px solid #dfe4e9;border-radius:9px;background:#fff}.tavern-preset-card-overrides summary{padding:10px 12px;color:#4f5964;cursor:pointer;font-size:9px;font-weight:650}.tavern-preset-card-overrides>div{border-top:1px solid #e5e9ed;padding:10px 12px}.tavern-preset-card-overrides label{display:block;margin:8px 0 5px;color:#7b848e;font-size:8px;font-weight:650}.tavern-preset-card-overrides pre{max-height:150px;overflow:auto;margin:0;border:1px solid #e4e8ec;border-radius:7px;padding:8px;background:#f8fafb;color:#343b43;font:8px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap}
.tavern-variable-tree{padding:12px 14px 50px}.tavern-variable-branch{margin:4px 0;border-left:1px solid #dfe3e8;padding-left:10px}.tavern-variable-branch summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0;cursor:pointer}.tavern-variable-branch summary strong{font:600 10px/1.3 ui-monospace,SFMono-Regular,Consolas,monospace}.tavern-variable-branch summary span{color:#858c95;font-size:8px}.tavern-variable-branch>div{padding-left:7px}.tavern-variable-leaf{display:grid;grid-template-columns:minmax(90px,.8fr) minmax(0,1.2fr);gap:8px;border-bottom:1px dotted #e2e5e8;padding:5px 0;font-size:9px}.tavern-variable-leaf span{overflow-wrap:anywhere;color:#59636e}.tavern-variable-leaf code{overflow-wrap:anywhere;color:#2b61a8}.tavern-variable-diff{padding:12px 16px}.tavern-variable-diff ol{margin:0;padding-left:20px}.tavern-variable-diff li{margin-bottom:7px;font-size:9px}.tavern-variable-diff strong,.tavern-variable-diff span{display:block}.tavern-variable-diff span{margin-top:2px;color:#6f7882}.tavern-raw-json{min-height:0;flex:1;padding:16px!important}
.tavern-regex-workbench .tavern-capability-inspector>pre{margin-top:5px}.tavern-regex-matches{padding:12px}.tavern-regex-matches>article{margin-bottom:12px;border:1px solid #dfe3e8;border-radius:8px;overflow:hidden}.tavern-regex-matches>article>header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7ea;padding:7px 9px;background:#f7f8fa;font-size:9px}.tavern-regex-matches>article>div{display:grid;grid-template-columns:1fr 1fr}.tavern-regex-matches section+section{border-left:1px solid #e5e7ea}.tavern-regex-matches h4{margin:0;padding:6px 8px;color:#6e7781;font-size:8px}.tavern-regex-matches pre{max-height:220px}.tavern-runtime-errors{margin:0;padding-left:18px;color:#a94450;font-size:9px;line-height:1.5}.tavern-script-list{padding:12px 14px}.tavern-script-list details{margin-bottom:8px;border:1px solid #dfe3e8;border-radius:8px;overflow:hidden}.tavern-script-list summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;cursor:pointer}.tavern-script-list summary strong{font-size:10px}.tavern-script-list summary span{color:#818994;font-size:8px}.tavern-script-list pre{max-height:420px;border-top:1px solid #e5e7ea}.tavern-chip-list{display:flex;flex-wrap:wrap;gap:5px}.tavern-chip-list span{border-radius:999px;padding:4px 7px;background:#edf3fc;color:#2d67ba;font:8px/1 ui-monospace,SFMono-Regular,Consolas,monospace}
.tavern-regex-settings,.tavern-regex-evidence{min-height:0;flex:1;overflow:auto;background:#f5f7fa}.tavern-regex-overview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;border-bottom:1px solid #e3e7eb;padding:12px 16px;background:#f7f9fc}.tavern-regex-overview>div{display:flex;min-width:0;flex-direction:column;gap:3px;border:1px solid #e2e6eb;border-radius:9px;padding:9px 10px;background:#fff}.tavern-regex-overview strong{overflow:hidden;color:#20252b;font-size:16px;line-height:1.15;text-overflow:ellipsis;white-space:nowrap}.tavern-regex-overview span{overflow:hidden;color:#7c848d;font-size:8px;text-overflow:ellipsis;white-space:nowrap}.tavern-regex-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;border-bottom:1px solid #e3e7eb;padding:10px 16px;background:#fff}.tavern-regex-toolbar .tavern-capability-search{height:34px;margin:0}.tavern-regex-debug-button{display:inline-flex;height:34px;align-items:center;gap:6px;border:1px solid #cbd9eb;border-radius:7px;padding:0 10px;background:#f6f9fd;color:#2b65ad;cursor:pointer;font:600 9px/1 inherit}.tavern-regex-debug-button:hover{border-color:#9ebbe0;background:#edf4fd}.tavern-regex-scopes{padding:12px 14px 48px}.tavern-regex-scope{margin-bottom:10px;border:1px solid #dfe4e9;border-radius:10px;background:#fff;box-shadow:0 1px 2px #1b2d4510;overflow:hidden}.tavern-regex-scope>header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px}.tavern-regex-scope>header>div{display:flex;min-width:0;flex-direction:column;gap:3px}.tavern-regex-scope>header strong{color:#2b3138;font-size:11px}.tavern-regex-scope>header span{overflow:hidden;color:#7d8690;font-size:8.5px;text-overflow:ellipsis;white-space:nowrap}.tavern-regex-scope>header em{flex:none;border-radius:999px;padding:3px 7px;background:#eef1f4;color:#747d87;font-size:8px;font-style:normal}.tavern-regex-scope>p{margin:0;border-top:1px solid #edf0f2;padding:9px 12px;color:#7d858e;font-size:9px;line-height:1.55}.tavern-regex-scope.is-unavailable{background:#fafbfc}.tavern-regex-scope.is-unavailable>header{opacity:.75}.tavern-regex-scope.is-current{border-color:#cad9ec}.tavern-regex-scope.is-current>header{background:#f7faff}.tavern-regex-scope.is-current>header em{background:#e7f1ff;color:#2464b5}.tavern-regex-rule-list{border-top:1px solid #e4e9ef}.tavern-regex-rule-list>article+article{border-top:1px solid #e8ecf0}.tavern-regex-rule-list>article>button{display:grid;width:100%;min-height:58px;box-sizing:border-box;grid-template-columns:28px minmax(0,1fr) auto 16px;align-items:center;gap:8px;border:0;padding:8px 10px;background:#fff;color:#30363d;cursor:pointer;text-align:left}.tavern-regex-rule-list>article>button:hover{background:#f7faff}.tavern-regex-rule-list>article.is-expanded>button{background:#eef5ff;color:#205fae}.tavern-regex-order{display:grid;width:25px;height:25px;place-items:center;border-radius:7px;background:#f0f2f5;color:#737c86;font:650 8px/1 ui-monospace,SFMono-Regular,Consolas,monospace}.tavern-regex-rule-list>article.is-expanded .tavern-regex-order{background:#dcecff;color:#1d61b7}.tavern-regex-rule-copy{display:flex;min-width:0;flex-direction:column;gap:4px}.tavern-regex-rule-copy strong,.tavern-regex-rule-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tavern-regex-rule-copy strong{font-size:10.5px}.tavern-regex-rule-copy small{color:#7a838d;font-size:8px}.tavern-regex-enabled{border-radius:999px;padding:3px 7px;background:#eaf7ef;color:#277949;font-size:8px;white-space:nowrap}.tavern-regex-rule-detail{border-top:1px solid #dfe8f2;padding:12px;background:#fbfdff}.tavern-regex-rule-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-bottom:12px}.tavern-regex-rule-facts>div{display:flex;min-width:0;flex-direction:column;gap:3px;border:1px solid #e5eaf0;border-radius:7px;padding:7px 8px;background:#fff}.tavern-regex-rule-facts span{color:#828b95;font-size:7.5px}.tavern-regex-rule-facts strong{overflow-wrap:anywhere;color:#343b43;font-size:8.5px;line-height:1.4}.tavern-regex-rule-detail>label{display:block;margin:10px 0 5px;color:#6f7882;font-size:8px;font-weight:650}.tavern-regex-rule-detail>pre{max-height:180px;margin:0;overflow:auto;border:1px solid #e2e7ed;border-radius:7px;padding:9px;background:#f6f8fa;color:#293039;font:8.5px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.tavern-regex-rule-id{display:block;margin-top:10px;overflow:hidden;color:#9098a1;font:7.5px/1.3 ui-monospace,SFMono-Regular,Consolas,monospace;text-overflow:ellipsis;white-space:nowrap}.tavern-regex-boundary{margin-top:12px;border-left:3px solid #d69a34;border-radius:0 8px 8px 0;padding:9px 10px;background:#fff9ee}.tavern-regex-boundary strong{color:#684814;font-size:9px}.tavern-regex-boundary p{margin:4px 0 0;color:#806333;font-size:8.5px;line-height:1.55}.tavern-regex-evidence{padding-bottom:48px}.tavern-regex-evidence-summary{border-bottom:1px solid #e1e6eb;padding:14px 16px;background:#fff}.tavern-regex-evidence-summary>header,.tavern-regex-match-section>header{display:flex;align-items:center;justify-content:space-between;gap:10px}.tavern-regex-evidence-summary>header>div,.tavern-regex-match-section>header>div{display:flex;min-width:0;flex-direction:column;gap:3px}.tavern-regex-evidence-summary>header strong,.tavern-regex-match-section>header strong{font-size:11px}.tavern-regex-evidence-summary>header span,.tavern-regex-match-section>header span{color:#7d858f;font-size:8px}.tavern-regex-plane-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:11px}.tavern-regex-plane-grid>article{display:flex;min-width:0;flex-direction:column;gap:3px;border:1px solid #e2e7ec;border-radius:8px;padding:9px;background:#fafbfc}.tavern-regex-plane-grid>article.is-active{border-color:#aac7ec;background:#f1f7ff}.tavern-regex-plane-grid span{color:#7c858f;font-size:7.5px}.tavern-regex-plane-grid strong{overflow:hidden;color:#343b43;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.tavern-regex-plane-grid small{color:#8b939c;font-size:7.5px}.tavern-regex-evidence-summary>p{margin:10px 0 0;color:#69737d;font-size:8.5px;line-height:1.55}.tavern-regex-match-section{padding:14px}.tavern-regex-match-section>.tavern-regex-matches{padding:10px 0 0}.tavern-regex-matches>article{background:#fff;box-shadow:0 1px 2px #182a4210}.tavern-regex-matches>article>header{padding:8px 10px}.tavern-regex-matches>article>header span{color:#7f8892}.tavern-regex-matches pre{font-size:8.5px;line-height:1.6}
.tavern-card-profile{padding:14px 16px 48px}.tavern-card-profile section{margin-bottom:20px}.tavern-card-profile p{color:#343a41;font-size:11px}.tavern-opening-documents{padding:12px 14px}.tavern-opening-documents article{margin-bottom:10px;border:1px solid #dfe3e8;border-radius:8px;overflow:hidden}.tavern-opening-documents header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7ea;padding:8px 10px;background:#f7f8fa}.tavern-opening-documents header strong{font-size:10px}.tavern-opening-documents header span{color:#2d6cc7;font-size:8px}.tavern-opening-documents p{margin:0;padding:11px;color:#343a41;font-size:11px;line-height:1.7;white-space:pre-wrap}.tavern-compatibility-list{padding:12px 14px}.tavern-compatibility-list>section,.tavern-compatibility-list>article{margin-bottom:8px;border:1px solid #dfe3e8;border-radius:8px;padding:10px}.tavern-compatibility-list>section.is-ready{border-left:3px solid #25a45b}.tavern-compatibility-list>section.is-degraded{border-left:3px solid #e3a52b}.tavern-compatibility-list>section.is-blocked{border-left:3px solid #c94d59}.tavern-compatibility-list header{display:flex;align-items:center;justify-content:space-between;gap:8px}.tavern-compatibility-list strong{font-size:10px}.tavern-compatibility-list span{color:#6e7781;font-size:8px}.tavern-compatibility-list p{margin:5px 0 0;color:#606a75;font-size:9px;line-height:1.5}.tavern-capability-boundary{border-left:3px solid #e3a52b;padding:9px 10px;background:#fffaf0}.tavern-capability-boundary strong{font-size:10px}
@media(max-width:1050px){:root{--tavern-capability-panel-width:440px}body:has(.tavern-capability-panel.is-open[data-capability="preset"]){--tavern-capability-panel-width:calc(100vw - var(--tavern-capability-rail-width))}.tavern-worldbook-workbench{grid-template-columns:180px minmax(0,1fr)}.tavern-regex-workbench{grid-template-columns:155px minmax(0,1fr)}.tavern-preset-toolbar{align-items:stretch;flex-direction:column}.tavern-preset-select-wrap{width:100%}.tavern-preset-actions{justify-content:flex-start}}@media(max-width:760px){:root{--tavern-capability-panel-width:calc(100vw - var(--tavern-capability-rail-width))}body:has(.tavern-card-capability-rail){padding-right:var(--tavern-capability-rail-width)}.tavern-capability-panel{box-shadow:-16px 0 40px #0002}.tavern-worldbook-workbench{grid-template-columns:170px minmax(0,1fr)}.tavern-regex-workbench{grid-template-columns:145px minmax(0,1fr)}.tavern-preset-budget-grid,.tavern-preset-samplers,.tavern-preset-prompt-layout{grid-template-columns:1fr}.tavern-preset-prompt-list{max-height:360px;border-right:0;border-bottom:1px solid #e1e5e9}.tavern-preset-select-wrap{min-width:0;grid-template-columns:1fr}.tavern-preset-select-wrap>label{grid-column:auto}.tavern-preset-binding{grid-template-columns:1fr}.tavern-preset-generation>header{align-items:flex-start;flex-direction:column}}
.tavern-preset-advanced{margin:12px 16px 0;border:1px solid #dfe4e9;border-radius:9px;background:#fff;box-shadow:0 1px 2px #182a4210}.tavern-preset-advanced>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;color:#4f5964;cursor:pointer;list-style:none}.tavern-preset-advanced>summary::-webkit-details-marker{display:none}.tavern-preset-advanced>summary::after{width:6px;height:6px;flex:none;border-right:1.5px solid #7b8590;border-bottom:1.5px solid #7b8590;content:"";transform:rotate(45deg);transition:transform .15s ease}.tavern-preset-advanced[open]>summary::after{transform:rotate(225deg)}.tavern-preset-advanced>summary strong{font-size:10px}.tavern-preset-advanced-body{display:flex;align-items:flex-end;gap:10px;border-top:1px solid #e6e9ed;padding:10px 12px}.tavern-preset-advanced-body .tavern-preset-samplers{min-width:0;flex:1;margin:0;border:0;padding:0;grid-template-columns:repeat(2,minmax(0,1fr))}.tavern-preset-reset-sampling{height:30px;flex:none;margin:0;border:1px solid #ced9e7;border-radius:7px;padding:0 9px;background:#f7faff;color:#3168aa;cursor:pointer;font-size:8.5px;font-weight:600}
.tavern-preset-workbench{display:flex;overflow:hidden;padding:0;flex-direction:column;background:#f7f8fa}.tavern-preset-toolbar{position:relative;z-index:5;align-items:center;gap:10px;padding:10px 14px}.tavern-preset-select-wrap{display:flex;min-width:0;align-items:center;gap:8px}.tavern-preset-select-wrap select{width:min(330px,55%);height:34px}.tavern-preset-revision{overflow:hidden;border:1px solid #dfe4e9;border-radius:6px;padding:6px 8px;background:#f6f7f9;color:#6f7882;font-size:8px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.tavern-preset-revision.is-dirty{border-color:#d5b66f;background:#fff9ea;color:#8a6319}.tavern-preset-actions{position:relative;flex:none;flex-wrap:nowrap}.tavern-preset-actions>button,.tavern-preset-more>summary{display:inline-flex;height:34px;box-sizing:border-box;align-items:center;justify-content:center;gap:5px;border:1px solid #ccd4dd;border-radius:7px;padding:0 11px;background:#fff;color:#44505d;cursor:pointer;font-size:9px;font-weight:650;list-style:none}.tavern-preset-actions .is-primary,.tavern-preset-editor-footer .is-primary{border-color:#2f73ca;background:#3278d3;color:#fff}.tavern-preset-actions .is-primary:hover:not(:disabled),.tavern-preset-editor-footer .is-primary:hover:not(:disabled){border-color:#245fae;background:#2869be;color:#fff}.tavern-preset-more{position:relative}.tavern-preset-more>summary{width:34px;padding:0}.tavern-preset-more>summary::-webkit-details-marker{display:none}.tavern-preset-menu{position:absolute;z-index:10;top:39px;right:0;display:flex;width:138px;overflow:hidden;flex-direction:column;border:1px solid #d7dde4;border-radius:8px;padding:5px;background:#fff;box-shadow:0 10px 26px #182a4224}.tavern-preset-menu button,.tavern-preset-menu a{display:flex;height:32px;align-items:center;gap:8px;border:0;border-radius:5px;padding:0 9px;background:transparent;color:#3f4852;cursor:pointer;font-size:9px;font-weight:550;text-decoration:none}.tavern-preset-menu button:hover:not(:disabled),.tavern-preset-menu a:hover{background:#f0f5fc;color:#2468be}.tavern-preset-menu .is-danger{color:#a7444d}.tavern-preset-rename{display:flex;align-items:flex-end;gap:7px;border-bottom:1px solid #e1e5ea;padding:8px 14px;background:#fbfcfd}.tavern-preset-rename label{display:flex;min-width:0;flex:1;flex-direction:column;gap:4px;color:#6f7882;font-size:8px;font-weight:650}.tavern-preset-rename input{height:31px;border:1px solid #a9c4e7;border-radius:7px;padding:0 9px;background:#fff;outline:none;box-shadow:0 0 0 2px #357bd512}.tavern-preset-rename button{height:31px;border:1px solid #d0d7df;border-radius:7px;padding:0 9px;background:#fff;color:#45515e;cursor:pointer;font-size:8.5px}.tavern-preset-binding{grid-template-columns:auto minmax(0,1fr);padding:7px 14px}.tavern-preset-notice,.tavern-preset-error{padding:7px 14px}.tavern-preset-advanced{flex:none;margin:8px 14px 0;border-radius:7px;box-shadow:none}.tavern-preset-advanced>summary{padding:9px 11px}.tavern-preset-prompts{display:grid;min-height:0;flex:1;grid-template-columns:216px minmax(0,1fr);overflow:hidden;margin:8px 14px 14px;border-radius:8px;box-shadow:none}.tavern-preset-prompt-nav{display:flex;min-width:0;min-height:0;overflow:hidden;flex-direction:column;border-right:1px solid #e0e5ea;background:#fbfcfd}.tavern-preset-prompt-nav>header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:13px 12px 8px}.tavern-preset-prompt-nav h3{font-size:12px}.tavern-preset-prompt-nav>header button{display:grid;width:28px;height:28px;flex:none;place-items:center;border:1px solid #d2d9e1;border-radius:7px;background:#fff;color:#4f5b68;cursor:pointer}.tavern-preset-search{display:flex;height:31px;box-sizing:border-box;align-items:center;gap:6px;margin:0 10px;border:1px solid #d9dfe6;border-radius:7px;padding:0 8px;background:#fff;color:#8a939d}.tavern-preset-search input{width:100%;height:auto;border:0;padding:0;background:transparent;color:#343c45;font-size:8.5px;outline:none}.tavern-preset-prompt-tabs{display:grid;grid-template-columns:repeat(2,1fr);margin:8px 10px 0;border-bottom:1px solid #dfe4e9}.tavern-preset-prompt-tabs button{position:relative;height:31px;border:0;background:transparent;color:#747d87;cursor:pointer;font-size:9px;font-weight:650}.tavern-preset-prompt-tabs button.is-active{color:#2368bd}.tavern-preset-prompt-tabs button.is-active::after{position:absolute;right:0;bottom:-1px;left:0;height:2px;background:#3278d3;content:""}.tavern-preset-prompt-tabs span{margin-left:3px;color:#929aa3;font-size:7px}.tavern-preset-prompt-list,.tavern-preset-library-list{min-height:0;max-height:none;overflow:auto;border:0;background:#fbfcfd}.tavern-preset-prompt-list article{min-height:47px;grid-template-columns:23px minmax(0,1fr) 30px 22px;gap:3px;padding:4px 6px;background:#fbfcfd}.tavern-preset-prompt-list article.is-selected{background:#edf5ff}.tavern-preset-prompt-main{gap:2px;padding:4px 2px}.tavern-preset-prompt-main strong{font-size:9px}.tavern-preset-prompt-main small{font-size:7px}.tavern-preset-row-toggle{position:relative!important;display:block!important;width:28px!important;height:16px!important;border:0!important;border-radius:999px!important;background:transparent!important}.tavern-preset-row-toggle input,.tavern-preset-editor-toggle input{position:absolute;width:1px;height:1px;opacity:0}.tavern-preset-row-toggle>span,.tavern-preset-editor-toggle>span{position:relative;display:block!important;width:28px!important;height:16px!important;border:0!important;border-radius:999px!important;background:#c9d0d8!important;transition:background .15s ease}.tavern-preset-row-toggle>span::after,.tavern-preset-editor-toggle>span::after{position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 1px 2px #0003;content:"";transition:transform .15s ease}.tavern-preset-row-toggle:has(input:checked)>span,.tavern-preset-editor-toggle:has(input:checked)>span{background:#3278d3!important}.tavern-preset-row-toggle:has(input:checked)>span::after,.tavern-preset-editor-toggle:has(input:checked)>span::after{transform:translateX(12px)}.tavern-preset-move{gap:0}.tavern-preset-move button{width:20px;height:20px}.tavern-preset-move button:first-child svg{transform:rotate(90deg)}.tavern-preset-move button:last-child svg{transform:rotate(90deg)}.tavern-preset-library-list article{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;border-bottom:1px solid #e5e9ed;padding:5px 7px}.tavern-preset-library-list article.is-selected{background:#edf5ff}.tavern-preset-library-list article>button:first-child{display:flex;min-width:0;flex-direction:column;gap:2px;border:0;padding:7px 4px;background:transparent;color:#39424c;cursor:pointer;text-align:left}.tavern-preset-library-list strong,.tavern-preset-library-list small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tavern-preset-library-list strong{font-size:9px}.tavern-preset-library-list small{color:#818a94;font-size:7px}.tavern-preset-insert{border:1px solid #cbd7e6;border-radius:6px;padding:5px 7px;background:#fff;color:#3169aa;cursor:pointer;font-size:8px}.tavern-preset-list-empty{margin:0;padding:24px 12px;color:#8a939d;font-size:8.5px;text-align:center}.tavern-preset-prompt-editor{position:relative;display:flex;min-width:0;min-height:0;overflow:auto;flex-direction:column;padding:16px 18px 64px;background:#fff}.tavern-preset-prompt-editor>header{align-items:center;margin-bottom:18px}.tavern-preset-prompt-editor>header strong{font-size:16px;line-height:1.25}.tavern-preset-editor-actions{display:flex;align-items:center;gap:5px}.tavern-preset-editor-actions>button{display:grid;width:29px;height:29px;place-items:center;border:1px solid #d4dae1;border-radius:7px;background:#fff;color:#56616d;cursor:pointer}.tavern-preset-editor-actions>button:disabled{cursor:not-allowed;opacity:.35}.tavern-preset-editor-toggle{display:flex;align-items:center;gap:5px;margin:0 5px 0 0!important;color:#66717c!important;font-size:8px!important}.tavern-preset-prompt-editor>label,.tavern-preset-editor-grid label,.tavern-preset-content{font-size:9px}.tavern-preset-prompt-editor input,.tavern-preset-prompt-editor select{height:35px;font-size:9.5px}.tavern-preset-editor-grid{gap:11px;margin-top:12px}.tavern-preset-content{min-height:210px;flex:1;margin-top:14px}.tavern-preset-content>span{display:flex;align-items:baseline;justify-content:space-between}.tavern-preset-content>span small{color:#8b949e;font-size:7.5px;font-weight:500}.tavern-preset-prompt-editor textarea{min-height:190px;flex:1;resize:none;padding:12px;background:#fff;font:9px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace}.tavern-preset-marker-note{margin-top:14px}.tavern-preset-editor-more{margin-top:14px;border-top:1px solid #e4e8ed}.tavern-preset-editor-more>summary{padding:11px 2px;color:#59646f;cursor:pointer;font-size:8.5px;font-weight:650}.tavern-preset-editor-more>div{padding-bottom:8px}.tavern-preset-card-overrides{margin:4px 0 0;box-shadow:none}.tavern-preset-editor-footer{position:absolute;right:0;bottom:0;left:0;display:flex;height:52px;box-sizing:border-box;align-items:center;justify-content:flex-end;gap:7px;border-top:1px solid #e0e5ea;padding:9px 14px;background:#fff}.tavern-preset-editor-footer>span{margin-right:auto;color:#7e8791;font-size:8px}.tavern-preset-editor-footer>span.is-dirty{color:#996c18}.tavern-preset-editor-footer>button{height:31px;border:1px solid #d0d7df;border-radius:7px;padding:0 10px;background:#fff;color:#45515e;cursor:pointer;font-size:8.5px;font-weight:650}.tavern-preset-editor-footer>button:disabled{cursor:not-allowed;opacity:.45}
.tavern-preset-search{height:38px;flex:none;gap:7px;border-radius:8px;padding:0 10px;color:#7e8893}.tavern-preset-search input{font-size:11px}.tavern-preset-prompt-tabs{flex:none}.tavern-preset-prompt-tabs button{height:38px;font-size:11.5px}.tavern-preset-prompt-tabs span{font-size:9.5px}.tavern-preset-prompt-main strong{font-size:10.5px}.tavern-preset-prompt-main small{font-size:8px}.tavern-preset-row-toggle>span,.tavern-preset-editor-toggle>span{transform:none!important}.tavern-preset-prompt-editor textarea{font-family:inherit;font-size:12px;line-height:1.7}
.tavern-preset-prompt-nav{position:relative}.tavern-preset-prompt-nav>header .tavern-preset-add-trigger{display:flex;width:auto;height:30px;gap:4px;padding:0 8px;font-size:9.5px;font-weight:650}.tavern-preset-prompt-list{margin-top:8px;border-top:1px solid #e1e5ea}.tavern-preset-add-popover{position:absolute;z-index:6;top:54px;right:8px;left:8px;display:flex;max-height:calc(100% - 62px);box-sizing:border-box;overflow:hidden;flex-direction:column;border:1px solid #ced6df;border-radius:9px;padding:8px;background:#fff;box-shadow:0 10px 28px #182a4230}.tavern-preset-add-popover>header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 2px 8px}.tavern-preset-add-popover>header>div{display:flex;min-width:0;flex-direction:column;gap:2px}.tavern-preset-add-popover>header strong{font-size:10.5px}.tavern-preset-add-popover>header span{color:#7e8791;font-size:8px}.tavern-preset-add-popover>header>button{display:grid;width:25px;height:25px;flex:none;place-items:center;border:0;border-radius:6px;background:transparent;color:#65717d;cursor:pointer}.tavern-preset-create-prompt{display:flex;min-height:42px;flex:none;align-items:center;gap:8px;border:1px solid #c9d8ea;border-radius:7px;padding:6px 9px;background:#f4f8fe;color:#2868b8;cursor:pointer;text-align:left}.tavern-preset-create-prompt>span{display:flex;min-width:0;flex-direction:column;gap:2px}.tavern-preset-create-prompt strong{font-size:9.5px}.tavern-preset-create-prompt small{color:#6f7d8d;font-size:7.5px}.tavern-preset-unused-search{display:flex;height:34px;flex:none;align-items:center;gap:6px;margin-top:8px;border:1px solid #d8dfe6;border-radius:7px;padding:0 8px;color:#828c97}.tavern-preset-unused-search input{width:100%;min-width:0;border:0;background:transparent;color:#343c45;font-size:9.5px;outline:none}.tavern-preset-unused-list{min-height:0;overflow:auto;margin-top:6px;border-top:1px solid #edf0f3}.tavern-preset-unused-list>button{display:flex;width:100%;align-items:center;justify-content:space-between;gap:7px;border:0;border-bottom:1px solid #edf0f3;padding:8px 4px;background:#fff;color:#343d47;cursor:pointer;text-align:left}.tavern-preset-unused-list>button:hover{background:#f3f7fc}.tavern-preset-unused-list>button>span{display:flex;min-width:0;flex-direction:column;gap:2px}.tavern-preset-unused-list strong,.tavern-preset-unused-list small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tavern-preset-unused-list strong{font-size:9.5px}.tavern-preset-unused-list small{color:#7d8791;font-size:7.5px}.tavern-preset-unused-list em{flex:none;color:#2d6fc3;font-size:8px;font-style:normal;font-weight:650}
.tavern-preset-prompt-list article{grid-template-columns:32px minmax(0,1fr) 30px 22px;cursor:grab}.tavern-preset-prompt-list article:active{cursor:grabbing}.tavern-preset-order-handle{display:flex;height:100%;align-items:center;justify-content:center;gap:2px;color:#87929d;cursor:grab;font:7px/1 ui-monospace,SFMono-Regular,Consolas,monospace;user-select:none}.tavern-preset-order-handle svg{color:#9aa4ae;transform:rotate(90deg)}.tavern-preset-prompt-list article.is-dragging{opacity:.35!important}.tavern-preset-prompt-list article.is-drop-before{box-shadow:inset 0 2px #3278d3}.tavern-preset-prompt-list article.is-drop-after{box-shadow:inset 0 -2px #3278d3}
.tavern-preset-secondary-actions{display:flex;min-height:46px;box-sizing:border-box;flex:none;align-items:center;gap:6px;border-bottom:1px solid #e1e5ea;padding:6px 14px;background:#fbfcfd}.tavern-preset-secondary-actions button,.tavern-preset-secondary-actions a{display:inline-flex;height:32px;box-sizing:border-box;align-items:center;justify-content:center;gap:6px;border:1px solid #d2d9e1;border-radius:7px;padding:0 10px;background:#fff;color:#46515d;cursor:pointer;font-size:9px;font-weight:650;text-decoration:none}.tavern-preset-secondary-actions button:hover:not(:disabled),.tavern-preset-secondary-actions a:hover{border-color:#9db8dd;background:#f3f7fd;color:#2366bd}.tavern-preset-secondary-actions button:disabled{cursor:not-allowed;opacity:.42}.tavern-preset-secondary-actions .is-danger{margin-left:auto;border-color:#e2c7ca;color:#a7444d}.tavern-preset-secondary-actions .is-danger:hover:not(:disabled){border-color:#d7aeb3;background:#fff5f5;color:#9f303c}
@media(max-width:1050px){.tavern-preset-toolbar{align-items:center;flex-direction:row}.tavern-preset-actions{justify-content:flex-end}.tavern-preset-select-wrap{width:auto}.tavern-preset-binding{grid-template-columns:auto minmax(0,1fr)}}@media(max-width:640px){.tavern-preset-revision{display:none}.tavern-preset-prompts{grid-template-columns:185px minmax(310px,1fr);overflow:auto}.tavern-preset-prompt-editor{min-width:310px}.tavern-preset-select-wrap select{width:100%}}
.tavern-preset-title-block{display:flex;width:126px;min-width:0;flex:none;flex-direction:column;gap:2px}.tavern-preset-title-block h2{overflow:hidden;margin:0;color:#20262d;font-size:13px;line-height:1.25;text-overflow:ellipsis;white-space:nowrap}.tavern-preset-title-block span{overflow:hidden;color:#7f8892;font-size:7.5px;text-overflow:ellipsis;white-space:nowrap}.tavern-preset-select-wrap{flex:1}.tavern-preset-select-wrap select{width:min(250px,62%)}
@media(max-width:640px){.tavern-preset-title-block{width:108px}.tavern-preset-title-block span{display:none}}
.tavern-frontend-overview-copy>span{font-size:10px}.tavern-frontend-overview-copy>strong{font-size:17px}.tavern-frontend-overview-copy>small{font-size:10px}.tavern-frontend-overview-facts strong{font-size:15px}.tavern-frontend-overview-facts span{font-size:9px}.tavern-frontend-setting-section>summary strong{font-size:12px}.tavern-frontend-setting-section>summary span{font-size:9px}.tavern-frontend-facts{font-size:10px}.tavern-frontend-facts dt,.tavern-frontend-facts dd{padding:9px 4px}.tavern-frontend-permission strong{font-size:11px}.tavern-frontend-permission small{font-size:9.5px}.tavern-frontend-note,.tavern-frontend-empty,.tavern-frontend-resource p{font-size:10px}.tavern-frontend-metrics span{font-size:9px}.tavern-frontend-metrics strong{font-size:15px}.tavern-frontend-setting-body h4{font-size:9px}.tavern-frontend-script>summary strong{font-size:10px}.tavern-frontend-script>summary span{font-size:9px}.tavern-frontend-state>summary{font-size:10px}
`;

    const CONTROL_STYLE = `
.dsh-roleplay-control{width:100%;box-sizing:border-box;list-style:none;border:1px solid var(--dsw-alias-border-l2,#e1e5ea);border-radius:12px;background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#20242a);transition:border-color .16s,background .16s}.dsh-roleplay-control:hover{border-color:var(--dsw-alias-label-dimmed,#a8afb8)}.dsh-roleplay-control.is-open{border-color:var(--dsw-alias-label-dimmed,#a8afb8);background:var(--dsw-alias-bg-layer-2,#fafbfc)}
.dsh-roleplay-control-header{display:flex;width:100%;box-sizing:border-box;appearance:none;align-items:center;gap:12px;border:0;border-radius:12px;padding:14px 16px;background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left}.dsh-roleplay-control-header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#2877eb);outline-offset:-2px}.dsh-roleplay-control-heading{display:flex;min-width:0;flex:1;flex-direction:column;gap:4px}.dsh-roleplay-control-heading strong{color:var(--dsw-alias-label-primary,#20242a);font-size:15px;font-weight:600;line-height:1.4}.dsh-roleplay-control-heading span{color:var(--dsw-alias-label-tertiary,#838b95);font-size:13px;line-height:1.5}.dsh-roleplay-control-chevron{flex:none;color:var(--dsw-alias-label-tertiary,#838b95);transition:transform .16s}.dsh-roleplay-control.is-open .dsh-roleplay-control-chevron{transform:rotate(180deg)}
.dsh-roleplay-control-body{margin:0 16px;border-top:1px solid var(--dsw-alias-border-l2,#e1e5ea);padding:14px 0 12px}.dsh-roleplay-control-row{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}.dsh-roleplay-control-copy{min-width:0}.dsh-roleplay-control-copy strong{font-size:13px;line-height:1.5}.dsh-roleplay-control-copy p{max-width:520px;margin:5px 0 0;color:var(--dsw-alias-label-secondary,#68717c);font-size:12px;line-height:1.6}.dsh-roleplay-control-toggle{display:flex;flex:none;align-items:center;gap:9px;margin-top:1px;font-size:13px;font-weight:650;cursor:pointer}.dsh-roleplay-control-toggle input{width:18px;height:18px;accent-color:var(--dsw-alias-brand-primary,#2877eb)}.dsh-roleplay-control-note{display:block;margin-top:14px;border-top:1px solid var(--dsw-alias-border-l2,#e1e5ea);padding-top:12px;color:var(--dsw-alias-label-tertiary,#838b95);font-size:12px;line-height:1.55}.dsh-roleplay-control [role=alert]{margin:10px 0 0;color:var(--dsw-alias-label-error,#b43e49);font-size:12px}
`;

    module.exports.inject = ["slots", "sessions"];
    module.exports.apply = (ctx: any): (() => void) => {
      const controlDisposers: Array<() => void> = [];
      let runtimeDispose: (() => void) | null = null;
      let lastRolePlaySessionId: string | null = null;
      let sessionRecovery: Promise<"ready" | "reloaded" | "missing"> | null = null;

      const currentRolePlaySessionId = (): string | null => {
        const current = ctx.sessions.list.getSnapshot().current as string | undefined;
        if (current === undefined) return null;
        if (state.activeSessionId === current) return current;
        return state.cards.some((card) => card.sessions.some((save) => save.sessionId === current)) ? current : null;
      };

      const recoverCurrentRolePlaySession = (): Promise<"ready" | "reloaded" | "missing"> | null => {
        const sessionId = currentRolePlaySessionId() ?? lastRolePlaySessionId;
        if (sessionId === null) return null;
        if (sessionRecovery !== null) return sessionRecovery;
        sessionRecovery = recoverRestoredClientSession(ctx.sessions, {
          sessionId,
          reload: () => window.location.reload(),
        }).then((result) => {
          if (result === "ready") lastRolePlaySessionId = null;
          return result;
        }).finally(() => { sessionRecovery = null; });
        return sessionRecovery;
      };

      const startRuntime = (): void => {
        if (runtimeDispose !== null) return;
        runtimeContext = ctx;
        void refreshHostCards()
          .then(() => recoverCurrentRolePlaySession())
          .catch((error) => patchState({ startError: error instanceof Error ? error.message : "无法读取已保存的酒馆卡" }));
        const disposers: Array<() => void> = [];
        if (typeof document !== "undefined") {
          const style = document.createElement("style");
          style.dataset.plugin = "dsh-roleplay-runtime";
          style.textContent = `${STYLE}\n${FRONTEND_CALL_STYLE}`;
          document.head.appendChild(style);
          disposers.push(() => style.remove());
        }
        disposers.push(ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({ name: "sidebar.footer.action", id: "dsh-roleplay-integration", order: 15 }, SidebarIntegration)));
        disposers.push(ctx.slots.inject("conversation.view", () => ctx.slots.register({ name: "conversation.view", id: "tavern", order: 30, label: () => "酒馆" }, TavernContextView)));
        disposers.push(ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({ name: "conversation.composer.dock", id: "dsh-roleplay-native-message-adapter", order: 90 }, TavernNativeMessageAdapter)));
        disposers.push(ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({ name: "conversation.input.dock", id: "dsh-roleplay-trajectory-surface-adapter", order: 19 }, TavernTrajectorySurfaceAdapter)));
        disposers.push(ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({ name: "conversation.input.dock", id: "dsh-roleplay-opening-switcher", order: 20 }, TavernOpeningSwitcher)));
        runtimeDispose = () => {
          const failures: unknown[] = [];
          lastRolePlaySessionId = currentRolePlaySessionId() ?? lastRolePlaySessionId;
          for (const dispose of disposers.reverse()) {
            try { dispose(); } catch (error) { failures.push(error); }
          }
          listeners.clear();
          state = initialState();
          runtimeContext = null;
          runtimeDispose = null;
          if (failures.length === 1) throw failures[0];
          if (failures.length > 1) throw new AggregateError(failures, "RolePlay 客户端运行时卸载失败");
        };
      };

      const syncRuntime = (enabled: boolean): void => {
        if (enabled) startRuntime();
        else runtimeDispose?.();
      };

      const RolePlaySettingsCard = (): any => {
        const [open, setOpen] = React.useState(false);
        const [enabled, setEnabled] = React.useState(null as boolean | null);
        const [busy, setBusy] = React.useState(false);
        const [error, setError] = React.useState("");
        const read = async (): Promise<void> => {
          const response = await fetch("/dsh-re3-rp/control", { cache: "no-store" });
          const body = await response.json();
          if (!response.ok || body.ok !== true) throw new Error(body.error || "无法读取插件状态");
          setEnabled(body.enabled === true);
          syncRuntime(body.enabled === true);
        };
        React.useEffect(() => { void read().catch((reason) => setError(reason instanceof Error ? reason.message : String(reason))); }, []);
        const update = async (next: boolean): Promise<void> => {
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/dsh-re3-rp/control", {
              method: "POST",
              headers: { "content-type": "application/json; charset=utf-8" },
              body: JSON.stringify({ enabled: next }),
            });
            const body = await response.json();
            if (!response.ok || body.ok !== true) throw new Error(body.error || "无法切换插件状态");
            setEnabled(body.enabled === true);
            syncRuntime(body.enabled === true);
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
          } finally {
            setBusy(false);
          }
        };
        return h("li", { className: `dsh-roleplay-control${open ? " is-open" : ""}` },
          h("button", { type: "button", className: "dsh-roleplay-control-header", "aria-expanded": open, onClick: () => setOpen(!open) },
            h("span", { className: "dsh-roleplay-control-heading" },
              h("strong", null, "DSH RolePlay"),
              h("span", null, "管理酒馆体验与运行时扩展。"),
            ),
            h(IconChevronDownOutline14, { className: "dsh-roleplay-control-chevron", size: 14 }),
          ),
          open ? h("div", { className: "dsh-roleplay-control-body" },
            h("div", { className: "dsh-roleplay-control-row" },
              h("div", { className: "dsh-roleplay-control-copy" },
                h("strong", null, "启用 DSH RolePlay"),
                h("p", null, "关闭后会卸载酒馆侧栏、对话适配、输入区扩展、Host 路由和运行时资源。角色卡与 Session 数据会保留，重新开启即可恢复。"),
              ),
              h("label", { className: "dsh-roleplay-control-toggle" },
                h("input", { type: "checkbox", checked: enabled === true, disabled: enabled === null || busy, onChange: (event: any) => { void update(event.currentTarget.checked); } }),
                busy ? "切换中…" : enabled === true ? "已开启" : "已关闭",
              ),
            ),
            error.length > 0 ? h("div", { role: "alert" }, error) : null,
            h("small", { className: "dsh-roleplay-control-note" }, "这里的关闭是可逆的运行时卸载；如需从磁盘删除 npm 包，请使用 DSH 的插件移除命令。"),
          ) : null,
        );
      };

      if (typeof document !== "undefined") {
        const style = document.createElement("style");
        style.dataset.plugin = "dsh-roleplay-control";
        style.textContent = CONTROL_STYLE;
        document.head.appendChild(style);
        controlDisposers.push(() => style.remove());
      }
      controlDisposers.push(ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({ name: "settings.plugin.item", key: "dsh-roleplay" }, RolePlaySettingsCard)));
      void fetch("/dsh-re3-rp/control", { cache: "no-store" })
        .then(async (response) => ({ response, body: await response.json() }))
        .then(({ response, body }) => {
          if (!response.ok || body.ok !== true) throw new Error(body.error || "无法读取插件状态");
          syncRuntime(body.enabled === true);
        })
        .catch((error) => patchState({ startError: error instanceof Error ? error.message : "无法读取插件状态" }));
      return () => {
        runtimeDispose?.();
        for (const dispose of controlDisposers.reverse()) dispose();
      };
    };
    return module.exports;
  }
});

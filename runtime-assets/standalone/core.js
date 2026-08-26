export function mountStandaloneFrontend({ adapter, document }) {
  const bindingNode = document.querySelector("#binding");
  const projectionNode = document.querySelector("#projection");
  const eventNode = document.querySelector("#event");
  const submitButton = document.querySelector("#submit");

  const render = (projection) => {
    projectionNode.replaceChildren(...projection.messages.map((message) => {
      const item = document.createElement("li");
      item.textContent = `${message.role}: ${message.text}`;
      item.dataset.seq = String(message.seq);
      return item;
    }));
  };

  const ready = async () => {
    const binding = await adapter.getBinding();
    bindingNode.textContent = `chat=${binding.chatId} · card=${binding.cardId} · adapter=${adapter.version}`;
    render(await adapter.getProjection());
    adapter.subscribe((event) => {
      eventNode.textContent = `${event.type}:${event.operationId ?? event.seq ?? ""}`;
      if (event.projection) render(event.projection);
    });
  };

  submitButton.addEventListener("click", async () => {
    submitButton.disabled = true;
    delete eventNode.dataset.error;
    try {
      const result = await adapter.submitTurn({ text: "我在调度台登记：启航前检查北舷灯。", operationId: "ft-standalone-u1" });
      eventNode.textContent = `generation_committed:${result.committedSeq}`;
      render(await adapter.getProjection());
    } catch (error) {
      eventNode.dataset.error = error.code ?? "bridge_unavailable";
      eventNode.textContent = `提交失败：${eventNode.dataset.error}`;
    } finally { submitButton.disabled = false; }
  });

  return ready();
}

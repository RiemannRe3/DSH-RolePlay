export async function* captureAssistantTextStream(
  stream: AsyncIterable<any>,
  onComplete: (body: string) => void,
): AsyncIterable<any> {
  let body = "";
  for await (const chunk of stream) {
    if (chunk?.type === "text-delta" && typeof chunk.text === "string") body += chunk.text;
    if (chunk?.type === "finish" && chunk.reason?.kind === "stop" && body.trim().length === 0) {
      yield {
        ...chunk,
        reason: {
          kind: "error",
          failure: {
            name: "EmptyAssistantResponseError",
            code: "empty_assistant_response",
            message: "模型已结束生成，但没有返回可显示的正文，请重试。",
          },
        },
      };
    } else {
      yield chunk;
    }
  }
  onComplete(body);
}

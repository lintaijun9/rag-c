import { chatStream } from "@/services/chat.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      message,
      storeId,
      storeNames: inputStoreNames,
      model,
      metadataFilter,
    } = body;

    const storeNames =
      inputStoreNames || (storeId ? [`fileSearchStores/${storeId}`] : []);

    if (!message || storeNames.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "message and storeNames (or storeId) are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const gen = chatStream({
            contents: message,
            storeNames,
            model,
            metadataFilter,
          });

          for await (const chunk of gen) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`),
            );
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

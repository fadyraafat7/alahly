import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter, type EntryContext } from "react-router";
import { renderToPipeableStream } from "react-dom/server";
import { applyCachePolicy } from './lib/cachePolicy';

export function handleDataRequest(response: Response) {
  applyCachePolicy(response.headers);
  return response;
}

export const streamTimeout = 5_000;
// Standard React Router Node streaming entry; catalog loaders resolve before render.
export default function handleRequest(
  request: Request,
  status: number,
  headers: Headers,
  context: EntryContext,
) {
  applyCachePolicy(headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  if (request.method === "HEAD") return new Response(null, { status, headers });
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => abort(), streamTimeout + 1_000);
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={context} url={request.url} />,
      {
        onAllReady() {
          const body = new PassThrough();
          body.on("finish", () => clearTimeout(timer));
          body.on("close", () => clearTimeout(timer));
          resolve(
            new Response(createReadableStreamFromReadable(body), {
              status,
              headers,
            }),
          );
          pipe(body);
        },
        onShellError(error) {
          clearTimeout(timer);
          reject(error);
        },
        onError() {
          status = 500;
        },
      },
    );
  });
}

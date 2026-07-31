import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleCompleteOnboardingRequest } from "./lib/onboarding.functions";
import { handleGenerateSimulationRequest } from "./lib/simulation-generator.functions";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type WorkerBindings = Record<string, unknown>;

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function readWorkerString(env: unknown, key: string): string {
  if (!env || typeof env !== "object") return "";
  const value = (env as WorkerBindings)[key];
  return typeof value === "string" ? value.trim() : "";
}

function googleClientIdResponse(env: unknown): Response {
  const clientId =
    readWorkerString(env, "GOOGLE_CLIENT_ID") ||
    readWorkerString(env, "VITE_GOOGLE_CLIENT_ID");

  return Response.json(
    { clientId },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // JD 시뮬레이션 생성은 응답이 길어 SSR 핸들러를 거치지 않고 직접 스트리밍합니다.
      // (첫 바이트를 즉시 내보내 Cloudflare 524를 회피)
      const { pathname } = new URL(request.url);
      if (pathname === "/api/google-client-id") {
        if (request.method !== "GET") {
          return new Response("Method Not Allowed", { status: 405 });
        }
        return googleClientIdResponse(env);
      }

      if (pathname === "/api/generate-simulation") {
        if (request.method !== "POST") {
          return new Response("Method Not Allowed", { status: 405 });
        }
        return handleGenerateSimulationRequest(request);
      }

      if (pathname === "/api/complete-onboarding") {
        if (request.method !== "POST") {
          return new Response("Method Not Allowed", { status: 405 });
        }
        return handleCompleteOnboardingRequest(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};

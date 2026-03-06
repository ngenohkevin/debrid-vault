import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://100.85.91.122:6501";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyRequest(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse | Response> {
  const { path } = await context.params;
  const pathString = "/api/" + path.join("/");

  const url = new URL(pathString, BACKEND_URL);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const isSSE = pathString.includes("/events");

  try {
    const headers: HeadersInit = {};
    if (!isSSE) {
      headers["Content-Type"] = "application/json";
    }
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      cache: "no-store",
    };

    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      const body = await request.text();
      if (body) {
        fetchOptions.body = body;
      }
    }

    const response = await fetch(url.toString(), fetchOptions);

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("text/event-stream") || isSSE) {
      if (!response.body) {
        return NextResponse.json(
          { error: "No response body from backend" },
          { status: 502 }
        );
      }

      return new Response(response.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-store, no-transform, must-revalidate",
          "X-Accel-Buffering": "no",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to backend" },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

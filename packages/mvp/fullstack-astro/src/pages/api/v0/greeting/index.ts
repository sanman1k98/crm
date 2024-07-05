import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = () => new Response(
  JSON.stringify({ text: "Hello World!" }),
);

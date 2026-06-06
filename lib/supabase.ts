import { createClient } from "@supabase/supabase-js";

// Server-only client. The service role key is a password to the whole
// database — it lives here, on the server, and never ships to the browser.

let supabase: any = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
} else {
  // Create a mock client for development without Supabase credentials
  supabase = {
    from: () => ({
      select: () => ({
        order: () => ({
          range: async () => ({
            data: [
              {
                id: "1",
                body: "What is the best way to learn React?",
                author: "John Doe",
                created_at: new Date().toISOString(),
                votes: [{ count: 42 }],
              },
              {
                id: "2",
                body: "How do I optimize Next.js performance?",
                author: "Jane Smith",
                created_at: new Date().toISOString(),
                votes: [{ count: 28 }],
              },
              {
                id: "3",
                body: "What are the benefits of TypeScript?",
                author: "Bob Wilson",
                created_at: new Date().toISOString(),
                votes: [{ count: 35 }],
              },
            ],
            error: null,
          }),
        }),
        textSearch: () => ({
          limit: async () => ({
            data: [],
            error: null,
          }),
        }),
      }),
    }),
    from: function () {
      return {
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        select: () => ({
          order: () => ({
            range: async () => ({
              data: [
                {
                  id: "1",
                  body: "What is the best way to learn React?",
                  author: "John Doe",
                  created_at: new Date().toISOString(),
                  votes: [{ count: 42 }],
                },
                {
                  id: "2",
                  body: "How do I optimize Next.js performance?",
                  author: "Jane Smith",
                  created_at: new Date().toISOString(),
                  votes: [{ count: 28 }],
                },
                {
                  id: "3",
                  body: "What are the benefits of TypeScript?",
                  author: "Bob Wilson",
                  created_at: new Date().toISOString(),
                  votes: [{ count: 35 }],
                },
              ],
              error: null,
            }),
          }),
          textSearch: () => ({
            limit: async () => ({
              data: [],
              error: null,
            }),
          }),
        }),
      };
    },
  };
  console.warn("[v0] Supabase not configured. Using mock data. Set SUPABASE_URL and SUPABASE_KEY to connect.");
}

export const supabase = supabase;

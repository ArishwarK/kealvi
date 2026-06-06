import { createClient } from "@supabase/supabase-js";

// Server-only client. The service role key is a password to the whole
// database — it lives here, on the server, and never ships to the browser.

const mockData = [
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
];

const mockClient = {
  from: (table: string) => ({
    insert: async () => ({ data: null, error: null }),
    update: async () => ({ data: null, error: null }),
    select: () => ({
      order: (field: string, options: any) => ({
        range: async (start: number, end: number) => ({
          data: mockData.slice(start, end + 1),
          error: null,
        }),
      }),
      textSearch: (field: string, query: string) => ({
        limit: async (count: number) => ({
          data: [],
          error: null,
        }),
      }),
    }),
  }),
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : mockClient;

if (!supabaseUrl || !supabaseKey) {
  console.warn("[v0] Supabase not configured. Using mock data. Set SUPABASE_URL and SUPABASE_KEY to connect.");
}

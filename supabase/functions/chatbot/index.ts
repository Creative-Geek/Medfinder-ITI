import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Define the model requested by the user
const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate Limits and Security
const MAX_HISTORY_MESSAGES = 20; // 10 turns
const MAX_MESSAGE_LENGTH = 1500; // Protection against prompt stuffing
const MAX_PAYLOAD_SIZE = 4 * 1024 * 1024; // 4MB to prevent cost bleeders

function getGeminiApiKeys(): string[] {
    const uniq: string[] = [];
    const push = (k: string | null | undefined) => {
        const key = (k || "").trim();
        if (key && !uniq.includes(key)) uniq.push(key);
    };

    const listRaw = Deno.env.get("GEMINI_API_KEYS");
    if (listRaw) {
        for (const part of listRaw.split(",")) push(part);
    }
    push(Deno.env.get("GEMINI_API_KEY_1"));
    push(Deno.env.get("GEMINI_API_KEY_2"));
    push(Deno.env.get("GEMINI_API_KEY_3"));
    push(Deno.env.get("GEMINI_API_KEY"));

    return uniq;
}

const GEMINI_API_KEYS = getGeminiApiKeys();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function jsonResponse(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            ...extraHeaders,
        },
    });
}

function textResponse(body: string, status = 200) {
    return new Response(body, {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
}

function sanitizeQuery(q: string) {
    return q.replace(/[,%]/g, " ").trim();
}

async function geminiChat(payload: any) {
    if (GEMINI_API_KEYS.length === 0) {
        throw new Error("Missing Gemini API keys in environment.");
    }

    let lastErr: string | null = null;

    for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
        const apiKey = GEMINI_API_KEYS[i];
        try {
            const res = await fetch(GEMINI_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({ ...payload, model: GEMINI_MODEL }),
            });
            const text = await res.text();

            if (res.ok) {
                return JSON.parse(text);
            }

            lastErr = `Gemini API error (${res.status}): ${text}`;

            // Rotate on rate limits or quota issues (429 or cost blockers)
            if (res.status === 429 && i < GEMINI_API_KEYS.length - 1) {
                console.warn(`Gemini rate limited on key #${i + 1}; rotating...`);
                continue;
            }

            throw new Error(lastErr);
        } catch (err: any) {
            lastErr = `Network error calling Gemini: ${err.message}`;
            if (i < GEMINI_API_KEYS.length - 1) continue;
            throw new Error(lastErr);
        }
    }
    throw new Error(lastErr || "Failed to contact Gemini.");
}

// Advanced product search with weighted relevance scoring
async function execSearchProducts(adminClient: any, args: any) {
    const rawQuery = args?.query ? sanitizeQuery(String(args.query)) : "";
    const minPrice = typeof args?.min_price === "number" ? args.min_price : null;
    const maxPrice = typeof args?.max_price === "number" ? args.max_price : null;
    const sort = args?.sort ? String(args.sort) : null;

    if (!rawQuery) {
        return { products: [], error: "Query cannot be empty" };
    }

    const keywords = rawQuery.trim().split(/\s+/).filter(Boolean);
    if (keywords.length === 0) {
        return { products: [], error: "Query cannot be empty" };
    }

    // Fetch all potentially matching products
    let q = adminClient
        .from("products")
        .select("id,name_ar,name_en,price,brand,image_url,type,active_ingredient,description,use_cases,category");

    if (minPrice !== null) q = q.gte("price", minPrice);
    if (maxPrice !== null) q = q.lte("price", maxPrice);

    const { data: allProducts, error } = await q;
    if (error) return { products: [], error: error.message };
    if (!allProducts || allProducts.length === 0) return { products: [] };

    // Calculate relevance score for each product
    const scored = allProducts.map((product: any) => {
        let score = 0;

        for (const keyword of keywords) {
            const lowerKeyword = keyword.toLowerCase();

            // Exact name match: weight 100
            if (product.name_ar?.toLowerCase().includes(lowerKeyword) ||
                product.name_en?.toLowerCase().includes(lowerKeyword)) {
                score += 100;
            }
            // Active ingredient: weight 75
            else if (Array.isArray(product.active_ingredient) &&
                product.active_ingredient.some((ing: string) => ing?.toLowerCase().includes(lowerKeyword))) {
                score += 75;
            }
            // Brand: weight 60
            else if (product.brand?.toLowerCase().includes(lowerKeyword)) {
                score += 60;
            }
            // Use cases (primary indication): weight 50
            else if (Array.isArray(product.use_cases) &&
                product.use_cases.some((u: string) => u?.toLowerCase().includes(lowerKeyword))) {
                score += 50;
            }
            // Type: weight 40
            else if (product.type?.toLowerCase().includes(lowerKeyword)) {
                score += 40;
            }
            // Description: weight 25
            else if (product.description?.toLowerCase().includes(lowerKeyword)) {
                score += 25;
            }
            // Category: weight 20
            else if (Array.isArray(product.category) &&
                product.category.some((c: string) => c?.toLowerCase().includes(lowerKeyword))) {
                score += 20;
            }
        }

        return { ...product, _score: score };
    });

    // Filter products with non-zero score
    const filtered = scored.filter((p: any) => p._score > 0);

    // Sort by relevance score, then by price
    if (sort === "price_asc") {
        filtered.sort((a: any, b: any) => a.price - b.price || b._score - a._score);
    } else if (sort === "price_desc") {
        filtered.sort((a: any, b: any) => b.price - a.price || b._score - a._score);
    } else {
        // Default: sort by relevance score descending, then price ascending
        filtered.sort((a: any, b: any) => b._score - a._score || a.price - b.price);
    }

    // Return top 5
    const result = filtered.slice(0, 5).map((p: any) => {
        const { _score, ...rest } = p;
        return rest;
    });

    return { products: result };
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return textResponse("Method Not Allowed", 405);

    try {
        // Enforce max payload size upfront (Cost Bleeder check)
        const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
        if (contentLength > MAX_PAYLOAD_SIZE) {
            return jsonResponse({ message: "Payload too large. Images must be resized to under 1MB." }, 413);
        }

        const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
        const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

        if (!jwt) return jsonResponse({ message: "Unauthorized", reason: "Missing JWT token", authHeader }, 401);

        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
        if (userErr || !userData?.user) {
            return jsonResponse({ message: "Unauthorized", details: userErr?.message, reason: "getUser failed" }, 401);
        }
        const user = userData.user;

        // Rate Limit check (IP and User)
        const ipAddress = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";
        const { data: rlData, error: rlErr } = await adminClient.rpc("enforce_chat_limits", {
            p_user_id: user.id,
            p_ip_address: ipAddress,
        });

        if (rlErr) {
            console.error("Rate limit check failed:", rlErr);
            return jsonResponse({ message: "Rate limiting error" }, 500);
        }
        if (rlData && rlData.allowed === false) {
            return jsonResponse({ message: rlData.message || "Rate limit exceeded" }, 429);
        }

        const body = await req.json();

        // Malicious prompt / Large input check 
        const messageText = String(body?.message || "").trim();
        if (messageText.length > MAX_MESSAGE_LENGTH) {
            return jsonResponse({ message: "Message is too long. Please condense your query." }, 400);
        }

        const base64Image = body?.image ? String(body.image) : null;
        const sessionId = body?.session_id ? String(body.session_id) : null;
        let history = Array.isArray(body?.history) ? body.history : [];

        // Max Messages Context Protection (Cost Bleeder)
        if (history.length >= MAX_HISTORY_MESSAGES) {
            return jsonResponse({ message: "Max conversation length reached (10 messages). Please delete this session to start a new chat." }, 400);
        }

        let currentSessionId = sessionId;
        if (!currentSessionId) {
            const { data: newSession, error: sessionErr } = await adminClient
                .from("chat_sessions")
                .insert({ user_id: user.id })
                .select("id")
                .single();
            if (sessionErr || !newSession) return jsonResponse({ message: "Failed to create session" }, 500);
            currentSessionId = newSession.id;
        }

        const userContent: any[] = [{ type: "text", text: messageText || "مرفق صورة الروشتة للمراجعة." }];
        if (base64Image) {
            // Strip out the data URL prefix if it exists
            const b64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
            userContent.push({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${b64Data}` }
            });
        }

        await adminClient.from("chat_messages").insert({
            session_id: currentSessionId,
            role: "user",
            content: messageText || "[Image Attached]"
        });

        // Tool Definitions
        const tools = [
            {
                type: "function",
                function: {
                    name: "search_products",
                    description: "Search the product database. Returns a list of candidates for you to evaluate — results are NOT shown to the user yet. You must explicitly call show_products to display anything.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Product name, brand, active ingredient, or symptom in Arabic or English" },
                            min_price: { type: "number" },
                            max_price: { type: "number" },
                        },
                        required: ["query"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "show_products",
                    description: "Display specific products to the user. Only call this when you have confirmed the right products. Pass only the IDs you want shown — nothing else will appear.",
                    parameters: {
                        type: "object",
                        properties: {
                            product_ids: {
                                type: "array",
                                items: { type: "number" },
                                description: "List of product IDs to show the user"
                            }
                        },
                        required: ["product_ids"]
                    }
                }
            }
        ];

        const systemPrompt = `You are a task-oriented search agent for Medfinder, an Egyptian online pharmacy. You have two tools: search_products (internal lookup) and show_products (commits results to the user).

AGENT LOOP:
1. Search using search_products — results are private, the user cannot see them.
2. Evaluate the candidates. Ask: does each result actually match what was requested?
3. If the right product is not in the results, refine and search again with a better query.
4. Once you are confident you have the correct matches, call show_products with ONLY those IDs.
5. Then reply with a short confirmation message.

SEARCH STRATEGY:
- For a named product (e.g. "Signal Toothpaste Cavity Protection"): search by brand + product name. If not found, try the active ingredient or category.
- For a symptom (e.g. "صداع"): search by symptom, then show the top relevant OTC results. Do not show products that only mention the symptom as a side effect.
- For a prescription image: identify each item, then search for each one separately. Do not bundle multiple items into one query.
- If a search returns no good match, try an alternative query before giving up.

STRICT RULES:
1. NEVER call show_products with products that don't match the request — filter out irrelevant candidates even if they appeared in search results.
2. Never write product names, prices, or details in your text reply. The UI renders cards from show_products — trust it.
3. Only refuse and refer to a doctor for serious/urgent symptoms (chest pain, difficulty breathing, high fever in infants) or complex chronic conditions (diabetes, cancer, psychiatric meds).
4. Keep all replies short, friendly, in Egyptian Arabic dialect.

EXAMPLES:
- User: "عندي صداع" → search_products({query:"صداع"}) → evaluate → show_products only the relevant pain relief IDs → reply: "دي أشهر الأدوية للصداع 👇"
- User uploads prescription with Signal Toothpaste + Signal Toothbrush:
  → search_products({query:"Signal toothpaste cavity"}), find id 84, confirm it matches
  → search_products({query:"Signal toothbrush"}), find id 90, confirm it matches
  → show_products({product_ids:[84,90]})
  → reply: "تمام، لقيت المنتجات المطلوبة في الروشتة، تقدر تطلبها من هنا:"
- User: "عندي ألم في الصدر وضيق تنفس" → NO tools, reply: "ده محتاج تشوف دكتور على طول."`;

        // Format history for Gemini
        const formattedHistory = history.map((msg: any) => ({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content
        }));

        let agentMessages: any[] = [
            { role: "system", content: systemPrompt },
            ...formattedHistory,
            { role: "user", content: userContent }
        ];

        // productCache holds all candidates seen during the agentic loop, keyed by id
        const productCache = new Map<number, any>();
        let lastProducts: any[] = [];

        for (let i = 0; i < 8; i++) {
            const completion = await geminiChat({
                messages: agentMessages,
                tools,
                tool_choice: "auto",
                temperature: 0.3
            });

            const assistantMsg = completion?.choices?.[0]?.message;
            if (!assistantMsg) throw new Error("Missing response from Gemini");

            if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
                agentMessages.push(assistantMsg);
                for (const tc of assistantMsg.tool_calls) {
                    const toolName = tc.function?.name;
                    let args: any = {};
                    try { args = JSON.parse(tc.function.arguments || "{}"); } catch (_) { }

                    let toolResult: any;

                    if (toolName === "search_products") {
                        // Internal search — results go to the LLM, not the user
                        toolResult = await execSearchProducts(adminClient, args);
                        if (toolResult.products) {
                            for (const p of toolResult.products) {
                                productCache.set(p.id, p);
                            }
                        }

                    } else if (toolName === "show_products") {
                        // Explicit commit — only these IDs get shown to the user
                        const ids: number[] = Array.isArray(args?.product_ids) ? args.product_ids : [];
                        lastProducts = ids
                            .map((id: number) => productCache.get(id))
                            .filter(Boolean);
                        toolResult = { shown: lastProducts.length };

                    } else {
                        toolResult = { error: "Unknown tool" };
                    }

                    agentMessages.push({ role: "tool", tool_call_id: tc.id, name: toolName, content: JSON.stringify(toolResult) });
                }
                continue;
            }

            // Final text
            const reply = (assistantMsg.content || "").toString().trim() || "تمام، في حاجة تانية أقدر أساعدك بيها؟";

            await adminClient.from("chat_messages").insert({
                session_id: currentSessionId,
                role: "assistant",
                content: reply,
                products_shown: lastProducts.length > 0 ? lastProducts : null
            });

            await adminClient.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", currentSessionId);

            return jsonResponse({
                reply,
                products: lastProducts,
                session_id: currentSessionId
            });
        }

        return jsonResponse({ reply: "واجهت مشكلة في معالجة طلبك، ممكن تحاول توضحه بطريقة تانية؟", session_id: currentSessionId });
    } catch (e: any) {
        console.error("Chatbot error:", e);
        return jsonResponse({ message: "Internal Server Error", details: String(e.message || e) }, 500);
    }
});

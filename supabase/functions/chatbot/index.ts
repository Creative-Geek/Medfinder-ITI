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

// Basic product tools mapping
async function execSearchProducts(adminClient: any, args: any) {
    const rawQuery = args?.query ? sanitizeQuery(String(args.query)) : "";
    const minPrice = typeof args?.min_price === "number" ? args.min_price : null;
    const maxPrice = typeof args?.max_price === "number" ? args.max_price : null;
    const sort = args?.sort ? String(args.sort) : null;

    let q = adminClient
        .from("products")
        .select("id,name_ar,name_en,price,brand,image_url,type,active_ingredient")
        .limit(5);

    if (minPrice !== null) q = q.gte("price", minPrice);
    if (maxPrice !== null) q = q.lte("price", maxPrice);
    if (rawQuery) {
        const keywords = rawQuery.trim().split(/\s+/).filter(Boolean);
        if (keywords.length === 1) {
            const kw = keywords[0];
            q = q.or(`name_ar.ilike.%${kw}%,name_en.ilike.%${kw}%,brand.ilike.%${kw}%,description.ilike.%${kw}%`);
        } else {
            const conditions = keywords.map(kw => `name_ar.ilike.%${kw}%,name_en.ilike.%${kw}%,brand.ilike.%${kw}%`).join(",");
            q = q.or(conditions);
        }
    }

    if (sort === "price_asc") q = q.order("price", { ascending: true });
    else if (sort === "price_desc") q = q.order("price", { ascending: false });

    const { data: products, error } = await q;
    if (error) return { products: [], error: error.message };
    return { products: products || [] };
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
                    description: "ابحث عن الأدوية أو المنتجات في قاعدة البيانات باسمها أو المادة الفعالة أو براند الشركة.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "اسم الدواء أو جزء منه باللغة العربية أو الإنجليزية" },
                            min_price: { type: "number" },
                            max_price: { type: "number" },
                        }
                    }
                }
            }
        ];

        const systemPrompt = `You are a smart search assistant for Medfinder, an Egyptian online pharmacy. Your job is to help users find and order medications available in the store.

CORE BEHAVIOR:
- When a user describes a common symptom or condition (headache, fever, cold, stomach pain, etc.), immediately use search_products to find relevant OTC medications for it. Do NOT lecture them or refuse.
- When a user mentions a drug name, brand, or active ingredient, search for it directly.
- When a user uploads a prescription image, read it and search for each medication listed.
- You are a search tool, not a doctor. You do not diagnose. But you CAN help people find common, well-known OTC remedies without treating that as a medical consultation.

STRICT RULES:
1. Never write drug names, prices, or product details in your text reply. The UI renders product cards automatically from the products array — trust it.
2. Only refuse and recommend a doctor when: the described condition is serious/urgent (chest pain, difficulty breathing, high fever in infants, etc.), OR the user is asking you to prescribe for a complex chronic condition (diabetes management, cancer, psychiatric meds).
3. Keep all replies short, friendly, and in Egyptian Arabic dialect.
4. Never recommend a specific drug by name in your text — just trigger the search tool and let the results speak.

RESPONSE EXAMPLES:
- User: "عندي صداع" → call search_products({query: "صداع"}) then reply: "تمام، دي أشهر الأدوية المتاحة للصداع 👇"
- User: "ابحث عن brufen" → call search_products({query: "brufen"}) then reply: "لقيت الأدوية دي:"
- User: "عندي ألم في الصدر وضيق تنفس" → NO search, reply: "ده محتاج تشوف دكتور على طول، متأخرش."`;

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

        let lastProducts: any[] = [];

        for (let i = 0; i < 4; i++) {
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
                    let args = {};
                    try { args = JSON.parse(tc.function.arguments || "{}"); } catch (_) { }

                    let toolResult: any;
                    if (toolName === "search_products") {
                        toolResult = await execSearchProducts(adminClient, args);
                        if (toolResult.products && toolResult.products.length > 0) {
                            lastProducts = toolResult.products;
                        }
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

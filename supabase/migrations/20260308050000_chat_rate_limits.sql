CREATE TABLE IF NOT EXISTS public.chat_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_type TEXT NOT NULL, -- 'minute' or 'day'
    hits INT NOT NULL DEFAULT 0,
    UNIQUE(identifier, window_start, window_type)
);

-- Index for quick lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_chat_rate_limits_cleanup ON public.chat_rate_limits(window_start);

CREATE OR REPLACE FUNCTION check_chat_rate_limit(
    p_identifier TEXT, 
    p_max_hits INT, 
    p_window_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_current_hits INT;
BEGIN
    -- Determine the window start based on type
    IF p_window_type = 'minute' THEN
        v_window_start := date_trunc('minute', now());
    ELSIF p_window_type = 'day' THEN
        v_window_start := date_trunc('day', now());
    ELSE
        RAISE EXCEPTION 'Invalid window type';
    END IF;

    -- Upsert the counter
    INSERT INTO public.chat_rate_limits (identifier, window_start, window_type, hits)
    VALUES (p_identifier, v_window_start, p_window_type, 1)
    ON CONFLICT (identifier, window_start, window_type)
    DO UPDATE SET hits = chat_rate_limits.hits + 1
    RETURNING hits INTO v_current_hits;

    -- Clean up old records occasionally (e.g. older than 2 days)
    IF random() < 0.01 THEN
        DELETE FROM public.chat_rate_limits WHERE window_start < now() - INTERVAL '2 days';
    END IF;

    -- Check if limit exceeded
    IF v_current_hits > p_max_hits THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION enforce_chat_limits(
    p_user_id UUID,
    p_ip_address TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_minute_ok BOOLEAN;
    v_user_day_ok BOOLEAN;
    v_ip_minute_ok BOOLEAN;
    v_ip_day_ok BOOLEAN;
BEGIN
    -- Check User ID Limits (15/min, 500/day)
    v_user_minute_ok := check_chat_rate_limit('user:' || p_user_id::text, 15, 'minute');
    v_user_day_ok := check_chat_rate_limit('user:' || p_user_id::text, 500, 'day');

    -- Check IP Limits (15/min, 500/day)
    v_ip_minute_ok := check_chat_rate_limit('ip:' || p_ip_address, 15, 'minute');
    v_ip_day_ok := check_chat_rate_limit('ip:' || p_ip_address, 500, 'day');

    IF NOT v_user_minute_ok OR NOT v_ip_minute_ok THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limit_minute', 'message', 'Too many requests this minute. Please slow down.');
    END IF;

    IF NOT v_user_day_ok OR NOT v_ip_day_ok THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limit_day', 'message', 'Daily chat limit reached. Please try again tomorrow.');
    END IF;

    RETURN jsonb_build_object('allowed', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions so the edge function can call this using service role
GRANT EXECUTE ON FUNCTION enforce_chat_limits(UUID, TEXT) TO service_role;

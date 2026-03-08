ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.set_profile_suspension(
  p_user_id uuid,
  p_is_suspended boolean
) RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF COALESCE(v_profile.is_admin, false) THEN
    RAISE EXCEPTION 'Admin accounts cannot be suspended';
  END IF;

  IF auth.uid() = p_user_id THEN
    RAISE EXCEPTION 'You cannot suspend your own account';
  END IF;

  UPDATE public.profiles
  SET is_suspended = p_is_suspended,
      suspended_at = CASE WHEN p_is_suspended THEN now() ELSE NULL END
  WHERE id = p_user_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.set_profile_suspension(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_profile_suspension(uuid, boolean) TO authenticated;
-- Migration 004: Expose active repository visibility through a narrow public RPC

CREATE OR REPLACE FUNCTION public.get_public_active_repositories(target_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  repo_full_name text,
  owner_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    repositories.user_id,
    repositories.repo_full_name,
    repositories.owner_avatar_url
  FROM public.repositories AS repositories
  WHERE repositories.is_active = true
    AND repositories.user_id = ANY(COALESCE(target_user_ids, ARRAY[]::uuid[]));
$$;

REVOKE ALL ON FUNCTION public.get_public_active_repositories(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_active_repositories(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_active_repositories(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_active_repositories(uuid[]) TO service_role;

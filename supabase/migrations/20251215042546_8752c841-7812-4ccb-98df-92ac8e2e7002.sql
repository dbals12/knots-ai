-- Drop the overly permissive policies that allow cross-user access
DROP POLICY IF EXISTS "Authenticated users can insert edits" ON public.edits;
DROP POLICY IF EXISTS "Authenticated users can select edits" ON public.edits;

-- The existing "Users can full access their own edits" policy already properly restricts access
-- through the outputs->sessions->user_id chain, so we keep that one.
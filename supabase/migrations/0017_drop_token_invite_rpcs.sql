-- accept_invite/get_invite_preview backed the token-link invite flow, which
-- 0016_email_invites.sql replaced with an email-addressed one
-- (create_invite/respond_to_invite/list_my_pending_invites). Nothing in the
-- app calls these anymore — drop them rather than leave unused RPC surface
-- area exposed.
drop function public.accept_invite(text);
drop function public.get_invite_preview(text);

-- Every role holds everything granted to PUBLIC on top of its own grants, so riff_app would otherwise
-- inherit Supabase's PUBLIC defaults. These are the revokes Supabase documents for custom roles
-- (supabase.com/docs/guides/troubleshooting/custom-role-inherits-privileges-that-were-not-explicitly-granted-ddaa1c).
-- CONNECT on the database is deliberately kept: revoking it breaks the Data API, Auth and Storage (same page).
revoke usage on schema public from public;
revoke temporary on database postgres from public;
alter default privileges for role postgres revoke execute on functions from public;

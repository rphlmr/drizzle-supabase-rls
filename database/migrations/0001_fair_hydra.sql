-- Custom SQL migration file, put you code below! --
CREATE OR REPLACE FUNCTION insert_user() RETURNS TRIGGER AS
$$
  BEGIN
    INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email); RETURN NEW;
  END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

CREATE OR REPLACE TRIGGER "on_new_auth_create_profile"
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION insert_user();

GRANT EXECUTE ON FUNCTION insert_user () TO supabase_auth_admin;
GRANT INSERT ON TABLE public.profiles TO supabase_auth_admin;
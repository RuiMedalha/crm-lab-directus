-- Atribuir role admin ao utilizador principal
INSERT INTO public.user_roles (user_id, role)
VALUES ('9eea0747-a44f-4ca3-b74b-f6d8d5f04048', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
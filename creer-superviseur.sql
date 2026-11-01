-- À exécuter APRÈS avoir créé l'utilisateur superviseur@courrier.local dans Authentication > Users
insert into public.courrier_profiles (id, login, nom, role, structure_id, ok)
select id, 'superviseur', 'Superviseur', 'superviseur', null, false
from auth.users where email = 'superviseur@courrier.local'
on conflict (id) do nothing;

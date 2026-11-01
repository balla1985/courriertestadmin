/* Mode cloud : Supabase Auth + base partagée par structure (version avec contrôle de conflit) */
const CFG=window.APP_CONFIG,sb=supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey),mail=l=>l.toLowerCase()+'@courrier.local',VER={};
let PROF=null,pushT=null,RT=null;
const sec=()=>supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const blank=()=>({dir:'Gestion du courrier administratif',divs:[],secs:[],users:[],arr:[],dep:[],n:0,ex:[]});
const okId=l=>/^[a-z0-9._-]+$/i.test(l);
D=blank();DB={sup:[],sts:[D],cur:0};
const load=r=>{VER[r.id]=r.version;const d={...r.data,id:r.id,dir:r.nom};norm(d);return d};
window.save=()=>{clearTimeout(pushT);pushT=setTimeout(()=>push(1),300)};
async function push(retry){if(!PROF||!D.id)return;const id=D.id,r=await sb.from('courrier_structures').update({nom:D.dir,data:D,version:VER[id]+1,updated_at:new Date().toISOString()}).eq('id',id).eq('version',VER[id]).select('version');
if(r.error)return toast('Erreur de synchronisation : '+r.error.message);if(r.data.length){VER[id]=r.data[0].version;return}
const g=await sb.from('courrier_structures').select('*').eq('id',id).single();if(g.error)return;VER[id]=g.data.version;mergeData(g.data.data);if(retry)push(0);else toast('Conflit de synchronisation : rechargez la page.')}
function listen(){if(RT)return;RT=sb.channel('structs').on('postgres_changes',{event:'UPDATE',schema:'public',table:'courrier_structures'},p=>{if(!PROF)return;const r=p.new,t=DB.sts.find(s=>s.id==r.id);if(!t||r.version<=(VER[r.id]||0))return;const d=load(r);Object.keys(t).forEach(k=>delete t[k]);Object.assign(t,d);if(PROF.role!='superviseur')me=t.users.find(u=>u.login==PROF.login)||me;const a=document.activeElement;if(me&&!document.querySelector('.modal')&&!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)))render()}).subscribe()}
async function afterAuth(){const u=(await sb.auth.getUser()).data.user;if(!u)return false;const{data:pf}=await sb.from('courrier_profiles').select('*').eq('id',u.id).single();if(!pf){await sb.auth.signOut();return false}
if(pf.role=='superviseur'){const{data}=await sb.from('courrier_structures').select('*').order('id');DB.sts=(data||[]).map(load);if(!DB.sts.length)DB.sts=[blank()];D=DB.sts[0];DB.cur=D.id||0;PROF=pf;me=DB.sup[0]={id:'sup',login:pf.login,nom:pf.nom||'Superviseur',role:'superviseur',actif:1,ok:pf.ok}}
else{const{data}=await sb.from('courrier_structures').select('*').eq('id',pf.structure_id).single();if(!data)return false;D=load(data);DB.sts=[D];DB.cur=D.id;const m=D.users.find(x=>x.login==pf.login);if(!m||!m.actif){await sb.auth.signOut();return false}PROF=pf;me=m;me.ok=pf.ok}
listen();return true}
const _render=render;window.render=function(){if(!me&&PROF){PROF=null;sb.auth.signOut();D=blank();DB={sup:[],sts:[D],cur:0}}_render()};
window.login=async function(){const l=$('lg').value.trim(),{error}=await sb.auth.signInWithPassword({email:mail(l),password:$('pw').value});if(error||!await afterAuth())return $('er').textContent='Identifiants invalides ou compte désactivé.';applyTheme(me);view='dash';land=0;render();if(!me.ok)pwModal(1)};
window.savePw=async function(){const n=$('p_n').value,er=m=>$('p_e').textContent=m;const e1=(await sb.auth.signInWithPassword({email:mail(PROF.login),password:$('p_o').value})).error;if(e1)return er('Mot de passe actuel incorrect.');if(n.length<6)return er('Au moins 6 caractères.');if(n!=$('p_c').value)return er('La confirmation ne correspond pas.');if(n==$('p_o').value)return er('Choisissez un mot de passe différent.');const e2=(await sb.auth.updateUser({password:n})).error;if(e2)return er(e2.message);await sb.from('courrier_profiles').update({ok:true}).eq('id',PROF.id);me.ok=1;save();$('md').innerHTML='';alert('Mot de passe modifié.')};
window.addUser=async function(){const n=$('u_n').value.trim(),l=$('u_l').value.trim(),p=$('u_p').value,r=$('u_r').value;if(!n||!okId(l)||p.length<6||D.users.some(u=>u.login.toLowerCase()==l.toLowerCase()))return alert('Champs invalides : identifiant sans espace (lettres, chiffres . _ -), unique, mot de passe de 6 caractères minimum.');
const su=await sec().auth.signUp({email:mail(l),password:p});if(su.error||!su.data.user)return alert('Création impossible : '+(su.error?.message||'inconnue'));
const pr=await sb.from('courrier_profiles').insert({id:su.data.user.id,login:l,nom:n,role:r,structure_id:D.id,ok:false});if(pr.error)return alert('Profil non créé : '+pr.error.message);
D.users.push({id:Date.now(),login:l,nom:n,role:r,div:+$('u_d').value,sec:+$('u_s').value,h:'',actif:1,ok:0});save();render()};
const _su=saveUser;window.saveUser=async function(id){const u=U(id);if($('e_p').value)return alert('Version cloud : l’agent change lui-même son mot de passe (bouton 🔑). Pour le réinitialiser : Supabase > Authentication > Users.');if($('e_l').value.trim()!=u.login)return alert('L’identifiant ne peut pas être modifié en version cloud.');await _su(id);sb.from('courrier_profiles').update({nom:u.nom,role:u.role}).eq('login',u.login)};
window.addSt=async function(){const n=$('n_s').value.trim(),an=$('n_an').value.trim(),l=$('n_al').value.trim(),p=$('n_ap').value;if(!n||!an||!okId(l)||p.length<6)return alert('Champs invalides (identifiant sans espace, mot de passe de 6 caractères minimum).');
const d={...blank(),dir:n,users:[{id:Date.now(),login:l,nom:an,role:'admin',div:0,sec:0,h:'',actif:1,ok:0}],ex:[{an:new Date().getFullYear(),ouvert:1}]};
const ins=await sb.from('courrier_structures').insert({nom:n,data:d}).select().single();if(ins.error)return alert('Erreur : '+ins.error.message);
const su=await sec().auth.signUp({email:mail(l),password:p});if(su.error||!su.data.user)return alert('Compte administrateur non créé : '+(su.error?.message||'inconnue'));
const pr=await sb.from('courrier_profiles').insert({id:su.data.user.id,login:l,nom:an,role:'admin',structure_id:ins.data.id,ok:false});if(pr.error)return alert('Profil non créé : '+pr.error.message);
if(DB.sts.length==1&&!DB.sts[0].id)DB.sts=[];const t=load(ins.data);DB.sts.push(t);swSt(t.id);alert('Structure créée.')};
(async()=>{const{data}=await sb.auth.getSession();if(data.session&&await afterAuth()){land=0;view='dash';render();if(!me.ok)pwModal(1)}else render()})();

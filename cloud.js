/* Mode cloud : Supabase Auth + base partagée par structure (version avec contrôle de conflit) */
const CFG=window.APP_CONFIG,sb=supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey),mail=l=>l.toLowerCase()+'@courrier.local',VER={};
let PROF=null,pushT=null,RT=null;
const blank=()=>({dir:'Gestion du courrier administratif',divs:[],secs:[],users:[],arr:[],dep:[],n:0,ex:[]});
const okId=l=>/^[a-z0-9._-]+$/i.test(l);
D=blank();DB={sup:[],sts:[D],cur:0};
const load=r=>{VER[r.id]=r.version;const d={...r.data,id:r.id,dir:r.nom};norm(d);return d};
window.save=()=>{clearTimeout(pushT);pushT=setTimeout(()=>push(1),300)};
async function push(retry){if(!PROF||!D.id)return;const id=D.id,r=await sb.from('courrier_structures').update({nom:D.dir,data:D,version:VER[id]+1,updated_at:new Date().toISOString()}).eq('id',id).eq('version',VER[id]).select('version');
if(r.error)return toast('Erreur de synchronisation : '+r.error.message);if(r.data.length){VER[id]=r.data[0].version;return}
const g=await sb.from('courrier_structures').select('*').eq('id',id).single();if(g.error)return;VER[id]=g.data.version;mergeData(g.data.data);if(retry)push(0);else toast('Conflit de synchronisation : rechargez la page.')}
function listen(){if(RT)return;RT=sb.channel('structs').on('postgres_changes',{event:'UPDATE',schema:'public',table:'courrier_structures'},p=>{if(!PROF)return;const r=p.new,t=DB.sts.find(s=>s.id==r.id);if(!t||r.version<=(VER[r.id]||0))return;const d=load(r);Object.keys(t).forEach(k=>delete t[k]);Object.assign(t,d);if(PROF.role!='superviseur')me=t.users.find(u=>u.login==PROF.login)||me;const a=document.activeElement;if(me&&!document.querySelector('.modal')&&!(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)))render();announce()}).subscribe()}
async function afterAuth(){const u=(await sb.auth.getUser()).data.user;if(!u)return false;const{data:pf}=await sb.from('courrier_profiles').select('*').eq('id',u.id).single();if(!pf){await sb.auth.signOut();return false}
if(pf.role=='superviseur'){const{data}=await sb.from('courrier_structures').select('*').order('id');DB.sts=(data||[]).map(load);if(!DB.sts.length)DB.sts=[blank()];D=DB.sts[0];DB.cur=D.id||0;PROF=pf;me=DB.sup[0]={id:'sup',login:pf.login,nom:pf.nom||'Superviseur',role:'superviseur',actif:1,ok:pf.ok}}
else{const{data}=await sb.from('courrier_structures').select('*').eq('id',pf.structure_id).single();if(!data)return false;D=load(data);DB.sts=[D];DB.cur=D.id;const m=D.users.find(x=>x.login==pf.login);if(!m||!m.actif){await sb.auth.signOut();return false}PROF=pf;me=m;me.ok=pf.ok}
listen();return true}
const _render=render;window.render=function(){if(!me&&PROF){PROF=null;sb.auth.signOut();D=blank();DB={sup:[],sts:[D],cur:0}}_render()};
window.login=async function(){const l=$('lg').value.trim(),{error}=await sb.auth.signInWithPassword({email:mail(l),password:$('pw').value});if(error||!await afterAuth())return $('er').textContent='Identifiants invalides ou compte désactivé.';applyTheme(me);view='dash';land=0;render();if(!me.ok)pwModal(1)};
window.savePw=async function(){const n=$('p_n').value,er=m=>$('p_e').textContent=m;const e1=(await sb.auth.signInWithPassword({email:mail(PROF.login),password:$('p_o').value})).error;if(e1)return er('Mot de passe actuel incorrect.');if(n.length<6)return er('Au moins 6 caractères.');if(n!=$('p_c').value)return er('La confirmation ne correspond pas.');if(n==$('p_o').value)return er('Choisissez un mot de passe différent.');const e2=(await sb.auth.updateUser({password:n})).error;if(e2)return er(e2.message);await sb.from('courrier_profiles').update({ok:true}).eq('id',PROF.id);me.ok=1;save();$('md').innerHTML='';alert('Mot de passe modifié.')};
async function fn(body){const{data,error}=await sb.functions.invoke('courrier-admin',{body});if(error){let m=error.message;try{m=(await error.context.json()).error||m}catch(e){}return{error:m}}return data||{}}
window.addUser=async function(){const n=$('u_n').value.trim(),l=$('u_l').value.trim(),p=$('u_p').value,r=$('u_r').value;if(!n||!okId(l)||p.length<6||D.users.some(u=>u.login.toLowerCase()==l.toLowerCase()))return alert('Champs invalides : identifiant sans espace (lettres, chiffres . _ -), unique, mot de passe de 6 caractères minimum.');
const x=await fn({action:'create_user',login:l,nom:n,role:r,password:p,structure_id:D.id});if(x.error)return alert('Création impossible : '+x.error);
D.users.push({id:Date.now(),login:l,nom:n,role:r,div:+$('u_d').value,sec:+$('u_s').value,h:'',actif:1,ok:0});save();render();alert('Agent créé.')};
const _su=saveUser;window.saveUser=async function(id){const u=U(id),p=$('e_p').value;if($('e_l').value.trim()!=u.login)return alert('L’identifiant ne peut pas être modifié en version cloud.');
if(p){if(p.length<6)return alert('Mot de passe de 6 caractères minimum.');const x=await fn({action:'reset_password',login:u.login,password:p});if(x.error)return alert('Réinitialisation impossible : '+x.error);$('e_p').value='';alert('Mot de passe réinitialisé : l’agent devra le changer à sa prochaine connexion.')}
await _su(id);await sb.from('courrier_profiles').update({nom:u.nom,role:u.role}).eq('login',u.login)};
window.addSt=async function(){const n=$('n_s').value.trim(),an=$('n_an').value.trim(),l=$('n_al').value.trim(),p=$('n_ap').value;if(!n||!an||!okId(l)||p.length<6)return alert('Champs invalides (identifiant sans espace, mot de passe de 6 caractères minimum).');
if(DB.sts.some(s=>(s.dir||'').toLowerCase()==n.toLowerCase()))return alert('Une structure porte déjà ce nom.');
const d={...blank(),dir:n,users:[{id:Date.now(),login:l,nom:an,role:'admin',div:0,sec:0,h:'',actif:1,ok:0}],ex:[{an:new Date().getFullYear(),ouvert:1}]};
const x=await fn({action:'create_structure',nom:n,data:d,admin:{login:l,nom:an,password:p}});if(x.error)return alert('Création impossible : '+x.error);
if(DB.sts.length==1&&!DB.sts[0].id)DB.sts=[];const t=load(x.structure);DB.sts.push(t);swSt(t.id);alert('Structure créée. Vous travaillez maintenant dans son espace.')};
window.stUpdate=async function(id,o){const x=await fn({action:'update_structure',structure_id:id,nom:o.dir,admin:{old_login:o.oldLogin,login:o.login,nom:o.nom,password:o.pw||undefined}});if(x.error)return alert('Modification impossible : '+x.error);const t=DB.sts.find(s=>s.id==id),d=load(x.structure);Object.keys(t).forEach(k=>delete t[k]);Object.assign(t,d);render();alert('Structure modifiée.')};
window.stDelete=async function(id){const x=await fn({action:'delete_structure',structure_id:id});if(x.error)return alert('Suppression impossible : '+x.error);DB.sts=DB.sts.filter(s=>s.id!=id);if(!DB.sts.length)DB.sts=[blank()];if(D.id==id){D=DB.sts[0];DB.cur=D.id||0}view='sts';render();alert('Structure supprimée.')};
async function loadSlides(){try{const{data}=await sb.from('courrier_slides').select('*').order('ordre');SLD=data||[]}catch(e){SLD=[]}}
window.slPersist=async function(list){const keep=list.map(s=>s.id),gone=(SLD||[]).map(s=>s.id).filter(id=>!keep.includes(id));
if(gone.length){const e=await sb.from('courrier_slides').delete().in('id',gone);if(e.error)return alert('Erreur : '+e.error.message)}
if(list.length){const e=await sb.from('courrier_slides').upsert(list.map((s,i)=>({id:s.id,titre:s.titre,texte:s.texte||'',image:s.image||'',ordre:i})));if(e.error)return alert('Erreur : '+e.error.message)}SLD=list};
SLD=[];
(async()=>{await loadSlides();const{data}=await sb.auth.getSession();if(data.session&&await afterAuth()){land=0;view='dash';render();if(!me.ok)pwModal(1)}else render()})();

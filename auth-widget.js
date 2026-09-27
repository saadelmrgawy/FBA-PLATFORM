/* =========================================================
   FBA FUTUR BY AI — AUTH WIDGET
   يشتغل في كل صفحات الموقع. مسؤول عن:
   - قراءة جلسة الدخول (fba_session) من localStorage / sessionStorage
   - التأكد من حالة الحساب "الحيّة" من قاعدة بيانات المستخدمين (IndexedDB)
     نفس القاعدة التي تستخدمها login.html و admin-dashboard.html
   - لو الحساب "approved" (مفعّل من الأدمن): تحويل زرار "تسجيل الدخول"
     في النافبار لأيقونة مستخدم (بوب أب فيه لوحة التحكم/الإعدادات/خروج)
     وتحويل زرار الانضمام في الهيرو لرسالة ترحيب.
   - لو الحساب لسه pending أو frozen أو banned أو rejected: تجاهل الجلسة
     تماماً ومعاملة الزائر كأنه مش مسجل دخول (الزرارات الافتراضية تفضل زي ما هي).
   ========================================================= */
(function(){
  'use strict';

  /* ---------- إعدادات قاعدة البيانات (نفس login.html) ---------- */
  var DB_NAME = 'FBA_FuturByAi_DB';
  var DB_VERSION = 1;
  var STORE_USERS = 'users';

  function openDB(){
    return new Promise(function(resolve, reject){
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(e){
        var db = e.target.result;
        if(!db.objectStoreNames.contains(STORE_USERS)){
          var store = db.createObjectStore(STORE_USERS, {keyPath:'id'});
          store.createIndex('nationalId','nationalId',{unique:false});
          store.createIndex('email','email',{unique:false});
        }
      };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  }

  function dbGetUserById(id){
    if(!id) return Promise.resolve(null);
    return openDB().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(STORE_USERS,'readonly');
        var req = tx.objectStore(STORE_USERS).get(id);
        req.onsuccess = function(){ resolve(req.result || null); };
        req.onerror = function(){ reject(req.error); };
      });
    }).catch(function(){ return null; });
  }

  /* ---------- خرائط الداشبورد (نفس login.html) ---------- */
  var DASH_URLS = {
    'supervisor':'./dashboard-supervisor.html',
    'coordinator':'./dashboard-coordinator.html',
    'director':'./dashboard-director.html',
    'deputy-director':'./dashboard-deputy-director.html',
    'executive':'./dashboard-executive.html',
    'unit-head':'./dashboard-unit-head.html',
    'deputy-unit-head':'./dashboard-deputy-unit-head.html',
    'manager':'./dashboard-manager.html',
    'leader':'./dashboard-leader.html',
    'member':'./dashboard-member.html',
    'trainee':'./dashboard-trainee.html',
    'admin-dashboard':'./admin-dashboard.html'
  };
  function getDashUrl(key){ return DASH_URLS[key] || './dashboard-member.html'; }

  /* ---------- الجلسة ---------- */
  function getSession(){
    try{
      var s = localStorage.getItem('fba_session');
      if(s) return JSON.parse(s);
      s = sessionStorage.getItem('fba_session');
      if(s) return JSON.parse(s);
    }catch(e){}
    return null;
  }
  function clearSession(){
    try{ localStorage.removeItem('fba_session'); }catch(e){}
    try{ sessionStorage.removeItem('fba_session'); }catch(e){}
  }
  function logout(){
    clearSession();
    window.location.href = './index.html';
  }

  function escapeHTML(str){
    if(str == null) return '';
    return String(str).replace(/[&<>"']/g, function(s){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s];
    });
  }
  function getInitials(name){
    if(!name) return 'FBA';
    var parts = String(name).trim().split(/\s+/).filter(Boolean);
    if(parts.length === 1) return parts[0].slice(0,2);
    return (parts[0][0]||'') + (parts[1][0]||'');
  }
  function firstName(name){
    if(!name) return 'صديقنا';
    return String(name).trim().split(/\s+/)[0];
  }

  /* ---------- الستايل (يُحقن مرة واحدة فقط) ---------- */
  function injectStyles(){
    if(document.getElementById('fbaAuthStyles')) return;
    var style = document.createElement('style');
    style.id = 'fbaAuthStyles';
    style.textContent =
      '.fba-user-wrap{position:relative;display:inline-flex;z-index:501;}'+
      '.fba-user-btn{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#00d9ff,#8b5cf6 55%,#ec4899);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.92rem;font-family:"Cairo",sans-serif;border:2px solid rgba(255,255,255,.35);cursor:pointer;box-shadow:0 8px 22px rgba(139,92,246,.45);transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .3s ease;}'+
      '.fba-user-btn:hover{transform:translateY(-3px) scale(1.06);box-shadow:0 14px 30px rgba(236,72,153,.55);}'+
      '.fba-user-dropdown{position:absolute;top:calc(100% + 14px);left:0;min-width:250px;background:linear-gradient(180deg,rgba(10,14,39,.98),rgba(15,23,42,.98));border:1px solid rgba(0,217,255,.3);border-radius:16px;padding:10px;backdrop-filter:blur(20px);box-shadow:0 20px 50px rgba(0,0,0,.55);opacity:0;visibility:hidden;transform:translateY(-8px);transition:all .25s cubic-bezier(.34,1.56,.64,1);font-family:"Cairo",sans-serif;}'+
      '.fba-user-wrap.open .fba-user-dropdown{opacity:1;visibility:visible;transform:translateY(0);}'+
      '.fba-user-head{display:flex;align-items:center;gap:10px;padding:8px 8px 14px;border-bottom:1px solid rgba(0,217,255,.15);margin-bottom:8px;}'+
      '.fba-user-head .fba-avatar-sm{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#00d9ff,#8b5cf6 55%,#ec4899);display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:.82rem;flex-shrink:0;}'+
      '.fba-user-head .fba-info h4{font-size:.85rem;color:#f1f5f9;margin:0 0 2px;font-weight:800;}'+
      '.fba-user-head .fba-info p{font-size:.7rem;color:#94a3b8;margin:0;}'+
      '.fba-menu-item{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;color:#e2e8f0;font-size:.82rem;font-weight:700;cursor:pointer;transition:background .2s ease,color .2s ease;text-align:right;width:100%;}'+
      '.fba-menu-item i{width:18px;text-align:center;color:#00d9ff;font-size:.85rem;}'+
      '.fba-menu-item:hover{background:rgba(0,217,255,.1);color:#fff;}'+
      '.fba-menu-item.danger i{color:#ef4444;}'+
      '.fba-menu-item.danger:hover{background:rgba(239,68,68,.12);color:#fca5a5;}'+
      '.fba-menu-sep{height:1px;background:rgba(148,163,184,.15);margin:6px 4px;}'+
      '.fba-welcome-pill{display:inline-flex;align-items:center;gap:10px;padding:0 22px 0 8px;height:52px;border-radius:100px;background:rgba(0,217,255,.08);border:1px solid rgba(0,217,255,.4);color:#f1f5f9;font-weight:800;font-size:.9rem;box-shadow:0 8px 22px rgba(0,217,255,.15);}'+
      '.fba-welcome-pill i{color:#fbbf24;font-size:1.05rem;}'+
      '.fba-welcome-pill .fba-name{color:#7dd3fc;}'+
      '.fba-user-btn img,.fba-avatar-sm img,.fba-pill-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;}'+
      '.fba-pill-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#00d9ff,#8b5cf6 55%,#ec4899);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.78rem;flex-shrink:0;overflow:hidden;}'+
      '@media (max-width:480px){.fba-user-dropdown{left:auto;right:0;min-width:230px;}.fba-welcome-pill{font-size:.8rem;padding:0 16px 0 6px;height:46px;}}';
    document.head.appendChild(style);
  }

  /* ---------- محتوى الأفاتار: صورة حقيقية لو موجودة، وإلا حروف الاسم ---------- */
  function avatarInner(initials, photoUrl){
    if(photoUrl){
      return '<img src="'+photoUrl+'" alt="الصورة الشخصية">';
    }
    return escapeHTML(initials);
  }

  /* ---------- بناء بوب أب المستخدم في النافبار ---------- */
  function renderNav(session, dashUrl, photoUrl){
    var loginBtn = document.querySelector('.nav-actions .nav-login-btn');
    if(!loginBtn) return;

    var initials = getInitials(session.name);
    var settingsUrl = dashUrl + '#settings';

    var wrap = document.createElement('div');
    wrap.className = 'fba-user-wrap';
    wrap.innerHTML =
      '<button type="button" class="fba-user-btn" aria-haspopup="true" aria-label="حسابي">'+avatarInner(initials, photoUrl)+'</button>'+
      '<div class="fba-user-dropdown">'+
        '<div class="fba-user-head">'+
          '<div class="fba-avatar-sm">'+avatarInner(initials, photoUrl)+'</div>'+
          '<div class="fba-info">'+
            '<h4>'+escapeHTML(session.name || 'عضو')+'</h4>'+
            '<p>'+escapeHTML(session.roleTitle || session.levelTitle || '')+'</p>'+
          '</div>'+
        '</div>'+
        '<a class="fba-menu-item" href="'+dashUrl+'"><i class="fas fa-gauge-high"></i><span>لوحة التحكم</span></a>'+
        '<a class="fba-menu-item" href="'+settingsUrl+'"><i class="fas fa-gear"></i><span>الإعدادات</span></a>'+
        '<div class="fba-menu-sep"></div>'+
        '<button type="button" class="fba-menu-item danger" id="fbaLogoutBtn"><i class="fas fa-right-from-bracket"></i><span>تسجيل الخروج</span></button>'+
      '</div>';

    loginBtn.replaceWith(wrap);

    var toggleBtn = wrap.querySelector('.fba-user-btn');
    toggleBtn.addEventListener('click', function(e){
      e.stopPropagation();
      wrap.classList.toggle('open');
    });
    document.addEventListener('click', function(e){
      if(!wrap.contains(e.target)) wrap.classList.remove('open');
    });
    var logoutBtn = wrap.querySelector('#fbaLogoutBtn');
    if(logoutBtn) logoutBtn.addEventListener('click', logout);
  }

  /* ---------- تحويل زرار الهيرو من "انضم" إلى ترحيب ---------- */
  function renderHero(session, dashUrl, photoUrl){
    var heroCta = document.querySelector(
      '.hero-buttons a[href="./register.html"], .page-hero-actions a[href="./register.html"]'
    );
    if(!heroCta) return;

    var initials = getInitials(session.name);
    var pill = document.createElement('a');
    pill.className = 'fba-welcome-pill';
    pill.href = dashUrl;
    pill.innerHTML =
      '<span class="fba-pill-avatar">'+avatarInner(initials, photoUrl)+'</span>'+
      '<span>أهلاً بعودتك، <span class="fba-name">'+escapeHTML(firstName(session.name))+'</span> 👋</span>';
    heroCta.replaceWith(pill);
  }

  /* ---------- التشغيل ---------- */
  async function init(){
    var session = getSession();
    if(!session) return; // زائر عادي، سيب الشكل الافتراضي زي ما هو

    var dashUrl;
    var photoUrl = null;

    if(session.isAdmin){
      dashUrl = './admin-dashboard.html';
    } else {
      var liveUser = null;
      try{ liveUser = await dbGetUserById(session.id); }catch(e){ liveUser = null; }

      // لو الحساب مش موجود أو حالته مش "approved" (pending/frozen/banned/rejected)
      // => نعامله كأنه مش مسجل دخول أصلاً ونمسح الجلسة القديمة
      if(!liveUser || liveUser.status !== 'approved'){
        clearSession();
        return;
      }

      dashUrl = getDashUrl(liveUser.dashboard || session.dashboard);
      // تحديث بيانات العرض من أحدث نسخة في قاعدة البيانات
      session.name = liveUser.fullNameAr || session.name;
      session.roleTitle = liveUser.positionTitle || session.roleTitle;
      session.levelTitle = liveUser.levelTitle || session.levelTitle;
      if(liveUser.personalPhoto && liveUser.personalPhoto.dataUrl){
        photoUrl = liveUser.personalPhoto.dataUrl;
      }
    }

    // لو المستخدم مسجل دخول فعلاً وفتح صفحة تسجيل الدخول تاني، يتوجه على طول لداشبورده
    if(/login\.html/i.test(location.pathname)){
      window.location.replace(dashUrl);
      return;
    }

    injectStyles();
    renderNav(session, dashUrl, photoUrl);
    renderHero(session, dashUrl, photoUrl);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

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
  var DB_VERSION = 2;
  var STORE_USERS = 'users';
  var STORE_META = 'meta';

  function openDB(){
    return new Promise(function(resolve, reject){
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      var migratedKeys = [];
      req.onupgradeneeded = function(e){
        var db = e.target.result;
        if(!db.objectStoreNames.contains(STORE_USERS)){
          var store = db.createObjectStore(STORE_USERS, {keyPath:'id'});
          store.createIndex('nationalId','nationalId',{unique:false});
          store.createIndex('email','email',{unique:false});
        }
        if(!db.objectStoreNames.contains(STORE_META)){
          db.createObjectStore(STORE_META, {keyPath:'key'});
        }
        // ترحيل لمرة واحدة من localStorage إلى IndexedDB
        try{
          var metaStore = e.target.transaction.objectStore(STORE_META);
          [['fba_admin_profile',true],['fba_admin_password',false],['fba_admin_activity',true]].forEach(function(pair){
            var raw = localStorage.getItem(pair[0]);
            if(raw !== null){
              var val = raw;
              if(pair[1]){ try{ val = JSON.parse(raw); }catch(_){ return; } }
              metaStore.put({key:pair[0], value:val});
              migratedKeys.push(pair[0]);
            }
          });
        }catch(_){}
      };
      req.onsuccess = function(){
        migratedKeys.forEach(function(k){ try{ localStorage.removeItem(k); }catch(_){} });
        resolve(req.result);
      };
      req.onerror = function(){ reject(req.error); };
    });
  }

  function dbMetaGet(key, fallback){
    return openDB().then(function(db){
      return new Promise(function(resolve){
        var r = db.transaction(STORE_META,'readonly').objectStore(STORE_META).get(key);
        r.onsuccess = function(){ resolve(r.result ? r.result.value : fallback); };
        r.onerror = function(){ resolve(fallback); };
      });
    }).catch(function(){ return fallback; });
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

  /* ---------- الستايل (يُحقن مرة واحدة فقط) ----------
     الزرار في النافبار والزرار في الهيرو بيستخدموا نفس كلاسات الصفحة الأصلية
     (nav-icon-btn / btn-primary ...) فبياخدوا نفس الحجم والشكل والـ responsive
     تلقائي. هنا بس بنضيف تفاصيل الأفاتار والبوب أب، بألوان من متغيرات التصميم. */
  function injectStyles(){
    if(document.getElementById('fbaAuthStyles')) return;
    var style = document.createElement('style');
    style.id = 'fbaAuthStyles';
    style.textContent =
      '.fba-user-wrap{position:relative;display:inline-flex;z-index:501;}'+
      /* زرار الأفاتار: نفس مقاس وشكل .nav-icon-btn في كل صفحة */
      '.nav-icon-btn.fba-user-btn{padding:0;overflow:hidden;background:var(--gradient-main,linear-gradient(135deg,#00d9ff,#8b5cf6 50%,#ec4899));border:1px solid rgba(255,255,255,.28);font-family:inherit;font-weight:900;font-size:.95rem;letter-spacing:0;}'+
      '.nav-icon-btn.fba-user-btn:hover{transform:translateY(-3px);box-shadow:0 12px 26px rgba(139,92,246,.5);}'+
      '.fba-user-btn img,.fba-avatar-sm img,.fba-chip-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit;}'+
      /* البوب أب */
      '.fba-user-dropdown{position:absolute;top:calc(100% + 12px);left:0;min-width:250px;background:linear-gradient(180deg,rgba(10,14,39,.98),rgba(15,23,42,.98));border:1px solid rgba(0,217,255,.3);border-radius:16px;padding:10px;-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);box-shadow:0 20px 50px rgba(0,0,0,.55);opacity:0;visibility:hidden;transform:translateY(-8px);transition:all .25s cubic-bezier(.34,1.56,.64,1);font-family:inherit;direction:rtl;}'+
      '.fba-user-wrap.open .fba-user-dropdown{opacity:1;visibility:visible;transform:translateY(0);}'+
      '.fba-user-head{display:flex;align-items:center;gap:10px;padding:8px 8px 14px;border-bottom:1px solid rgba(0,217,255,.15);margin-bottom:8px;}'+
      '.fba-avatar-sm{position:relative;width:42px;height:42px;border-radius:12px;overflow:hidden;background:var(--gradient-main,linear-gradient(135deg,#00d9ff,#8b5cf6 50%,#ec4899));display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:.82rem;flex-shrink:0;}'+
      '.fba-info{min-width:0;}'+
      '.fba-info h4{font-size:.85rem;color:#f1f5f9;margin:0 0 2px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'+
      '.fba-info p{font-size:.7rem;color:#94a3b8;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'+
      '.fba-menu-item{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;color:#e2e8f0;font-size:.82rem;font-weight:700;cursor:pointer;transition:background .2s ease,color .2s ease;text-align:right;width:100%;background:transparent;border:none;font-family:inherit;}'+
      '.fba-menu-item i{width:18px;text-align:center;color:var(--neon-cyan,#00d9ff);font-size:.85rem;}'+
      '.fba-menu-item:hover{background:rgba(0,217,255,.1);color:#fff;}'+
      '.fba-menu-item.danger i{color:#ef4444;}'+
      '.fba-menu-item.danger:hover{background:rgba(239,68,68,.12);color:#fca5a5;}'+
      '.fba-menu-sep{height:1px;background:rgba(148,163,184,.15);margin:6px 4px;}'+
      /* شيب الأفاتار الصغير جوه زرار الترحيب */
      '.fba-chip-avatar{position:relative;width:28px;height:28px;border-radius:9px;overflow:hidden;background:rgba(255,255,255,.22);display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:.7rem;flex-shrink:0;}'+
      '@media (max-width:768px){.nav-icon-btn.fba-user-btn{font-size:.85rem;}}'+
      '@media (max-width:480px){.fba-user-dropdown{left:auto;right:0;min-width:230px;}}';
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
    var settingsUrl = session.isAdmin ? (dashUrl + '#profile') : (dashUrl + '#settings');

    var wrap = document.createElement('div');
    wrap.className = 'fba-user-wrap';
    wrap.innerHTML =
      '<button type="button" class="nav-icon-btn fba-user-btn" aria-haspopup="true" aria-label="حسابي">'+avatarInner(initials, photoUrl)+'</button>'+
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
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') wrap.classList.remove('open');
    });
    var logoutBtn = wrap.querySelector('#fbaLogoutBtn');
    if(logoutBtn) logoutBtn.addEventListener('click', logout);
  }

  /* ---------- تحويل زرار الهيرو من "انضم" إلى ترحيب ----------
     بنحتفظ بنفس كلاس الزرار الأصلي (btn-primary / btn-ghost / btn-gold)
     فيطلع بنفس الحجم والشكل والألوان بالظبط في كل صفحة. */
  function renderHero(session, dashUrl, photoUrl){
    var heroCta = document.querySelector(
      '.hero-buttons a[href="./register.html"], .page-hero-actions a[href="./register.html"]'
    );
    if(!heroCta) return;

    var initials = getInitials(session.name);
    var btn = document.createElement('a');
    btn.className = heroCta.className;
    btn.href = dashUrl;
    btn.innerHTML =
      '<span class="fba-chip-avatar">'+avatarInner(initials, photoUrl)+'</span>'+
      '<span>أهلاً بعودتك، '+escapeHTML(firstName(session.name))+' 👋</span>';
    heroCta.replaceWith(btn);
  }

  /* ---------- التشغيل ---------- */
  async function init(){
    var session = getSession();
    if(!session) return; // زائر عادي، سيب الشكل الافتراضي زي ما هو

    var dashUrl;
    var photoUrl = null;

    if(session.isAdmin){
      dashUrl = './admin-dashboard.html';
      // بيانات الأدمن (الاسم/المسمى/الصورة) من أحدث نسخة في IndexedDB
      var ap = (await dbMetaGet('fba_admin_profile', {})) || {};
      if(ap.name) session.name = ap.name;
      if(ap.roleTitle) session.roleTitle = ap.roleTitle;
      if(ap.photo && ap.photo.dataUrl) photoUrl = ap.photo.dataUrl;
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

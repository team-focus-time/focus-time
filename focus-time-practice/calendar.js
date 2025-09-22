(function(){
  // Load sessions for local overlay
  function ymd(d){ const dt=new Date(d); const y=dt.getFullYear(); const m=String(dt.getMonth()+1).padStart(2,'0'); const day=String(dt.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
  const store = { get(k,d){ try{ const r=localStorage.getItem(k); return r==null? d: JSON.parse(r);}catch(_){return d;} }, set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} } };
  const sessions = store.get('ft_sessions', []);

  const calEl = document.getElementById('calendar');
  const sourcesRow = document.getElementById('sourcesRow');
  const viewSel = document.getElementById('viewSel');

  // Build FC calendar
  const calendar = new FullCalendar.Calendar(calEl, {
    height: '100%',
    initialView: 'timeGridWeek',
    nowIndicator: true,
    slotMinTime: '06:00:00',
    slotMaxTime: '24:00:00',
    expandRows: true,
    headerToolbar: false,
    locale: 'ko',
    firstDay: 1,
    buttonText: { today: '오늘', month: '월', week: '주', day: '일', list: '일정' },
    views: {
      threeDay: { type: 'timeGrid', duration: { days: 3 }, buttonText: '3일' },
      twoWeeks: { type: 'timeGrid', duration: { weeks: 2 }, buttonText: '2주' },
      multiMonthThree: { type: 'multiMonth', duration: { months: 3 }, buttonText: '3개월' },
    },
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    eventSources: buildInitialSources(),
  });
  calendar.render();

  // Navigation
  document.querySelector('[data-cal="today"]').onclick = ()=> calendar.today();
  document.querySelector('[data-cal="prev"]').onclick = ()=> calendar.prev();
  document.querySelector('[data-cal="next"]').onclick = ()=> calendar.next();
  viewSel.onchange = ()=> calendar.changeView(viewSel.value);

  // Local sessions as event source (overlay)
  function sessionEvents(){
    return sessions.filter(s=> s.mode==='focus').map(s=>{
      const start = new Date(s.ts); const end = new Date(s.ts + (s.minutes||0)*60000);
  const title = (s.category ? `[${s.category}] ` : '') + (s.task || 'Focus');
      return { id: 'sess-'+s.ts, start, end, title, backgroundColor: '#818cf8', borderColor:'#818cf8', textColor:'#0b1120' };
    });
  }

  function buildInitialSources(){
    const saved = store.get('ft_calendar_sources', { ics: [], gcal: { apiKey: '', calendars: [] }, oauth: { clientId: '', chosen: [] } });
    renderSourceBadges(saved);
    const srcs = [{ events: sessionEvents }];
    // ICS
    saved.ics.forEach(url=>{
      srcs.push({ id:'ics:'+url, url, format:'ics' });
    });
    // Google public calendars (API key)
    if (saved.gcal && saved.gcal.apiKey){
      FullCalendar.globalLocales; // ensure loaded
      srcs.push({ googleCalendarApiKey: saved.gcal.apiKey });
      saved.gcal.calendars.forEach(cid=>{ srcs.push({ googleCalendarId: cid }); });
    }
    // OAuth-picked private calendars will be added after login
    return srcs;
  }

  function renderSourceBadges(saved){
    sourcesRow.innerHTML = '';
    saved.ics.forEach(url=>{
      const b = document.createElement('span');
      b.className='src-badge'; b.textContent = 'ICS';
      const s = document.createElement('small'); s.textContent = ' '+url; s.style.opacity=.8; b.appendChild(s);
      const del = document.createElement('button'); del.textContent='✕'; del.onclick=()=> removeIcs(url);
      b.appendChild(del); sourcesRow.appendChild(b);
    });
    (saved.gcal.calendars||[]).forEach(cid=>{
      const b = document.createElement('span'); b.className='src-badge'; b.textContent='GCal';
      const s = document.createElement('small'); s.textContent=' '+cid; s.style.opacity=.8; b.appendChild(s);
      const del = document.createElement('button'); del.textContent='✕'; del.onclick=()=> removeGcal(cid);
      b.appendChild(del); sourcesRow.appendChild(b);
    });
  }

  // Add ICS
  document.getElementById('btn-add-ics').onclick = ()=>{
    const url = (document.getElementById('icsUrl').value||'').trim();
  if(!url){ return; }
    const saved = store.get('ft_calendar_sources', { ics: [], gcal: { apiKey: '', calendars: [] } });
  if(!saved.ics.includes(url)){ saved.ics.push(url); }
    store.set('ft_calendar_sources', saved);
    calendar.addEventSource({ id:'ics:'+url, url, format:'ics' });
    renderSourceBadges(saved);
  };

  // Add Google public calendar (API key + calendarId)
  document.getElementById('btn-add-gcal').onclick = ()=>{
    const apiKey = (document.getElementById('gapiKey').value||'').trim();
    const calId = (document.getElementById('gcalId').value||'').trim();
  if(!apiKey || !calId){ return; }
    const saved = store.get('ft_calendar_sources', { ics: [], gcal: { apiKey: '', calendars: [] } });
    saved.gcal.apiKey = apiKey;
  if(!saved.gcal.calendars.includes(calId)){ saved.gcal.calendars.push(calId); }
    store.set('ft_calendar_sources', saved);
    // set api key and add source
    calendar.addEventSource({ googleCalendarApiKey: apiKey });
    calendar.addEventSource({ googleCalendarId: calId });
    renderSourceBadges(saved);
  };

  function removeIcs(url){
    const saved = store.get('ft_calendar_sources', { ics: [], gcal: { apiKey: '', calendars: [] } });
    saved.ics = saved.ics.filter(u=> u!==url); store.set('ft_calendar_sources', saved);
  const src = calendar.getEventSourceById('ics:'+url); if (src){ src.remove(); }
    renderSourceBadges(saved);
  }
  function removeGcal(cid){
    const saved = store.get('ft_calendar_sources', { ics: [], gcal: { apiKey: '', calendars: [] } });
    saved.gcal.calendars = saved.gcal.calendars.filter(x=> x!==cid); store.set('ft_calendar_sources', saved);
    // FullCalendar google sources don't always have IDs; reload for simplicity
  calendar.getEventSources().forEach(s=>{ if(s.internalEventSource?.sourceDef?.googleCalendarId===cid){ s.remove(); } });
    renderSourceBadges(saved);
  }

  // ---------------- Google OAuth (GIS + gapi) ----------------
  const btnLogin = document.getElementById('btn-g-login');
  const btnLogout = document.getElementById('btn-g-logout');
  const gClientId = document.getElementById('gClientId');
  const pickRow = document.getElementById('gcalPick');

  let tokenClient = null; let accessToken = null;
  const savedOauth = store.get('ft_calendar_sources', { ics: [], gcal: { apiKey: '', calendars: [] }, oauth: { clientId: '', chosen: [] } }).oauth;
  // Prefer pre-configured Client ID from meta tag, fallback to saved
  const metaClient = document.querySelector('meta[name="google-client-id"]')?.content || '';
  if (gClientId){ gClientId.value = metaClient || savedOauth.clientId || ''; }

  // Basic format guard: real OAuth Client IDs look like
  // 1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
  // This helps prevent entering an email by mistake (which causes 400 errors)
  function isLikelyClientId(s){
    if (!s) {
      return false;
    }
    const v = String(s).trim();
    return v.endsWith('.apps.googleusercontent.com') && v.includes('-') && !v.includes('@') && !/\s/.test(v);
  }

  function ensureGapiLoaded(){
    return new Promise((resolve)=>{
      if (window.gapi && window.google){ resolve(); return; }
      const check = setInterval(()=>{
        if (window.gapi && window.google){ clearInterval(check); resolve(); }
      }, 200);
    });
  }

  async function initGapi(){
    await ensureGapiLoaded();
    await new Promise(res=> gapi.load('client', res));
    await gapi.client.init({}); // discovery will be per-request
  }

  async function login(){
    const clientId = (gClientId.value||'').trim();
    if (!isLikelyClientId(clientId)){
      alert('올바른 OAuth Client ID가 필요합니다.\n이메일이 아니라 "...apps.googleusercontent.com" 으로 끝나는 문자열을 입력하세요.\n예: 1234567890-abc123def.apps.googleusercontent.com');
      return;
    }
    const saved = store.get('ft_calendar_sources', { ics: [], gcal: { apiKey: '', calendars: [] }, oauth: { clientId: '', chosen: [] } });
    saved.oauth.clientId = clientId; store.set('ft_calendar_sources', saved);
    await initGapi();
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      callback: async (resp)=>{
        accessToken = resp.access_token;
        btnLogin.disabled = true; btnLogout.disabled = false;
        await loadCalendars();
      }
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  function logout(){
    if (accessToken){ try { google.accounts.oauth2.revoke(accessToken); } catch(_){} }
    accessToken = null; btnLogin.disabled = false; btnLogout.disabled = true; pickRow.innerHTML = '';
    // remove oauth sources
    const saved = store.get('ft_calendar_sources', { ics: [], gcal: { apiKey: '', calendars: [] }, oauth: { clientId: '', chosen: [] } });
    (saved.oauth.chosen||[]).forEach(cid=> removeOauthSource(cid));
    saved.oauth.chosen = []; store.set('ft_calendar_sources', saved);
  }

  async function loadCalendars(){
    if (!accessToken){ return; }
    gapi.client.setToken({ access_token: accessToken });
    const res = await gapi.client.request({ path: 'https://www.googleapis.com/calendar/v3/users/me/calendarList' });
    const items = (res.result && res.result.items) || [];
    renderPicker(items);
    // restore chosen
    const saved = store.get('ft_calendar_sources', { ics: [], gcal: { apiKey: '', calendars: [] }, oauth: { clientId: '', chosen: [] } });
    (saved.oauth.chosen||[]).forEach(cid=> addOauthSource(cid));
  }

  function renderPicker(cals){
    pickRow.innerHTML = '';
    cals.forEach(c=>{
      const { id } = c; const name = c.summary || id; const color = c.backgroundColor || '#60a5fa';
      const label = document.createElement('label'); label.className='src-badge'; label.style.borderColor = 'rgba(255,255,255,.2)';
      const cb = document.createElement('input'); cb.type='checkbox'; cb.style.accentColor = color; cb.dataset.cid = id;
      const saved = store.get('ft_calendar_sources', { ics: [], gcal: { apiKey: '', calendars: [] }, oauth: { clientId: '', chosen: [] } });
      cb.checked = !!(saved.oauth.chosen||[]).includes(id);
      cb.onchange = ()=>{ if (cb.checked){ addChosen(id); } else { removeChosen(id); } };
      const sp = document.createElement('span'); sp.textContent = ' '+name; sp.style.color = '#e6edff';
      label.appendChild(cb); label.appendChild(sp);
      pickRow.appendChild(label);
    });
  }

  function addChosen(cid){
    const saved = store.get('ft_calendar_sources', { ics: [], gcal: { apiKey: '', calendars: [] }, oauth: { clientId: '', chosen: [] } });
    if (!saved.oauth.chosen.includes(cid)){ saved.oauth.chosen.push(cid); store.set('ft_calendar_sources', saved); }
    addOauthSource(cid);
  }
  function removeChosen(cid){
    const saved = store.get('ft_calendar_sources', { ics: [], gcal: { apiKey: '', calendars: [] }, oauth: { clientId: '', chosen: [] } });
    saved.oauth.chosen = saved.oauth.chosen.filter(x=> x!==cid); store.set('ft_calendar_sources', saved);
    removeOauthSource(cid);
  }

  function addOauthSource(cid){
    // dynamic event source using gapi with current view's timeRange
    const id = 'oauth:'+cid;
    if (calendar.getEventSourceById(id)){ return; }
    calendar.addEventSource({ id, events: async (info, success, failure)=>{
      try{
        gapi.client.setToken({ access_token: accessToken });
        const params = new URLSearchParams({
          timeMin: new Date(info.start).toISOString(),
          timeMax: new Date(info.end).toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime'
        });
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cid)}/events?${params}`;
        const res = await gapi.client.request({ path: url });
        const events = (res.result.items||[]).map(ev=>{
          const start = ev.start.dateTime || ev.start.date;
          const end = ev.end.dateTime || ev.end.date;
          return {
            id: ev.id, title: ev.summary || '(제목 없음)', start, end,
            backgroundColor: ev.colorId? undefined : '#60a5fa'
          };
        });
        success(events);
      }catch(err){ failure(err); }
    }});
  }
  function removeOauthSource(cid){
    const id = 'oauth:'+cid; const src = calendar.getEventSourceById(id); if (src){ src.remove(); }
  }

  if (btnLogin){ btnLogin.onclick = login; }
  if (btnLogout){ btnLogout.onclick = logout; }

  // Auto-init if clientId saved
  (async function(){
    const bootClientId = (gClientId?.value || '').trim();
    if (isLikelyClientId(bootClientId)){
      await initGapi();
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: bootClientId,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        callback: async (resp)=>{ accessToken = resp.access_token; btnLogin.disabled=true; btnLogout.disabled=false; await loadCalendars(); }
      });
    }
  })();
})();

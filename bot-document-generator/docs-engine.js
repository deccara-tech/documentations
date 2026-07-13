/* =====================================================================
   Shared docs template engine. Copy UNCHANGED across projects & pages.
   A page only defines a global DOCS_DATA object, then loads this file.

   DOCS_DATA = {
     project, tagline, repo, fallbackVersion,
     audience,            // e.g. "User Guide" / "Technical Docs"
     crossLink,           // { href, label } to the sibling doc
     sections: [
       { id, nav, title, type:"html",      html }                        |
       { id, nav, title, type:"changelog", items:[{v,notes}] }           |
       { id, nav, title, type:"diagrams",  items:[{title,code}] }        |
       { id, nav, title, type:"demo", intro, cases:[{title,note,steps}] }|
       { id, nav, title, type:"commands",  columns, rows }
     ]
   }
   ===================================================================== */
(function(){
  const D = window.DOCS_DATA;
  if(!D){ document.body.innerHTML="<p style='padding:2rem'>Missing DOCS_DATA.</p>"; return; }
  const esc=(t)=>String(t).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

  /* ---------- shell ---------- */
  document.title = `${D.project} — ${D.audience}`;
  const navLinks = D.sections.map(s=>`<a href="#${s.id}">${esc(s.nav||s.title)}</a>`).join("");
  const switchBtn = D.crossLink ? `<a class="switch" href="${D.crossLink.href}">${esc(D.crossLink.label)} →</a>` : "";

  document.body.innerHTML = `
    <div class="wrap">
      <aside>
        <div class="logo">${esc(D.project)}</div>
        <div class="aud">${esc(D.audience)}</div>
        <div class="ver">version <span data-ver>—</span></div>
        ${switchBtn}
        <nav>${navLinks}</nav>
      </aside>
      <main>
        <section id="__top">
          <span class="badge" data-ver>v?</span>
          <span class="pill"><a href="${D.repo}" target="_blank" rel="noopener">GitHub ↗</a></span>
          <h1>${esc(D.project)}</h1>
          <p class="muted" style="font-size:17px">${esc(D.tagline)}</p>
        </section>
        ${D.sections.map(renderSection).join("")}
        <div class="footer">
          ${esc(D.project)} · ${esc(D.audience)} ·
          <a href="${D.repo}" target="_blank">source</a> ·
          generated ${new Date().toISOString().slice(0,10)} ·
          version <span data-ver>${esc(D.fallbackVersion)}</span>
        </div>
      </main>
    </div>`;

  /* ---------- section renderers ---------- */
  function renderSection(s){
    return `<section id="${s.id}"><h2>${esc(s.title)}</h2>${bodyFor(s)}</section>`;
  }
  function bodyFor(s){
    switch(s.type){
      case "html": return s.html;
      case "changelog":
        return s.items.map(c=>`<details><summary>${esc(c.v)}</summary><p class="muted">${esc(c.notes)}</p></details>`).join("");
      case "diagrams":
        return s.items.map(d=>`<h3>${esc(d.title)}</h3><div class="mermaid">${esc(d.code)}</div>`).join("");
      case "commands":{
        const cols=s.columns||Object.keys(s.rows[0]||{});
        return `<table><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr>`+
          s.rows.map(r=>`<tr>${cols.map(c=>`<td>${cellFmt(r[c])}</td>`).join("")}</tr>`).join("")+`</table>`;
      }
      case "demo":
        return `<p class="usecase-desc">${esc(s.intro||"")}</p>
          <div class="demo-controls">
            <select data-demo-select></select>
            <button data-demo-replay>▶ Replay</button>
            <button data-demo-speed>Speed: 1×</button>
          </div>
          <p class="usecase-desc" data-demo-note></p>
          <div class="phone">
            <div class="phone-top"><span class="dot">🤖</span><span>Document Bot<small>online</small></span></div>
            <div class="chat" data-demo-chat></div>
          </div>`;
      default: return "";
    }
  }
  // command cells: wrap short code-ish tokens in <code>, else escape
  function cellFmt(v){
    v=String(v==null?"":v);
    if(/^[!A-Z][\w:!<>/. ()|-]*$/.test(v) && v===v.toUpperCase() && v.length<40) return `<code>${esc(v)}</code>`;
    return esc(v);
  }

  /* ---------- version: latest GitHub tag = source of truth ---------- */
  (async()=>{
    let ver=D.fallbackVersion;
    try{
      const m=D.repo.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
      if(m){
        const r=await fetch(`https://api.github.com/repos/${m[1]}/${m[2]}/tags?per_page=1`);
        if(r.ok){ const j=await r.json(); if(j[0]&&j[0].name) ver=j[0].name; }
      }
    }catch(e){/* offline -> fallback */}
    document.querySelectorAll("[data-ver]").forEach(el=>el.textContent=ver);
  })();

  /* ---------- mermaid ---------- */
  if(window.mermaid){
    mermaid.initialize({startOnLoad:true,theme:"dark",securityLevel:"loose",themeVariables:{
      primaryColor:"#161b22",primaryTextColor:"#e6edf3",primaryBorderColor:"#2a323d",
      lineColor:"#8b97a5",fontFamily:"system-ui"}});
  }

  /* ---------- scrollspy ---------- */
  const links=[...document.querySelectorAll("aside nav a")];
  const spy=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)
    links.forEach(l=>l.classList.toggle("active",l.getAttribute("href")==="#"+e.target.id));
  }),{rootMargin:"-30% 0px -60% 0px"});
  document.querySelectorAll("main section").forEach(sec=>spy.observe(sec));

  /* ---------- chat demo engine ---------- */
  const demo=D.sections.find(s=>s.type==="demo");
  if(demo){
    const chat=document.querySelector("[data-demo-chat]");
    const sel=document.querySelector("[data-demo-select]");
    const note=document.querySelector("[data-demo-note]");
    let speed=1,timers=[];const SPEEDS=[1,2,0.5];
    sel.innerHTML=demo.cases.map((u,i)=>`<option value="${i}">${esc(u.title)}</option>`).join("");
    const clock=()=>new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    const clear=()=>{timers.forEach(clearTimeout);timers=[];};
    function bubble(step){
      const el=document.createElement("div");
      el.className="msg "+(step.from==="user"?"user":"bot")+(step.kind==="file"?" file":"");
      let inner="";
      if(step.quote) inner+=`<div class="quote">${esc(step.quote)}</div>`;
      if(step.kind==="file")
        inner+=`<div class="doc"><span class="ic">📄</span><div><b>${esc(step.fileName)}</b><br><span class="meta" style="text-align:left">${esc(step.text||"")}</span></div></div>`;
      else inner+=esc(step.text);
      inner+=`<span class="meta">${clock()} ${step.from==="user"?"✓✓":""}</span>`;
      el.innerHTML=inner;chat.appendChild(el);chat.scrollTop=chat.scrollHeight;
    }
    function typing(){const el=document.createElement("div");el.className="msg bot";el.dataset.typing="1";
      el.innerHTML=`<span class="typing"><i></i><i></i><i></i></span>`;chat.appendChild(el);chat.scrollTop=chat.scrollHeight;}
    function untype(){const t=chat.querySelector("[data-typing]");if(t)t.remove();}
    function play(idx){
      clear();chat.innerHTML="";const uc=demo.cases[idx];note.textContent=uc.note||"";let t=300;
      uc.steps.forEach(step=>{
        if(step.typing){const d=step.typing/speed;timers.push(setTimeout(typing,t));t+=d;timers.push(setTimeout(untype,t));}
        else{timers.push(setTimeout(()=>bubble(step),t));t+=650/speed;}
      });
    }
    sel.addEventListener("change",()=>play(+sel.value));
    document.querySelector("[data-demo-replay]").addEventListener("click",()=>play(+sel.value));
    document.querySelector("[data-demo-speed]").addEventListener("click",e=>{
      speed=SPEEDS[(SPEEDS.indexOf(speed)+1)%SPEEDS.length];
      e.target.textContent="Speed: "+speed+"×";play(+sel.value);
    });
    play(0);
  }
})();

import React, { useEffect, useState } from "react";
import TalkToPage from "./TalkToPage";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const PRESETS = [
  // Instant CSS
  { id: "focus",        label: "Focus",           desc: "Strip distractions, center the content",          color: "#6366f1" },
  { id: "newspaper1920",label: "Time Warp",        desc: "Sepia broadsheet with drop caps",                 color: "#a37c4e" },
  // AI-powered
  { id: "soundtrack",   label: "Soundtrack",      desc: "Ambient score tuned to the page's emotional tone", color: "#7c3aed", ai: true },
  { id: "worldbuilder", label: "World Builder",   desc: "Cinematic scene header from the story's setting",  color: "#1D9E75", ai: true },
  { id: "conceptmap",   label: "Concept Map",     desc: "Argument & concept graph injected as a sidebar",   color: "#378ADD", ai: true },
  { id: "datavis",      label: "Data Surfacer",   desc: "AI charts & fact-checks below every statistic",    color: "#BA7517", ai: true },
  { id: "conversation", label: "Conversation",    desc: "Rewrites the page as a Socratic dialogue",         color: "#D4537E", ai: true },
];

const CSS_PRESET_OPS = {
  focus: { remove:[], hide:[], restyle:{ "html":"background:#0a0a0f !important;", "body":"background:#0a0a0f !important;color:#000000 !important;", "p, li, td, dd, span, div":"color:#000000 !important;font-size:17px !important;line-height:1.85 !important;", "h1, h2, h3, h4":"color:#000000 !important;letter-spacing:-0.02em !important;", "a":"color:#4338ca !important;", "#mw-navigation, #mw-head, #mw-panel, #catlinks, .mw-indicators, .navbox, .sidebar, .refbegin, #footer, .mw-portlet":"display:none !important;", "#mw-content-text":"max-width:720px !important;margin:0 auto !important;padding:40px 24px !important;" }, inject:[] },
  newspaper1920: { remove:[], hide:[], restyle:{ "html, body":"background:#f4e9d0 !important;color:#1a1008 !important;font-family:'Times New Roman',Times,serif !important;", "body":"max-width:900px !important;margin:0 auto !important;padding:32px 20px !important;border-left:3px double #8b6914 !important;border-right:3px double #8b6914 !important;", "h1":"font-size:2.6em !important;text-align:center !important;border-top:4px double #1a1008 !important;border-bottom:4px double #1a1008 !important;padding:10px 0 !important;letter-spacing:0.05em !important;text-transform:uppercase !important;", "h2, h3":"font-size:1.3em !important;border-bottom:1px solid #8b6914 !important;text-transform:uppercase !important;letter-spacing:0.08em !important;", "p":"font-size:15px !important;line-height:1.7 !important;text-align:justify !important;", "a":"color:#5c3d0a !important;text-decoration:underline !important;", "img":"filter:sepia(0.6) grayscale(0.3) contrast(1.1) !important;border:2px solid #8b6914 !important;" }, inject:[] },
};

// Hardcoded demo presets — instant, no AI call needed
const DEMO_PRESETS = {
  "en.wikipedia.org/wiki/Apollo_11": {
    worldbuilder: { __executeScript: function() {
  (function(){
    if(document.getElementById('ibrowse-worldbuilder')) return;
    var PW=280;

    // ── Inject CSS to push page content inward ──────────────────────
    var style=document.createElement('style');
    style.setAttribute('data-ibrowse-padding','');
    style.textContent='html{margin-left:'+PW+'px!important;margin-right:'+PW+'px!important;transition:margin .4s ease;}';
    document.head.appendChild(style);

    function makePanel(side){
      var p=document.createElement('div');
      p.style.cssText='position:fixed;top:0;'+side+':0;width:'+PW+'px;height:100vh;z-index:99985;overflow:hidden;pointer-events:none;display:flex;flex-direction:column;';

      // Starfield
      var canvas=document.createElement('canvas');
      canvas.width=PW; canvas.height=window.innerHeight;
      canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;';
      var cx=canvas.getContext('2d');
      cx.fillStyle='#00000f'; cx.fillRect(0,0,PW,canvas.height);
      for(var i=0;i<180;i++){
        var sx=Math.random()*PW, sy=Math.random()*canvas.height;
        var sr=Math.random()*1.3, sop=0.4+Math.random()*0.6;
        cx.beginPath(); cx.arc(sx,sy,sr,0,Math.PI*2);
        cx.fillStyle='rgba(255,255,255,'+sop+')'; cx.fill();
      }
      // Soft nebula glow
      var ng=cx.createRadialGradient(PW*0.5,canvas.height*0.35,0,PW*0.5,canvas.height*0.35,PW*0.7);
      ng.addColorStop(0,'rgba(80,60,180,0.08)'); ng.addColorStop(1,'rgba(0,0,0,0)');
      cx.fillStyle=ng; cx.fillRect(0,0,PW,canvas.height);
      p.appendChild(canvas);

      // Moon surface at bottom
      var surf=document.createElement('div');
      surf.style.cssText='position:absolute;bottom:0;left:0;right:0;height:42%;background:linear-gradient(to top,#252318 0%,#32302a 35%,rgba(35,32,24,0) 100%);';
      surf.innerHTML='<svg style="position:absolute;bottom:0;left:0;width:100%;height:100%;opacity:0.4" viewBox="0 0 280 200" preserveAspectRatio="none"><ellipse cx="70" cy="175" rx="55" ry="12" fill="none" stroke="#1a1a10" stroke-width="2"/><ellipse cx="70" cy="175" rx="45" ry="9" fill="rgba(0,0,0,0.3)"/><ellipse cx="210" cy="185" rx="40" ry="9" fill="none" stroke="#1a1a10" stroke-width="1.5"/><ellipse cx="210" cy="185" rx="32" ry="7" fill="rgba(0,0,0,0.2)"/><ellipse cx="140" cy="192" rx="25" ry="6" fill="none" stroke="#1a1a10" stroke-width="1"/></svg>';
      p.appendChild(surf);

      // Edge fade toward article (feather inward)
      var fade=document.createElement('div');
      var fadeDir=side==='left'?'to right':'to left';
      fade.style.cssText='position:absolute;top:0;'+side+':auto;'+(side==='left'?'right':'left')+':0;width:60px;height:100%;background:linear-gradient('+fadeDir+',rgba(0,0,10,0) 0%,rgba(0,0,10,0.85) 100%);pointer-events:none;';
      p.appendChild(fade);

      return p;
    }

    var leftPanel=makePanel('left');
    var rightPanel=makePanel('right');

    // ── Left panel extras: astronaut + flag ──────────────────────────
    var astro=document.createElement('div');
    astro.style.cssText='position:absolute;bottom:33%;left:50%;transform:translateX(-50%);width:72px;opacity:0.9;filter:drop-shadow(0 0 14px rgba(180,210,255,0.35));';
    astro.innerHTML='<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg"><ellipse cx="40" cy="20" rx="16" ry="16" fill="#c8d4e0"/><circle cx="40" cy="20" r="11" fill="#1a2030"/><ellipse cx="40" cy="20" r="8" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><rect x="24" y="34" width="32" height="38" rx="8" fill="#b0bec8"/><rect x="26" y="36" width="28" height="34" rx="6" fill="#8a9aaa"/><rect x="30" y="44" width="20" height="14" rx="3" fill="#1a2030"/><rect x="33" y="46" width="14" height="10" rx="2" fill="#0a3060"/><rect x="8" y="36" width="14" height="28" rx="6" fill="#a0b0bc"/><rect x="58" y="36" width="14" height="28" rx="6" fill="#a0b0bc"/><rect x="6" y="58" width="16" height="10" rx="4" fill="#8a9aaa"/><rect x="58" y="58" width="16" height="10" rx="4" fill="#8a9aaa"/><rect x="28" y="70" width="12" height="28" rx="5" fill="#a0b0bc"/><rect x="40" y="70" width="12" height="28" rx="5" fill="#a0b0bc"/><rect x="26" y="92" width="14" height="10" rx="4" fill="#8a9aaa"/><rect x="40" y="92" width="14" height="10" rx="4" fill="#8a9aaa"/></svg>';
    leftPanel.appendChild(astro);

    var flag=document.createElement('div');
    flag.style.cssText='position:absolute;bottom:33%;left:68%;opacity:0.82;';
    flag.innerHTML='<svg width="32" height="52" viewBox="0 0 36 60"><line x1="4" y1="0" x2="4" y2="58" stroke="#c8d4e0" stroke-width="1.5"/><rect x="4" y="2" width="28" height="17" fill="#b22234"/><rect x="4" y="5" width="28" height="3" fill="white"/><rect x="4" y="8" width="28" height="3" fill="#b22234"/><rect x="4" y="11" width="28" height="3" fill="white"/><rect x="4" y="14" width="28" height="3" fill="#b22234"/><rect x="4" y="2" width="12" height="11" fill="#3c3b6e"/><circle cx="7" cy="5" r="1" fill="white"/><circle cx="11" cy="5" r="1" fill="white"/><circle cx="15" cy="5" r="1" fill="white"/><circle cx="7" cy="9" r="1" fill="white"/><circle cx="11" cy="9" r="1" fill="white"/><circle cx="15" cy="9" r="1" fill="white"/></svg>';
    leftPanel.appendChild(flag);

    // Label at bottom of left panel
    var lbl=document.createElement('div');
    lbl.style.cssText='position:absolute;bottom:8px;left:0;right:0;text-align:center;font-family:monospace;font-size:9px;letter-spacing:1.5px;color:rgba(103,232,249,0.55);text-transform:uppercase;';
    lbl.textContent='Sea of Tranquility';
    leftPanel.appendChild(lbl);

    // ── Right panel extras: Earthrise + telemetry readout ────────────
    var earth=document.createElement('div');
    earth.style.cssText='position:absolute;top:18%;left:50%;transform:translateX(-50%);width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 38% 35%,#4a8fd4 0%,#2d6fa8 30%,#1a4a72 55%,#0d2a44 80%,#050e18 100%);box-shadow:0 0 50px rgba(74,143,212,0.4),inset -14px -10px 32px rgba(0,0,20,0.65);overflow:hidden;';
    earth.innerHTML='<svg width="120" height="120" viewBox="0 0 120 120" style="position:absolute;inset:0;opacity:0.7"><ellipse cx="42" cy="46" rx="16" ry="11" fill="#3a7a3a" transform="rotate(-15 42 46)"/><ellipse cx="64" cy="41" rx="9" ry="13" fill="#4a8a4a" transform="rotate(10 64 41)"/><ellipse cx="48" cy="66" rx="20" ry="9" fill="#3a7a3a" transform="rotate(-5 48 66)"/><ellipse cx="85" cy="60" rx="11" ry="8" fill="#4a8a4a"/></svg><svg width="120" height="120" viewBox="0 0 120 120" style="position:absolute;inset:0;opacity:0.45"><ellipse cx="32" cy="32" rx="20" ry="6" fill="white" transform="rotate(-20 32 32)"/><ellipse cx="76" cy="55" rx="16" ry="5" fill="white" transform="rotate(10 76 55)"/><ellipse cx="55" cy="82" rx="22" ry="6" fill="white" transform="rotate(-10 55 82)"/></svg>';
    rightPanel.appendChild(earth);

    // Telemetry readout
    var telem=document.createElement('div');
    telem.style.cssText='position:absolute;bottom:40%;left:50%;transform:translateX(-50%);width:220px;font-family:monospace;font-size:10px;color:rgba(103,232,249,0.7);line-height:1.9;text-align:left;white-space:nowrap;';
    telem.innerHTML='<div style="color:rgba(103,232,249,0.4);letter-spacing:1px;margin-bottom:4px;">MISSION TELEMETRY</div>ALT: 000,000 FT · NOMINAL<br>VELOCITY: 0.0 FPS<br>PITCH: +00.0° ROLL: +00.0°<br>O₂ PRESS: 3.7 PSI ✓<br>COMM: HOUSTON LINK ACTIVE<br><span style="color:rgba(52,211,153,0.8);">STATUS: EAGLE HAS LANDED</span>';
    rightPanel.appendChild(telem);

    var rlbl=document.createElement('div');
    rlbl.style.cssText='position:absolute;bottom:8px;left:0;right:0;text-align:center;font-family:monospace;font-size:9px;letter-spacing:1.5px;color:rgba(103,232,249,0.55);text-transform:uppercase;';
    rlbl.textContent='July 20, 1969';
    rightPanel.appendChild(rlbl);

    // ── Close button (top center, pointer-events on) ─────────────────
    var closeBtn=document.createElement('button');
    closeBtn.textContent='✕ Exit Moon';
    closeBtn.style.cssText='position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:99990;background:rgba(0,0,16,0.75);border:1px solid rgba(103,232,249,0.25);border-radius:16px;color:rgba(103,232,249,0.8);padding:5px 16px;cursor:pointer;font-size:11px;font-family:monospace;letter-spacing:1px;pointer-events:auto;';
    closeBtn.onclick=function(){
      document.getElementById('ibrowse-worldbuilder').remove();
      var st=document.querySelector('style[data-ibrowse-padding]'); if(st) st.remove();
    };

    var container=document.createElement('div');
    container.id='ibrowse-worldbuilder';
    container.appendChild(leftPanel);
    container.appendChild(rightPanel);
    container.appendChild(closeBtn);
    document.body.appendChild(container);
  })();
}},
    soundtrack: { __executeScript: function() {
  (function(){
    if(window.__ibrowseAudio) return;
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    window.__ibrowseAudio=ctx;
    var master=ctx.createGain(); master.gain.value=0.85; master.connect(ctx.destination);

    // Continuous background static — always-on white noise through a telephone bandpass
    var noiseLen=ctx.sampleRate*3;
    var noiseBuf=ctx.createBuffer(1,noiseLen,ctx.sampleRate);
    var nd=noiseBuf.getChannelData(0);
    for(var i=0;i<noiseLen;i++) nd[i]=Math.random()*2-1;
    function playLoopNoise(){
      var src=ctx.createBufferSource(); src.buffer=noiseBuf; src.loop=true;
      // Telephone band: 300–3400 Hz
      var hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=320; hp.Q.value=0.7;
      var lp=ctx.createBiquadFilter(); lp.type='lowpass';  lp.frequency.value=3200; lp.Q.value=0.7;
      // Slow amplitude wobble to simulate carrier signal fading
      var wobble=ctx.createOscillator(); var wobbleG=ctx.createGain();
      wobble.frequency.value=0.15; wobbleG.gain.value=0.04;
      wobble.connect(wobbleG);
      var ng=ctx.createGain(); ng.gain.value=0.13;
      wobbleG.connect(ng.gain);
      src.connect(hp); hp.connect(lp); lp.connect(ng); ng.connect(master);
      wobble.start(); src.start();
    }
    playLoopNoise();

    // Crackle bursts — short loud static pops, frequent
    function crackle(){
      var dur=0.04+Math.random()*0.18;
      var buf=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*dur),ctx.sampleRate);
      var d=buf.getChannelData(0);
      for(var i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(Math.random()>0.85?1:0.3);
      var src=ctx.createBufferSource(); src.buffer=buf;
      var filt=ctx.createBiquadFilter(); filt.type='bandpass';
      filt.frequency.value=900+Math.random()*1800; filt.Q.value=0.5;
      var g=ctx.createGain(); g.gain.value=0;
      src.connect(filt); filt.connect(g); g.connect(master);
      src.start();
      var t=ctx.currentTime;
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(0.45+Math.random()*0.3,t+0.005);
      g.gain.exponentialRampToValueAtTime(0.001,t+dur);
      setTimeout(crackle, 400+Math.random()*2200);
    }
    crackle();

    // Signal dropout — briefly cut the master like a comms blackout
    function dropout(){
      var t=ctx.currentTime;
      var dur=0.08+Math.random()*0.3;
      master.gain.setValueAtTime(0.85,t);
      master.gain.linearRampToValueAtTime(0.02,t+0.03);
      master.gain.linearRampToValueAtTime(0.85,t+dur);
      setTimeout(dropout, 5000+Math.random()*12000);
    }
    setTimeout(dropout, 4000);

    // Telemetry beeps — mission control double-beep pattern
    function beep(){
      var freqs=Math.random()>0.4?[880,880]:[660,880];
      freqs.forEach(function(f,idx){
        var o=ctx.createOscillator(), g=ctx.createGain();
        o.type='sine'; o.frequency.value=f;
        g.gain.value=0; o.connect(g); g.connect(master);
        var t=ctx.currentTime+idx*0.18;
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(0.09,t+0.006);
        g.gain.setValueAtTime(0.09,t+0.07);
        g.gain.linearRampToValueAtTime(0,t+0.09);
        o.start(t); o.stop(t+0.1);
      });
      setTimeout(beep, 1200+Math.random()*4000);
    }
    setTimeout(beep, 600);

    // UI pill
    var el=document.createElement('div');
    el.id='ibrowse-audio-ctrl';
    el.style.cssText='position:fixed;bottom:18px;left:18px;z-index:99999;background:rgba(5,5,20,0.9);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:8px 16px;font-family:sans-serif;font-size:12px;color:#e2e8f0;display:flex;align-items:center;gap:10px;box-shadow:0 4px 24px rgba(0,0,0,0.5);';
    el.innerHTML='📡 <span style="opacity:0.75;letter-spacing:.3px;">Mission Control Radio</span> <button id="ibrowse-mute" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:12px;color:#fff;padding:3px 10px;cursor:pointer;font-size:11px;">Mute</button>';
    document.body.appendChild(el);
    document.getElementById('ibrowse-mute').onclick=function(){
      if(ctx.state==='running'){ctx.suspend();this.textContent='Unmute';}
      else{ctx.resume();this.textContent='Mute';}
    };
  })();
}},
    datavis: { remove:[], hide:[], restyle:{}, inject:[
      { html:`<div id="ibrowse-datavis" style="position:fixed;bottom:80px;right:18px;z-index:99990;width:280px;display:flex;flex-direction:column;gap:10px;font-family:sans-serif;"><div style="background:#0f0f1a;border:1px solid #1e1e30;border-radius:12px;padding:14px 16px;"><div style="font-size:18px;font-weight:700;color:#67e8f9;">500M+ viewers</div><div style="font-size:11px;color:#64748b;margin:4px 0 8px;">watched the Moon landing live on TV</div><svg width="100%" height="8" style="border-radius:4px;overflow:hidden;"><rect width="100%" height="8" fill="#1e1e30"/><rect width="92%" height="8" fill="#67e8f9" rx="4"/></svg><div style="font-size:10px;color:#475569;margin-top:4px;">~92% of all TV sets in use that day</div></div><div style="background:#0f0f1a;border:1px solid #1e1e30;border-radius:12px;padding:14px 16px;"><div style="font-size:18px;font-weight:700;color:#a78bfa;">21.6 kg</div><div style="font-size:11px;color:#64748b;margin:4px 0 8px;">of moon rocks & soil collected</div><svg viewBox="0 0 36 36" width="60" height="60" style="display:block;margin:0 auto;"><circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e1e30" stroke-width="3"/><circle cx="18" cy="18" r="15.9" fill="none" stroke="#a78bfa" stroke-width="3" stroke-dasharray="72 28" stroke-dashoffset="25" transform="rotate(-90 18 18)"/><text x="18" y="22" text-anchor="middle" font-size="8" fill="#a78bfa" font-family="sans-serif">21.6kg</text></svg></div><div style="background:#0f0f1a;border:1px solid #1e1e30;border-radius:12px;padding:14px 16px;"><div style="font-size:18px;font-weight:700;color:#34d399;">20 sec</div><div style="font-size:11px;color:#64748b;margin:4px 0 6px;">of descent fuel remaining at touchdown</div><div style="font-size:10px;color:#f59e0b;font-style:italic;">⚠ Verify: NASA Mission Reports, NASA History Division</div></div><button onclick="document.getElementById('ibrowse-datavis').remove()" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:8px;color:#fca5a5;padding:6px;cursor:pointer;font-size:11px;">✕ Close</button></div>` },
    ]},
    conceptmap: { __executeScript: function() {
var W=window.innerWidth, H=window.innerHeight;
var CX=W/2, CY=H/2;

var nodes=[
  // Core
  {id:0, label:'Apollo 11', color:'#a78bfa', r:32, x:CX, y:CY, vx:0,vy:0, fixed:true, group:'Mission', desc:'First crewed lunar landing · July 16–24, 1969 · Mission duration: 8 days 3 hrs'},
  // Crew
  {id:1, label:'Neil Armstrong', color:'#38bdf8', r:22, x:CX-200,y:CY-150,vx:0,vy:0, group:'Crew', desc:'Commander · First human on the Moon · "One small step for man…"'},
  {id:2, label:'Buzz Aldrin', color:'#38bdf8', r:20, x:CX+200,y:CY-150,vx:0,vy:0, group:'Crew', desc:'Lunar Module Pilot · Second person on Moon · Described it as "magnificent desolation"'},
  {id:3, label:'Michael Collins', color:'#38bdf8', r:18, x:CX,y:CY-240,vx:0,vy:0, group:'Crew', desc:'Command Module Pilot · Orbited alone · "Most isolated human in history"'},
  // Spacecraft
  {id:4, label:'Saturn V', color:'#f59e0b', r:22, x:CX-280,y:CY+60,vx:0,vy:0, group:'Hardware', desc:'363 ft tall · 3,038,500 kg · 7.6M lbs thrust · Most powerful rocket ever flown'},
  {id:5, label:'Eagle (LM)', color:'#f59e0b', r:19, x:CX+260,y:CY+60,vx:0,vy:0, group:'Hardware', desc:'Lunar Module · Touched down July 20, 1969 · "The Eagle has landed"'},
  {id:6, label:'Columbia (CM)', color:'#f59e0b', r:16, x:CX+100,y:CY-260,vx:0,vy:0, group:'Hardware', desc:'Command Module · Splashed down July 24 · Recovered by USS Hornet'},
  // Context
  {id:7, label:'Space Race', color:'#f87171', r:24, x:CX-320,y:CY-80,vx:0,vy:0, group:'Context', desc:'US vs USSR 1957–1969 · Triggered by Sputnik · Ended with Moon landing'},
  {id:8, label:'Cold War', color:'#f87171', r:20, x:CX-360,y:CY+120,vx:0,vy:0, group:'Context', desc:'Geopolitical rivalry · Drove billions in NASA funding · Ideological battle'},
  {id:9, label:'JFK Challenge', color:'#fb923c', r:18, x:CX-240,y:CY+220,vx:0,vy:0, group:'Context', desc:'"Before this decade is out" · May 25, 1961 · Set 8-year deadline'},
  {id:10,label:'NASA', color:'#60a5fa', r:21, x:CX+320,y:CY-80,vx:0,vy:0, group:'Org', desc:'Founded 1958 · 400,000 engineers & scientists · $25.4B Apollo program budget'},
  // Science & Impact
  {id:11,label:'Sea of Tranquility', color:'#34d399', r:18, x:CX+280,y:CY+180,vx:0,vy:0, group:'Location', desc:'Mare Tranquillitatis · 0.67°N 23.47°E · Selected for flat terrain'},
  {id:12,label:'Lunar Samples', color:'#4ade80', r:16, x:CX+160,y:CY+270,vx:0,vy:0, group:'Science', desc:'21.6 kg collected · Revealed Moon formed from Earth collision · Still studied today'},
  {id:13,label:'500M Viewers', color:'#e879f9', r:17, x:CX-160,y:CY+270,vx:0,vy:0, group:'Impact', desc:'~1/6 of world population watched live · Largest TV broadcast in history'},
  {id:14,label:'20 Sec Fuel', color:'#fbbf24', r:14, x:CX+80,y:CY-290,vx:0,vy:0, group:'Drama', desc:'Fuel remaining at touchdown · Alarm 1202 fired · Armstrong manually piloted past boulders'},
  {id:15,label:'Moon Rocks', color:'#4ade80', r:14, x:CX+300,y:CY+280,vx:0,vy:0, group:'Science', desc:'Basaltic composition · 3.7B years old · Proved Moon has no water or life'},
  {id:16,label:'Nixon Call', color:'#c084fc', r:13, x:CX-80,y:CY+310,vx:0,vy:0, group:'Impact', desc:'President Nixon called from Oval Office · "Greatest week since Creation"'},
  {id:17,label:'Apollo Program', color:'#818cf8', r:20, x:CX-180,y:CY-280,vx:0,vy:0, group:'Mission', desc:'17 missions 1961–1972 · 12 humans walked on Moon · $280B in today\'s dollars'},
];

var edges=[
  {s:7, t:0,  c:'#60a5fa', l:'culminates in'},
  {s:8, t:7,  c:'#f87171', l:'fuels'},
  {s:9, t:7,  c:'#fb923c', l:'accelerates'},
  {s:10,t:0,  c:'#60a5fa', l:'executes'},
  {s:17,t:0,  c:'#818cf8', l:'parent of'},
  {s:4, t:0,  c:'#f59e0b', l:'launches'},
  {s:0, t:5,  c:'#94a3b8', l:'deploys'},
  {s:0, t:6,  c:'#94a3b8', l:'carries'},
  {s:0, t:1,  c:'#94a3b8', l:'crew'},
  {s:0, t:2,  c:'#94a3b8', l:'crew'},
  {s:0, t:3,  c:'#94a3b8', l:'crew'},
  {s:3, t:6,  c:'#38bdf8', l:'pilots'},
  {s:1, t:11, c:'#34d399', l:'walks on'},
  {s:2, t:11, c:'#34d399', l:'walks on'},
  {s:5, t:11, c:'#f59e0b', l:'lands at'},
  {s:11,t:12, c:'#4ade80', l:'source of'},
  {s:12,t:15, c:'#4ade80', l:'includes'},
  {s:0, t:13, c:'#e879f9', l:'watched by'},
  {s:1, t:13, c:'#e879f9', l:'broadcast'},
  {s:5, t:14, c:'#f87171', l:'nearly failed'},
  {s:0, t:16, c:'#c084fc', l:'received'},
  {s:10,t:17, c:'#818cf8', l:'runs'},
];

// ---- Build UI ----
var ov=document.createElement('div');
ov.id='ibrowse-cmap-sidebar';
ov.style.cssText='position:fixed;inset:0;z-index:999990;background:rgba(3,3,14,0.94);font-family:system-ui,sans-serif;overflow:hidden;backdrop-filter:blur(2px);';

// Header
var hdr=document.createElement('div');
hdr.style.cssText='position:absolute;top:0;left:0;right:0;height:52px;background:rgba(13,13,26,0.95);border-bottom:1px solid rgba(139,92,246,0.25);display:flex;align-items:center;padding:0 20px;gap:16px;z-index:2;box-shadow:0 2px 20px rgba(0,0,0,0.4);';
hdr.innerHTML='<span style="font-size:18px;">🗺</span>'
  +'<div><div style="font-size:14px;font-weight:700;color:#e2e8f0;letter-spacing:-0.2px;">Apollo 11 · Knowledge Graph</div>'
  +'<div style="font-size:11px;color:#475569;margin-top:1px;">'+nodes.length+' concepts · '+edges.length+' relationships · Click a node to explore</div></div>'
  +'<div style="margin-left:auto;display:flex;gap:8px;align-items:center;">'
  +'<div style="display:flex;gap:12px;font-size:10px;color:#475569;">'
  +'<span><span style="color:#60a5fa;font-size:14px;">—</span> leads-to</span>'
  +'<span><span style="color:#94a3b8;font-size:14px;">—</span> part-of</span>'
  +'<span><span style="color:#4ade80;font-size:14px;">—</span> supports</span>'
  +'<span><span style="color:#f87171;font-size:14px;">—</span> tension</span>'
  +'</div>'
  +'<button id="ibrowse-cmap-close" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#94a3b8;cursor:pointer;font-size:12px;padding:6px 14px;font-family:inherit;transition:all 0.15s;">✕ Close</button>'
  +'</div>';
ov.appendChild(hdr);

// Info panel (right side on click)
var info=document.createElement('div');
info.style.cssText='position:absolute;bottom:20px;right:20px;width:240px;background:rgba(13,13,26,0.95);border:1px solid rgba(139,92,246,0.3);border-radius:14px;padding:16px;font-size:12px;color:#cbd5e1;line-height:1.6;display:none;z-index:3;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
ov.appendChild(info);

// Group legend bottom-left
var leg=document.createElement('div');
leg.style.cssText='position:absolute;bottom:20px;left:20px;background:rgba(13,13,26,0.9);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 16px;font-size:10px;color:#64748b;z-index:3;';
var groups={Mission:'#a78bfa',Crew:'#38bdf8',Hardware:'#f59e0b',Context:'#f87171',Org:'#60a5fa',Location:'#34d399',Science:'#4ade80',Impact:'#e879f9',Drama:'#fbbf24'};
leg.innerHTML='<div style="font-size:10px;font-weight:600;color:#475569;margin-bottom:8px;letter-spacing:0.5px;text-transform:uppercase;">Groups</div>'
  +Object.entries(groups).map(function(g){return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><span style="width:8px;height:8px;border-radius:50%;background:'+g[1]+';display:inline-block;"></span>'+g[0]+'</div>';}).join('');
ov.appendChild(leg);

// Tooltip
var tip=document.createElement('div');
tip.style.cssText='display:none;position:fixed;background:#0d0d1a;border:1px solid #334155;border-radius:10px;padding:10px 14px;font-size:12px;color:#cbd5e1;z-index:999999;pointer-events:none;max-width:220px;line-height:1.6;box-shadow:0 8px 32px rgba(0,0,0,0.6);';
ov.appendChild(tip);

// SVG
var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
svg.setAttribute('width',W); svg.setAttribute('height',H);
svg.style.cssText='position:absolute;top:52px;left:0;';

var defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
// Arrow markers per color
var markerColors={'#60a5fa':'arr-blue','#94a3b8':'arr-grey','#4ade80':'arr-green','#f87171':'arr-red','#f59e0b':'arr-amber','#38bdf8':'arr-cyan','#fb923c':'arr-orange','#e879f9':'arr-pink','#818cf8':'arr-indigo','#c084fc':'arr-purple','#34d399':'arr-teal','#fbbf24':'arr-yellow'};
Object.entries(markerColors).forEach(function(mc){
  var mk=document.createElementNS('http://www.w3.org/2000/svg','marker');
  mk.setAttribute('id',mc[1]); mk.setAttribute('markerWidth','7'); mk.setAttribute('markerHeight','7');
  mk.setAttribute('refX','6'); mk.setAttribute('refY','3.5'); mk.setAttribute('orient','auto');
  var mp=document.createElementNS('http://www.w3.org/2000/svg','path');
  mp.setAttribute('d','M0,0 L0,7 L7,3.5 z'); mp.setAttribute('fill',mc[0]); mp.setAttribute('fill-opacity','0.7');
  mk.appendChild(mp); defs.appendChild(mk);
});
svg.appendChild(defs);

// Edge label group (below nodes)
var edgeLabelG=document.createElementNS('http://www.w3.org/2000/svg','g');
svg.appendChild(edgeLabelG);

var edgeEls=edges.map(function(e){
  var markerId=markerColors[e.c]||'arr-grey';
  var line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('stroke',e.c); line.setAttribute('stroke-width','1.5');
  line.setAttribute('stroke-opacity','0.35'); line.setAttribute('marker-end','url(#'+markerId+')');
  svg.appendChild(line);

  var lt=document.createElementNS('http://www.w3.org/2000/svg','text');
  lt.setAttribute('text-anchor','middle'); lt.setAttribute('fill',e.c);
  lt.setAttribute('font-size','9'); lt.setAttribute('font-family','system-ui');
  lt.setAttribute('opacity','0'); lt.setAttribute('pointer-events','none');
  edgeLabelG.appendChild(lt);

  return {line, lt, e};
});

var nodeEls=nodes.map(function(n){
  var g=document.createElementNS('http://www.w3.org/2000/svg','g');
  g.style.cursor='pointer';

  // Glow circle
  var glow=document.createElementNS('http://www.w3.org/2000/svg','circle');
  glow.setAttribute('r',n.r+8); glow.setAttribute('fill',n.color); glow.setAttribute('opacity','0');
  glow.setAttribute('filter','blur(6px)');

  // Main circle
  var circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
  circle.setAttribute('r',n.r); circle.setAttribute('fill',n.color+'1a');
  circle.setAttribute('stroke',n.color); circle.setAttribute('stroke-width','2');

  // Group badge arc (small colored ring segment)
  var text=document.createElementNS('http://www.w3.org/2000/svg','text');
  text.setAttribute('text-anchor','middle'); text.setAttribute('dominant-baseline','central');
  text.setAttribute('fill','#f1f5f9'); text.setAttribute('font-weight','600');
  text.setAttribute('font-family','system-ui'); text.setAttribute('pointer-events','none');

  var words=n.label.split(' ');
  var fs=n.r>22?11:n.r>16?10:9;
  text.setAttribute('font-size',String(fs));
  if(words.length<=2){
    text.textContent=n.label;
  } else {
    var mid=Math.ceil(words.length/2);
    var t1=document.createElementNS('http://www.w3.org/2000/svg','tspan');
    t1.setAttribute('x','0'); t1.setAttribute('dy',String(-fs*0.6));
    t1.textContent=words.slice(0,mid).join(' ');
    var t2=document.createElementNS('http://www.w3.org/2000/svg','tspan');
    t2.setAttribute('x','0'); t2.setAttribute('dy',String(fs*1.3));
    t2.textContent=words.slice(mid).join(' ');
    text.appendChild(t1); text.appendChild(t2);
  }

  // Group label below node
  var grpTxt=document.createElementNS('http://www.w3.org/2000/svg','text');
  grpTxt.setAttribute('text-anchor','middle'); grpTxt.setAttribute('y',String(n.r+13));
  grpTxt.setAttribute('fill',n.color); grpTxt.setAttribute('font-size','8');
  grpTxt.setAttribute('font-family','system-ui'); grpTxt.setAttribute('opacity','0.7');
  grpTxt.setAttribute('pointer-events','none'); grpTxt.textContent=n.group;

  g.appendChild(glow); g.appendChild(circle); g.appendChild(text); g.appendChild(grpTxt);
  svg.appendChild(g);
  return {g,circle,glow,n};
});

ov.appendChild(svg);
document.body.appendChild(ov);

document.getElementById('ibrowse-cmap-close').onmouseenter=function(){this.style.background='rgba(255,255,255,0.12)';this.style.color='#e2e8f0';};
document.getElementById('ibrowse-cmap-close').onmouseleave=function(){this.style.background='rgba(255,255,255,0.06)';this.style.color='#94a3b8';};
document.getElementById('ibrowse-cmap-close').onclick=function(){ov.remove();};

var selected=null;

function setSelected(n){
  selected=n;
  nodeEls.forEach(function(ne){
    var conn=!n||ne.n.id===n.id||edges.some(function(e){return(e.s===n.id&&e.t===ne.n.id)||(e.t===n.id&&e.s===ne.n.id);});
    ne.g.style.opacity=conn?'1':'0.15';
    ne.circle.setAttribute('stroke-width', ne.n.id===n?.id ? '3' : '2');
    ne.glow.setAttribute('opacity', ne.n.id===n?.id ? '0.15' : '0');
  });
  edgeEls.forEach(function(ee){
    var hl=n&&(ee.e.s===n.id||ee.e.t===n.id);
    ee.line.setAttribute('stroke-opacity',hl?'0.9':n?'0.05':'0.35');
    ee.line.setAttribute('stroke-width',hl?'2.5':'1.5');
    ee.lt.setAttribute('opacity',hl?'1':'0');
  });
  if(n){
    var conns=edges.filter(function(e){return e.s===n.id||e.t===n.id;});
    var connNames=conns.map(function(e){
      var other=nodes[e.s===n.id?e.t:e.s];
      return '<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:'+other.color+'">'+other.label+'</span><span style="color:'+e.c+';font-size:10px;opacity:0.8;">'+e.l+'</span></div>';
    }).join('');
    info.style.display='block';
    info.innerHTML='<div style="font-size:14px;font-weight:700;color:'+n.color+';margin-bottom:4px;">'+n.label+'</div>'
      +'<div style="font-size:10px;color:#64748b;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">'+n.group+'</div>'
      +'<div style="color:#94a3b8;margin-bottom:12px;font-size:12px;">'+n.desc+'</div>'
      +'<div style="font-size:10px;color:#475569;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Connections ('+conns.length+')</div>'
      +connNames
      +'<div style="margin-top:10px;text-align:center;"><button onclick="this.closest(\'div[style*=bottom]\').style.display=\'none\'" style="font-size:10px;color:#475569;background:none;border:none;cursor:pointer;">dismiss</button></div>';
  } else {
    info.style.display='none';
  }
}

nodeEls.forEach(function(ne){
  ne.g.addEventListener('mouseenter',function(ev){
    if(!selected){ne.circle.setAttribute('fill',ne.n.color+'33');ne.glow.setAttribute('opacity','0.1');}
    tip.style.display='block';
    tip.innerHTML='<strong style="color:'+ne.n.color+'">'+ne.n.label+'</strong> <span style="color:#475569;font-size:10px;">· '+ne.n.group+'</span><br><span style="color:#94a3b8;font-size:11px;">'+ne.n.desc+'</span>';
  });
  ne.g.addEventListener('mousemove',function(ev){
    var tx=ev.clientX+16, ty=ev.clientY-10;
    if(tx+230>W) tx=ev.clientX-240;
    tip.style.left=tx+'px'; tip.style.top=ty+'px';
  });
  ne.g.addEventListener('mouseleave',function(){
    if(!selected||selected.id!==ne.n.id){ne.circle.setAttribute('fill',ne.n.color+'1a');ne.glow.setAttribute('opacity','0');}
    tip.style.display='none';
  });
  ne.g.addEventListener('click',function(ev){
    ev.stopPropagation();
    setSelected(selected&&selected.id===ne.n.id?null:ne.n);
  });
});
ov.addEventListener('click',function(){setSelected(null);});

// Force sim
function tick(){
  for(var i=0;i<nodes.length;i++){
    for(var j=i+1;j<nodes.length;j++){
      var a=nodes[i],b=nodes[j];
      var dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||1;
      var f=1400/(d*d);
      if(!a.fixed){a.vx-=dx/d*f;a.vy-=dy/d*f;}
      if(!b.fixed){b.vx+=dx/d*f;b.vy+=dy/d*f;}
    }
  }
  edges.forEach(function(e){
    var a=nodes[e.s],b=nodes[e.t];
    var dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||1;
    var f=(d-140)*0.03;
    if(!a.fixed){a.vx+=dx/d*f;a.vy+=dy/d*f;}
    if(!b.fixed){b.vx-=dx/d*f;b.vy-=dy/d*f;}
  });
  nodes.forEach(function(n){
    if(n.fixed)return;
    n.vx+=(CX-n.x)*0.001;n.vy+=(CY-n.y)*0.001;
    n.vx*=0.8;n.vy*=0.8;
    n.x+=n.vx;n.y+=n.vy;
    n.x=Math.max(n.r+10,Math.min(W-n.r-10,n.x));
    n.y=Math.max(n.r+60,Math.min(H-n.r-20,n.y));
  });
  edgeEls.forEach(function(ee){
    var a=nodes[ee.e.s],b=nodes[ee.e.t];
    var dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||1;
    var sx=a.x+dx/d*a.r,sy=a.y+dy/d*a.r+52;
    var ex=b.x-dx/d*(b.r+8),ey=b.y-dy/d*(b.r+8)+52;
    ee.line.setAttribute('x1',sx);ee.line.setAttribute('y1',sy);
    ee.line.setAttribute('x2',ex);ee.line.setAttribute('y2',ey);
    ee.lt.setAttribute('x',(sx+ex)/2);ee.lt.setAttribute('y',(sy+ey)/2-4);
    ee.lt.textContent=ee.e.l;
  });
  nodeEls.forEach(function(ne){
    ne.g.setAttribute('transform','translate('+ne.n.x+','+(ne.n.y+52)+')');
  });
}

var fr=0;
function run(){fr++;tick();if(fr<200||document.getElementById('ibrowse-cmap-sidebar'))requestAnimationFrame(run);}
requestAnimationFrame(run);
    }, remove:[], hide:[], restyle:{}, inject:[]},
    conversation: { remove:[], hide:[], restyle:{}, inject:[
      { html:`<style>
  @keyframes ibc-fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes ibc-orb{0%,100%{transform:scale(1);opacity:.18}50%{transform:scale(1.12);opacity:.28}}
  @keyframes ibc-slide-in{from{opacity:0;transform:translateX(-100%)}to{opacity:1;transform:translateX(0)}}
  @keyframes ibc-typing{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
  #ibrowse-convo{position:fixed;inset:0;z-index:999999;background:rgba(4,4,14,.96);backdrop-filter:blur(12px);display:flex;flex-direction:column;font-family:'Segoe UI',system-ui,sans-serif;overflow:hidden;}
  #ibrowse-convo .ibc-orb1{position:absolute;top:-120px;right:-100px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,#6366f1 0%,#8b5cf6 40%,transparent 70%);animation:ibc-orb 5s ease-in-out infinite;pointer-events:none;}
  #ibrowse-convo .ibc-orb2{position:absolute;bottom:-80px;left:-80px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,#db2777 0%,#9d174d 40%,transparent 70%);animation:ibc-orb 6s ease-in-out infinite reverse;pointer-events:none;opacity:.15;}
  #ibrowse-convo .ibc-header{display:flex;align-items:center;justify-content:space-between;padding:20px 28px 16px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0;position:relative;z-index:2;}
  #ibrowse-convo .ibc-title{display:flex;flex-direction:column;gap:3px;}
  #ibrowse-convo .ibc-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#475569;font-weight:600;}
  #ibrowse-convo .ibc-name{font-size:18px;font-weight:700;color:#f1f5f9;letter-spacing:-.3px;}
  #ibrowse-convo .ibc-close{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#94a3b8;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .2s,color .2s;}
  #ibrowse-convo .ibc-close:hover{background:rgba(239,68,68,.15);color:#fca5a5;border-color:rgba(239,68,68,.3);}
  #ibrowse-convo .ibc-participants{display:flex;gap:16px;padding:12px 28px;border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0;position:relative;z-index:2;}
  #ibrowse-convo .ibc-person{display:flex;align-items:center;gap:8px;font-size:12px;}
  #ibrowse-convo .ibc-avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#fff;flex-shrink:0;}
  #ibrowse-convo .ibc-pname{font-weight:600;}
  #ibrowse-convo .ibc-prole{color:#64748b;font-size:11px;}
  #ibrowse-convo .ibc-feed{flex:1;overflow-y:auto;padding:24px 28px 28px;display:flex;flex-direction:column;gap:0;position:relative;z-index:2;}
  #ibrowse-convo .ibc-feed::-webkit-scrollbar{width:4px;}
  #ibrowse-convo .ibc-feed::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px;}
  #ibrowse-convo .ibc-msg{display:flex;gap:10px;margin-bottom:18px;opacity:0;animation:ibc-fadeUp .5s ease forwards;}
  #ibrowse-convo .ibc-msg.right{flex-direction:row-reverse;}
  #ibrowse-convo .ibc-bubble{max-width:70%;padding:13px 17px;font-size:14px;line-height:1.65;position:relative;}
  #ibrowse-convo .ibc-bubble.alex{background:linear-gradient(135deg,#1e1b4b,#1a1535);border-radius:4px 18px 18px 18px;color:#e0e7ff;border:1px solid rgba(99,102,241,.2);}
  #ibrowse-convo .ibc-bubble.jamie{background:linear-gradient(135deg,#1f1218,#1a0f16);border-radius:18px 4px 18px 18px;color:#fce7f3;border:1px solid rgba(219,39,119,.2);}
  #ibrowse-convo .ibc-msgname{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px;}
  #ibrowse-convo .ibc-msgname.alex{color:#818cf8;}
  #ibrowse-convo .ibc-msgname.jamie{color:#f472b6;text-align:right;}
  #ibrowse-convo .ibc-timestamp{font-size:10px;color:#334155;margin-top:4px;display:block;}
  #ibrowse-convo .ibc-divider{display:flex;align-items:center;gap:10px;margin:8px 0 20px;color:#1e293b;font-size:11px;}
  #ibrowse-convo .ibc-divider::before,#ibrowse-convo .ibc-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.05);}
  #ibrowse-convo .ibc-footer{padding:14px 28px;border-top:1px solid rgba(255,255,255,.06);text-align:center;font-size:11px;color:#334155;flex-shrink:0;position:relative;z-index:2;}
</style>
<div id="ibrowse-convo">
  <div class="ibc-orb1"></div>
  <div class="ibc-orb2"></div>
  <div class="ibc-header">
    <div class="ibc-title">
      <span class="ibc-label">I Browse · Socratic Mode</span>
      <span class="ibc-name">Apollo 11 — The Moon Landing</span>
    </div>
    <button class="ibc-close" onclick="document.getElementById('ibrowse-convo').remove()">✕</button>
  </div>
  <div class="ibc-participants">
    <div class="ibc-person">
      <div class="ibc-avatar" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);">A</div>
      <div><div class="ibc-pname" style="color:#818cf8;">Alex</div><div class="ibc-prole">The Advocate</div></div>
    </div>
    <div class="ibc-person">
      <div class="ibc-avatar" style="background:linear-gradient(135deg,#db2777,#9d174d);">J</div>
      <div><div class="ibc-pname" style="color:#f472b6;">Jamie</div><div class="ibc-prole">The Skeptic</div></div>
    </div>
  </div>
  <div class="ibc-feed">
    <div class="ibc-divider">Mission Overview</div>

    <div class="ibc-msg" style="animation-delay:.05s">
      <div class="ibc-avatar" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;">A</div>
      <div><div class="ibc-msgname alex">Alex</div><div class="ibc-bubble alex">July 20, 1969. Neil Armstrong steps off the Eagle lunar module and onto the Sea of Tranquility — the first human to walk on another world. Eight years after Kennedy's challenge, the United States had done the impossible. Over 500 million people watched live. It remains the single most watched television event in human history.</div><span class="ibc-timestamp">9:56 PM EDT, July 20, 1969</span></div>
    </div>

    <div class="ibc-msg right" style="animation-delay:.2s">
      <div class="ibc-avatar" style="background:linear-gradient(135deg,#db2777,#9d174d);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;">J</div>
      <div><div class="ibc-msgname jamie">Jamie</div><div class="ibc-bubble jamie">Let's be honest — this was a Cold War stunt. Kennedy didn't say "let's go to the Moon to advance science." He said it to beat the Soviets. The entire Apollo program was geopolitical theater funded by a nation terrified of looking weak. Was the science actually worth $28 billion — roughly $280 billion in today's dollars?</div><span class="ibc-timestamp" style="text-align:right;display:block;">Challenging the premise</span></div>
    </div>

    <div class="ibc-msg" style="animation-delay:.35s">
      <div class="ibc-avatar" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;">A</div>
      <div><div class="ibc-msgname alex">Alex</div><div class="ibc-bubble alex">Both things can be true. Yes, the Cold War was the ignition — but what followed was genuine science. The 842 pounds of lunar samples astronauts brought back over six missions reshaped our entire model of how the Moon formed. We now know the Moon likely coalesced from debris after a Mars-sized body collided with the early Earth. That knowledge came directly from Apollo rocks. No rocks, no Giant Impact Hypothesis.</div><span class="ibc-timestamp">Scientific legacy</span></div>
    </div>

    <div class="ibc-divider">The Human Drama</div>

    <div class="ibc-msg right" style="animation-delay:.5s">
      <div class="ibc-avatar" style="background:linear-gradient(135deg,#db2777,#9d174d);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;">J</div>
      <div><div class="ibc-msgname jamie">Jamie</div><div class="ibc-bubble jamie">Fair enough on the science. But what about the sheer recklessness of the mission itself? They had 20 seconds of fuel left when Armstrong manually flew the lander past a boulder-filled crater. Nixon had a pre-written eulogy ready for if they didn't make it back. The astronauts themselves estimated a 50% chance of returning alive. Wasn't this ethically dubious — sending humans on a near-suicidal mission?</div><span class="ibc-timestamp" style="text-align:right;display:block;">Risk & ethics</span></div>
    </div>

    <div class="ibc-msg" style="animation-delay:.65s">
      <div class="ibc-avatar" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;">A</div>
      <div><div class="ibc-msgname alex">Alex</div><div class="ibc-bubble alex">The astronauts were test pilots who had spent their careers flying experimental aircraft — they understood risk better than anyone and chose to go. Armstrong was a former X-15 pilot who had ejected from a lunar training vehicle seconds before it exploded. These weren't naïve men. And that 20-second fuel moment? Armstrong had already decided on his abort threshold. He was calm, controlled, and put the Eagle down on a flat patch with 25 seconds to spare. That wasn't recklessness — it was mastery under pressure.</div><span class="ibc-timestamp">Defending the crew</span></div>
    </div>

    <div class="ibc-msg right" style="animation-delay:.8s">
      <div class="ibc-avatar" style="background:linear-gradient(135deg,#db2777,#9d174d);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;">J</div>
      <div><div class="ibc-msgname jamie">Jamie</div><div class="ibc-bubble jamie">What about Michael Collins — the forgotten astronaut? He orbited the Moon alone for 21 hours while Armstrong and Aldrin walked below. If the Eagle couldn't lift off, he would have had to leave them behind and return to Earth alone. History celebrates two moon walkers. Collins is a footnote. Doesn't that bother you?</div><span class="ibc-timestamp" style="text-align:right;display:block;">The forgotten man</span></div>
    </div>

    <div class="ibc-msg" style="animation-delay:.95s">
      <div class="ibc-avatar" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;">A</div>
      <div><div class="ibc-msgname alex">Alex</div><div class="ibc-bubble alex">Collins himself said he didn't feel lonely — he felt "awareness, anticipation, satisfaction, confidence." He later wrote that he was "the loneliest man since Adam" but wore it with pride. As for history forgetting him — I'd argue Collins is the most quietly profound figure of the mission. He was the only human alive who was not on Earth or the Moon. Every single other person in existence was on one side of that equation. Collins was the hinge.</div><span class="ibc-timestamp">Collins, reframed</span></div>
    </div>

    <div class="ibc-divider">Legacy & Meaning</div>

    <div class="ibc-msg right" style="animation-delay:1.1s">
      <div class="ibc-avatar" style="background:linear-gradient(135deg,#db2777,#9d174d);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;">J</div>
      <div><div class="ibc-msgname jamie">Jamie</div><div class="ibc-bubble jamie">Here's what I can't reconcile: after Apollo 17 in 1972, we never went back. If the Moon was such a triumph, why did the program end? Congress cut funding, the public lost interest, and NASA pivoted to the Space Shuttle. Doesn't that abandonment suggest Apollo was more spectacle than foundation?</div><span class="ibc-timestamp" style="text-align:right;display:block;">The abandonment problem</span></div>
    </div>

    <div class="ibc-msg" style="animation-delay:1.25s">
      <div class="ibc-avatar" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;">A</div>
      <div><div class="ibc-msgname alex">Alex</div><div class="ibc-bubble alex">That abandonment is America's genuine failure — but it doesn't diminish what Apollo achieved. The program produced GPS-grade inertial navigation, scratch-resistant lenses, memory foam, water purification tech, and CAT scan image processing — all developed to solve specific Moon mission problems. And 55 years later, Artemis is going back. The gap wasn't evidence that Apollo was hollow — it was evidence of short political cycles. The foundation was always there.</div><span class="ibc-timestamp">The ripple effects</span></div>
    </div>

    <div class="ibc-msg right" style="animation-delay:1.4s">
      <div class="ibc-avatar" style="background:linear-gradient(135deg,#db2777,#9d174d);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;">J</div>
      <div><div class="ibc-msgname jamie">Jamie</div><div class="ibc-bubble jamie">One last thing I keep returning to: Armstrong said "one small step for man, one giant leap for mankind" — but he claimed he said "one small step for *a* man." Does the missing 'a' change the meaning entirely? And does it matter that the most memorable sentence in human exploration might have been grammatically incomplete?</div><span class="ibc-timestamp" style="text-align:right;display:block;">The famous words</span></div>
    </div>

    <div class="ibc-msg" style="animation-delay:1.55s">
      <div class="ibc-avatar" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;">A</div>
      <div><div class="ibc-msgname alex">Alex</div><div class="ibc-bubble alex">It matters philosophically and not at all practically. Without the 'a', "man" and "mankind" are synonyms and the sentence is a tautology. Armstrong always insisted he said it — audio analysis in 2006 found a faint trace consistent with the 'a' being swallowed by static. But here's what I think is more interesting: Armstrong spent the rest of his life largely avoiding the spotlight, living quietly in Ohio, refusing most interview requests. The man who said those words became, deliberately, a footnote to them. That restraint might be the most human thing about the whole mission.</div><span class="ibc-timestamp">A fitting close</span></div>
    </div>
  </div>
  <div class="ibc-footer">Generated by I Browse · Socratic dialogue based on Apollo 11 Wikipedia article</div>
</div>` },
    ]},
  },
};

function getDemoPreset(url, presetId) {
  for (const [pattern, presets] of Object.entries(DEMO_PRESETS)) {
    if (url.includes(pattern) && presets[presetId]) return presets[presetId];
  }
  return null;
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response?.error) {
        reject(new Error(response.error));
        return;
      }

      resolve(response);
    });
  });
}

async function fetchAuthConfig() {
  const response = await fetch(`${BACKEND_URL}/auth/config`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload.detail || "Could not load Auth0 config from backend",
    );
  }

  return payload;
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [log, setLog] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [logOpen, setLogOpen] = useState(true);
  const [activePresets, setActivePresets] = useState(new Set());
  const [loadingPresets, setLoadingPresets] = useState(new Set());
  const [galleryOpen, setGalleryOpen] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const response = await sendRuntimeMessage({ type: "auth:getSession" });
        if (mounted) setSession(response.session || null);
      } catch (err) {
        if (mounted) setError(err.message || "Could not read auth session");
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshSession = async () => {
    const response = await sendRuntimeMessage({ type: "auth:getSession" });
    setSession(response.session || null);
    return response.session || null;
  };

  const requireSession = async () => {
    const currentSession = session || (await refreshSession());
    if (!currentSession?.accessToken) {
      throw new Error("Sign in with Auth0 before transforming a page");
    }
    return currentSession;
  };

  const handleLogin = async () => {
    setAuthLoading(true);
    setError("");
    setStatus("");

    try {
      const config = await fetchAuthConfig();
      if (!config.configured) {
        throw new Error(
          "Backend Auth0 config is incomplete. Add AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_AUDIENCE.",
        );
      }

      const response = await sendRuntimeMessage({
        type: "auth:login",
        config,
      });
      setSession(response.session || null);
      setStatus(
        `Signed in as ${response.session?.user?.email || response.session?.user?.name || "user"}`,
      );
    } catch (err) {
      setError(err.message || "Sign-in failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    setError("");
    setStatus("");

    try {
      await sendRuntimeMessage({ type: "auth:logout" });
      setSession(null);
      setActivePresets(new Set());
      setStatus("Signed out");
    } catch (err) {
      setError(err.message || "Sign-out failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const ensureContentScript = async (tabId) => {
    try {
      await chrome.tabs.sendMessage(tabId, { type: "ping" });
    } catch {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content_script.js"] });
      await new Promise(r => setTimeout(r, 150));
    }
  };

  const applyPreset = async (presetId, choice = null) => {
    setLoadingPresets(s => new Set([...s, presetId]));
    setError("");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab");

      await ensureContentScript(tab.id);

      // CSS-only presets
      if (CSS_PRESET_OPS[presetId]) {
        await chrome.tabs.sendMessage(tab.id, { type: "applyOps", ops: CSS_PRESET_OPS[presetId] });
        setActivePresets(s => new Set([...s, presetId]));
        return;
      }

      // Check for hardcoded demo preset first
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const demoOps = getDemoPreset(activeTab?.url || "", presetId);
      if (demoOps) {
        if (demoOps.__executeScript) {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: demoOps.__executeScript });
        } else {
          await chrome.tabs.sendMessage(tab.id, { type: "applyOps", ops: demoOps });
        }
        setActivePresets(s => new Set([...s, presetId]));
        return;
      }

      // AI presets — get page content
      setStatus("Reading page...");
      let pageText = "";
      let pageHTML = "";
      try {
        const txtRes = await chrome.tabs.sendMessage(tab.id, { type: "getPageText" });
        pageText = txtRes?.text || "";
      } catch (e) {
        throw new Error("getPageText failed: " + e.message);
      }
      try {
        const snapRes = await chrome.tabs.sendMessage(tab.id, { type: "getSnapshot" });
        pageHTML = (snapRes?.snapshot || []).map(el => `<${el.tag}>${el.text}</${el.tag}>`).join("\n").slice(0, 3000);
      } catch (e) {
        throw new Error("getSnapshot failed: " + e.message);
      }

      setStatus(`Calling AI (${pageText.length} chars)...`);
      const res = await fetch(`${BACKEND_URL}/preset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_id: presetId, pageText, pageHTML, choice }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Backend ${res.status}: ${detail}`);
      }
      const ops = await res.json();
      const opsSummary = `inject:${ops.inject?.length||0} hide:${ops.hide?.length||0} restyle:${Object.keys(ops.restyle||{}).length}`;
      setStatus(opsSummary);
      setLog(JSON.stringify(ops, null, 2));
      await chrome.tabs.sendMessage(tab.id, { type: "applyOps", ops });
      setActivePresets(s => new Set([...s, presetId]));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPresets(s => { const n = new Set(s); n.delete(presetId); return n; });
    }
  };

  const PRESET_DOM_IDS = {
    worldbuilder: ["ibrowse-worldbuilder"],
    soundtrack:   ["ibrowse-audio-ctrl"],
    conceptmap:   ["ibrowse-cmap-sidebar"],
    datavis:      ["ibrowse-datavis"],
    conversation: ["ibrowse-convo"],
  };

  const deactivatePreset = async (presetId) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const ids = PRESET_DOM_IDS[presetId] || [];
      if (tab?.id && ids.length) {
        await chrome.tabs.sendMessage(tab.id, { type: "removePreset", ids });
      }
    } catch {}
    setActivePresets(s => { const n = new Set(s); n.delete(presetId); return n; });
  };

  const handleClearAll = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "applyOps", ops: { remove:[], hide:[], restyle:{}, inject:[] } });
    } catch {}
    setActivePresets(new Set());
  };

  const handleTransform = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setLog("");
    setStatus("");
    setError("");

    try {
      const authSession = session;
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) throw new Error("No active tab found");

      let snapshot;
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: "getSnapshot",
        });
        snapshot = response.snapshot;
      } catch (e) {
        throw new Error(
          "Could not reach content script. Try refreshing the page.",
        );
      }

      const res = await fetch(`${BACKEND_URL}/transform`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authSession?.accessToken ? { Authorization: `Bearer ${authSession.accessToken}` } : {}),
        },
        body: JSON.stringify({ prompt: prompt.trim(), snapshot }),
      });

      if (res.status === 401) {
        setSession(null);
        await sendRuntimeMessage({ type: "auth:logout" });
        throw new Error("Your session expired. Sign in again to continue.");
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error ${res.status}: ${text}`);
      }

      const ops = await res.json();
      setLog(JSON.stringify(ops, null, 2));
      await chrome.tabs.sendMessage(tab.id, { type: "applyOps", ops });
      setStatus("Applied successfully");
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const signedIn = Boolean(session?.accessToken);
  const isDisabled = loading || !prompt.trim() || !signedIn;

  return (
    <>
      <style>{`
        @keyframes ttpage-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ttpage-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div className="orb" />
      <div className="orb2" />
      <div className="app-container">
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src="./logo.png"
                alt="Ibrowse"
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "13px",
                  objectFit: "cover",
                  boxShadow: "0 0 16px rgba(130,80,255,0.45), 0 0 6px rgba(34,211,238,0.2)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  background: "linear-gradient(135deg, #a5b4fc, #c4b5fd, #67e8f9)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px",
                }}
              >
                Ibrowse
              </span>
            </div>
            <div
              className="live-dot"
              title={signedIn ? "Signed in" : "Signed out"}
            />
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#475569",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              fontWeight: "500",
            }}
          >
            transform your web
          </div>
        </div>

        <div className="divider" />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "12px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                  fontWeight: "600",
                }}
              >
                Auth0 Access
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: signedIn ? "#e2e8f0" : "#94a3b8",
                  lineHeight: 1.4,
                }}
              >
                {signedIn
                  ? session.user?.email || session.user?.name || "Signed in"
                  : "Sign in before using presets or custom prompts."}
              </div>
            </div>
            {signedIn ? (
              <button
                onClick={handleLogout}
                disabled={authLoading}
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(248,113,113,0.25)",
                  background: "rgba(127,29,29,0.18)",
                  color: "#fecaca",
                  cursor: authLoading ? "not-allowed" : "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={handleLogin}
                disabled={authLoading}
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(103,232,249,0.28)",
                  background: "rgba(8,145,178,0.16)",
                  color: "#67e8f9",
                  cursor: authLoading ? "not-allowed" : "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                {authLoading ? "Checking..." : "Sign In"}
              </button>
            )}
          </div>
          {!signedIn && (
            <div
              style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.5 }}
            >
              Your Auth0 Universal Login can offer Google, GitHub, and
              email/password depending on the connections enabled in your Auth0
              app.
            </div>
          )}
        </div>

        <div className="divider" />

        {/* PRESET GALLERY */}
        <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
          {/* Gallery header */}
          <div onClick={() => setGalleryOpen(o => !o)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", padding:"2px 0" }}>
            <div style={{ fontSize:"11px", color:"#64748b", letterSpacing:"0.6px", textTransform:"uppercase", fontWeight:"600" }}>
              Quick Presets
              {activePresets.size > 0 && (
                <span style={{ marginLeft:"8px", background:"rgba(99,102,241,0.2)", color:"#818cf8", borderRadius:"999px", padding:"1px 7px", fontSize:"10px", fontWeight:"700" }}>
                  {activePresets.size} active
                </span>
              )}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              {activePresets.size > 0 && (
                <button onClick={e => { e.stopPropagation(); handleClearAll(); }} style={{ fontSize:"10px", color:"#ef4444", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"999px", padding:"2px 10px", cursor:"pointer", fontFamily:"inherit" }}>
                  Clear all
                </button>
              )}
              <span style={{ color:"#475569", fontSize:"12px", transition:"transform 0.2s", display:"inline-block", transform: galleryOpen ? "rotate(0deg)" : "rotate(-90deg)" }}>▾</span>
            </div>
          </div>

          {/* Cards */}
          <div style={{ overflowY: galleryOpen ? "auto" : "hidden", overflowX:"hidden", maxHeight: galleryOpen ? "420px" : "0", transition:"max-height 0.3s ease", display:"flex", flexDirection:"column", gap:"6px", paddingRight:"2px" }}>
            {PRESETS.map(preset => {
              const isActive = activePresets.has(preset.id);
              const isLoading = loadingPresets.has(preset.id);
              return (
                <div key={preset.id}>
                  <div
                    onClick={() => !isLoading && applyPreset(preset.id)}
                    style={{
                      height:"64px",
                      borderRadius:"12px",
                      border: isActive ? `1.5px solid ${preset.color}` : "0.5px solid rgba(255,255,255,0.07)",
                      background: isActive ? `${preset.color}14` : "rgba(255,255,255,0.02)",
                      display:"flex", alignItems:"center", padding:"0 14px", gap:"12px",
                      cursor: isLoading ? "default" : "pointer",
                      opacity: isLoading ? 0.7 : 1,
                      transition:"all 0.2s ease",
                    }}
                  >
                    {/* Dot / Spinner */}
                    <div style={{ flexShrink:0, width:"8px", height:"8px" }}>
                      {isLoading ? (
                        <div style={{ width:"14px", height:"14px", border:`2px solid ${preset.color}44`, borderTop:`2px solid ${preset.color}`, borderRadius:"50%", animation:"ttpage-spin 0.7s linear infinite", marginTop:"-3px", marginLeft:"-3px" }} />
                      ) : (
                        <div style={{ width:"8px", height:"8px", borderRadius:"50%", background: isActive ? preset.color : "rgba(255,255,255,0.15)", boxShadow: isActive ? `0 0 8px ${preset.color}` : "none", animation: isActive ? "ttpage-pulse 1.8s ease-in-out infinite" : "none" }} />
                      )}
                    </div>
                    {/* Text */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"13px", fontWeight:"600", color: isActive ? preset.color : "#e2e8f0", marginBottom:"2px" }}>{preset.label}</div>
                      <div style={{ fontSize:"11px", color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{preset.desc}</div>
                    </div>
                    {/* Active indicator */}
                    {isActive && !isLoading && (
                      <button onClick={e => { e.stopPropagation(); deactivatePreset(preset.id); }} style={{ fontSize:"10px", color:"#94a3b8", background:"transparent", border:"none", cursor:"pointer", flexShrink:0, padding:"4px" }}>✕</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="divider" />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flex: 1,
          }}
        >
          <label
            style={{
              fontSize: "11px",
              color: "#64748b",
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              fontWeight: "600",
            }}
          >
            Custom Instruction
          </label>
          <textarea
            style={{
              width: "100%",
              minHeight: "90px",
              background: "rgba(15,15,30,0.8)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: "12px",
              color: "#e2e8f0",
              padding: "12px 14px",
              fontSize: "14px",
              resize: "vertical",
              outline: "none",
              fontFamily: "'Space Grotesk', sans-serif",
              lineHeight: "1.6",
              transition: "border-color 0.2s, box-shadow 0.2s",
              backdropFilter: "blur(8px)",
              opacity: signedIn ? 1 : 0.6,
            }}
            placeholder={
              signedIn
                ? 'e.g. "hide all MrBeast videos" or "make all text blue"'
                : "Sign in to unlock prompting"
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                handleTransform();
            }}
            disabled={loading || !signedIn}
          />
          <div
            style={{ fontSize: "11px", color: "#334155", textAlign: "right" }}
          >
            ⌘↵ to run
          </div>
        </div>

        <button
          className="transform-btn"
          onClick={handleTransform}
          disabled={isDisabled}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Analyzing page...
            </>
          ) : signedIn ? (
            "Transform →"
          ) : (
            "Sign In First"
          )}
        </button>

        {status && (
          <div className="status-badge success">
            <span style={{ fontSize: "16px" }}>✦</span>
            {status}
          </div>
        )}

        {error && (
          <div className="status-badge error">
            <span style={{ fontSize: "14px" }}>⚠</span>
            <span style={{ wordBreak: "break-word" }}>{error}</span>
          </div>
        )}

        {log && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              className="log-header"
              onClick={() => setLogOpen((open) => !open)}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                  fontWeight: "600",
                }}
              >
                Ops JSON
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "#475569",
                  transition: "transform 0.2s",
                  display: "inline-block",
                  transform: logOpen ? "rotate(0deg)" : "rotate(-90deg)",
                }}
              >
                ▾
              </span>
            </div>
            {logOpen && <div className="log-box">{log}</div>}
          </div>
        )}

        <TalkToPage accessToken={session?.accessToken || ""} />
      </div>
    </>
  );
}

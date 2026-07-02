import React, { useState, useMemo } from "react";

// ── Canonicalization so "MB 228.3" == "MB-Approval 228.3" etc. ────────────────
function canon(s){
  let t = s.toUpperCase().trim();
  t = t.replace("MB-APPROVAL","MB").replace("APPROVAL","");
  t = t.replace("RENAULT TRUCKS","RENAULT").replace("RENAULT RLD","RLD").replace("RENAULT RD","RD").replace("RLD-","RLD").replace("RD-","RD");
  t = t.replace("DETROIT DIESEL","DETROIT").replace("DDC","DETROIT");
  t = t.replace("CATERPILLAR","CAT");
  t = t.replace("CUMMINS CES","CES").replace("CES ","CES");
  t = t.replace("MACK EOS","MACKEO-S").replace("EO-S 4.5","EOS4.5").replace("EOS 4.5","EOS4.5");
  t = t.replace("PREMIUM PLUS","PREMPLUS");
  t = t.replace("TYPE ","").replace("CATEGORY ","");
  t = t.replace("MAN M ","MAN").replace(" LA","");
  t = t.replace(/-1\b/,"");
  t = t.replace(/\s+/g,"");
  return t;
}

// ── Data (verified from published TDS, June 2026) ─────────────────────────────
const QALCO = {
  "traction-max-15w40": { name: "CEPSA TRACTION MAX 15W40", dpf:false,
    approvals:["API CI-4","ACEA E7","MAN M 3275-1","MB 228.3","VOLVO VDS-3","MACK EO-N","RENAULT RLD-2","CUMMINS CES 20078","MTU Type 2","DEUTZ DQC III-18","CAT ECF-2","JASO DH-1","SCANIA","DAF","IVECO"] },
  "traction-max-20w50": { name: "CEPSA TRACTION MAX 20W50", dpf:false,
    approvals:["API CH-4","MB 228.3","VOLVO VDS-2","RENAULT RD-2","MACK EO-M PLUS","CUMMINS CES 20077","MTU Type 2","DEUTZ DQC II-05","CAT ECF-1a","MAN M 3275-1"] },
  "traction-advanced-ls-15w40": { name: "CEPSA TRACTION ADVANCED LS 15W40", dpf:true,
    approvals:["API CK-4","ACEA E9","ACEA E7","VOLVO VDS-4.5","RENAULT RLD-3","MB 228.31","DETROIT 93K222","MACK EOS 4.5","MTU Type 2.1","CAT ECF-3","CUMMINS CES 20086","JASO DH-2","MAN M 3775","DEUTZ DQC III-18 LA","FORD WSS-M2C171-F1"] },
  "traction-advanced-le-10w40": { name: "CEPSA TRACTION ADVANCED LE 10W40", dpf:true,
    approvals:["API CJ-4","ACEA E6","ACEA E7","ACEA E9","MB 228.51","VOLVO VDS-4","MACK EO-O PREMIUM PLUS","MTU Type 3.1","DETROIT 93K218","DEUTZ DQC IV-10 LA","MAN M 3477","RENAULT RLD-3","CUMMINS CES 20081","CAT ECF-3","JASO DH-2","SCANIA LOW ASH"] },
};

const COMPETITORS = [
  { id:"shell-r4x", brand:"Shell", name:"Rimula R4 X 15W-40", dpf:false, tier:"Older engines · non-DPF",
    approvals:["API CI-4","ACEA E7","JASO DH-1","MB 228.3","MAN M 3275","VOLVO VDS-3","RENAULT RLD-2","CUMMINS CES 20078","CAT ECF-2","MACK EO-N"], match:"traction-max-15w40" },
  { id:"shell-r4l", brand:"Shell", name:"Rimula R4 L 15W-40", dpf:true, tier:"Low-SAPS · DPF · Euro V–VI",
    approvals:["API CK-4","API CJ-4","API CI-4 PLUS","ACEA E9","ACEA E7","CAT ECF-3","CUMMINS CES 20086","CUMMINS CES 20081","DETROIT 93K222","DEUTZ DQC III-10 LA","MAN M 3775","MB 228.31","MTU Type 2.1","JASO DH-2","VOLVO VDS-4.5","MACK EOS 4.5","RENAULT RLD-3","FORD WSS-M2C171-F1"], match:"traction-advanced-ls-15w40" },
  { id:"mobil-mx", brand:"Mobil", name:"Delvac MX 15W-40", dpf:false, tier:"Older engines · non-DPF",
    approvals:["API CI-4 PLUS","ACEA E7","MB 228.3","MAN M 3275","VOLVO VDS-3","CAT ECF-2","CUMMINS CES 20078","RENAULT RLD-2","MACK EO-N","API SL"], match:"traction-max-15w40" },
  { id:"mobil-esp", brand:"Mobil", name:"Delvac MX ESP / Modern 15W-40", dpf:true, tier:"Low-SAPS · DPF · Euro V–VI",
    approvals:["API CK-4","API CJ-4","API CI-4 PLUS","ACEA E9","MB 228.31","CUMMINS CES 20086","CUMMINS CES 20081","DETROIT 93K222","VOLVO VDS-4.5","MACK EOS 4.5","RENAULT RLD-3","MAN M 3775","CAT ECF-3","API SN"], match:"traction-advanced-ls-15w40" },
  { id:"total-7400", brand:"TotalEnergies", name:"Rubia TIR 7400 15W-40", dpf:false, tier:"Euro III–V · non-DPF",
    approvals:["API CI-4","ACEA E7","CUMMINS CES 20078","MACK EO-N","RENAULT RLD-2","VOLVO VDS-3","CAT ECF-1a","MAN M 3275","MB 228.3","SCANIA","DAF"], match:"traction-max-15w40" },
  { id:"total-7900", brand:"TotalEnergies", name:"Rubia TIR 7900 15W-40", dpf:true, tier:"Low-SAPS · DPF · Euro VI",
    approvals:["API CK-4","API CJ-4","API CI-4 PLUS","API CH-4","ACEA E9","ACEA E7","CUMMINS CES 20081","DETROIT 93K218","MACK EO-O PREMIUM PLUS","MAN M 3575","MB 228.31","RENAULT RLD-3","VOLVO VDS-4","CAT ECF-3"], match:"traction-advanced-ls-15w40" },
];

const BRAND_COLOR = { Shell:"#f6c244", Mobil:"#e35a4a", TotalEnergies:"#e873b6" };

function analyze(comp){
  const q = QALCO[comp.match];
  const qCanon = new Set(q.approvals.map(canon));
  const matched = comp.approvals.filter(a=>qCanon.has(canon(a)));
  const gaps = comp.approvals.filter(a=>!qCanon.has(canon(a)));
  const conf = Math.round(100*matched.length/comp.approvals.length);
  const extra = q.approvals.filter(a=> !comp.approvals.map(canon).includes(canon(a)));
  return { q, matched, gaps, extra, conf, dpfAligned: comp.dpf===q.dpf };
}

function confBand(c){
  if(c>=90) return { label:"Strong equivalent", color:"#4ea87a", bg:"#10211a", bd:"#244234" };
  if(c>=70) return { label:"Close equivalent — verify gaps", color:"#c7b07a", bg:"#221e10", bd:"#3a3115" };
  return { label:"Partial — review carefully", color:"#e09a73", bg:"#241710", bd:"#4a2f1e" };
}

export default function LubIQConquest(){
  const [selected, setSelected] = useState(null);
  const a = useMemo(()=> selected ? analyze(selected) : null, [selected]);
  const band = a ? confBand(a.conf) : null;

  return (
    <div style={{minHeight:"100vh", background:"#0e1411", color:"#e8efe9", fontFamily:"'IBM Plex Sans', system-ui, sans-serif", padding:"30px 18px"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap');
        .cmp{cursor:pointer;transition:border-color .15s, transform .15s, background .15s}
        .cmp:hover{transform:translateY(-2px);border-color:#3a6b51}
        button:focus-visible{outline:2px solid #4ea87a;outline-offset:2px}
        @media (prefers-reduced-motion: reduce){.cmp{transition:none}}
        @keyframes fillbar{from{width:0}}
      `}</style>
      <div style={{maxWidth:760, margin:"0 auto"}}>
        <div style={{display:"flex", alignItems:"baseline", gap:12, marginBottom:6}}>
          <span style={{fontFamily:"'IBM Plex Mono', monospace", fontSize:13, letterSpacing:"0.18em", color:"#4ea87a", fontWeight:600}}>LUB·IQ</span>
          <span style={{fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:"0.12em", color:"#5e7268"}}>CONQUEST · CROSS-REFERENCE</span>
        </div>
        <h1 style={{fontFamily:"'Fraunces', serif", fontWeight:600, fontSize:28, lineHeight:1.12, margin:"0 0 8px", color:"#f3f8f4"}}>
          What's the SPECTRO equivalent<br/>of the oil they run now?
        </h1>
        <p style={{color:"#9bb0a5", fontSize:14.5, margin:"0 0 22px", maxWidth:560}}>
          Pick the competitor product a customer currently uses. See the matching Qalco product, a confidence score from shared OEM approvals, and an honest list of any specifications that don't carry across.
        </p>

        {/* Competitor grid */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:10, marginBottom:24}}>
          {COMPETITORS.map(c=>(
            <div key={c.id} className="cmp" onClick={()=>setSelected(c)} style={{
              background: selected?.id===c.id ? "#16241c" : "#141c18",
              border:"1px solid "+(selected?.id===c.id ? "#4ea87a" : "#26352c"),
              borderRadius:11, padding:"13px 14px"
            }}>
              <div style={{display:"flex", alignItems:"center", gap:7, marginBottom:4}}>
                <span style={{width:8, height:8, borderRadius:"50%", background:BRAND_COLOR[c.brand]}}/>
                <span style={{fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:"#8aa096", letterSpacing:"0.06em"}}>{c.brand.toUpperCase()}</span>
              </div>
              <div style={{fontSize:14.5, fontWeight:600, color:"#eaf2ec", marginBottom:3}}>{c.name}</div>
              <div style={{fontSize:11.5, color: c.dpf?"#7fb0c7":"#b89a6a"}}>{c.tier}</div>
            </div>
          ))}
        </div>

        {/* Result */}
        {a && (
          <div style={{background:"#121a16", border:"1px solid #233029", borderRadius:14, padding:"20px 20px 22px"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14, flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:12, color:"#5e7268", fontFamily:"'IBM Plex Mono', monospace", letterSpacing:"0.08em", marginBottom:5}}>RECOMMENDED EQUIVALENT</div>
                <div style={{fontSize:13, color:"#8aa096", marginBottom:3}}>
                  <span style={{color:BRAND_COLOR[selected.brand]}}>{selected.brand} {selected.name}</span>
                  <span style={{color:"#4a5d52"}}>  →  </span>
                </div>
                <div style={{fontFamily:"'Fraunces', serif", fontSize:21, fontWeight:600, color:"#f3f8f4"}}>{a.q.name}</div>
              </div>
              <div style={{textAlign:"center", minWidth:96}}>
                <div style={{fontFamily:"'IBM Plex Mono', monospace", fontSize:34, fontWeight:600, color:band.color, lineHeight:1}}>{a.conf}<span style={{fontSize:16}}>%</span></div>
                <div style={{fontSize:10, color:"#5e7268", letterSpacing:"0.1em", marginTop:2}}>APPROVAL OVERLAP</div>
              </div>
            </div>

            {/* Confidence band */}
            <div style={{marginTop:14, marginBottom:4, background:band.bg, border:"1px solid "+band.bd, borderRadius:9, padding:"9px 13px", display:"flex", alignItems:"center", gap:10}}>
              <span style={{color:band.color, fontWeight:600, fontSize:13.5}}>{band.label}</span>
              <span style={{marginLeft:"auto", fontSize:12, color: a.dpfAligned ? "#86c7a3" : "#e09a73"}}>
                {a.dpfAligned ? "✓ DPF class aligned" : "⚠ DPF class differs — do not substitute"}
              </span>
            </div>

            {/* Bar */}
            <div style={{height:7, background:"#1c2620", borderRadius:4, overflow:"hidden", margin:"12px 0 18px"}}>
              <div style={{height:"100%", width:a.conf+"%", background:band.color, borderRadius:4, animation:"fillbar .5s ease"}}/>
            </div>

            {/* Comparison table */}
            <div style={{fontSize:12, color:"#5e7268", fontFamily:"'IBM Plex Mono', monospace", letterSpacing:"0.08em", marginBottom:9}}>
              APPROVAL-BY-APPROVAL · {selected.name}
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:5}}>
              {a.matched.map(m=>(
                <div key={m} style={{display:"flex", alignItems:"center", gap:9, background:"#10211a", border:"1px solid #1f3a2c", borderRadius:7, padding:"7px 11px"}}>
                  <span style={{color:"#4ea87a", fontSize:14, width:14}}>✓</span>
                  <span style={{fontSize:13, color:"#cfe0d6"}}>{m}</span>
                  <span style={{marginLeft:"auto", fontSize:11, color:"#5d7567", fontFamily:"'IBM Plex Mono', monospace"}}>covered</span>
                </div>
              ))}
              {a.gaps.map(g=>(
                <div key={g} style={{display:"flex", alignItems:"center", gap:9, background:"#241a12", border:"1px solid #443018", borderRadius:7, padding:"7px 11px"}}>
                  <span style={{color:"#e09a73", fontSize:14, width:14}}>!</span>
                  <span style={{fontSize:13, color:"#e6cdb6"}}>{g}</span>
                  <span style={{marginLeft:"auto", fontSize:11, color:"#9c7a55", fontFamily:"'IBM Plex Mono', monospace"}}>not listed — verify</span>
                </div>
              ))}
            </div>

            {a.extra.length>0 && (
              <div style={{marginTop:14}}>
                <div style={{fontSize:12, color:"#5e7268", marginBottom:7}}>The Qalco product additionally carries: </div>
                <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
                  {a.extra.map(e=>(
                    <span key={e} style={{fontSize:11.5, background:"#10211a", border:"1px solid #244234", borderRadius:6, padding:"3px 8px", color:"#86c7a3", fontFamily:"'IBM Plex Mono', monospace"}}>+ {e}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{marginTop:16, paddingTop:13, borderTop:"1px solid #1c2620", fontSize:11.5, color:"#6a8074", lineHeight:1.5}}>
              <strong style={{color:"#8aa096"}}>How to read this:</strong> "Covered" means {a.q.name} carries the same OEM approval the competitor lists. "Verify" items are approvals on the competitor sheet not currently listed on the Qalco data sheet — they may still be met but aren't published, so confirm before switching a fleet that specifically requires them.
            </div>
          </div>
        )}

        {!a && (
          <div style={{background:"#141c18", border:"1px dashed #2c3d33", borderRadius:12, padding:"26px", color:"#9bb0a5", fontSize:14, textAlign:"center"}}>
            Select a competitor product above to see its Qalco equivalent and the approval comparison.
          </div>
        )}

        <div style={{marginTop:24, fontSize:11, color:"#516359", lineHeight:1.55}}>
          Cross-reference is indicative, based on shared published specifications — not a manufacturer-certified interchange. Competitor approvals transcribed from public technical data sheets (Shell, ExxonMobil, TotalEnergies), June 2026, and may change. Always confirm against the current data sheet and the equipment maker's requirement before recommending a switch.
        </div>
      </div>
    </div>
  );
}

import { C0 } from "./styles";

export const COL0 = [C0.blue, C0.green, C0.orange, C0.purple, C0.teal, C0.red];

export function HBarSimple({ data, colors, label }) {
  const entries = Object.entries(data);
  const max = Math.max(...Object.values(data), 1);
  if (!entries.length) return <div style={{color:"#aaa",fontSize:12,textAlign:"center",padding:16}}>No {label} data</div>;
  return (
    <div>
      {entries.map(([k,v],i) => (
        <div key={i} style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:2}}>
            <span style={{color:"#555",fontWeight:600}}>{k}</span>
            <span style={{color:"#888"}}>{v}</span>
          </div>
          <div style={{height:16,background:"#f0f4f8",borderRadius:8,overflow:"hidden"}}>
            <div style={{width:`${(v/max)*100}%`,height:"100%",background:(Array.isArray(colors)?colors[i%colors.length]:colors)||C0.blue,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700,minWidth:24,transition:"width 0.5s"}}>{v}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function VBarSimple({ data, color, height=140 }) {
  const entries = Object.entries(data);
  const max = Math.max(...Object.values(data), 1);
  if (!entries.length) return <div style={{color:"#aaa",fontSize:12,textAlign:"center",padding:16}}>No data</div>;
  return (
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:10,height,overflowX:"auto",paddingBottom:20}}>
      {entries.map(([k,v],i) => {
        const h = Math.max((v/max)*(height-24),4);
        return (
          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:50}}>
            <div style={{fontSize:12,fontWeight:700,color:color||C0.blue,marginBottom:2}}>{v}</div>
            <div style={{width:36,height,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
              <div style={{width:"100%",height,background:"#f0f4f8",borderRadius:4,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",bottom:0,width:"100%",height:h,background:Array.isArray(color)?color[i%color.length]:color||C0.blue,borderRadius:4,transition:"height 0.5s"}}/>
              </div>
            </div>
            <div style={{fontSize:12,color:"#888",marginTop:4,textAlign:"center",maxWidth:60,lineHeight:1.2}}>{k}</div>
          </div>
        );
      })}
    </div>
  );
}

export function DonutSimple({ data, colors, size=120 }) {
  const total = Object.values(data).reduce((a,b)=>a+b,0);
  const entries = Object.entries(data).filter(([,v])=>v>0);
  if (!entries.length) return <div style={{color:"#aaa",fontSize:12,textAlign:"center",padding:16}}>No data</div>;
  const r=size/2-4,cx=size/2,cy=size/2;
  let cum=0; const segs=entries.map(([k,v],i)=>{const p=v/total,s=cum;cum+=p;return{key:k,value:v,pct:p,start:s,color:(Array.isArray(colors)?colors[i%colors.length]:colors)||"#ccc"};});
  const arc=(s,e)=>{
    if(e-s>=1)return`M${cx} ${cy} L${cx} ${cy-r} A${r} ${r} 0 1 1 ${cx-0.01} ${cy-r} Z`;
    const sx=cx+r*Math.sin(2*Math.PI*s),sy=cy-r*Math.cos(2*Math.PI*s);
    const ex=cx+r*Math.sin(2*Math.PI*e),ey=cy-r*Math.cos(2*Math.PI*e);
    return`M${cx} ${cy} L${sx} ${sy} A${r} ${r} 0 ${(e-s)>0.5?1:0} 1 ${ex} ${ey} Z`;
  };
  return(
    <div style={{display:"flex",alignItems:"center",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segs.map((s,i)=><path key={i} d={arc(s.start,s.start+s.pct)} fill={s.color} stroke="#fff" strokeWidth={1.5}/>)}
        <circle cx={cx} cy={cy} r={r*0.55} fill="#fff"/>
        <text x={cx} y={cy+1} textAnchor="middle" fontSize={size*0.12} fontWeight={700} fill="#333">{total}</text>
        <text x={cx} y={cy+size*0.06} textAnchor="middle" fontSize={size*0.065} fill="#aaa">Total</text>
      </svg>
      <div style={{display:"flex",flexDirection:"column",gap:2}}>
        {segs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:14}}><div style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}/><span style={{color:"#666"}}>{s.key}</span><span style={{fontWeight:700,color:"#333"}}>{s.value}</span><span style={{color:"#999",fontSize:13}}>({(s.pct*100).toFixed(1)}%)</span></div>)}
      </div>
    </div>
  );
}

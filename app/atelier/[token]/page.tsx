'use client';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';

function mediaUrl(key:string,token:string){return '/api/media?key='+encodeURIComponent(key)+'&token='+encodeURIComponent(token)}
function isVideoKey(key:string){return /\.(mp4|mov|webm)$/i.test(key)}
function fmt(d:string){try{return new Date(d+'T12:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}catch{return d}}

type Checklist={item:string,done:boolean,comment:string};
type PublicWorkshop={name:string,type:string,place:string,date:string,start:string,end:string,responsible:string,photosBefore:string[],photosAfter:string[]};

function MediaGrid({photos,token,onEnlarge}:{photos:string[],token:string,onEnlarge:(url:string)=>void}){
  if(!photos.length)return <p style={{color:'#71848f',margin:'4px 0 0'}}>Aucun fichier.</p>;
  return <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{photos.map((p,i)=>isVideoKey(p)
    ?<video key={i} src={mediaUrl(p,token)} controls style={{width:140,height:140,objectFit:'cover',borderRadius:8,background:'#000'}}/>
    :<img key={i} src={mediaUrl(p,token)} alt="" onClick={()=>onEnlarge(mediaUrl(p,token))} style={{width:140,height:140,objectFit:'cover',borderRadius:8,cursor:'zoom-in'}}/>)}</div>;
}

export default function Page(){
  const params=useParams<{token:string}>();
  const token=String(params?.token||'');
  const [workshop,setWorkshop]=useState<PublicWorkshop|null>(null);
  const [checklist,setChecklist]=useState<Checklist[]>([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [lightbox,setLightbox]=useState('');

  useEffect(()=>{
    if(!token){setLoading(false);setError('Lien invalide.');return}
    fetch('/api/public/workshop?token='+encodeURIComponent(token)).then(async r=>{
      const data=await r.json() as any;
      if(!r.ok)throw Error(data.error||'Atelier introuvable.');
      setWorkshop(data.workshop);setChecklist(data.checklist||[]);
    }).catch(e=>setError(e instanceof Error?e.message:String(e))).finally(()=>setLoading(false));
  },[token]);

  const wrap:React.CSSProperties={maxWidth:720,margin:'0 auto',padding:'32px 20px 60px',fontFamily:'system-ui,-apple-system,sans-serif',color:'#112f3d'};

  if(loading)return <div style={wrap}>Chargement…</div>;
  if(error||!workshop)return <div style={wrap}>
    <p style={{textTransform:'uppercase',fontSize:12,letterSpacing:'.5px',color:'#71848f',fontWeight:700}}>Le Cercle</p>
    <h1 style={{margin:'6px 0 10px',fontSize:22}}>Lien introuvable</h1>
    <p style={{color:'#475569'}}>{error||'Ce lien n’est plus valide, ou l’atelier a été supprimé.'}</p>
  </div>;

  const done=checklist.filter(c=>c.done).length;

  return <div style={wrap}>
    <p style={{textTransform:'uppercase',fontSize:12,letterSpacing:'.5px',color:'#71848f',fontWeight:700,margin:0}}>Le Cercle · Atelier</p>
    <h1 style={{margin:'6px 0 4px',fontSize:26}}>{workshop.name}</h1>
    <p style={{color:'#475569',margin:'0 0 24px'}}>{[workshop.type,workshop.place,fmt(workshop.date),workshop.start+'–'+workshop.end,workshop.responsible?'Responsable : '+workshop.responsible:''].filter(Boolean).join(' · ')}</p>

    <h2 style={{fontSize:17,margin:'0 0 10px'}}>Checklist de nettoyage ({done}/{checklist.length})</h2>
    <div style={{border:'1px solid #e2e8f0',borderRadius:10,overflow:'hidden',marginBottom:28}}>
      {checklist.map((c,i)=><div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',borderTop:i?'1px solid #e2e8f0':'none'}}>
        <span style={{width:20,height:20,borderRadius:5,background:c.done?'#1f9d55':'#e2e8f0',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0,marginTop:1}}>{c.done?'✓':''}</span>
        <div><div>{c.item}</div>{c.comment&&<div style={{fontSize:13,color:'#71848f'}}>{c.comment}</div>}</div>
      </div>)}
      {!checklist.length&&<div style={{padding:14,color:'#71848f'}}>Aucun élément dans cette checklist.</div>}
    </div>

    <h2 style={{fontSize:17,margin:'0 0 10px'}}>Avant l’atelier</h2>
    <div style={{marginBottom:28}}><MediaGrid photos={workshop.photosBefore} token={token} onEnlarge={setLightbox}/></div>

    <h2 style={{fontSize:17,margin:'0 0 10px'}}>Après l’atelier</h2>
    <MediaGrid photos={workshop.photosAfter} token={token} onEnlarge={setLightbox}/>

    {lightbox&&<div onClick={()=>setLightbox('')} style={{position:'fixed',inset:0,background:'rgba(17,47,61,.92)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,cursor:'zoom-out',zIndex:50}}>
      <img src={lightbox} alt="" style={{maxWidth:'92vw',maxHeight:'92vh',borderRadius:10,display:'block'}}/>
    </div>}
  </div>;
}

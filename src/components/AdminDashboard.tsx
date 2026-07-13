"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import type { ReactNode, CSSProperties } from "react";

// All data access goes through the auth-gated /api/admin/* routes — the
// dashboard deliberately does NOT load the client Firebase SDK (no CDN
// scripts, no direct Firestore reads).

const rp = (n: number) => `Rp ${(n||0).toLocaleString("id-ID")}`;
const fmtD = (d: string|null|undefined) => d ? new Date(d).toLocaleString("id-ID",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "";

const fileToDataURL = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new window.Image();
    img.onload = () => {
      const maxW = 800;
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) { resolve(reader.result as string); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("Invalid image"));
    img.src = reader.result as string;
  };
  reader.onerror = () => reject(new Error("Read failed"));
  reader.readAsDataURL(file);
});

interface OItem { name:string; weight:string; qty:number; price:number; subtotal:number; }
interface Order {
  id:string;
  items:OItem[];
  shipment:{id:string;label:string;price:number}|null;
  customer:{name:string;contact:string;address:string}|null;
  total:number;
  status:string;                  // "pending" | "shipped" | "cancelled"
  hasProof:boolean;               // proof image itself is fetched on demand
  createdAt:string;
  shippedAt:string|null;
  paymentVerified?:boolean;
  paymentVerifiedAt?:string;
  trackingCourier?:string;
  trackingNumber?:string;
  cancelledAt?:string;
  cancelReason?:string;
  internalNotes?:string;
}
interface Prod { id?:string; name:string; weight:string; price:number; origin:string; process:string; notes:string; cat:"filter"|"espresso"; img:string; available:boolean; stock?:number; createdAt?:string; }
const emptyProd:Prod = {name:"",weight:"",price:0,origin:"",process:"",notes:"",cat:"filter",img:"",available:true,stock:undefined};

const Ic = {
  refresh:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  download:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  check:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  undo:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  wa:<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.553 4.12 1.522 5.856L.058 23.65a.5.5 0 00.607.607l5.794-1.464A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82a9.82 9.82 0 01-5.233-1.504l-.375-.223-3.443.87.906-3.318-.248-.39A9.82 9.82 0 1121.82 12 9.83 9.83 0 0112 21.82z"/></svg>,
  chev:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  eye:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  plus:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  coffee:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg>,
  orders:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  chart:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  trend:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
};

const shortRp = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(Math.round(n));
};

const dayKey = (d: Date): number => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

export default function AdminDashboard() {
  const [loggedIn,setLoggedIn]=useState(false);
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [loginErr,setLoginErr]=useState("");
  const [loginLoading,setLoginLoading]=useState(false);
  const [tab,setTab]=useState<"orders"|"products"|"analytics">("orders");
  const [aRange,setARange]=useState<7|30|90|0>(30);

  const [orders,setOrders]=useState<Order[]>([]);
  const [oFilter,setOFilter]=useState("all");
  const [oSearch,setOSearch]=useState("");
  const [expanded,setExpanded]=useState<string|null>(null);
  const [updating,setUpdating]=useState<string|null>(null);
  const [refreshing,setRefreshing]=useState(false);
  const [loading,setLoading]=useState(false);
  // Proof modal: img is null while the on-demand fetch is in flight.
  const [proofModal,setProofModal]=useState<{id:string;img:string|null}|null>(null);

  const [prods,setProds]=useState<Prod[]>([]);
  const [pLoading,setPLoading]=useState(false);
  const [showForm,setShowForm]=useState(false);
  const [editP,setEditP]=useState<Prod|null>(null);
  const [pForm,setPForm]=useState<Prod>({...emptyProd});
  const [pSaving,setPSaving]=useState(false);
  const [delConfirm,setDelConfirm]=useState<string|null>(null);
  const [dragOver,setDragOver]=useState(false);
  const [imgUploading,setImgUploading]=useState(false);
  const [imgErr,setImgErr]=useState("");
  const [flash,setFlash]=useState<{msg:string;kind:"error"|"success"}|null>(null);
  const fileInputRef=useRef<HTMLInputElement|null>(null);
  const flashTimer=useRef<number|undefined>(undefined);

  const showFlash=(msg:string,kind:"error"|"success"="error")=>{
    setFlash({msg,kind});
    window.clearTimeout(flashTimer.current);
    flashTimer.current=window.setTimeout(()=>setFlash(null),3500);
  };

  const getToken=()=>{try{return window.sessionStorage?.getItem("asuka_admin_token")??"";}catch{return "";}};

  // Authenticated JSON call to an admin API route. On 401 (expired/invalid
  // session) it logs the admin out so they re-authenticate. Returns null on any
  // failure (after surfacing a message) so callers can bail cleanly.
  interface ApiData{orders?:Order[];products?:Prod[];proof?:string|null;update?:Record<string,unknown>;removed?:string[];id?:string;error?:string;}
  const adminApi=async(url:string,method:string,body?:unknown):Promise<ApiData|null>=>{
    let res:Response;
    try{
      res=await fetch(url,{method,headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`},body:body===undefined?undefined:JSON.stringify(body)});
    }catch{showFlash("Tidak bisa terhubung ke server.");return null;}
    if(res.status===401){setLoggedIn(false);try{window.sessionStorage?.removeItem("asuka_admin_token");}catch{}showFlash("Sesi berakhir. Silakan login lagi.");return null;}
    let data:ApiData|null=null;try{data=await res.json();}catch{}
    if(!res.ok){showFlash(data?.error||"Operasi gagal.");return null;}
    return data??{};
  };

  const handleImageFile=async(file:File|null|undefined)=>{
    setImgErr("");
    if(!file)return;
    if(!file.type.startsWith("image/")){setImgErr("File harus berupa gambar.");return;}
    if(file.size>8*1024*1024){setImgErr("Ukuran maksimal 8MB.");return;}
    setImgUploading(true);
    try{const data=await fileToDataURL(file);setPForm(p=>({...p,img:data}));}
    catch{setImgErr("Gagal membaca gambar.");}
    finally{setImgUploading(false);}
  };

  const fetchOrders=async()=>{setRefreshing(true);try{const data=await adminApi("/api/admin/orders","GET");if(data?.orders)setOrders(data.orders as Order[]);}finally{setRefreshing(false);}};
  const fetchProds=async()=>{setPLoading(true);try{const data=await adminApi("/api/admin/products","GET");if(data?.products)setProds(data.products as Prod[]);}finally{setPLoading(false);}};

  // Payment proofs are excluded from the order list (they're big base64
  // blobs) — fetch a single one only when the admin opens it.
  const openProof=async(orderId:string)=>{
    setProofModal({id:orderId,img:null});
    const data=await adminApi(`/api/admin/orders?proof=${encodeURIComponent(orderId)}`,"GET");
    if(!data){setProofModal(null);return;}
    if(!data.proof){setProofModal(null);showFlash("Bukti pembayaran tidak ditemukan.");return;}
    setProofModal(cur=>cur&&cur.id===orderId?{id:orderId,img:data.proof as string}:cur);
  };

  // Escape closes whichever overlay is open (proof modal / product form).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setProofModal(null);
      setShowForm(false);
      setEditP(null);
      setDelConfirm(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (typeof window === "undefined") return;
        const token = window.sessionStorage?.getItem("asuka_admin_token");
        if (!token) return;
        // Verify the stored token is still valid before trusting the session.
        const r = await fetch("/api/admin/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const d = await r.json();
        if (!d.valid) {
          window.sessionStorage?.removeItem("asuka_admin_token");
          return;
        }
        if (typeof d.user === "string") setUsername(d.user);
        setLoggedIn(true);
        setLoading(true);
        Promise.all([fetchOrders(), fetchProds()]).finally(() => setLoading(false));
      } catch {
        // Network error etc — fail closed (don't auto-login)
      }
    })();
  }, []);

  const handleLogin=async()=>{setLoginErr("");setLoginLoading(true);try{const r=await fetch("/api/admin/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});const d=await r.json();if(r.ok&&d.success){setLoggedIn(true);setPassword("");try{window.sessionStorage?.setItem("asuka_admin_token",d.token);}catch{}setLoading(true);Promise.all([fetchOrders(),fetchProds()]).finally(()=>setLoading(false));}else{setLoginErr(d.error||"Login gagal.");}}catch{setLoginErr("Tidak bisa connect.");}finally{setLoginLoading(false);}};
  const handleLogout=()=>{setLoggedIn(false);setUsername("");setPassword("");setOrders([]);setProds([]);try{window.sessionStorage?.removeItem("asuka_admin_token");}catch{}};

  // Guard against CSV/formula injection: a field starting with = + - @ (or a
  // control char) can execute as a formula when the file is opened in Excel/
  // Sheets. Prefix those with a single quote, then quote/escape for CSV.
  const csvCell=(v:string|number):string=>{
    let s=String(v??"");
    if(/^[=+\-@\t\r]/.test(s))s="'"+s;
    return `"${s.replace(/"/g,'""')}"`;
  };
  const downloadCSV=()=>{const l=filteredOrders;const h=["Order ID","Tanggal","Nama","WA","Alamat","Items","Pengiriman","Ongkir","Total","Status","Tgl Kirim"];const rows=l.map(o=>[o.id,fmtD(o.createdAt),o.customer?.name??"",o.customer?.contact??"",o.customer?.address??"",(o.items??[]).map(i=>`${i.name} x${i.qty}`).join("; "),o.shipment?.label??"",o.shipment?.price??0,o.total??0,o.status??"pending",o.shippedAt?fmtD(o.shippedAt):""].map(csvCell));const csv=[h.map(csvCell).join(","),...rows.map(r=>r.join(","))].join("\n");const b=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`asuka-orders-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(u);};

  const needsVerify=(o:Order):boolean=>o.hasProof&&!o.paymentVerified&&o.status!=="cancelled";

  const getFilteredOrders=():Order[]=>{
    let l=orders;
    if(oFilter==="pending")l=l.filter(o=>o.status!=="shipped"&&o.status!=="cancelled");
    if(oFilter==="shipped")l=l.filter(o=>o.status==="shipped");
    if(oFilter==="cancelled")l=l.filter(o=>o.status==="cancelled");
    if(oFilter==="needs-verify")l=l.filter(needsVerify);
    if(oSearch.trim()){
      const q=oSearch.toLowerCase();
      l=l.filter(o=>(o.customer?.name??"").toLowerCase().includes(q)||(o.customer?.contact??"").includes(q)||o.id.toLowerCase().includes(q));
    }
    return l;
  };
  const filteredOrders=getFilteredOrders();
  const oS={
    all:orders.length,
    pending:orders.filter(o=>o.status!=="shipped"&&o.status!=="cancelled").length,
    shipped:orders.filter(o=>o.status==="shipped").length,
    cancelled:orders.filter(o=>o.status==="cancelled").length,
    needsVerify:orders.filter(needsVerify).length,
    // Revenue excludes cancelled orders.
    rev:orders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+(o.total??0),0),
  };

  const analytics=useMemo(()=>{
    const now=Date.now();
    const days=aRange===0?Math.max(1,Math.min(90,Math.ceil((now-Math.min(now,...orders.map(o=>o.createdAt?new Date(o.createdAt).getTime():now)))/86400000)+1)):aRange;
    const cutoff=aRange===0?0:now-aRange*86400000;
    // Analytics excludes cancelled orders — they shouldn't inflate revenue/conversion.
    const inRange=orders.filter(o=>o.status!=="cancelled"&&o.createdAt&&new Date(o.createdAt).getTime()>=cutoff);
    const cancelledInRange=orders.filter(o=>o.status==="cancelled"&&o.createdAt&&new Date(o.createdAt).getTime()>=cutoff);
    // Daily buckets
    const today=new Date();today.setHours(0,0,0,0);
    const buckets:{date:Date;revenue:number;count:number}[]=[];
    for(let i=days-1;i>=0;i--){
      const d=new Date(today.getTime()-i*86400000);
      buckets.push({date:d,revenue:0,count:0});
    }
    const idxByKey=new Map<number,number>();
    buckets.forEach((b,i)=>idxByKey.set(dayKey(b.date),i));
    inRange.forEach(o=>{
      if(!o.createdAt)return;
      const k=dayKey(new Date(o.createdAt));
      const idx=idxByKey.get(k);
      if(idx!==undefined){buckets[idx].revenue+=o.total??0;buckets[idx].count+=1;}
    });
    // Top products
    const prodMap=new Map<string,{qty:number;rev:number}>();
    inRange.forEach(o=>(o.items??[]).forEach(it=>{
      const cur=prodMap.get(it.name)??{qty:0,rev:0};
      cur.qty+=it.qty;cur.rev+=it.subtotal??(it.price*it.qty);
      prodMap.set(it.name,cur);
    }));
    const topProducts=[...prodMap.entries()].map(([name,v])=>({name,...v})).sort((a,b)=>b.rev-a.rev).slice(0,5);
    // Shipping mix
    const shipMap=new Map<string,number>();
    inRange.forEach(o=>{const l=o.shipment?.label??"—";shipMap.set(l,(shipMap.get(l)??0)+1);});
    const shipMix=[...shipMap.entries()].map(([label,count])=>({label,count}));
    const totalRev=inRange.reduce((s,o)=>s+(o.total??0),0);
    const totalOrders=inRange.length;
    const shipped=inRange.filter(o=>o.status==="shipped").length;
    const pending=totalOrders-shipped;
    const avg=totalOrders?totalRev/totalOrders:0;
    const conv=totalOrders?(shipped/totalOrders)*100:0;
    const cancelled=cancelledInRange.length;
    const totalIncCancelled=totalOrders+cancelled;
    const cancelRate=totalIncCancelled?(cancelled/totalIncCancelled)*100:0;
    // Recent activity
    const recent=[...inRange].sort((a,b)=>(new Date(b.createdAt).getTime())-(new Date(a.createdAt).getTime())).slice(0,6);
    return{buckets,topProducts,shipMix,totalRev,totalOrders,shipped,pending,avg,conv,cancelled,cancelRate,recent};
  },[orders,aRange]);

  // Real-time (not period-based) operational signals
  const awaitingVerifyCount=oS.needsVerify;
  const outOfStockProds=prods.filter(p=>p.stock===0);
  const lowStockProds=prods.filter(p=>p.stock!==undefined&&p.stock!==null&&p.stock>0&&p.stock<=5);

  const openAdd=()=>{setPForm({...emptyProd});setEditP(null);setShowForm(true);};
  const openEdit=(p:Prod)=>{setPForm({...p});setEditP(p);setShowForm(true);};
  const closeForm=()=>{setShowForm(false);setEditP(null);setPForm({...emptyProd});};

  const saveProd=async()=>{
    if(!pForm.name||!pForm.weight||!pForm.price)return;
    setPSaving(true);
    try{
      const data:Record<string,unknown>={name:pForm.name,weight:pForm.weight,price:Number(pForm.price),origin:pForm.origin,process:pForm.process,notes:pForm.notes,cat:pForm.cat,img:pForm.img,available:pForm.available};
      // Only persist stock when admin actually typed a number (stays "untracked" otherwise).
      if(pForm.stock!==undefined&&pForm.stock!==null&&!Number.isNaN(pForm.stock))data.stock=Number(pForm.stock);
      if(editP?.id){
        const r=await adminApi("/api/admin/products","PATCH",{id:editP.id,data});
        if(!r)return;
        setProds(p=>p.map(pr=>pr.id===editP.id?{...pr,...data}as Prod:pr));
      }else{
        const r=await adminApi("/api/admin/products","POST",data);
        if(!r)return;
        setProds(p=>[{id:r.id,...data,createdAt:new Date().toISOString()}as Prod,...p]);
      }
      closeForm();
      showFlash(editP?"Produk diupdate.":"Produk ditambahkan.","success");
    }finally{setPSaving(false);}
  };

  // ── ORDER ACTIONS ── (all writes go through the auth-gated admin API)
  // The server validates the state transition against the CURRENT document and
  // returns the fields it actually wrote — local state mirrors that response
  // instead of guessing timestamps/values client-side.
  const orderAction=async(id:string,payload:Record<string,unknown>,successMsg?:string):Promise<boolean>=>{
    setUpdating(id);
    try{
      const r=await adminApi("/api/admin/orders","PATCH",{id,...payload});
      if(!r)return false;
      setOrders(p=>p.map(o=>{
        if(o.id!==id)return o;
        const next:Record<string,unknown>={...o,...(r.update??{})};
        for(const k of (r.removed??[])as string[])delete next[k];
        return next as unknown as Order;
      }));
      if(successMsg)showFlash(successMsg,"success");
      return true;
    }finally{setUpdating(null);}
  };

  const verifyPayment=(id:string)=>orderAction(id,{action:"verify"},"Pembayaran diverifikasi.");
  const markShipped=(id:string,courier:string,resi:string)=>{
    if(!courier.trim()||!resi.trim()){showFlash("Isi courier dan no. resi dulu.");return Promise.resolve(false);}
    return orderAction(id,{action:"ship",courier:courier.trim(),resi:resi.trim()},"Order ditandai shipped.");
  };
  const undoShipped=(id:string)=>orderAction(id,{action:"undo"},"Order dikembalikan ke pending.");
  const cancelOrder=(id:string,reason:string)=>{
    if(!reason.trim())return Promise.resolve(false);
    return orderAction(id,{action:"cancel",reason:reason.trim()},"Order dibatalkan. Stok produk (pending) dikembalikan.");
  };
  const saveNotes=(id:string,notes:string)=>orderAction(id,{action:"notes",notes},"Catatan disimpan.");

  const toggleAvail=async(id:string,cur:boolean)=>{const r=await adminApi("/api/admin/products","PATCH",{id,data:{available:!cur}});if(!r)return;setProds(p=>p.map(pr=>pr.id===id?{...pr,available:!cur}:pr));};
  const deleteProd=async(id:string)=>{const r=await adminApi("/api/admin/products","DELETE",{id});if(!r)return;setProds(p=>p.filter(pr=>pr.id!==id));setDelConfirm(null);showFlash("Produk dihapus.","success");};

  const inp:CSSProperties={width:"100%",padding:"11px 14px",borderRadius:10,border:"1.5px solid #262626",fontSize:14,background:"#1a1a1a",color:"#e8e4df",fontFamily:"var(--font-dm-sans),sans-serif"};
  const lab:CSSProperties={fontSize:11,fontWeight:600,color:"#666",marginBottom:5,display:"block",letterSpacing:.3};
  const tb:CSSProperties={display:"flex",alignItems:"center",justifyContent:"center",padding:"8px 12px",borderRadius:8,border:"1.5px solid #262626",background:"transparent",color:"#777",cursor:"pointer"};

  return (
    <div style={{fontFamily:"var(--font-dm-sans),sans-serif",background:"#111",color:"#e8e4df",minHeight:"100vh"}}>

      {!loggedIn&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20}}>
          <div style={{width:"100%",maxWidth:360,animation:"fadeUp .5s ease"}}>
            <div style={{textAlign:"center",marginBottom:32}}><div style={{fontSize:28,marginBottom:8}}>☕</div><h1 style={{fontFamily:"var(--font-cormorant),serif",color:"#e8e4df",fontSize:24}}>Asuka Admin</h1><p style={{color:"#555",fontSize:13,marginTop:4}}>Login untuk mengelola pesanan & produk</p></div>
            <form onSubmit={e=>{e.preventDefault();handleLogin();}} style={{background:"#1a1a1a",borderRadius:16,padding:24,border:"1px solid #262626"}}>
              <div style={{marginBottom:14}}><label htmlFor="admin-user" style={lab}>Username</label><input id="admin-user" name="username" type="text" autoComplete="username" autoFocus value={username} onChange={e=>setUsername(e.target.value)} placeholder="admin" style={inp} disabled={loginLoading}/></div>
              <div style={{marginBottom:18}}><label htmlFor="admin-pass" style={lab}>Password</label><input id="admin-pass" name="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={inp} disabled={loginLoading}/></div>
              {loginErr&&<p role="alert" style={{color:"#e85d4a",fontSize:12,marginBottom:14,background:"rgba(232,93,74,.08)",padding:"8px 12px",borderRadius:8}}>{loginErr}</p>}
              <button type="submit" disabled={loginLoading} style={{width:"100%",background:loginLoading?"#2a3a2b":"#3d5a3e",color:"#f4f1eb",border:"none",padding:"13px",borderRadius:10,fontSize:14,fontWeight:600,cursor:loginLoading?"wait":"pointer"}}>{loginLoading?"Checking...":"Sign In"}</button>
            </form>
          </div>
        </div>
      )}

      {loggedIn&&(<>
        {flash&&(<div role="status" style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:300,padding:"10px 18px",borderRadius:10,fontSize:13,fontWeight:600,boxShadow:"0 8px 30px rgba(0,0,0,.4)",animation:"fadeUp .25s ease",
          background:flash.kind==="success"?"#16241a":"#2a1a1a",
          border:flash.kind==="success"?"1px solid rgba(127,170,128,.4)":"1px solid rgba(232,93,74,.4)",
          color:flash.kind==="success"?"#9ec89f":"#e8a89a"}}>{flash.msg}</div>)}
        <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 24px",borderBottom:"1px solid #1a1a1a",background:"#111",position:"sticky",top:0,zIndex:50}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>☕</span><span style={{fontFamily:"var(--font-cormorant),serif",fontSize:16,fontWeight:600,color:"#e8e4df",letterSpacing:1}}>ASUKA ADMIN</span></div>
          <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:12,color:"#555"}}>{username}</span><button onClick={handleLogout} style={{background:"none",border:"1px solid #2a2a2a",color:"#777",padding:"5px 14px",borderRadius:6,fontSize:11,cursor:"pointer",fontWeight:500}}>Logout</button></div>
        </header>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:"1px solid #1e1e1e",background:"#141414"}}>
          {([{k:"orders" as const,l:"Orders",ic:Ic.orders},{k:"analytics" as const,l:"Analytics",ic:Ic.chart},{k:"products" as const,l:"Products",ic:Ic.coffee}]).map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,padding:"14px 0",display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"transparent",border:"none",borderBottom:tab===t.k?"2px solid #7faa80":"2px solid transparent",color:tab===t.k?"#7faa80":"#555",fontSize:13,fontWeight:600,cursor:"pointer"}}>{t.ic} {t.l}</button>
          ))}
        </div>

        <div style={{padding:"24px 24px 60px",maxWidth:1040,margin:"0 auto"}}>

          {/* ═══ ORDERS ═══ */}
          {tab==="orders"&&(<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:28}}>
              {([{l:"Total",v:String(oS.all),c:"#7faa80"},{l:"Pending",v:String(oS.pending),c:"#e8a838"},{l:"Shipped",v:String(oS.shipped),c:"#5a9a7a"},{l:"Revenue",v:rp(oS.rev),c:"#7faa80"}]as const).map((s,i)=>(
                <div key={i} style={{background:"#161616",borderRadius:14,padding:"18px 16px",border:"1px solid #1e1e1e"}}><div style={{fontSize:11,color:"#555",fontWeight:600,letterSpacing:.5,textTransform:"uppercase",marginBottom:6}}>{s.l}</div><div style={{fontSize:26,fontWeight:700,color:s.c}}>{s.v}</div></div>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:16}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[
                  {k:"all",l:`All (${oS.all})`,c:undefined},
                  {k:"pending",l:`Pending (${oS.pending})`,c:undefined},
                  {k:"needs-verify",l:`Need Verify (${oS.needsVerify})`,c:oS.needsVerify>0?"#e8a838":undefined},
                  {k:"shipped",l:`Shipped (${oS.shipped})`,c:undefined},
                  {k:"cancelled",l:`Cancelled (${oS.cancelled})`,c:undefined},
                ].map(f=>{
                  const active=oFilter===f.k;
                  const accent=f.c;
                  return (
                    <button key={f.k} onClick={()=>setOFilter(f.k)} style={{
                      padding:"7px 16px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
                      border:active?`1.5px solid ${accent??"#3d5a3e"}`:`1.5px solid ${accent?accent+"55":"#262626"}`,
                      background:active?(accent?accent+"22":"rgba(61,90,62,.15)"):"transparent",
                      color:active?(accent??"#7faa80"):(accent??"#666"),
                    }}>{f.l}</button>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",flex:"1 1 260px",justifyContent:"flex-end"}}>
                <input type="search" aria-label="Cari order (nama, WA, atau order ID)" placeholder="Cari nama / WA / ID..." value={oSearch} onChange={e=>setOSearch(e.target.value)} style={{...inp,flex:"1 1 140px",maxWidth:240,padding:"8px 12px",fontSize:12}}/>
                <button onClick={fetchOrders} aria-label="Refresh daftar order" title="Refresh" style={tb}><span style={{display:"flex",animation:refreshing?"spin .8s linear infinite":"none"}}>{Ic.refresh}</span></button>
                <button onClick={downloadCSV} aria-label="Download CSV order" style={{...tb,background:"#3d5a3e",color:"#e8e4df",borderColor:"#3d5a3e"}}>{Ic.download}<span style={{marginLeft:5,fontSize:11,fontWeight:600}}>CSV</span></button>
              </div>
            </div>
            {loading&&<div style={{textAlign:"center",padding:"60px 20px",color:"#555"}}>Loading...</div>}
            {!loading&&filteredOrders.length===0&&<div style={{textAlign:"center",padding:"60px 20px",color:"#444"}}>Tidak ada order.</div>}
            {!loading&&filteredOrders.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8}}>{filteredOrders.map(o=>(
              <ORow
                key={o.id}
                o={o}
                exp={expanded===o.id}
                toggle={()=>setExpanded(expanded===o.id?null:o.id)}
                busy={updating===o.id}
                onProof={()=>openProof(o.id)}
                onVerify={()=>verifyPayment(o.id)}
                onShip={(c,r)=>markShipped(o.id,c,r)}
                onUndoShip={()=>undoShipped(o.id)}
                onCancel={(reason)=>cancelOrder(o.id,reason)}
                onSaveNotes={(notes)=>saveNotes(o.id,notes)}
              />
            ))}</div>}
          </>)}

          {/* ═══ ANALYTICS ═══ */}
          {tab==="analytics"&&(<>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
              <div>
                <h2 style={{fontSize:20,fontWeight:700,color:"#e8e4df"}}>Analytics</h2>
                <p style={{fontSize:12,color:"#555",marginTop:2}}>Insight bisnis dari data order kamu</p>
              </div>
              <div style={{display:"flex",gap:6,background:"#161616",border:"1px solid #1e1e1e",borderRadius:10,padding:4}}>
                {([{k:7 as const,l:"7 Hari"},{k:30 as const,l:"30 Hari"},{k:90 as const,l:"90 Hari"},{k:0 as const,l:"Semua"}]).map(r=>(
                  <button key={r.k} onClick={()=>setARange(r.k)} style={{padding:"7px 14px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",border:"none",background:aRange===r.k?"#3d5a3e":"transparent",color:aRange===r.k?"#e8e4df":"#666",transition:"all .15s"}}>{r.l}</button>
                ))}
              </div>
            </div>

            {loading&&<div style={{textAlign:"center",padding:"60px 20px",color:"#555"}}>Loading...</div>}
            {!loading&&analytics.totalOrders===0&&(
              <div style={{textAlign:"center",padding:"80px 20px",color:"#444",background:"#161616",borderRadius:14,border:"1px solid #1e1e1e"}}>
                <div style={{opacity:.4,marginBottom:12,display:"flex",justifyContent:"center"}}>{Ic.chart}</div>
                <p style={{fontSize:14,color:"#666"}}>Belum ada data untuk periode ini.</p>
                <p style={{fontSize:12,color:"#444",marginTop:6}}>Coba pilih rentang waktu lain.</p>
              </div>
            )}
            {!loading&&analytics.totalOrders>0&&(<>
              {/* KPI Row — 6 cards: 4 business metrics + 2 action signals */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:14}}>
                <KPI label="Revenue" value={rp(analytics.totalRev)} accent="#7faa80" sub={`${analytics.totalOrders} order`}/>
                <KPI label="Avg Order Value" value={rp(Math.round(analytics.avg))} accent="#e8a838" sub="per pesanan"/>
                <KPI label="Conversion" value={`${analytics.conv.toFixed(0)}%`} accent="#5a9a7a" sub={`${analytics.shipped} dikirim`}/>
                <KPI label="Pending" value={String(analytics.pending)} accent="#e85d4a" sub="menunggu kirim"/>
                <KPI label="Cancel Rate" value={`${analytics.cancelRate.toFixed(0)}%`} accent="#a85d72" sub={`${analytics.cancelled} dibatalkan`}/>
                <KPI label="Awaiting Verify" value={String(awaitingVerifyCount)} accent="#c4a132" sub={awaitingVerifyCount>0?"perlu tindakan":"semua aman"}/>
              </div>

              {/* Action banner: only show if there's something to do */}
              {(awaitingVerifyCount>0||outOfStockProds.length>0||lowStockProds.length>0)&&(
                <div style={{background:"rgba(232,168,56,0.06)",border:"1px solid rgba(232,168,56,0.22)",borderRadius:12,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                  <div style={{fontSize:18}}>⚠️</div>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#e8a838",letterSpacing:.5,textTransform:"uppercase",marginBottom:4}}>Perlu Tindakan</div>
                    <div style={{fontSize:13,color:"#bbb",lineHeight:1.55}}>
                      {awaitingVerifyCount>0&&<span><b style={{color:"#e8e4df"}}>{awaitingVerifyCount}</b> order belum diverifikasi</span>}
                      {awaitingVerifyCount>0&&(outOfStockProds.length>0||lowStockProds.length>0)&&<span style={{color:"#555"}}> · </span>}
                      {outOfStockProds.length>0&&<span><b style={{color:"#e85d4a"}}>{outOfStockProds.length}</b> produk habis stok</span>}
                      {outOfStockProds.length>0&&lowStockProds.length>0&&<span style={{color:"#555"}}> · </span>}
                      {lowStockProds.length>0&&<span><b style={{color:"#e8a838"}}>{lowStockProds.length}</b> produk stok rendah</span>}
                    </div>
                  </div>
                  {awaitingVerifyCount>0&&(
                    <button onClick={()=>{setTab("orders");setOFilter("needs-verify");}} style={{padding:"7px 14px",borderRadius:8,border:"none",background:"#e8a838",color:"#1a1a1a",fontSize:11,fontWeight:700,letterSpacing:.4,textTransform:"uppercase",cursor:"pointer"}}>Lihat order</button>
                  )}
                  {(outOfStockProds.length>0||lowStockProds.length>0)&&(
                    <button onClick={()=>setTab("products")} style={{padding:"7px 14px",borderRadius:8,border:"1px solid #2a2a2a",background:"transparent",color:"#aaa",fontSize:11,fontWeight:700,letterSpacing:.4,textTransform:"uppercase",cursor:"pointer"}}>Restock</button>
                  )}
                </div>
              )}

              {/* Revenue Trend */}
              <div style={{background:"#161616",borderRadius:14,border:"1px solid #1e1e1e",padding:"22px 24px",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
                  <div>
                    <div style={{fontSize:12,color:"#555",fontWeight:600,letterSpacing:.4,textTransform:"uppercase"}}>Revenue Trend</div>
                    <div style={{fontSize:18,fontWeight:700,color:"#e8e4df",marginTop:4}}>{rp(analytics.totalRev)}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:6,background:"rgba(127,170,128,.1)",color:"#7faa80",fontSize:11,fontWeight:600}}>{Ic.trend} {aRange===0?"All time":`Last ${aRange}d`}</div>
                </div>
                <RevenueChart buckets={analytics.buckets}/>
              </div>

              {/* Donut + Top Products */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:16}}>
                <div style={{background:"#161616",borderRadius:14,border:"1px solid #1e1e1e",padding:"22px 24px"}}>
                  <div style={{fontSize:12,color:"#555",fontWeight:600,letterSpacing:.4,textTransform:"uppercase",marginBottom:18}}>Status Pesanan</div>
                  <StatusDonut shipped={analytics.shipped} pending={analytics.pending}/>
                </div>
                <div style={{background:"#161616",borderRadius:14,border:"1px solid #1e1e1e",padding:"22px 24px"}}>
                  <div style={{fontSize:12,color:"#555",fontWeight:600,letterSpacing:.4,textTransform:"uppercase",marginBottom:18}}>Top Beans (by Revenue)</div>
                  {analytics.topProducts.length===0?(
                    <div style={{textAlign:"center",padding:"30px 0",color:"#444",fontSize:12}}>Belum ada penjualan</div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>
                      {(()=>{const max=Math.max(...analytics.topProducts.map(p=>p.rev));return analytics.topProducts.map((p,i)=>(
                        <div key={p.name}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5}}>
                            <span style={{fontSize:12.5,color:"#e8e4df",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"60%"}}>{i+1}. {p.name}</span>
                            <span style={{fontSize:11.5,color:"#7faa80",fontWeight:700}}>{rp(p.rev)}</span>
                          </div>
                          <div style={{height:6,background:"#0f0f0f",borderRadius:3,overflow:"hidden",position:"relative"}}>
                            <div style={{position:"absolute",inset:0,width:`${(p.rev/max)*100}%`,background:"linear-gradient(90deg,#3d5a3e,#7faa80)",borderRadius:3,transition:"width .5s ease"}}/>
                          </div>
                          <div style={{fontSize:10,color:"#555",marginTop:3}}>{p.qty} unit terjual</div>
                        </div>
                      ));})()}
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Mix + Recent */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
                <div style={{background:"#161616",borderRadius:14,border:"1px solid #1e1e1e",padding:"22px 24px"}}>
                  <div style={{fontSize:12,color:"#555",fontWeight:600,letterSpacing:.4,textTransform:"uppercase",marginBottom:18}}>Distribusi Pengiriman</div>
                  {analytics.shipMix.length===0?(
                    <div style={{textAlign:"center",padding:"30px 0",color:"#444",fontSize:12}}>—</div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      {(()=>{const total=analytics.shipMix.reduce((s,x)=>s+x.count,0);const colors=["#7faa80","#e8a838","#5a9a7a","#e85d4a"];return analytics.shipMix.map((s,i)=>(
                        <div key={s.label}>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                            <span style={{color:"#aaa"}}>{s.label}</span>
                            <span style={{color:"#777",fontWeight:600}}>{s.count} ({((s.count/total)*100).toFixed(0)}%)</span>
                          </div>
                          <div style={{height:5,background:"#0f0f0f",borderRadius:3,overflow:"hidden"}}>
                            <div style={{width:`${(s.count/total)*100}%`,height:"100%",background:colors[i%colors.length],borderRadius:3,transition:"width .5s ease"}}/>
                          </div>
                        </div>
                      ));})()}
                    </div>
                  )}
                </div>
                <div style={{background:"#161616",borderRadius:14,border:"1px solid #1e1e1e",padding:"22px 24px"}}>
                  <div style={{fontSize:12,color:"#555",fontWeight:600,letterSpacing:.4,textTransform:"uppercase",marginBottom:14}}>Aktivitas Terbaru</div>
                  <div style={{display:"flex",flexDirection:"column",gap:0}}>
                    {analytics.recent.map((o,i)=>(
                      <div key={o.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<analytics.recent.length-1?"1px solid #1e1e1e":"none"}}>
                        <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:o.status==="shipped"?"#5a9a7a":"#e8a838"}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12.5,color:"#e8e4df",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.customer?.name??"—"}</div>
                          <div style={{fontSize:10.5,color:"#555",marginTop:1}}>{fmtD(o.createdAt)}</div>
                        </div>
                        <div style={{fontSize:12,fontWeight:700,color:"#7faa80",flexShrink:0}}>{rp(o.total)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detailed Stock Alerts — only show if there's something to act on */}
              {(outOfStockProds.length>0||lowStockProds.length>0)&&(
                <div style={{background:"#161616",borderRadius:14,border:"1px solid #1e1e1e",padding:"22px 24px",marginTop:16}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:8}}>
                    <div style={{fontSize:12,color:"#555",fontWeight:600,letterSpacing:.4,textTransform:"uppercase"}}>Restock Alert</div>
                    <button onClick={()=>setTab("products")} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #2a2a2a",background:"transparent",color:"#888",fontSize:10.5,fontWeight:600,letterSpacing:.4,textTransform:"uppercase",cursor:"pointer"}}>Buka Products</button>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:0}}>
                    {[...outOfStockProds,...lowStockProds].map((p,i,arr)=>{
                      const isOut=p.stock===0;
                      return (
                        <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<arr.length-1?"1px solid #1e1e1e":"none"}}>
                          <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:isOut?"#e85d4a":"#e8a838",boxShadow:`0 0 6px ${isOut?"#e85d4a":"#e8a838"}55`}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,color:"#e8e4df",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                            <div style={{fontSize:11,color:"#555",marginTop:1}}>{p.weight} · {p.origin||"—"}</div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <div style={{fontSize:13,fontWeight:700,color:isOut?"#e85d4a":"#e8a838"}}>{p.stock} stok</div>
                            <div style={{fontSize:10,color:"#555",letterSpacing:.3,textTransform:"uppercase",marginTop:1}}>{isOut?"Habis":"Rendah"}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>)}
          </>)}

          {/* ═══ PRODUCTS ═══ */}
          {tab==="products"&&(<>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
              <div><h2 style={{fontSize:20,fontWeight:700,color:"#e8e4df"}}>Manage Beans</h2><p style={{fontSize:12,color:"#555",marginTop:2}}>{prods.length} produk · {prods.filter(p=>p.available).length} tersedia</p></div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={fetchProds} aria-label="Refresh daftar produk" title="Refresh" style={tb}><span style={{display:"flex",animation:pLoading?"spin .8s linear infinite":"none"}}>{Ic.refresh}</span></button>
                <button onClick={openAdd} style={{...tb,background:"#3d5a3e",color:"#e8e4df",borderColor:"#3d5a3e",gap:6}}>{Ic.plus}<span style={{fontSize:12,fontWeight:600}}>Tambah Beans</span></button>
              </div>
            </div>

            {pLoading&&<div style={{textAlign:"center",padding:"60px",color:"#555"}}>Loading...</div>}
            {!pLoading&&prods.length===0&&<div style={{textAlign:"center",padding:"60px",color:"#444"}}><p>Belum ada produk.</p><p style={{fontSize:12,color:"#555",marginTop:4}}>Klik &quot;Tambah Beans&quot; untuk mulai.</p></div>}
            {!pLoading&&prods.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {prods.map(p=>(
                  <div key={p.id} style={{background:"#161616",borderRadius:14,border:"1px solid #1e1e1e",padding:"16px 18px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                    <div style={{width:48,height:48,borderRadius:10,background:p.cat==="espresso"?"linear-gradient(135deg,#1a1a1a,#2d2d2d)":"linear-gradient(135deg,#3d5a3e,#5a7d5c)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",opacity:p.available?1:.4}}>
                      {p.img?<img src={p.img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:Ic.coffee}
                    </div>
                    <div style={{flex:"1 1 180px",minWidth:0,opacity:p.available?1:.5}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontWeight:600,fontSize:14,color:"#e8e4df"}}>{p.name}</span>
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:p.cat==="espresso"?"rgba(139,105,20,.1)":"rgba(61,90,62,.1)",color:p.cat==="espresso"?"#c4a132":"#7faa80",textTransform:"uppercase",letterSpacing:.5}}>{p.cat}</span>
                        {!p.available&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,background:"rgba(232,93,74,.1)",color:"#e85d4a",textTransform:"uppercase"}}>Sold Out</span>}
                        {p.stock!==undefined&&p.stock<=5&&p.stock>0&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,background:"rgba(232,168,56,.1)",color:"#e8a838",textTransform:"uppercase"}}>Stok rendah</span>}
                        {p.stock===0&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,background:"rgba(232,93,74,.1)",color:"#e85d4a",textTransform:"uppercase"}}>Habis</span>}
                      </div>
                      <div style={{fontSize:12,color:"#555",marginTop:2}}>
                        {p.weight} · {p.origin} · {rp(p.price)}
                        {p.stock!==undefined&&<> · <b style={{color:p.stock===0?"#e85d4a":p.stock<=5?"#e8a838":"#7faa80"}}>{p.stock} stok</b></>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:"auto"}}>
                      <button onClick={()=>toggleAvail(p.id!,p.available)} style={{...tb,padding:"6px 12px",fontSize:11,gap:4,background:p.available?"rgba(232,168,56,.1)":"rgba(90,154,122,.1)",borderColor:p.available?"rgba(232,168,56,.2)":"rgba(90,154,122,.2)",color:p.available?"#e8a838":"#5a9a7a"}}>{p.available?"Sold Out":"Available"}</button>
                      <button onClick={()=>openEdit(p)} aria-label={`Edit ${p.name}`} title="Edit" style={{...tb,padding:"6px 10px"}}>{Ic.edit}</button>
                      {delConfirm===p.id?(<div style={{display:"flex",gap:4}}><button onClick={()=>deleteProd(p.id!)} aria-label={`Konfirmasi hapus ${p.name}`} style={{...tb,padding:"6px 10px",background:"rgba(232,93,74,.15)",borderColor:"rgba(232,93,74,.3)",color:"#e85d4a"}}>Ya</button><button onClick={()=>setDelConfirm(null)} style={{...tb,padding:"6px 10px"}}>Batal</button></div>):(<button onClick={()=>setDelConfirm(p.id!)} aria-label={`Hapus ${p.name}`} title="Hapus" style={{...tb,padding:"6px 10px",color:"#555"}}>{Ic.trash}</button>)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Form Modal */}
            {showForm&&(
              <div role="dialog" aria-modal="true" aria-label={editP?"Edit beans":"Tambah beans baru"} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={closeForm}>
                <div style={{background:"#1a1a1a",borderRadius:16,padding:28,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",border:"1px solid #262626"}} onClick={e=>e.stopPropagation()}>
                  <h3 style={{fontSize:18,fontWeight:700,color:"#e8e4df",marginBottom:20}}>{editP?"Edit Beans":"Tambah Beans Baru"}</h3>
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    <div><label style={lab}>Nama Beans *</label><input value={pForm.name} onChange={e=>setPForm({...pForm,name:e.target.value})} placeholder="Gayo Mossto Wash" style={inp}/></div>
                    <div style={{display:"flex",gap:12}}>
                      <div style={{flex:1}}><label style={lab}>Berat *</label><input value={pForm.weight} onChange={e=>setPForm({...pForm,weight:e.target.value})} placeholder="200 gr" style={inp}/></div>
                      <div style={{flex:1}}><label style={lab}>Harga (Rp) *</label><input type="number" value={pForm.price||""} onChange={e=>setPForm({...pForm,price:Number(e.target.value)})} placeholder="150000" style={inp}/></div>
                      <div style={{flex:1}}>
                        <label style={lab}>Stok</label>
                        <input
                          type="number"
                          min={0}
                          value={pForm.stock===undefined?"":pForm.stock}
                          onChange={e=>{
                            const v=e.target.value;
                            setPForm({...pForm,stock:v===""?undefined:Math.max(0,Number(v))});
                          }}
                          placeholder="opsional"
                          style={inp}
                        />
                        <p style={{fontSize:10,color:"#555",marginTop:4,lineHeight:1.4}}>Kosongkan = tidak track stok</p>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:12}}>
                      <div style={{flex:1}}><label style={lab}>Origin</label><input value={pForm.origin} onChange={e=>setPForm({...pForm,origin:e.target.value})} placeholder="Aceh, Sumatra" style={inp}/></div>
                      <div style={{flex:1}}><label style={lab}>Process</label><input value={pForm.process} onChange={e=>setPForm({...pForm,process:e.target.value})} placeholder="Washed" style={inp}/></div>
                    </div>
                    <div><label style={lab}>Tasting Notes</label><input value={pForm.notes} onChange={e=>setPForm({...pForm,notes:e.target.value})} placeholder="Citrus, Caramel, Clean Body" style={inp}/></div>
                    <div>
                      <label style={lab}>Gambar Produk (opsional)</label>
                      <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{handleImageFile(e.target.files?.[0]);if(e.target)e.target.value="";}}/>
                      {pForm.img?(
                        <div style={{position:"relative",borderRadius:10,overflow:"hidden",border:"1.5px solid #262626",background:"#0f0f0f"}}>
                          <img src={pForm.img} alt="" style={{display:"block",width:"100%",maxHeight:220,objectFit:"cover"}}/>
                          <div style={{position:"absolute",top:8,right:8,display:"flex",gap:6}}>
                            <button type="button" onClick={()=>fileInputRef.current?.click()} style={{padding:"6px 10px",borderRadius:6,border:"none",background:"rgba(0,0,0,.65)",color:"#e8e4df",fontSize:11,fontWeight:600,cursor:"pointer"}}>Ganti</button>
                            <button type="button" onClick={()=>{setPForm({...pForm,img:""});setImgErr("");}} style={{padding:"6px 10px",borderRadius:6,border:"none",background:"rgba(232,93,74,.85)",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>Hapus</button>
                          </div>
                        </div>
                      ):(
                        <div
                          onClick={()=>fileInputRef.current?.click()}
                          onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                          onDragLeave={e=>{e.preventDefault();setDragOver(false);}}
                          onDrop={e=>{e.preventDefault();setDragOver(false);handleImageFile(e.dataTransfer.files?.[0]);}}
                          style={{border:`1.5px dashed ${dragOver?"#7faa80":"#2e2e2e"}`,borderRadius:10,padding:"28px 16px",textAlign:"center",cursor:"pointer",background:dragOver?"rgba(127,170,128,.06)":"#141414",transition:"all .15s"}}
                        >
                          <div style={{fontSize:22,marginBottom:6,opacity:.6}}>📷</div>
                          <div style={{fontSize:13,color:"#aaa",fontWeight:600}}>{imgUploading?"Memproses...":"Drag & drop atau klik untuk pilih"}</div>
                          <div style={{fontSize:11,color:"#555",marginTop:4}}>PNG, JPG · max 8MB · auto-resize ke 800px</div>
                        </div>
                      )}
                      {imgErr&&<p style={{color:"#e85d4a",fontSize:11,marginTop:6}}>{imgErr}</p>}
                    </div>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <div style={{flex:1}}><label style={lab}>Kategori</label><div style={{display:"flex",gap:8}}>{(["filter","espresso"]as const).map(c=>(<button key={c} onClick={()=>setPForm({...pForm,cat:c})} style={{flex:1,padding:"9px 0",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",border:pForm.cat===c?"1.5px solid #3d5a3e":"1.5px solid #262626",background:pForm.cat===c?"rgba(61,90,62,.15)":"transparent",color:pForm.cat===c?"#7faa80":"#666",textTransform:"capitalize"}}>{c}</button>))}</div></div>
                      <div><label style={lab}>Status</label><button onClick={()=>setPForm({...pForm,available:!pForm.available})} style={{padding:"9px 16px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",border:"1.5px solid",borderColor:pForm.available?"rgba(90,154,122,.3)":"rgba(232,93,74,.3)",background:pForm.available?"rgba(90,154,122,.1)":"rgba(232,93,74,.1)",color:pForm.available?"#5a9a7a":"#e85d4a"}}>{pForm.available?"Available":"Sold Out"}</button></div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:24}}>
                    <button onClick={closeForm} style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid #262626",background:"transparent",color:"#777",fontSize:14,fontWeight:600,cursor:"pointer"}}>Batal</button>
                    <button onClick={saveProd} disabled={pSaving||!pForm.name||!pForm.weight||!pForm.price} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:(pForm.name&&pForm.weight&&pForm.price)?"#3d5a3e":"#262626",color:"#e8e4df",fontSize:14,fontWeight:600,cursor:pSaving?"wait":"pointer"}}>{pSaving?"Saving...":editP?"Update":"Tambah"}</button>
                  </div>
                </div>
              </div>
            )}
          </>)}
        </div>
      </>)}

      {proofModal&&(
        <div role="dialog" aria-modal="true" aria-label="Bukti pembayaran" onClick={()=>setProofModal(null)} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,cursor:"zoom-out"}}>
          {proofModal.img?(
            <div style={{maxWidth:500,maxHeight:"90vh",position:"relative"}} onClick={e=>e.stopPropagation()}>
              <img src={proofModal.img} alt="Bukti pembayaran" style={{width:"100%",height:"auto",maxHeight:"85vh",objectFit:"contain",borderRadius:12}}/>
              <button onClick={()=>setProofModal(null)} aria-label="Tutup" style={{position:"absolute",top:-12,right:-12,width:32,height:32,borderRadius:"50%",border:"none",background:"#333",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,cursor:"pointer"}}>×</button>
            </div>
          ):(
            <div style={{color:"#888",fontSize:13,display:"flex",alignItems:"center",gap:10}}><span style={{display:"flex",animation:"spin .8s linear infinite"}}>{Ic.refresh}</span> Memuat bukti pembayaran...</div>
          )}
        </div>
      )}

      <style>{`@keyframes fadeUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0}input:focus{outline:2px solid #3d5a3e;outline-offset:1px}::selection{background:#3d5a3e;color:#f4f1eb}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:3px}`}</style>
    </div>
  );
}

function ORow({o,exp,toggle,onVerify,onShip,onUndoShip,onCancel,onSaveNotes,busy,onProof}:{
  o:Order;
  exp:boolean;
  toggle:()=>void;
  busy:boolean;
  onProof:()=>void;
  onVerify:()=>void;
  onShip:(courier:string,resi:string)=>void;
  onUndoShip:()=>void;
  onCancel:(reason:string)=>Promise<boolean>;
  onSaveNotes:(notes:string)=>Promise<boolean>;
}){
  const isShipped=o.status==="shipped";
  const isCancelled=o.status==="cancelled";
  const isPending=!isShipped&&!isCancelled;
  const [hover,setHover]=useState(false);
  const [courier,setCourier]=useState(o.trackingCourier??"");
  const [resi,setResi]=useState(o.trackingNumber??"");
  const [confirmCancel,setConfirmCancel]=useState(false);
  const [cancelReason,setCancelReason]=useState("");
  const [notes,setNotes]=useState(o.internalNotes??"");
  const [notesDirty,setNotesDirty]=useState(false);

  const statusColor=isShipped?"#5a9a7a":isCancelled?"#e85d4a":"#e8a838";
  const statusBg=isShipped?"rgba(90,154,122,.1)":isCancelled?"rgba(232,93,74,.1)":"rgba(232,168,56,.1)";
  const statusLabel=isShipped?"shipped":isCancelled?"cancelled":"pending";

  const inpDark:CSSProperties={width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #262626",fontSize:13,background:"#1a1a1a",color:"#e8e4df",fontFamily:"var(--font-dm-sans),sans-serif"};

  return(
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} style={{background:"#161616",borderRadius:14,border:`1px solid ${exp||hover?"#2a2a2a":"#1e1e1e"}`,overflow:"hidden",transition:"border-color .15s, transform .15s",transform:hover&&!exp?"translateY(-1px)":"translateY(0)",opacity:isCancelled?0.65:1}}>
      <div onClick={toggle} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",cursor:"pointer"}}>
        <div style={{width:10,height:10,borderRadius:"50%",flexShrink:0,background:statusColor,boxShadow:`0 0 8px ${statusColor}55`}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontWeight:600,fontSize:14,color:"#e8e4df",textDecoration:isCancelled?"line-through":"none"}}>{o.customer?.name??"—"}</span>
            <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:statusBg,color:statusColor,letterSpacing:.5,textTransform:"uppercase"}}>{statusLabel}</span>
            {o.hasProof&&!o.paymentVerified&&o.status!=="cancelled"&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,background:"rgba(232,168,56,.1)",color:"#e8a838",letterSpacing:.5}}>BUKTI · BELUM VERIFIKASI</span>}
            {o.paymentVerified&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,background:"rgba(127,170,128,.1)",color:"#7faa80",letterSpacing:.5}}>BAYAR ✓</span>}
            {o.internalNotes&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,background:"rgba(168,168,232,.08)",color:"#8b8fa8",letterSpacing:.5}}>📝 CATATAN</span>}
          </div>
          <div style={{fontSize:12,color:"#555",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.customer?.contact} · {o.shipment?.label} · {(o.items??[]).length} items</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:16,fontWeight:700,color:isCancelled?"#666":"#7faa80",textDecoration:isCancelled?"line-through":"none"}}>{rp(o.total)}</div>
          <div style={{fontSize:10.5,color:"#444",marginTop:1}}>{fmtD(o.createdAt)}</div>
        </div>
        <span style={{transform:exp?"rotate(180deg)":"rotate(0)",transition:"transform .2s",flexShrink:0,display:"flex"}}>{Ic.chev}</span>
      </div>

      {exp&&(
        <div style={{padding:"0 18px 18px",borderTop:"1px solid #1e1e1e",animation:"fadeUp .2s ease"}}>
          <div style={{paddingTop:14}}>
            <div style={{fontSize:10.5,color:"#444",marginBottom:12,fontFamily:"monospace"}}>ID: {o.id}</div>

            {/* Cancelled banner */}
            {isCancelled&&(
              <div style={{background:"rgba(232,93,74,.08)",border:"1px solid rgba(232,93,74,.25)",borderRadius:8,padding:"10px 14px",marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:"#e85d4a",letterSpacing:.5,textTransform:"uppercase",marginBottom:4}}>Order Dibatalkan</div>
                <div style={{fontSize:12.5,color:"#aaa",lineHeight:1.5}}>{o.cancelReason||"—"}</div>
                {o.cancelledAt&&<div style={{fontSize:10.5,color:"#666",marginTop:4}}>{fmtD(o.cancelledAt)}</div>}
              </div>
            )}

            <DS t="Items">
              {(o.items??[]).map((it,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13,color:"#aaa"}}><span>{it.name} <span style={{color:"#555"}}>({it.weight})</span> × {it.qty}</span><span style={{fontWeight:600,color:"#ccc"}}>{rp(it.subtotal)}</span></div>))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 0",fontSize:12,color:"#666",borderTop:"1px solid #222",marginTop:6}}><span>Ongkir ({o.shipment?.label})</span><span>{rp(o.shipment?.price??0)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 0",fontSize:14,color:"#7faa80",fontWeight:700,borderTop:"1px solid #222",marginTop:4}}><span>Total</span><span>{rp(o.total)}</span></div>
            </DS>

            <DS t="Penerima">
              <div style={{fontSize:13,color:"#999",lineHeight:1.6}}>
                <div><b style={{color:"#777"}}>Nama:</b> {o.customer?.name}</div>
                <div><b style={{color:"#777"}}>WA:</b> {o.customer?.contact}</div>
                <div><b style={{color:"#777"}}>Alamat:</b> {o.customer?.address}</div>
              </div>
            </DS>

            {/* Bukti Pembayaran + Verifikasi */}
            {o.hasProof&&(
              <DS t="Bukti Pembayaran">
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <button onClick={onProof} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:8,fontSize:12.5,fontWeight:600,background:"rgba(127,170,128,.1)",color:"#7faa80",border:"1px solid rgba(127,170,128,.2)",cursor:"pointer"}}>{Ic.eye} Lihat Bukti</button>
                  {!o.paymentVerified&&!isCancelled&&(
                    <button onClick={onVerify} disabled={busy} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",borderRadius:8,fontSize:12.5,fontWeight:600,background:"#1f3a26",color:"#7faa80",border:"1px solid rgba(127,170,128,.3)",cursor:busy?"wait":"pointer",opacity:busy?.5:1}}>{Ic.check} Verifikasi Bayar</button>
                  )}
                  {o.paymentVerified&&(
                    <span style={{fontSize:11.5,color:"#7faa80",fontWeight:600}}>✓ Diverifikasi {o.paymentVerifiedAt?fmtD(o.paymentVerifiedAt):""}</span>
                  )}
                </div>
              </DS>
            )}

            {/* Tracking — input saat pending, info saat shipped */}
            {!isCancelled&&(
              <DS t="Pengiriman">
                {isShipped?(
                  <div style={{fontSize:13,color:"#aaa",lineHeight:1.7}}>
                    <div><b style={{color:"#777"}}>Status:</b> <span style={{color:"#5a9a7a"}}>Dikirim {o.shippedAt?fmtD(o.shippedAt):""}</span></div>
                    {o.trackingCourier&&<div><b style={{color:"#777"}}>Courier:</b> {o.trackingCourier}</div>}
                    {o.trackingNumber&&<div><b style={{color:"#777"}}>No. Resi:</b> <code style={{fontFamily:"monospace",color:"#e8e4df",background:"#1a1a1a",padding:"2px 6px",borderRadius:4,fontSize:12}}>{o.trackingNumber}</code></div>}
                  </div>
                ):(
                  <div>
                    <div style={{display:"flex",gap:8,marginBottom:6}}>
                      <input value={courier} onChange={e=>setCourier(e.target.value)} placeholder="Courier (JNE / J&T / SiCepat / dll)" style={{...inpDark,flex:"1 1 180px"}}/>
                      <input value={resi} onChange={e=>setResi(e.target.value)} placeholder="No. resi" style={{...inpDark,flex:"1 1 180px"}}/>
                    </div>
                    <p style={{fontSize:10.5,color:"#555",marginTop:4}}>Isi sebelum mark shipped. Customer akan lihat info ini di track page.</p>
                  </div>
                )}
              </DS>
            )}

            {/* Internal notes */}
            <DS t="Catatan Internal">
              <textarea
                value={notes}
                onChange={e=>{setNotes(e.target.value);setNotesDirty(e.target.value!==(o.internalNotes??""));}}
                rows={2}
                placeholder="Catatan untuk admin (mis: permintaan customer, alergi, hadiah, dll). Customer tidak lihat ini."
                style={{...inpDark,resize:"vertical",fontFamily:"var(--font-dm-sans),sans-serif"}}
              />
              {notesDirty&&(
                <button
                  onClick={async()=>{if(await onSaveNotes(notes))setNotesDirty(false);}}
                  disabled={busy}
                  style={{marginTop:6,padding:"7px 14px",borderRadius:6,border:"none",background:"#3d5a3e",color:"#e8e4df",fontSize:11,fontWeight:600,cursor:busy?"wait":"pointer",opacity:busy?.5:1}}
                >Simpan catatan</button>
              )}
            </DS>

            {/* Action buttons */}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
              {isPending&&(
                <button
                  onClick={e=>{e.stopPropagation();onShip(courier,resi);}}
                  disabled={busy}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:8,fontSize:12,fontWeight:600,cursor:busy?"wait":"pointer",border:"none",background:"#3d5a3e",color:"#e8e4df",opacity:busy?.5:1}}
                >{Ic.check} Tandai Shipped</button>
              )}
              {isShipped&&(
                <button
                  onClick={e=>{e.stopPropagation();onUndoShip();}}
                  disabled={busy}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:8,fontSize:12,fontWeight:600,cursor:busy?"wait":"pointer",border:"none",background:"#2a2215",color:"#e8a838",opacity:busy?.5:1}}
                >{Ic.undo} Kembalikan Pending</button>
              )}
              {!isCancelled&&!confirmCancel&&(
                <button
                  onClick={e=>{e.stopPropagation();setConfirmCancel(true);}}
                  disabled={busy}
                  style={{padding:"9px 14px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",border:"1px solid rgba(232,93,74,.3)",background:"transparent",color:"#e85d4a"}}
                >Cancel order</button>
              )}
              {o.customer?.contact&&!isCancelled&&(
                <a href={`https://wa.me/${(o.customer.contact).replace(/[^0-9]/g,"")}?text=${encodeURIComponent(
                  isShipped&&o.trackingNumber
                    ? `Halo ${o.customer.name}, pesanan kopi dari Asuka Brewing sudah kami kirim via ${o.trackingCourier??"kurir"} dengan no. resi ${o.trackingNumber}. Terima kasih!`
                    : `Halo ${o.customer.name}, pesanan kopi dari Asuka Brewing total ${rp(o.total)} sudah kami proses. Terima kasih!`
                )}`} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:5,padding:"9px 16px",borderRadius:8,fontSize:12,fontWeight:600,background:"#14331c",color:"#4ade80",border:"none",textDecoration:"none"}}>{Ic.wa} WhatsApp</a>
              )}
            </div>

            {/* Cancel confirmation form */}
            {confirmCancel&&!isCancelled&&(
              <div style={{marginTop:14,padding:14,background:"rgba(232,93,74,.06)",border:"1px solid rgba(232,93,74,.25)",borderRadius:8}}>
                <div style={{fontSize:11,fontWeight:700,color:"#e85d4a",letterSpacing:.5,textTransform:"uppercase",marginBottom:8}}>Konfirmasi pembatalan</div>
                <textarea
                  value={cancelReason}
                  onChange={e=>setCancelReason(e.target.value)}
                  rows={2}
                  placeholder="Alasan pembatalan (mis: bukti bayar tidak match, stok habis, customer batal)"
                  style={{...inpDark,resize:"vertical",fontFamily:"var(--font-dm-sans),sans-serif"}}
                />
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <button
                    onClick={async e=>{e.stopPropagation();if(cancelReason.trim()&&await onCancel(cancelReason)){setConfirmCancel(false);setCancelReason("");}}}
                    disabled={busy||!cancelReason.trim()}
                    style={{padding:"8px 16px",borderRadius:6,border:"none",background:cancelReason.trim()?"#7a2a20":"#262626",color:"#e8e4df",fontSize:12,fontWeight:600,cursor:cancelReason.trim()?"pointer":"not-allowed",opacity:busy?.5:1}}
                  >Konfirmasi cancel</button>
                  <button
                    onClick={e=>{e.stopPropagation();setConfirmCancel(false);setCancelReason("");}}
                    style={{padding:"8px 16px",borderRadius:6,border:"1px solid #2a2a2a",background:"transparent",color:"#888",fontSize:12,fontWeight:600,cursor:"pointer"}}
                  >Batal</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DS({t,children}:{t:string;children:ReactNode}){return(<div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,color:"#555",letterSpacing:.5,textTransform:"uppercase",marginBottom:6}}>{t}</div>{children}</div>);}

function KPI({label,value,accent,sub}:{label:string;value:string;accent:string;sub:string}){
  return(
    <div style={{background:"#161616",borderRadius:14,padding:"18px 18px",border:"1px solid #1e1e1e",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:accent,opacity:.7}}/>
      <div style={{fontSize:10.5,color:"#555",fontWeight:600,letterSpacing:.5,textTransform:"uppercase",marginBottom:6}}>{label}</div>
      <div style={{fontSize:24,fontWeight:700,color:accent,lineHeight:1.1}}>{value}</div>
      <div style={{fontSize:11,color:"#666",marginTop:5}}>{sub}</div>
    </div>
  );
}

function RevenueChart({buckets}:{buckets:{date:Date;revenue:number;count:number}[]}){
  const [hover,setHover]=useState<number|null>(null);
  const w=600,h=220,pl=52,pr=14,pt=18,pb=32;
  const cw=w-pl-pr,ch=h-pt-pb;
  const max=Math.max(1,...buckets.map(b=>b.revenue));
  const n=buckets.length;
  const step=n>1?cw/(n-1):0;
  const points=buckets.map((b,i)=>({x:pl+i*step,y:pt+ch-(b.revenue/max)*ch,...b}));
  const path=points.length?points.map((p,i)=>`${i===0?"M":"L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" "):"";
  const area=points.length?`${path} L ${points[points.length-1].x.toFixed(1)} ${(pt+ch).toFixed(1)} L ${points[0].x.toFixed(1)} ${(pt+ch).toFixed(1)} Z`:"";
  const labelStep=Math.max(1,Math.ceil(n/6));
  return(
    <div style={{width:"100%",overflow:"hidden"}}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{width:"100%",height:"auto",display:"block",fontFamily:"var(--font-dm-sans),sans-serif"}}>
        <defs>
          <linearGradient id="revGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7faa80" stopOpacity=".4"/>
            <stop offset="100%" stopColor="#7faa80" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Y-axis grid */}
        {[0,.25,.5,.75,1].map(t=>(
          <g key={t}>
            <line x1={pl} y1={pt+ch*(1-t)} x2={w-pr} y2={pt+ch*(1-t)} stroke="#222" strokeWidth=".7" strokeDasharray="3 5"/>
            <text x={pl-8} y={pt+ch*(1-t)+3} fill="#555" fontSize="9" textAnchor="end">{t===0?"0":shortRp(max*t)}</text>
          </g>
        ))}
        {/* Area + line */}
        {area&&<path d={area} fill="url(#revGrad)"/>}
        {path&&<path d={path} stroke="#7faa80" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
        {/* Hover hit-areas */}
        {points.map((p,i)=>(
          <g key={i}>
            <rect x={Math.max(pl,p.x-step/2)} y={pt} width={Math.max(1,step)} height={ch} fill="transparent" onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} style={{cursor:"crosshair"}}/>
          </g>
        ))}
        {/* Hover marker */}
        {hover!==null&&points[hover]&&(
          <g pointerEvents="none">
            <line x1={points[hover].x} y1={pt} x2={points[hover].x} y2={pt+ch} stroke="#7faa80" strokeWidth="1" strokeDasharray="2 3" opacity=".5"/>
            <circle cx={points[hover].x} cy={points[hover].y} r="5" fill="#161616" stroke="#7faa80" strokeWidth="2"/>
          </g>
        )}
        {/* X-axis labels */}
        {points.map((p,i)=>i%labelStep===0||i===n-1?(
          <text key={i} x={p.x} y={h-12} fill="#555" fontSize="9" textAnchor="middle">{p.date.getDate()}/{p.date.getMonth()+1}</text>
        ):null)}
        {/* Tooltip */}
        {hover!==null&&points[hover]&&(()=>{
          const p=points[hover];
          const tw=130,th=44;
          const tx=Math.max(pl,Math.min(w-pr-tw,p.x-tw/2));
          const ty=Math.max(pt,p.y-th-10);
          return(
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={tw} height={th} rx="6" fill="#0a0a0a" stroke="#2a2a2a" strokeWidth="1"/>
              <text x={tx+10} y={ty+15} fill="#666" fontSize="9">{p.date.toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})}</text>
              <text x={tx+10} y={ty+30} fill="#7faa80" fontSize="11.5" fontWeight="700">{rp(p.revenue)}</text>
              <text x={tx+tw-10} y={ty+30} fill="#555" fontSize="10" textAnchor="end">{p.count} order</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

function StatusDonut({shipped,pending}:{shipped:number;pending:number}){
  const total=shipped+pending;
  const cx=85,cy=85,r=58,sw=18;
  const C=2*Math.PI*r;
  const sFrac=total?shipped/total:0;
  const pFrac=total?pending/total:0;
  return(
    <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
      <svg width="170" height="170" viewBox="0 0 170 170" style={{flexShrink:0}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0f0f0f" strokeWidth={sw}/>
        {total>0&&(<>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#5a9a7a" strokeWidth={sw} strokeDasharray={`${C*sFrac} ${C}`} strokeLinecap="butt" transform={`rotate(-90 ${cx} ${cy})`} style={{transition:"stroke-dasharray .6s ease"}}/>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8a838" strokeWidth={sw} strokeDasharray={`${C*pFrac} ${C}`} strokeDashoffset={-C*sFrac} strokeLinecap="butt" transform={`rotate(-90 ${cx} ${cy})`} style={{transition:"all .6s ease"}}/>
        </>)}
        <text x={cx} y={cy-2} textAnchor="middle" fill="#e8e4df" fontSize="28" fontWeight="700" fontFamily="var(--font-dm-sans),sans-serif">{total}</text>
        <text x={cx} y={cy+16} textAnchor="middle" fill="#555" fontSize="10" fontFamily="var(--font-dm-sans),sans-serif" letterSpacing="1">ORDERS</text>
      </svg>
      <div style={{flex:1,minWidth:120,display:"flex",flexDirection:"column",gap:12}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <span style={{width:10,height:10,borderRadius:2,background:"#5a9a7a"}}/>
            <span style={{fontSize:11.5,color:"#aaa"}}>Shipped</span>
          </div>
          <div style={{fontSize:18,fontWeight:700,color:"#5a9a7a"}}>{shipped}<span style={{fontSize:11,color:"#555",fontWeight:500,marginLeft:6}}>{total?`${((sFrac)*100).toFixed(0)}%`:""}</span></div>
        </div>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <span style={{width:10,height:10,borderRadius:2,background:"#e8a838"}}/>
            <span style={{fontSize:11.5,color:"#aaa"}}>Pending</span>
          </div>
          <div style={{fontSize:18,fontWeight:700,color:"#e8a838"}}>{pending}<span style={{fontSize:11,color:"#555",fontWeight:500,marginLeft:6}}>{total?`${((pFrac)*100).toFixed(0)}%`:""}</span></div>
        </div>
      </div>
    </div>
  );
}
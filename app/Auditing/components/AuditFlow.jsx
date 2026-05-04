"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AUDIT_TEMPLATES } from "./templateLibrary";
import PdplWorkspace from "./PdplWorkspace";
import CstAuditWorkspace from "./CstAuditWorkspace";

// ─── FONTS ───────────────────────────────────────────────────────────────────
const FontLink = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body,#root{height:100%;font-family:'Sora',sans-serif;}
    ::-webkit-scrollbar{width:5px;height:5px;}
    ::-webkit-scrollbar-track{background:#f1f5f9;}
    ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
    input[type=date]::-webkit-calendar-picker-indicator{opacity:0.5;cursor:pointer;}
    @keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideInRight{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  `}</style>
);

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  bg:"#f8fafc", bg2:"#f1f5f9", surface:"#ffffff", surface2:"#f8fafc",
  border:"#e2e8f0", border2:"#cbd5e1",
  teal:"#0d9488", teal2:"#0f766e", tealBg:"#f0fdfa", tealBorder:"#99f6e4",
  amber:"#d97706", amberBg:"#fffbeb", amberBorder:"#fde68a",
  red:"#dc2626", redBg:"#fef2f2", redBorder:"#fecaca",
  blue:"#2563eb", blueBg:"#eff6ff", blueBorder:"#bfdbfe",
  green:"#16a34a", greenBg:"#f0fdf4", greenBorder:"#bbf7d0",
  purple:"#7c3aed", purpleBg:"#f5f3ff", purpleBorder:"#ddd6fe",
  text1:"#0f172a", text2:"#475569", text3:"#94a3b8",
};

const AVATAR_COLORS = ['#2563eb','#0d9488','#d97706','#dc2626','#7c3aed','#16a34a','#db2777','#0891b2','#ea580c','#4338ca'];
const MONO = "'JetBrains Mono', monospace";

// ─── FILE HELPERS ─────────────────────────────────────────────────────────────
const FILE_TYPES = {
  pdf:  {icon:'📄', color:'#dc2626', bg:'#fef2f2', border:'#fecaca', label:'PDF'},
  xlsx: {icon:'📊', color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', label:'Excel'},
  xls:  {icon:'📊', color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', label:'Excel'},
  docx: {icon:'📝', color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', label:'Word'},
  doc:  {icon:'📝', color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', label:'Word'},
  jpg:  {icon:'🖼', color:'#d97706', bg:'#fffbeb', border:'#fde68a', label:'Image'},
  jpeg: {icon:'🖼', color:'#d97706', bg:'#fffbeb', border:'#fde68a', label:'Image'},
  png:  {icon:'🖼', color:'#d97706', bg:'#fffbeb', border:'#fde68a', label:'Image'},
  ppt:  {icon:'📋', color:'#ea580c', bg:'#fff7ed', border:'#fed7aa', label:'PPT'},
  pptx: {icon:'📋', color:'#ea580c', bg:'#fff7ed', border:'#fed7aa', label:'PPT'},
  csv:  {icon:'📈', color:'#0d9488', bg:'#f0fdfa', border:'#99f6e4', label:'CSV'},
  txt:  {icon:'📃', color:'#475569', bg:'#f8fafc', border:'#e2e8f0', label:'Text'},
};
const getFileType = name => FILE_TYPES[name?.split('.').pop()?.toLowerCase()] || {icon:'📎',color:'#475569',bg:'#f8fafc',border:'#e2e8f0',label:'File'};
const fmtSize = bytes => bytes < 1024 ? bytes+'B' : bytes < 1048576 ? (bytes/1024).toFixed(1)+'KB' : (bytes/1048576).toFixed(1)+'MB';

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const INIT_MEMBERS = [
  {id:1,name:'Anil Mehta',role:'Admin',email:'anil.mehta@lixil.com',initials:'AM'},
  {id:2,name:'Priya Sharma',role:'Auditor',email:'priya.sharma@lixil.com',initials:'PS'},
  {id:3,name:'Rajan Verma',role:'Auditor',email:'rajan.verma@lixil.com',initials:'RV'},
  {id:4,name:'Sneha Gupta',role:'Reviewer',email:'sneha.gupta@lixil.com',initials:'SG'},
  {id:5,name:'Deepak Joshi',role:'Auditor',email:'deepak.joshi@lixil.com',initials:'DJ'},
  {id:6,name:'Kavita Singh',role:'Auditor',email:'kavita.singh@lixil.com',initials:'KS'},
  {id:7,name:'Mohit Agarwal',role:'Reviewer',email:'mohit.agarwal@lixil.com',initials:'MA'},
  {id:8,name:'Neha Patel',role:'Auditor',email:'neha.patel@lixil.com',initials:'NP'},
  {id:9,name:'Rahul Tiwari',role:'Auditor',email:'rahul.tiwari@lixil.com',initials:'RT'},
  {id:10,name:'Sunita Rao',role:'Reviewer',email:'sunita.rao@lixil.com',initials:'SR'},
];

const mkStep = (id,step,status,aqc,risk,assignee,due,obs='',docs=[],comments=[]) =>
  ({id,step,status,aqc,risk,assignee,due,obs,docs,comments});

const INIT_PROJECTS = [
  {
    id:1,name:'HR Audit — FY2025',unit:'Lixil Window Systems Private Limited',
    type:'hr',icon:'👤',status:'active',start:'2025-01-15',end:'2025-03-31',lead:1,
    desc:'Comprehensive audit of HR policies, recruitment, payroll, and compliance.',
    procedures:[
      {id:'p1',name:'Policies & Procedures',desc:'Review whether HR policies are documented, approved by management',steps:[
        mkStep('1.1','Obtain copy of organization chart and review for appropriate delegation and segregation of duties.','done','pass','medium',2,'2025-02-10','Organization chart obtained. Delegation matrix reviewed — minor gaps in segregation noted.',[{name:'OrgChart_FY2025.pdf',size:'245KB',type:'pdf',uploadedBy:'Priya Sharma',uploadedAt:'2025-02-10'},{name:'Delegation_Matrix.xlsx',size:'88KB',type:'xlsx',uploadedBy:'Anil Mehta',uploadedAt:'2025-02-11'}],[{author:'Priya Sharma',initials:'PS',time:'2 days ago',text:'Chart was last updated in Dec 2024. Will request latest version.'}]),
        mkStep('1.2','Verify whether POSH Internal Committee Constitution (ICC) is constituted as per law and meetings/complaints records maintained.','done','pass','high',3,'2025-02-12','ICC constituted. 4 meetings held in FY2024. Minutes available.',[{name:'ICC_Constitution.pdf',size:'112KB',type:'pdf',uploadedBy:'Rajan Verma',uploadedAt:'2025-02-12'},{name:'ICC_Meeting_Minutes_Q1.docx',size:'56KB',type:'docx',uploadedBy:'Rajan Verma',uploadedAt:'2025-02-12'},{name:'POSH_Complaint_Register.xlsx',size:'34KB',type:'xlsx',uploadedBy:'Rajan Verma',uploadedAt:'2025-02-13'}],[]),
        mkStep('1.3','Check whether whistleblower / grievance redressal mechanism exists and complaints are tracked and resolved.','progress','review','high',2,'2025-02-20','',[],[]),
        mkStep('1.4','Verify whether HR policies are approved by the Board / Senior Management and documented with version control.','done','pass','medium',4,'2025-02-15','Policies board-approved. Version control maintained.',[{name:'Board_Approval_HR_Policy.pdf',size:'320KB',type:'pdf',uploadedBy:'Sneha Gupta',uploadedAt:'2025-02-15'}],[]),
        mkStep('1.5','Formal induction process, code of conduct/ethics, Consequence management, implementation and communication not defined.','todo','pending','high',null,'2025-02-28','',[],[]),
        mkStep('1.6','Obtain copy of leave, recruitment, payroll, POSH & grievance handling policies and their periodic review process.','done','pass','low',5,'2025-02-10','All policies obtained and reviewed.',[{name:'Leave_Policy_v4.pdf',size:'98KB',type:'pdf',uploadedBy:'Deepak Joshi',uploadedAt:'2025-02-10'},{name:'Payroll_Policy.pdf',size:'145KB',type:'pdf',uploadedBy:'Deepak Joshi',uploadedAt:'2025-02-10'}],[]),
        mkStep('1.7','Verify that HR policies are properly communicated to employees, acknowledged through signed declarations, and periodically reviewed.','progress','pending','medium',6,'2025-02-25','',[],[]),
        mkStep('1.8','Assess whether implementation of policies is effective by testing sample transactions and comparing actual practice with documented procedures.','todo','pending','high',null,'2025-03-05','',[],[]),
      ]},
      {id:'p2',name:'Recruitment Process',desc:'Verify hiring is conducted against approved manpower plans',steps:[
        mkStep('2.1','Check whether Manpower budget is approved and monitoring for the same.','done','pass','medium',3,'2025-02-18','Budget approved by MD. Monthly tracking done.',[{name:'Manpower_Budget_FY25.xlsx',size:'210KB',type:'xlsx',uploadedBy:'Rajan Verma',uploadedAt:'2025-02-18'}],[]),
        mkStep('2.2','Verify recruitment is based on an approved Manpower Requisition form.','done','pass','medium',2,'2025-02-18','MRF process followed for all roles.',[],[]),
        mkStep('2.3','Verify whether job description and job specification laid down to ensure no ambiguity.','progress','review','low',7,'2025-02-22','',[],[]),
        mkStep('2.4','Check whether referral schemes in existence and compliance to the same.','todo','pending','low',null,'2025-03-01','',[],[]),
        mkStep('2.5','Confirm hiring is within approved salary band and deviations are authorized.','done','pass','high',4,'2025-02-20','3 deviations found — all authorized by HR Head.',[{name:'Salary_Band_Deviations.xlsx',size:'67KB',type:'xlsx',uploadedBy:'Sneha Gupta',uploadedAt:'2025-02-20'}],[]),
        mkStep('2.6','Review compliance with defined interview process and documentation.','progress','pending','medium',8,'2025-02-28','',[],[]),
        mkStep('2.7','Verify whether reference checks of candidates done.','todo','pending','medium',null,'2025-03-05','',[],[]),
        mkStep('2.8','Verify whether offer letters and appointment letters are issued and acknowledged by employees.','done','pass','low',9,'2025-02-15','All sampled employees have signed copies on file.',[],[]),
        mkStep('2.9','Verify whether joining documents are obtained (PAN, Aadhar, Bank details, etc.)','done','pass','medium',5,'2025-02-15','Documents collected for all joiners tested.',[],[]),
        mkStep('2.10','Check whether probation confirmation process is defined and documented.','progress','review','medium',6,'2025-03-01','',[],[]),
        mkStep('2.11','Verify payments to recruitment agencies and whether in accordance with contract.','todo','pending','high',null,'2025-03-10','',[],[]),
      ]},
      {id:'p3',name:'Payroll & Compensation',desc:'Review payroll processes, salary revisions, statutory compliance',steps:[
        mkStep('3.1','Match actual salary payments (bank transfer) with approved payroll output file and investigate discrepancies.','progress','pending','high',10,'2025-03-05','',[],[]),
        mkStep('3.2','Verify salary revision approvals and increments authorized.','todo','pending','high',null,'2025-03-10','',[],[]),
        mkStep('3.3','Check statutory deductions (PF, ESI, TDS) are correctly computed and deposited on time.','todo','pending','high',null,'2025-03-12','',[],[]),
        mkStep('3.4','Verify leave encashment calculations and approvals.','todo','pending','medium',null,'2025-03-15','',[],[]),
      ]},
    ]
  },
  {
    id:2,name:'Finance & Accounts — FY2025',unit:'Lixil Window Systems Pvt Ltd',
    type:'fin',icon:'💰',status:'active',start:'2025-01-20',end:'2025-04-15',lead:4,
    desc:'Review of financial controls, AP/AR, bank reconciliations, and expense management.',
    procedures:[
      {id:'f1',name:'Accounts Payable',desc:'Review vendor payments and invoice processing',steps:[
        mkStep('F1.1','Review vendor invoice processing and 3-way match (PO, GRN, Invoice).','done','pass','high',7,'2025-02-20','Process followed for all tested invoices.',[],[]),
        mkStep('F1.2','Verify vendor master data changes are authorized.','progress','review','high',4,'2025-02-25','',[],[]),
      ]},
    ]
  },
  {
    id:3,name:'Inventory Management — Q1 2025',unit:'Lixil Manufacturing Unit',
    type:'inv',icon:'📦',status:'review',start:'2025-02-01',end:'2025-04-30',lead:7,
    desc:'Physical verification, stock reconciliation and warehouse controls.',
    procedures:[
      {id:'i1',name:'Stock Verification',desc:'Physical count and reconciliation',steps:[
        mkStep('I1.1','Conduct physical stock count and reconcile with system records.','done','pass','high',8,'2025-03-01','Physical count matches within 0.5% variance.',[],[]),
        mkStep('I1.2','Review slow-moving and obsolete inventory provisions.','progress','pending','medium',9,'2025-03-10','',[],[]),
      ]},
    ]
  },
  {
    id:4,name:'Billing & Collections — FY2025',unit:'Lixil Sales Division',
    type:'bil',icon:'🧾',status:'active',start:'2025-02-10',end:'2025-05-15',lead:10,
    desc:'Revenue recognition, customer billing accuracy, and collections monitoring.',
    procedures:[
      {id:'b1',name:'Billing Accuracy',desc:'Verify billing matches contracts and approvals',steps:[
        mkStep('B1.1','Test sample customer invoices against contracts and price lists.','todo','pending','high',null,'2025-03-15','',[],[]),
        mkStep('B1.2','Verify credit notes are properly authorized.','todo','pending','medium',null,'2025-03-20','',[],[]),
      ]},
    ]
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function calcProgress(p) {
  const procedures = Array.isArray(p?.procedures) ? p.procedures : [];
  const all = procedures.flatMap(pr=>pr.steps || []);
  if(!all.length) return 0;
  return Math.round(all.filter(s=>s.status==='done').length/all.length*100);
}
function avatarColor(id){ return AVATAR_COLORS[(id-1)%AVATAR_COLORS.length]; }
function getProjectProcedures(project){
  return Array.isArray(project?.procedures) ? project.procedures : [];
}
function getProjectSteps(project){
  return getProjectProcedures(project).flatMap(proc => proc.steps || []);
}

// ─── BADGE MAPS ───────────────────────────────────────────────────────────────
const STATUS_MAP = {
  todo:     {label:'Not Started', bg:'#ffffff', color:'#475569', border:'#cbd5e1', dot:'#94a3b8'},
  progress: {label:'In Progress', bg:'#fff7ed', color:'#b45309', border:'#fdba74', dot:'#f59e0b'},
  done:     {label:'Completed', bg:'#f0fdf4', color:'#15803d', border:'#86efac', dot:'#22c55e'},
};
const AQC_MAP = {
  pending: {label:'Pending', bg:'#ffffff', color:'#475569', border:'#cbd5e1', dot:'#94a3b8'},
  pass:    {label:'Passed', bg:'#f0fdf4', color:'#15803d', border:'#86efac', dot:'#22c55e'},
  review:  {label:'Needs Review', bg:'#fff7ed', color:'#b45309', border:'#fdba74', dot:'#f59e0b'},
  fail:    {label:'Failed', bg:'#fef2f2', color:'#b91c1c', border:'#fca5a5', dot:'#ef4444'},
};
const RISK_MAP = {
  high:   {label:'High Risk', bg:'#fef2f2', color:'#b91c1c', border:'#fca5a5', dot:'#ef4444'},
  medium: {label:'Medium Risk', bg:'#fff7ed', color:'#b45309', border:'#fdba74', dot:'#f59e0b'},
  low:    {label:'Low Risk', bg:'#ecfeff', color:'#0f766e', border:'#67e8f9', dot:'#06b6d4'},
};
const TYPE_COLORS = {
  hr:  {accent:C.teal,   bg:C.tealBg,    border:C.tealBorder},
  fin: {accent:C.amber,  bg:C.amberBg,   border:C.amberBorder},
  inv: {accent:C.blue,   bg:C.blueBg,    border:C.blueBorder},
  bil: {accent:C.red,    bg:C.redBg,     border:C.redBorder},
  it:  {accent:C.purple, bg:C.purpleBg,  border:C.purpleBorder},
  ops: {accent:C.text2,  bg:C.bg2,       border:C.border},
};

const Badge = ({map,val,small}) => {
  const m = map[val]||map[Object.keys(map)[0]];
  return <span style={{display:'inline-flex',alignItems:'center',gap:6,padding:small?'4px 9px':'5px 11px',borderRadius:999,fontSize:small?10.5:11.5,fontWeight:700,background:m.bg,color:m.color,border:`1px solid ${m.border}`,whiteSpace:'nowrap'}}>
    <span style={{width:7,height:7,borderRadius:'50%',background:m.dot||m.color,flexShrink:0}} />
    {m.label}
  </span>;
};
const Avatar = ({member,size=28}) => (
  <div title={member.name} style={{width:size,height:size,borderRadius:'50%',background:avatarColor(member.id),display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.38,fontWeight:700,color:'#fff',flexShrink:0}}>{member.initials}</div>
);

const DrawerCardSelect=({options,val,onSelect,mapObj,cols=3})=>(
  <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:7}}>
    {options.map(k=>{
      const m=mapObj[k];const sel=val===k;
      return(
        <button key={k} onClick={()=>onSelect(k)} style={{padding:'9px 8px',borderRadius:9,fontSize:12,fontWeight:600,fontFamily:MONO,cursor:'pointer',textAlign:'center',border:sel?`2px solid ${m.border}`:`1.5px solid ${C.border}`,color:sel?m.color:C.text3,background:sel?m.bg:'#fff',boxShadow:sel?`0 2px 8px ${m.border}55`:'none',transform:sel?'translateY(-1px)':'none',transition:'all .18s'}}>
          {m.label}
        </button>
      );
    })}
  </div>
);

// ─── TOAST ────────────────────────────────────────────────────────────────────
function useToast(){
  const [toasts,setToasts]=useState([]);
  const show=useCallback((type,msg)=>{
    const id=Date.now();
    setToasts(t=>[...t,{id,type,msg}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200);
  },[]);
  return{toasts,show};
}
const TICONS={success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
const ToastContainer=({toasts})=>(
  <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,display:'flex',flexDirection:'column',gap:8,pointerEvents:'none'}}>
    {toasts.map(t=>(
      <div key={t.id} style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,padding:'11px 16px',fontSize:13,color:C.text1,display:'flex',alignItems:'center',gap:10,boxShadow:'0 4px 24px rgba(0,0,0,0.1)',maxWidth:340,animation:'slideUp .3s ease'}}>
        <span>{TICONS[t.type]||TICONS.info}</span><span>{t.msg}</span>
      </div>
    ))}
  </div>
);

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const NAV_ITEMS=[
  {section:'Workspace',items:[{id:'audit categorys',icon:'◫',label:'Audit Category Library'},{id:'dashboard',icon:'⬡',label:'Dashboard'},{id:'my-tasks',icon:'◎',label:'My Tasks'}]},
  {section:'Reports',items:[{id:'export-excel',icon:'⬒',label:'Export Excel',action:true},{id:'export-pdf',icon:'⬓',label:'Export PDF',action:true}]},
  {section:'Admin',items:[{id:'team',icon:'◈',label:'Team Members'}]},
];
const Sidebar=({activeView,setView,projectCount,onExcelExport,onPdfExport})=>{
  const handleNav=id=>{if(id==='export-excel'){onExcelExport();return;}if(id==='export-pdf'){onPdfExport();return;}setView(id);};
  return(
    <aside style={{width:240,minWidth:240,background:'#fff',borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',boxShadow:'1px 0 4px rgba(0,0,0,0.04)'}}>
      <div style={{padding:'22px 20px 18px',borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,background:'linear-gradient(135deg,#0d9488,#0f766e)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#fff',fontFamily:MONO}}>AF</div>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:C.text1,letterSpacing:'-0.3px'}}>AuditFlow</div>
            <div style={{fontSize:10,color:C.text3,fontFamily:MONO,letterSpacing:'1px',textTransform:'uppercase',marginTop:2}}>Lixil Internal Audit</div>
          </div>
        </div>
      </div>
      <nav style={{flex:1,padding:'14px 10px',overflowY:'auto'}}>
        {NAV_ITEMS.map(section=>(
          <div key={section.section}>
            <div style={{fontSize:10,fontFamily:MONO,letterSpacing:'1.5px',textTransform:'uppercase',color:C.text3,padding:'12px 10px 6px',fontWeight:600}}>{section.section}</div>
            {section.items.map(item=>{
              const isActive=activeView===item.id;
              return(
                <div key={item.id} onClick={()=>handleNav(item.id)}
                  onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background=C.bg2;}}
                  onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background='transparent';}}
                  style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:8,cursor:'pointer',color:isActive?C.teal:C.text2,fontSize:13.5,fontWeight:isActive?600:500,background:isActive?C.tealBg:'transparent',border:isActive?`1px solid ${C.tealBorder}`:'1px solid transparent',marginBottom:2,transition:'all .15s'}}>
                  <span style={{width:16,textAlign:'center',fontSize:13,color:isActive?C.teal:C.text3}}>{item.icon}</span>
                  {item.label}
                  {item.id==='dashboard'&&<span style={{marginLeft:'auto',background:C.teal,color:'#fff',fontSize:10,fontWeight:700,fontFamily:MONO,padding:'2px 6px',borderRadius:10}}>{projectCount}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      <div style={{padding:14,borderTop:`1px solid ${C.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:C.bg2,borderRadius:10,border:`1px solid ${C.border}`}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff'}}>AM</div>
          <div>
            <div style={{fontSize:12.5,fontWeight:600,color:C.text1}}>Admin User</div>
            <div style={{fontSize:10.5,color:C.teal,fontFamily:MONO}}>● Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard=({icon,value,label,change,changeType,accent})=>(
  <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:14,padding:20,position:'relative',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
    <div style={{position:'absolute',top:-10,right:-10,width:60,height:60,borderRadius:'50%',background:accent,opacity:0.08}}/>
    <div style={{fontSize:22,marginBottom:10}}>{icon}</div>
    <div style={{fontSize:30,fontWeight:800,fontFamily:MONO,color:C.text1,lineHeight:1}}>{value}</div>
    <div style={{fontSize:12,color:C.text2,marginTop:6,fontWeight:500}}>{label}</div>
    <div style={{fontSize:11,fontFamily:MONO,marginTop:7,color:changeType==='up'?C.green:C.amber}}>{change}</div>
  </div>
);

// ─── PROJECT CARD ─────────────────────────────────────────────────────────────
const ProjectCard=({project,members,onClick})=>{
  const prog=calcProgress(project);
  const tc=TYPE_COLORS[project.type]||TYPE_COLORS.hr;
  const allSteps=getProjectSteps(project);
  const assigneeIds=[...new Set(allSteps.map(s=>s.assignee).filter(Boolean))].slice(0,4);
  const sb={active:{bg:C.tealBg,color:C.teal,border:C.tealBorder,label:'Active'},review:{bg:C.amberBg,color:C.amber,border:C.amberBorder,label:'Under Review'},closed:{bg:C.bg2,color:C.text3,border:C.border,label:'Closed'}}[project.status]||{bg:C.tealBg,color:C.teal,border:C.tealBorder,label:'Active'};
  return(
    <div onClick={onClick} style={{background:`linear-gradient(180deg,#ffffff 0%,${tc.bg} 100%)`,border:`1px solid ${tc.border}`,borderRadius:18,padding:22,cursor:'pointer',position:'relative',overflow:'hidden',boxShadow:'0 10px 30px rgba(15,23,42,0.08)',transition:'all .2s',minHeight:260,display:'flex',flexDirection:'column'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 18px 40px rgba(15,23,42,0.12)';e.currentTarget.style.borderColor=tc.accent+'88';}}
      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 10px 30px rgba(15,23,42,0.08)';e.currentTarget.style.borderColor=tc.border;}}>
      <div style={{position:'absolute',top:-28,right:-18,width:110,height:110,borderRadius:'50%',background:`radial-gradient(circle, ${tc.accent}18 0%, transparent 70%)`}}/>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,position:'relative'}}>
        <div style={{width:52,height:52,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,background:'#ffffffcc',border:`1px solid ${tc.border}`,boxShadow:'0 6px 18px rgba(15,23,42,0.06)'}}>{project.icon}</div>
        <span style={{fontSize:10.5,fontFamily:MONO,padding:'5px 12px',borderRadius:999,fontWeight:700,background:sb.bg,color:sb.color,border:`1px solid ${sb.border}`}}>{sb.label}</span>
      </div>
      <div style={{fontSize:11,color:tc.accent,fontFamily:MONO,letterSpacing:'0.8px',marginBottom:10}}>COMPANY PROJECT</div>
      <div style={{fontSize:16.5,fontWeight:800,color:C.text1,marginBottom:8,lineHeight:1.35}}>{project.name}</div>
      <div style={{fontSize:13,color:C.text2,lineHeight:1.6,minHeight:58}}>{project.desc}</div>
      <div style={{marginTop:'auto',paddingTop:18,borderTop:`1px solid ${C.border}`}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:11,color:C.text3,fontFamily:MONO}}>PROGRESS</div>
          <span style={{fontSize:12.5,fontFamily:MONO,fontWeight:700,color:C.text2}}>{prog}%</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <div style={{flex:1,height:6,background:'#e8eef7',borderRadius:999,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:999,background:`linear-gradient(90deg,${tc.accent},${tc.accent}cc)`,width:`${prog}%`,transition:'width .5s ease'}}/>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center'}}>
            {assigneeIds.map((mid,i)=>{const m=members.find(t=>t.id===mid);return m?<div key={mid} title={m.name} style={{width:24,height:24,borderRadius:'50%',background:avatarColor(m.id),border:`2px solid #fff`,marginLeft:i?-6:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff'}}>{m.initials}</div>:null;})}
          </div>
          <span style={{fontSize:11.5,color:C.text3,fontFamily:MONO}}>{allSteps.filter(s=>s.status==='done').length}/{allSteps.length} steps</span>
        </div>
      </div>
    </div>
  );
};

const TemplateCard=({template,projectCount,stepCount,onClick})=>(
  <button
    type="button"
    onClick={onClick}
    style={{
      background:`linear-gradient(145deg, #ffffff 0%, ${template.bg} 100%)`,
      border:`1px solid ${template.border}`,
      borderRadius:24,
      padding:'26px 24px',
      cursor:'pointer',
      position:'relative',
      overflow:'hidden',
      boxShadow:'0 10px 32px rgba(15,23,42,0.08)',
      transition:'all .2s',
      textAlign:'left',
      minHeight:220,
      display:'flex',
      flexDirection:'column'
    }}
    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 18px 40px rgba(15,23,42,0.12)';}}
    onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 10px 32px rgba(15,23,42,0.08)';}}
  >
    <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at top right, ${template.accent}16 0%, transparent 42%)`,pointerEvents:'none'}} />
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,marginBottom:20,position:'relative'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:56,height:56,borderRadius:18,background:'#ffffffcc',border:`1px solid ${template.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,boxShadow:'0 6px 20px rgba(15,23,42,0.06)'}}>
          {template.icon}
        </div>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.text1,lineHeight:1.2}}>{template.name}</div>
          <div style={{fontSize:11.5,color:template.accent,fontFamily:MONO,marginTop:6,letterSpacing:'0.8px'}}>{template.shortCode}</div>
        </div>
      </div>
      <span style={{fontSize:10.5,fontFamily:MONO,padding:'5px 12px',borderRadius:999,fontWeight:700,background:'#ffffffaa',color:template.accent,border:`1px solid ${template.border}`}}>
        {template.status}
      </span>
    </div>
    <div style={{fontSize:14,color:C.text2,lineHeight:1.7,marginBottom:22,position:'relative',maxWidth:420}}>{template.description}</div>
    <div style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:12.5,fontWeight:700,color:template.accent,position:'relative',marginTop:'auto'}}>
      Open audit category
    </div>
  </button>
);

const TableView=({project,members,onOpenTask,onAddStep,onDeleteStep,onRenameProcedure})=>{
  const [editingProc,setEditingProc]=useState(null);
  const [editingName,setEditingName]=useState('');
  const [editingDesc,setEditingDesc]=useState('');
  const th={background:C.bg2,padding:'10px 14px',textAlign:'left',fontSize:10.5,fontWeight:600,fontFamily:MONO,letterSpacing:'0.5px',textTransform:'uppercase',color:C.text3,borderBottom:`2px solid ${C.border2}`,whiteSpace:'nowrap',position:'sticky',top:0,zIndex:10};
  const td={padding:'11px 14px',borderBottom:`1px solid ${C.border}`,verticalAlign:'middle',fontSize:13};
  const editingField=(pi,field)=>editingProc&&editingProc.pi===pi&&editingProc.field===field;
  const inlineInput=(val,onChange,onCommit,onCancel,bold=false)=>(
    <input autoFocus value={val} onChange={e=>onChange(e.target.value)}
      onBlur={onCommit} onKeyDown={e=>{if(e.key==='Enter')onCommit();if(e.key==='Escape')onCancel();}}
      style={{background:'#fff',border:`2px solid ${C.teal}`,borderRadius:7,padding:'3px 10px',fontSize:bold?13.5:12,fontWeight:bold?700:400,fontStyle:bold?'normal':'italic',color:C.text1,outline:'none',fontFamily:'Sora,sans-serif',minWidth:bold?200:160}}/>
  );
  return(
    <div style={{overflowX:'auto',flex:1}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
        <thead>
          <tr>
            {['Ref','Audit Step','Status','AQC','Risk','Assigned To','Due Date','Files','Actions'].map(h=>(
              <th key={h} style={{...th,minWidth:h==='Audit Step'?280:h==='Files'?110:undefined}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {project.procedures.map((proc,pi)=>{
            const done=proc.steps.filter(s=>s.status==='done').length;
            const pct=proc.steps.length?Math.round(done/proc.steps.length*100):0;
            return[
              <tr key={proc.id} style={{background:'linear-gradient(90deg,#f0fdfa,#f8fafc)'}}>
                <td colSpan={9} style={{...td,borderLeft:`4px solid ${C.teal}`,padding:'10px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <span style={{fontSize:13,color:C.teal,fontWeight:700,fontFamily:MONO,background:C.tealBg,border:`1px solid ${C.tealBorder}`,borderRadius:6,padding:'2px 8px',flexShrink:0}}>§{pi+1}</span>
                    {editingField(pi,'name')
                      ?inlineInput(editingName,setEditingName,()=>{if(editingName.trim())onRenameProcedure(pi,{name:editingName.trim()});setEditingProc(null);},()=>setEditingProc(null),true)
                      :<span onClick={()=>{setEditingProc({pi,field:'name'});setEditingName(proc.name);}} style={{fontSize:13.5,fontWeight:700,color:C.text1,cursor:'text',padding:'3px 7px',borderRadius:6,border:'1px solid transparent',transition:'all .15s',display:'flex',alignItems:'center',gap:5}}
                        onMouseEnter={e=>{e.currentTarget.style.border=`1px dashed ${C.teal}`;e.currentTarget.style.background='#fff';}}
                        onMouseLeave={e=>{e.currentTarget.style.border='1px solid transparent';e.currentTarget.style.background='transparent';}}>{proc.name}<span style={{fontSize:10,color:C.text3}}>✏</span></span>}
                    <span style={{color:C.text3,fontSize:12}}>—</span>
                    {editingField(pi,'desc')
                      ?inlineInput(editingDesc,setEditingDesc,()=>{onRenameProcedure(pi,{desc:editingDesc});setEditingProc(null);},()=>setEditingProc(null),false)
                      :<span onClick={()=>{setEditingProc({pi,field:'desc'});setEditingDesc(proc.desc||'');}} style={{fontSize:11.5,color:C.text3,fontStyle:'italic',cursor:'text',padding:'3px 7px',borderRadius:6,border:'1px solid transparent',transition:'all .15s',display:'flex',alignItems:'center',gap:5}}
                        onMouseEnter={e=>{e.currentTarget.style.border=`1px dashed ${C.border2}`;e.currentTarget.style.background='#fff';e.currentTarget.style.color=C.text2;}}
                        onMouseLeave={e=>{e.currentTarget.style.border='1px solid transparent';e.currentTarget.style.background='transparent';e.currentTarget.style.color=C.text3;}}>{proc.desc||<span style={{color:C.border2}}>Add description…</span>}<span style={{fontSize:10,opacity:.6}}>✏</span></span>}
                    <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:60,height:4,background:C.border2,borderRadius:2,overflow:'hidden'}}>
                          <div style={{height:'100%',background:C.teal,width:`${pct}%`,borderRadius:2,transition:'width .4s'}}/>
                        </div>
                        <span style={{fontFamily:MONO,fontSize:10.5,color:C.teal,fontWeight:600}}>{done}/{proc.steps.length}</span>
                      </div>
                      <button onClick={()=>onAddStep(pi)} style={{background:C.teal,border:'none',color:'#fff',padding:'4px 12px',borderRadius:6,fontSize:11,cursor:'pointer',fontFamily:'Sora,sans-serif',fontWeight:600}}>＋ Step</button>
                    </div>
                  </div>
                </td>
              </tr>,
              ...proc.steps.map((s,si)=>{
                const m=s.assignee?members.find(t=>t.id===s.assignee):null;
                const docCount=(s.docs||[]).length;
                return(
                  <tr key={s.id} onClick={()=>onOpenTask(pi,si)} style={{cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bg2}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{...td,fontFamily:MONO,fontSize:11.5,color:C.text3,fontWeight:600}}>{s.id}</td>
                    <td style={{...td,color:C.text1,lineHeight:1.5,maxWidth:300}}>{s.step}</td>
                    <td style={td}><Badge map={STATUS_MAP} val={s.status}/></td>
                    <td style={td}><Badge map={AQC_MAP} val={s.aqc}/></td>
                    <td style={td}><Badge map={RISK_MAP} val={s.risk}/></td>
                    <td style={td}>
                      {m?<div style={{display:'flex',alignItems:'center',gap:7}}><Avatar member={m} size={26}/><span style={{fontSize:12,color:C.text2}}>{m.name}</span></div>
                        :<span style={{fontSize:12,color:C.text3}}>— Unassigned</span>}
                    </td>
                    <td style={{...td,fontFamily:MONO,fontSize:11.5,color:C.text3}}>{s.due||'—'}</td>
                    <td style={td}>
                      {docCount>0
                        ?<span style={{display:'inline-flex',alignItems:'center',gap:5,background:C.tealBg,color:C.teal,border:`1px solid ${C.tealBorder}`,borderRadius:20,padding:'3px 10px',fontSize:11,fontFamily:MONO,fontWeight:600,cursor:'pointer'}}>
                          📎 {docCount} {docCount===1?'file':'files'}
                        </span>
                        :<span style={{fontSize:12,color:C.text3}}>—</span>}
                    </td>
                    <td style={td} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:5}}>
                        <button onClick={()=>onOpenTask(pi,si)} title="Edit" style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',fontSize:13,color:C.text3,display:'flex',alignItems:'center',justifyContent:'center'}}>✏</button>
                        <button onClick={()=>onDeleteStep(pi,si)} title="Delete" style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.redBorder}`,background:C.redBg,cursor:'pointer',fontSize:13,color:C.red,display:'flex',alignItems:'center',justifyContent:'center'}}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ];
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── KANBAN VIEW ──────────────────────────────────────────────────────────────
const KanbanView=({project,members,onOpenTask})=>{
  const COLS=[
    {key:'todo',label:'Not Started',color:'#94a3b8'},
    {key:'progress',label:'In Progress',color:C.amber},
    {key:'done',label:'Done',color:C.green},
  ];
  const allSteps=getProjectProcedures(project).flatMap((proc,pi)=>(proc.steps || []).map((s,si)=>({...s,procName:proc.name,pi,si})));
  return(
    <div style={{display:'flex',gap:16,padding:'20px 24px',overflowX:'auto',flex:1,alignItems:'flex-start'}}>
      {COLS.map(col=>{
        const cards=allSteps.filter(s=>s.status===col.key);
        return(
          <div key={col.key} style={{minWidth:270,maxWidth:270,display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#fff',border:`1px solid ${C.border}`,borderRadius:'10px 10px 0 0',borderBottom:`2px solid ${col.color}`}}>
              <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12.5,fontWeight:700,color:C.text1}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:col.color}}/>
                {col.label}
              </div>
              <span style={{fontFamily:MONO,fontSize:11,color:C.text3,background:C.bg2,padding:'2px 7px',borderRadius:10}}>{cards.length}</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8,background:C.bg2,border:`1px solid ${C.border}`,borderTop:'none',borderRadius:'0 0 10px 10px',padding:10,minHeight:100}}>
              {cards.length?cards.map(s=>{
                const m=s.assignee?members.find(t=>t.id===s.assignee):null;
                const docCount=(s.docs||[]).length;
                return(
                  <div key={s.id} onClick={()=>onOpenTask(s.pi,s.si)}
                    style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:10,padding:14,cursor:'pointer',transition:'all .2s',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=C.teal}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                    <div style={{fontFamily:MONO,fontSize:10,color:C.text3,marginBottom:5}}>{s.procName} · {s.id}</div>
                    <div style={{fontSize:12.5,color:C.text1,lineHeight:1.4,marginBottom:10}}>{s.step.length>90?s.step.substring(0,90)+'…':s.step}</div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <Badge map={RISK_MAP} val={s.risk} small/>
                        {docCount>0&&<span style={{fontSize:10,fontFamily:MONO,color:C.teal}}>📎{docCount}</span>}
                      </div>
                      {m?<Avatar member={m} size={22}/>:<span style={{fontSize:11,color:C.text3}}>—</span>}
                    </div>
                  </div>
                );
              }):<div style={{textAlign:'center',color:C.text3,fontSize:12,padding:20}}>No items</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── TASK DRAWER (with Details / Files tabs) ──────────────────────────────────
const TaskDrawer=({open,task,procName,members,onClose,onSave})=>{
  const [form,setForm]=useState(null);
  const [drawerTab,setDrawerTab]=useState('details');
  const [commentText,setCommentText]=useState('');
  const fileInputRef=useRef(null);

  // Reset tab when task changes
  useState(()=>{if(task){setForm({...task,docs:[...(task.docs||[])],comments:[...(task.comments||[])]});setDrawerTab('details');}},[task]);
  if(!open||!task)return null;
  const ft=form||task;
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const inputStyle={background:'#fff',border:`1px solid ${C.border2}`,borderRadius:9,padding:'10px 14px',color:C.text1,fontSize:13.5,fontFamily:'Sora,sans-serif',outline:'none',width:'100%',transition:'border .2s'};
  const labelStyle={fontSize:10.5,fontWeight:700,fontFamily:MONO,color:C.text3,textTransform:'uppercase',letterSpacing:'0.8px',display:'block',marginBottom:8};

  const addComment=()=>{
    if(!commentText.trim())return;
    set('comments',[...(ft.comments||[]),{author:'Admin User',initials:'AM',time:'Just now',text:commentText.trim()}]);
    setCommentText('');
  };

  const handleFileUpload=e=>{
    const newDocs=Array.from(e.target.files).map(f=>({
      name:f.name,
      size:fmtSize(f.size),
      type:f.name.split('.').pop().toLowerCase(),
      uploadedBy:'Admin User',
      uploadedAt:new Date().toISOString().slice(0,10),
    }));
    set('docs',[...ft.docs,...newDocs]);
    e.target.value='';
  };

  const removeDoc=i=>set('docs',ft.docs.filter((_,j)=>j!==i));
  const assignedMember=ft.assignee?members.find(m=>m.id===ft.assignee):null;
  const docCount=(ft.docs||[]).length;

  // Group docs by file type for summary
  const typeGroups={};
  (ft.docs||[]).forEach(d=>{const t=getFileType(d.name);const k=t.label;typeGroups[k]=(typeGroups[k]||0)+1;});

  return(
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.35)',zIndex:100,backdropFilter:'blur(3px)'}}/>
      <div style={{position:'fixed',right:0,top:0,bottom:0,width:600,background:C.bg,borderLeft:`1px solid ${C.border}`,zIndex:101,display:'flex',flexDirection:'column',boxShadow:'-12px 0 50px rgba(0,0,0,0.12)',animation:'slideInRight .25s ease'}}>

        {/* ── DRAWER HEADER ── */}
        <div style={{padding:'20px 26px',borderBottom:`1px solid ${C.border}`,flexShrink:0,background:'#fff'}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
                <span style={{fontFamily:MONO,fontSize:11,color:'#fff',fontWeight:700,background:C.teal,padding:'3px 9px',borderRadius:20}}>{ft.id}</span>
                <span style={{fontFamily:MONO,fontSize:11,color:C.text3}}>{procName}</span>
                {docCount>0&&<span style={{fontFamily:MONO,fontSize:10,color:C.teal,background:C.tealBg,border:`1px solid ${C.tealBorder}`,borderRadius:20,padding:'2px 8px'}}>📎 {docCount} file{docCount!==1?'s':''}</span>}
              </div>
              <div style={{fontSize:15,fontWeight:700,color:C.text1,lineHeight:1.4}}>{ft.step}</div>
            </div>
            <button onClick={onClose} style={{width:33,height:33,borderRadius:9,border:`1px solid ${C.border}`,background:C.bg2,cursor:'pointer',color:C.text2,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
          </div>

          {/* ── TAB STRIP ── */}
          <div style={{display:'flex',gap:2,marginTop:16}}>
            {[['details','📋 Details'],['files',`📁 Files${docCount>0?' ('+docCount+')':''}`]].map(([k,l])=>(
              <button key={k} onClick={()=>setDrawerTab(k)} style={{padding:'8px 16px',borderRadius:'8px 8px 0 0',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'Sora,sans-serif',border:'none',
                color:drawerTab===k?C.teal:C.text3,
                background:drawerTab===k?C.bg:'transparent',
                borderBottom:drawerTab===k?`2px solid ${C.teal}`:'2px solid transparent',
                transition:'all .15s'}}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* ── TAB CONTENT ── */}
        <div style={{flex:1,overflowY:'auto'}}>

          {/* ════ DETAILS TAB ════ */}
          {drawerTab==='details'&&(
            <div style={{padding:'20px 26px',display:'flex',flexDirection:'column',gap:18}}>

              {/* Step description */}
              <div style={{background:'#fff',borderRadius:12,border:`1px solid ${C.border}`,padding:'16px 18px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                <label style={labelStyle}>Audit Step Description</label>
                <textarea value={ft.step} onChange={e=>set('step',e.target.value)} style={{...inputStyle,resize:'vertical',minHeight:72,lineHeight:1.6,border:`1px solid ${C.border}`}}/>
              </div>

              {/* Status + Risk */}
              <div style={{background:'#fff',borderRadius:12,border:`1px solid ${C.border}`,padding:'18px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                  <div>
                    <label style={labelStyle}>Status</label>
                    <DrawerCardSelect options={['todo','progress','done']} val={ft.status} onSelect={v=>set('status',v)} mapObj={STATUS_MAP} cols={1}/>
                  </div>
                  <div>
                    <label style={labelStyle}>Risk Rating</label>
                    <DrawerCardSelect options={['high','medium','low']} val={ft.risk} onSelect={v=>set('risk',v)} mapObj={RISK_MAP} cols={1}/>
                  </div>
                </div>
                <div style={{marginTop:18,paddingTop:18,borderTop:`1px solid ${C.border}`}}>
                  <label style={labelStyle}>AQC — Audit Quality Check</label>
                  <DrawerCardSelect options={['pending','pass','review','fail']} val={ft.aqc} onSelect={v=>set('aqc',v)} mapObj={AQC_MAP} cols={4}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:18,paddingTop:18,borderTop:`1px solid ${C.border}`}}>
                  <div>
                    <label style={labelStyle}>Assigned To</label>
                    {assignedMember&&(
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,background:C.bg2,borderRadius:8,padding:'7px 10px',border:`1px solid ${C.border}`}}>
                        <div style={{width:24,height:24,borderRadius:'50%',background:avatarColor(assignedMember.id),display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',flexShrink:0}}>{assignedMember.initials}</div>
                        <span style={{fontSize:12,fontWeight:600,color:C.text1}}>{assignedMember.name}</span>
                        <span style={{fontSize:10,color:C.text3,fontFamily:MONO,marginLeft:'auto'}}>{assignedMember.role}</span>
                      </div>
                    )}
                    <select value={ft.assignee||''} onChange={e=>set('assignee',parseInt(e.target.value)||null)} style={{...inputStyle,appearance:'none',cursor:'pointer',fontSize:13,padding:'9px 13px'}}>
                      <option value=''>— Unassigned —</option>
                      {members.map(m=><option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Due Date</label>
                    <input type='date' value={ft.due||''} onChange={e=>set('due',e.target.value)} style={inputStyle}/>
                    {ft.due&&<div style={{marginTop:6,fontSize:11,color:C.text3,fontFamily:MONO}}>📅 {new Date(ft.due).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>}
                  </div>
                </div>
              </div>

              {/* Observations */}
              <div style={{background:'#fff',borderRadius:12,border:`1px solid ${C.border}`,padding:'16px 18px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                <label style={labelStyle}>Observations / Findings</label>
                <textarea value={ft.obs||''} onChange={e=>set('obs',e.target.value)} placeholder='Enter your audit observations, findings, and notes here...' style={{...inputStyle,resize:'vertical',minHeight:100,lineHeight:1.6,border:`1px solid ${C.border}`}}/>
              </div>

              {/* Comments */}
              <div style={{background:'#fff',borderRadius:12,border:`1px solid ${C.border}`,padding:'16px 18px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                <label style={labelStyle}>Comments</label>
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:14}}>
                  {(ft.comments||[]).length===0&&<div style={{fontSize:12.5,color:C.text3,padding:'12px 0',textAlign:'center',borderBottom:`1px dashed ${C.border}`}}>No comments yet. Be the first!</div>}
                  {(ft.comments||[]).map((c,i)=>(
                    <div key={i} style={{display:'flex',gap:10}}>
                      <div style={{width:30,height:30,borderRadius:'50%',background:AVATAR_COLORS[Math.abs((c.author||'').charCodeAt(0)-65)%AVATAR_COLORS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',flexShrink:0,marginTop:2}}>{c.initials}</div>
                      <div style={{flex:1,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:'10px 14px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                          <span style={{fontSize:12.5,fontWeight:700,color:C.text1}}>{c.author}</span>
                          <span style={{fontSize:10.5,color:C.text3,fontFamily:MONO}}>{c.time}</span>
                        </div>
                        <div style={{fontSize:13,color:C.text2,lineHeight:1.55}}>{c.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
                  <textarea value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder='Add a comment...' rows={2} style={{...inputStyle,flex:1,resize:'none',border:`1px solid ${C.border}`}}/>
                  <button onClick={addComment} style={{background:C.teal,color:'#fff',border:'none',padding:'10px 16px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'Sora,sans-serif',flexShrink:0}}>↑ Send</button>
                </div>
              </div>
            </div>
          )}

          {/* ════ FILES TAB ════ */}
          {drawerTab==='files'&&(
            <div style={{padding:'20px 26px',display:'flex',flexDirection:'column',gap:18}}>

              {/* Summary bar */}
              {docCount>0&&(
                <div style={{background:'#fff',borderRadius:12,border:`1px solid ${C.border}`,padding:'14px 18px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:36,height:36,borderRadius:9,background:C.tealBg,border:`1px solid ${C.tealBorder}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>📁</div>
                    <div>
                      <div style={{fontSize:16,fontWeight:800,color:C.text1,fontFamily:MONO}}>{docCount}</div>
                      <div style={{fontSize:11,color:C.text3}}>Total files</div>
                    </div>
                  </div>
                  <div style={{width:1,height:32,background:C.border}}/>
                  {Object.entries(typeGroups).map(([type,count])=>(
                    <div key={type} style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:14}}>{FILE_TYPES[Object.keys(FILE_TYPES).find(k=>FILE_TYPES[k].label===type)]?.icon||'📎'}</span>
                      <span style={{fontSize:12,color:C.text2,fontWeight:600}}>{count} {type}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload zone */}
              <div style={{background:'#fff',borderRadius:12,border:`1px solid ${C.border}`,padding:'16px 18px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                <label style={labelStyle}>Upload Documents</label>
                <label style={{display:'block',border:`2px dashed ${C.tealBorder}`,borderRadius:12,padding:'28px 20px',textAlign:'center',cursor:'pointer',transition:'all .2s',background:C.tealBg}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.background='#e6faf7';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.tealBorder;e.currentTarget.style.background=C.tealBg;}}>
                  <div style={{fontSize:32,marginBottom:10}}>📎</div>
                  <div style={{fontSize:14,color:C.teal,fontWeight:700,marginBottom:4}}>Click to upload or drag & drop</div>
                  <div style={{fontSize:12,color:C.text3}}>PDF, Excel, Word, Images, CSV — any size</div>
                  <input ref={fileInputRef} type='file' multiple style={{display:'none'}} onChange={handleFileUpload}/>
                </label>
              </div>

              {/* Files grid */}
              {docCount===0?(
                <div style={{textAlign:'center',padding:'40px 20px',color:C.text3,background:'#fff',borderRadius:12,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:40,marginBottom:10,opacity:.3}}>📂</div>
                  <div style={{fontSize:14,fontWeight:600,color:C.text2,marginBottom:4}}>No files attached yet</div>
                  <div style={{fontSize:12}}>Upload documents using the zone above</div>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {(ft.docs||[]).map((doc,i)=>{
                    const ft2=getFileType(doc.name);
                    return(
                      <div key={i} style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:14,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',transition:'all .15s'}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=ft2.border;e.currentTarget.style.boxShadow=`0 3px 12px ${ft2.border}88`;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)';}}>
                        {/* File type icon block */}
                        <div style={{width:44,height:44,borderRadius:10,background:ft2.bg,border:`1px solid ${ft2.border}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,flexShrink:0}}>
                          <span style={{fontSize:18}}>{ft2.icon}</span>
                          <span style={{fontSize:8,fontFamily:MONO,fontWeight:700,color:ft2.color,textTransform:'uppercase',letterSpacing:'0.5px'}}>{ft2.label}</span>
                        </div>
                        {/* File info */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13.5,fontWeight:600,color:C.text1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.name}</div>
                          <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4,flexWrap:'wrap'}}>
                            <span style={{fontSize:11,color:C.text3,fontFamily:MONO}}>{doc.size||'—'}</span>
                            {doc.uploadedBy&&<>
                              <span style={{fontSize:11,color:C.border2}}>·</span>
                              <span style={{fontSize:11,color:C.text3}}>by {doc.uploadedBy}</span>
                            </>}
                            {doc.uploadedAt&&<>
                              <span style={{fontSize:11,color:C.border2}}>·</span>
                              <span style={{fontSize:11,color:C.text3,fontFamily:MONO}}>{doc.uploadedAt}</span>
                            </>}
                          </div>
                        </div>
                        {/* Actions */}
                        <div style={{display:'flex',gap:6,flexShrink:0}}>
                          <button title="Download" style={{width:30,height:30,borderRadius:7,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',fontSize:13,color:C.text3,display:'flex',alignItems:'center',justifyContent:'center'}}>⬇</button>
                          <button onClick={()=>removeDoc(i)} title="Remove" style={{width:30,height:30,borderRadius:7,border:`1px solid ${C.redBorder}`,background:C.redBg,cursor:'pointer',fontSize:13,color:C.red,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{padding:'16px 26px',borderTop:`1px solid ${C.border}`,display:'flex',gap:10,flexShrink:0,background:'#fff'}}>
          <button onClick={()=>{onSave(ft);setForm(null);}} style={{flex:1,background:C.teal,color:'#fff',border:'none',padding:'11px 16px',borderRadius:9,fontSize:13.5,fontWeight:700,cursor:'pointer',fontFamily:'Sora,sans-serif',boxShadow:`0 3px 14px ${C.teal}44`}}>✓ Save Changes</button>
          <button onClick={onClose} style={{background:'#fff',color:C.text2,border:`1px solid ${C.border2}`,padding:'11px 18px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'Sora,sans-serif'}}>Cancel</button>
        </div>
      </div>
    </>
  );
};

// ─── CSV IMPORT MODAL ─────────────────────────────────────────────────────────
// CSV Schema:
//   Column A: procedure   — Procedure / group name (blank = same as previous row)
//   Column B: step        — Audit step description (required)
//   Column C: risk        — high | medium | low  (optional, default: medium)
//   Column D: assignee_id — Member ID number (optional)
//   Column E: due         — YYYY-MM-DD (optional)
//
// Example rows:
//   procedure,step,risk,assignee_id,due
//   Policies & Procedures,Obtain copy of organization chart,high,2,2025-02-10
//   ,Verify POSH Committee constitution,medium,3,2025-02-12
//   Recruitment Process,Check manpower budget approval,high,3,2025-02-18

const SAMPLE_CSV = `procedure,step,risk,assignee_id,due
Policies & Procedures,Obtain copy of organisation chart and review delegation of duties.,high,2,2025-02-10
,Verify POSH Internal Committee is constituted as per law.,high,3,2025-02-12
,Check whistleblower / grievance redressal mechanism exists.,medium,2,2025-02-20
,Verify HR policies are approved by Board / Senior Management.,medium,4,2025-02-15
Recruitment Process,Check whether Manpower budget is approved and monitored.,medium,3,2025-02-18
,Verify recruitment is based on approved Manpower Requisition form.,medium,2,2025-02-18
,Confirm hiring is within approved salary band.,high,4,2025-02-20
Payroll & Compensation,Match salary payments with approved payroll output file.,high,10,2025-03-05
,Verify salary revision approvals and increments authorized.,high,,2025-03-10
,Check statutory deductions (PF ESI TDS) computed correctly.,high,,2025-03-12`;

// ─── SHEETJS LOADER ──────────────────────────────────────────────────────────
// Dynamically load SheetJS once, cache the promise
let _xlsxPromise = null;
function loadXLSX(){
  if(_xlsxPromise) return _xlsxPromise;
  _xlsxPromise = new Promise((resolve,reject)=>{
    if(window.XLSX){resolve(window.XLSX);return;}
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload=()=>resolve(window.XLSX);
    s.onerror=()=>reject(new Error('Failed to load SheetJS'));
    document.head.appendChild(s);
  });
  return _xlsxPromise;
}

// ─── PARSE ROWS → PROCEDURES ─────────────────────────────────────────────────
// Works on a 2D array of rows (already decoded, first row = header)
function buildProceduresFromRows(rows){
  // Skip header row — detect it by checking if first cell contains "procedure" or "step"
  let startIdx = 0;
  const firstRow = (rows[0]||[]).map(c=>String(c||'').toLowerCase().trim());
  if(firstRow.includes('procedure') || firstRow.includes('step') || firstRow.includes('audit step')){
    startIdx = 1; // skip header
  }
  // Also skip the description sub-row our Excel has (row 2 in the sheet, contains "Procedure / Group Name" etc.)
  const secondRow = (rows[startIdx]||[]).map(c=>String(c||'').toLowerCase().trim());
  if(secondRow[0] && (secondRow[0].includes('group') || secondRow[0].includes('blank') || secondRow[0].includes('procedure / group'))){
    startIdx++;
  }

  const procedures=[];
  let currentProc=null;
  let currentProcName='';
  let procCounter=1;

  for(let ri=startIdx; ri<rows.length; ri++){
    const row = rows[ri];
    if(!row || row.every(c=>!c && c!==0)) continue; // skip empty rows

    const procName  = String(row[0]||'').trim();
    const stepText  = String(row[1]||'').trim();
    const riskRaw   = String(row[2]||'').toLowerCase().trim();
    const risk      = ['high','medium','low'].includes(riskRaw) ? riskRaw : 'medium';
    const assigneeId= parseInt(row[3]) || null;
    const due       = String(row[4]||'').trim();

    if(!stepText) continue; // skip rows without a step

    // Skip if it looks like the description sub-header row from our Excel audit category
    if(stepText.toLowerCase().includes('audit step description') ||
       stepText.toLowerCase().includes('[required]') ||
       stepText.toLowerCase().startsWith('procedure')) continue;

    if(procName && procName !== currentProcName){
      // New procedure group
      currentProcName = procName;
      currentProc = {
        id: 'csv_p' + Date.now() + '_' + procCounter,
        name: procName,
        desc: '',
        steps: []
      };
      procedures.push(currentProc);
      procCounter++;
    } else if(!currentProc){
      currentProc = {
        id: 'csv_p' + Date.now() + '_' + (procCounter++),
        name: 'Imported Procedure',
        desc: '',
        steps: []
      };
      procedures.push(currentProc);
    }

    const stepNum = currentProc.steps.length + 1;
    const procIdx = procedures.indexOf(currentProc) + 1;
    const newStep = mkStep(
      `${procIdx}.${stepNum}`,
      stepText, 'todo', 'pending', risk, assigneeId, due, '', [], []
    );
    currentProc.steps.push(newStep);
  }
  return procedures;
}

// ─── PARSE CSV TEXT → ROWS ────────────────────────────────────────────────────
function parseCSVText(text){
  // Strip BOM if present (common in Excel-exported CSVs)
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  const lines = cleaned.split('\n');
  const rows = lines.map(line=>{
    const cols=[];
    let cur=''; let inQ=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'){
        if(inQ && line[i+1]==='"'){cur+='"';i++;} // escaped quote
        else{inQ=!inQ;}
      } else if(ch===','&&!inQ){cols.push(cur);cur='';}
      else{cur+=ch;}
    }
    cols.push(cur);
    return cols.map(c=>c.trim());
  });
  return buildProceduresFromRows(rows);
}

// ─── LEGACY ALIAS ─────────────────────────────────────────────────────────────
function parseCSV(text){ return parseCSVText(text); }

const ImportModal=({open,onClose,onImport,projectName,setProjectName})=>{
  const [csvText,setCsvText]=useState('');
  const [preview,setPreview]=useState(null);
  const [parseError,setParseError]=useState('');
  const [activeTab,setActiveTab]=useState('upload'); // upload | paste | schema
  const fileRef=useRef(null);

  const doPreview=text=>{
    try{
      const procs=parseCSV(text);
      if(!procs.length){setParseError('No valid rows found. Check format.');setPreview(null);return;}
      setPreview(procs);setParseError('');
    }catch(e){setParseError('Parse error: '+e.message);setPreview(null);}
  };

  const [loading,setLoading]=useState(false);

  const handleFile=async e=>{
    const f=e.target.files[0];if(!f)return;
    e.target.value='';
    const ext=f.name.split('.').pop().toLowerCase();
    setLoading(true);setParseError('');setPreview(null);

    try{
      if(ext==='xlsx'||ext==='xls'){
        // Use SheetJS to read Excel binary
        const XLSX=await loadXLSX();
        const buf=await f.arrayBuffer();
        const wb=XLSX.read(buf,{type:'array'});
        // Use the first sheet
        const wsName=wb.SheetNames[0];
        const ws=wb.Sheets[wsName];
        // Convert to 2D array — defval:'' ensures empty cells are ''
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',blankrows:false});
        const procs=buildProceduresFromRows(rows);
        if(!procs.length){setParseError('No valid rows found in Excel. Check the sheet matches the schema.');setLoading(false);return;}
        setPreview(procs);setParseError('');
      } else {
        // CSV — read as text with UTF-8, fallback to latin1 if garbled
        const readAs=(encoding)=>new Promise((res,rej)=>{
          const r=new FileReader();
          r.onload=ev=>res(ev.target.result);
          r.onerror=rej;
          r.readAsText(f,encoding);
        });
        let text=await readAs('utf-8');
        // If garbled (lots of replacement chars), retry with windows-1252
        const garbledCount=(text.match(/\uFFFD/g)||[]).length;
        if(garbledCount>5) text=await readAs('windows-1252');
        setCsvText(text);
        const procs=parseCSVText(text);
        if(!procs.length){setParseError('No valid rows found. Check format.');setLoading(false);return;}
        setPreview(procs);setParseError('');
      }
    }catch(err){
      setParseError('Error reading file: '+err.message);
    }
    setLoading(false);
  };

  const downloadSample=()=>{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([SAMPLE_CSV],{type:'text/csv'}));
    a.download='AuditFlow_Import_Template.csv';a.click();
  };

  if(!open)return null;

  const tabBtn=(k,l)=>(
    <button key={k} onClick={()=>setActiveTab(k)} style={{padding:'8px 16px',borderRadius:8,fontSize:12.5,fontWeight:600,cursor:'pointer',border:'none',fontFamily:'Sora,sans-serif',color:activeTab===k?C.teal:C.text3,background:activeTab===k?C.tealBg:'transparent',borderBottom:activeTab===k?`2px solid ${C.teal}`:'2px solid transparent',transition:'all .15s'}}>{l}</button>
  );

  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.55)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)',padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:18,width:'100%',maxWidth:680,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.2)',animation:'slideUp .3s ease'}}>

        {/* Header */}
        <div style={{padding:'22px 26px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:C.text1,marginBottom:4}}>⬆ Import Audit Steps</div>
            <div style={{fontSize:12.5,color:C.text3}}>Upload a CSV/Excel file to automatically build procedures and audit steps</div>
          </div>
          <button onClick={onClose} style={{width:33,height:33,borderRadius:9,border:`1px solid ${C.border}`,background:C.bg2,cursor:'pointer',fontSize:16,color:C.text2,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,padding:'14px 26px 0',borderBottom:`1px solid ${C.border}`}}>
          {tabBtn('upload','📁 Upload File')}
          {tabBtn('paste','✏ Paste CSV')}
          {tabBtn('schema','📐 Schema Guide')}
        </div>

        <div style={{padding:'20px 26px',display:'flex',flexDirection:'column',gap:16}}>

          {activeTab==='upload'&&(
            <>
              <label style={{display:'block',border:`2px dashed ${C.tealBorder}`,borderRadius:14,padding:'32px 20px',textAlign:'center',cursor:'pointer',background:loading?'#e6faf7':C.tealBg,transition:'all .2s',opacity:loading?0.7:1}}
                onMouseEnter={e=>{if(!loading){e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.background='#e6faf7';}}}
                onMouseLeave={e=>{if(!loading){e.currentTarget.style.borderColor=C.tealBorder;e.currentTarget.style.background=C.tealBg;}}}>
                <div style={{fontSize:36,marginBottom:10}}>{loading?'⏳':'📂'}</div>
                <div style={{fontSize:15,fontWeight:700,color:C.teal,marginBottom:6}}>
                  {loading?'Reading file…':'Click to choose your file'}
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,flexWrap:'wrap',marginBottom:6}}>
                  {[['📊','Excel .xlsx',C.greenBg,C.green,C.greenBorder],['📈','Excel .xls',C.greenBg,C.green,C.greenBorder],['📋','CSV .csv',C.tealBg,C.teal,C.tealBorder]].map(([icon,label,bg,color,border])=>(
                    <span key={label} style={{fontSize:11,fontFamily:MONO,fontWeight:700,background:bg,color:color,border:`1px solid ${border}`,borderRadius:6,padding:'3px 9px',display:'inline-flex',alignItems:'center',gap:4}}>{icon} {label}</span>
                  ))}
                </div>
                <div style={{fontSize:11.5,color:C.text3,marginTop:4}}>Make sure your file follows the schema in the <strong>Schema Guide</strong> tab</div>
                <input ref={fileRef} type='file' accept='.csv,.xlsx,.xls' style={{display:'none'}} onChange={handleFile} disabled={loading}/>
              </label>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1,height:1,background:C.border}}/>
                <span style={{fontSize:12,color:C.text3,fontFamily:MONO}}>OR</span>
                <div style={{flex:1,height:1,background:C.border}}/>
              </div>
              <button onClick={downloadSample} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 18px',cursor:'pointer',fontFamily:'Sora,sans-serif',fontSize:13,fontWeight:600,color:C.text2,display:'flex',alignItems:'center',gap:10,justifyContent:'center'}}>
                ⬇ Download Sample CSV Template
                <span style={{fontSize:11,color:C.text3,fontFamily:MONO}}>with example procedures & steps</span>
              </button>
            </>
          )}

          {/* PASTE tab */}
          {activeTab==='paste'&&(
            <>
              <div style={{fontSize:12.5,color:C.text3,background:C.bg2,borderRadius:8,padding:'10px 14px',fontFamily:MONO,lineHeight:1.6}}>
                Format: <strong style={{color:C.text2}}>procedure,step,risk,assignee_id,due</strong><br/>
                Leave procedure blank to add to previous group. Risk: high/medium/low.
              </div>
              <textarea value={csvText} onChange={e=>{setCsvText(e.target.value);setPreview(null);setParseError('');}}
                placeholder={SAMPLE_CSV} rows={8}
                style={{background:'#fff',border:`1.5px solid ${C.border2}`,borderRadius:10,padding:'12px 14px',color:C.text1,fontSize:12.5,fontFamily:MONO,outline:'none',resize:'vertical',lineHeight:1.6}}/>
              <button onClick={()=>doPreview(csvText)} style={{background:C.teal,color:'#fff',border:'none',borderRadius:9,padding:'10px 18px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'Sora,sans-serif',alignSelf:'flex-start'}}>
                👁 Preview Import
              </button>
            </>
          )}

          {/* SCHEMA tab */}
          {activeTab==='schema'&&(
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{background:C.tealBg,border:`1px solid ${C.tealBorder}`,borderRadius:10,padding:'14px 16px'}}>
                <div style={{fontSize:13,fontWeight:700,color:C.teal,marginBottom:8}}>📐 CSV Column Schema</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {[
                    {col:'A',name:'procedure',required:false,type:'Text',desc:'Group / procedure name. Leave blank to continue adding steps to the previous group.'},
                    {col:'B',name:'step',required:true,type:'Text',desc:'Full audit step description. Required — rows without this are skipped.'},
                    {col:'C',name:'risk',required:false,type:'high | medium | low',desc:'Risk rating for the step. Defaults to "medium" if blank or invalid.'},
                    {col:'D',name:'assignee_id',required:false,type:'Number',desc:'Team member ID to assign. Must match an existing member ID (1–10, etc.)'},
                    {col:'E',name:'due',required:false,type:'YYYY-MM-DD',desc:'Due date in ISO format. E.g. 2025-03-15. Leave blank if not set.'},
                  ].map(row=>(
                    <div key={row.col} style={{display:'flex',gap:12,padding:'10px 12px',background:'#fff',borderRadius:8,border:`1px solid ${C.border}`,alignItems:'flex-start'}}>
                      <span style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:'#fff',background:C.teal,borderRadius:5,padding:'2px 7px',flexShrink:0,marginTop:1}}>{row.col}</span>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                          <span style={{fontSize:13,fontWeight:700,color:C.text1,fontFamily:MONO}}>{row.name}</span>
                          <span style={{fontSize:10,fontFamily:MONO,padding:'1px 6px',borderRadius:4,background:row.required?C.redBg:C.bg2,color:row.required?C.red:C.text3,border:`1px solid ${row.required?C.redBorder:C.border}`}}>{row.required?'Required':'Optional'}</span>
                          <span style={{fontSize:10.5,color:C.text3,fontFamily:MONO}}>{row.type}</span>
                        </div>
                        <div style={{fontSize:12,color:C.text2,lineHeight:1.5}}>{row.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{background:C.bg2,borderRadius:10,padding:'14px 16px'}}>
                <div style={{fontSize:12.5,fontWeight:700,color:C.text1,marginBottom:8}}>Example CSV</div>
                <pre style={{fontSize:11.5,fontFamily:MONO,color:C.text2,lineHeight:1.7,overflowX:'auto',whiteSpace:'pre-wrap'}}>
{`procedure,step,risk,assignee_id,due
Policies & Procedures,Obtain org chart and review delegation.,high,2,2025-02-10
,Verify POSH Committee is constituted per law.,high,3,2025-02-12
,Check whistleblower mechanism exists.,medium,2,2025-02-20
Recruitment Process,Check Manpower budget is approved.,medium,3,2025-02-18
,Verify recruitment uses approved MRF form.,medium,2,2025-02-18`}
                </pre>
                <button onClick={downloadSample} style={{marginTop:10,background:'#fff',border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 14px',cursor:'pointer',fontFamily:'Sora,sans-serif',fontSize:12.5,fontWeight:600,color:C.text2,display:'flex',alignItems:'center',gap:8}}>
                  ⬇ Download Full Sample Template
                </button>
              </div>
            </div>
          )}

          {/* Parse error */}
          {parseError&&(
            <div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:10,padding:'12px 16px',fontSize:13,color:C.red,display:'flex',alignItems:'center',gap:10}}>
              ❌ {parseError}
            </div>
          )}

          {/* Preview */}
          {preview&&(
            <div style={{background:'#fff',border:`1px solid ${C.tealBorder}`,borderRadius:12,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
              <div style={{padding:'12px 16px',background:C.tealBg,borderBottom:`1px solid ${C.tealBorder}`,display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:13,fontWeight:700,color:C.teal}}>✅ Preview</span>
                <span style={{fontFamily:MONO,fontSize:11,color:C.teal}}>{preview.length} procedure{preview.length!==1?'s':''} · {preview.reduce((a,p)=>a+p.steps.length,0)} steps</span>
              </div>
              <div style={{maxHeight:260,overflowY:'auto'}}>
                {preview.map((proc,pi)=>(
                  <div key={pi}>
                    <div style={{padding:'10px 16px',background:'linear-gradient(90deg,#f0fdfa,#f8fafc)',borderLeft:`4px solid ${C.teal}`,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:C.teal,background:C.tealBg,border:`1px solid ${C.tealBorder}`,borderRadius:5,padding:'1px 7px'}}>§{pi+1}</span>
                      <span style={{fontSize:13,fontWeight:700,color:C.text1}}>{proc.name}</span>
                      <span style={{fontSize:11,color:C.text3,marginLeft:'auto',fontFamily:MONO}}>{proc.steps.length} steps</span>
                    </div>
                    {proc.steps.map((s,si)=>(
                      <div key={si} style={{padding:'8px 16px 8px 32px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontFamily:MONO,fontSize:10.5,color:C.text3,minWidth:30}}>{s.id}</span>
                        <span style={{fontSize:12.5,color:C.text1,flex:1}}>{s.step.length>80?s.step.slice(0,80)+'…':s.step}</span>
                        <Badge map={RISK_MAP} val={s.risk} small/>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'16px 26px',borderTop:`1px solid ${C.border}`,display:'flex',gap:10,justifyContent:'flex-end',background:'#fff'}}>
          <button onClick={onClose} style={{background:'transparent',color:C.text2,border:`1px solid ${C.border2}`,padding:'9px 18px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'Sora,sans-serif'}}>Cancel</button>
          <button onClick={()=>{if(!preview||!preview.length)return;onImport(preview);onClose();}}
            disabled={!preview||!preview.length}
            style={{background:preview?.length?C.teal:'#94a3b8',color:'#fff',border:'none',padding:'9px 20px',borderRadius:9,fontSize:13,fontWeight:700,cursor:preview?.length?'pointer':'not-allowed',fontFamily:'Sora,sans-serif',boxShadow:preview?.length?`0 3px 12px ${C.teal}44`:'none',transition:'all .2s'}}>
            ⬆ Import {preview?.length?`${preview.reduce((a,p)=>a+p.steps.length,0)} Steps`:''}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── NEW PROJECT MODAL ────────────────────────────────────────────────────────
const NewProjectModal=({open,members,onClose,onCreate})=>{
  const [form,setForm]=useState({
    name:'',
    projectName:'',
    projectLeader:'',
    clientName:'',
    start:'',
    end:'',
    projectLength:'',
    coordinatorName:'',
    unit:'',
    type:'hr',
    status:'active',
    lead:'',
    desc:'',
  });
  const [showImport,setShowImport]=useState(false);
  const [importedProcedures,setImportedProcedures]=useState(null);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const inputStyle={background:'#fff',border:`1px solid ${C.border2}`,borderRadius:8,padding:'9px 13px',color:C.text1,fontSize:13.5,fontFamily:'Sora,sans-serif',outline:'none',width:'100%'};
  const labelStyle={fontSize:11,fontWeight:600,fontFamily:MONO,color:C.text3,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:6};
  if(!open)return null;
  const icons={hr:'👤',fin:'💰',inv:'📦',bil:'🧾',it:'💻',ops:'⚙️'};
  return(
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>
        <div onClick={e=>e.stopPropagation()} style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:16,width:560,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.15)',animation:'slideUp .3s ease'}}>
          <div style={{padding:'22px 24px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:18,fontWeight:800,color:C.text1}}>Add Audited Company</div>
              <div style={{fontSize:12,color:C.text3,marginTop:3}}>Create a company workspace inside this audit category, then optionally import steps from CSV</div>
            </div>
            <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',fontSize:16,color:C.text2,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
          <div style={{padding:24,display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={labelStyle}>Project Name *</label><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder='e.g. HR Audit — Q1 2025' style={inputStyle}/></div>
            <div><label style={labelStyle}>Unit / Entity *</label><input value={form.unit} onChange={e=>set('unit',e.target.value)} placeholder='e.g. Lixil Window Systems Private Limited' style={inputStyle}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={labelStyle}>Project Leader</label><input value={form.projectLeader} onChange={e=>set('projectLeader',e.target.value)} placeholder='e.g. Priya Sharma' style={inputStyle}/></div>
              <div><label style={labelStyle}>Client&apos;s Name</label><input value={form.clientName} onChange={e=>set('clientName',e.target.value)} placeholder='e.g. PW Company' style={inputStyle}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={labelStyle}>Audit Type</label>
                <select value={form.type} onChange={e=>set('type',e.target.value)} style={{...inputStyle,appearance:'none',cursor:'pointer'}}>
                  {[['hr','👤 Human Resources'],['fin','💰 Finance & Accounts'],['inv','📦 Inventory Management'],['bil','🧾 Billing & Collection'],['it','💻 IT & Systems'],['ops','⚙️ Operations']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Status</label>
                <select value={form.status} onChange={e=>set('status',e.target.value)} style={{...inputStyle,appearance:'none',cursor:'pointer'}}>
                  <option value='active'>Active</option><option value='review'>Under Review</option><option value='closed'>Closed</option>
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={labelStyle}>Start Date</label><input type='date' value={form.start} onChange={e=>set('start',e.target.value)} style={inputStyle}/></div>
              <div><label style={labelStyle}>End Date</label><input type='date' value={form.end} onChange={e=>set('end',e.target.value)} style={inputStyle}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label style={labelStyle}>Project Length</label><input value={form.projectLength} onChange={e=>set('projectLength',e.target.value)} placeholder='e.g. 45 Days' style={inputStyle}/></div>
              <div><label style={labelStyle}>Audit Coordinator</label><input value={form.coordinatorName} onChange={e=>set('coordinatorName',e.target.value)} placeholder='e.g. Rahul Tiwari' style={inputStyle}/></div>
            </div>
            <div><label style={labelStyle}>Lead Auditor</label>
              <select value={form.lead} onChange={e=>set('lead',e.target.value)} style={{...inputStyle,appearance:'none',cursor:'pointer'}}>
                <option value=''>— Select Lead —</option>
                {members.filter(m=>m.role==='Admin'||m.role==='Reviewer').map(m=><option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Description</label>
              <textarea value={form.desc} onChange={e=>set('desc',e.target.value)} placeholder='Brief description of audit scope...' rows={2} style={{...inputStyle,resize:'vertical',lineHeight:1.5}}/>
            </div>

            {/* Import CSV section */}
            <div style={{borderRadius:12,border:`2px dashed ${importedProcedures?C.tealBorder:C.border}`,padding:'16px 18px',background:importedProcedures?C.tealBg:'#fafafa',transition:'all .2s'}}>
              {importedProcedures?(
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{fontSize:24}}>✅</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13.5,fontWeight:700,color:C.teal}}>Steps imported from CSV</div>
                    <div style={{fontSize:12,color:C.text2,marginTop:3}}>{importedProcedures.length} procedure{importedProcedures.length!==1?'s':''} · {importedProcedures.reduce((a,p)=>a+p.steps.length,0)} audit steps ready</div>
                  </div>
                  <button onClick={()=>setImportedProcedures(null)} style={{fontSize:12,color:C.red,cursor:'pointer',background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:7,padding:'4px 10px',fontFamily:'Sora,sans-serif',fontWeight:600}}>Remove</button>
                </div>
              ):(
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:13.5,fontWeight:600,color:C.text2,marginBottom:4}}>📂 Import Audit Steps from CSV / Excel</div>
                  <div style={{fontSize:12,color:C.text3,marginBottom:12}}>Skip manual entry — upload a pre-filled CSV to auto-create all procedures and steps</div>
                  <button onClick={()=>setShowImport(true)} style={{background:C.teal,color:'#fff',border:'none',borderRadius:8,padding:'9px 20px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'Sora,sans-serif',boxShadow:`0 3px 10px ${C.teal}44`}}>
                    ⬆ Upload CSV / Excel
                  </button>
                </div>
              )}
            </div>
          </div>
          <div style={{padding:'0 24px 24px',display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={onClose} style={{background:'transparent',color:C.text2,border:`1px solid ${C.border2}`,padding:'9px 16px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'Sora,sans-serif'}}>Cancel</button>
            <button onClick={()=>onCreate(form,importedProcedures)} style={{background:C.teal,color:'#fff',border:'none',padding:'9px 20px',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Sora,sans-serif',boxShadow:`0 3px 12px ${C.teal}44`}}>
              {icons[form.type]} Create Project →
            </button>
          </div>
        </div>
      </div>
      {showImport&&<ImportModal open={showImport} onClose={()=>setShowImport(false)} onImport={procs=>{setImportedProcedures(procs);setShowImport(false);}}/>}
    </>
  );
};

// ─── ADD MEMBER MODAL ─────────────────────────────────────────────────────────
const AddMemberModal=({open,onClose,onAdd})=>{
  const [form,setForm]=useState({name:'',role:'Auditor',email:''});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const inputStyle={background:'#fff',border:`1px solid ${C.border2}`,borderRadius:8,padding:'9px 13px',color:C.text1,fontSize:13.5,fontFamily:'Sora,sans-serif',outline:'none',width:'100%'};
  const labelStyle={fontSize:11,fontWeight:600,fontFamily:MONO,color:C.text3,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:6};
  if(!open)return null;
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:16,width:440,boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}}>
        <div style={{padding:'22px 24px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:18,fontWeight:700,color:C.text1}}>Add Team Member</div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',fontSize:16,color:C.text2}}>✕</button>
        </div>
        <div style={{padding:24,display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div><label style={labelStyle}>Full Name</label><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder='e.g. Priya Sharma' style={inputStyle}/></div>
            <div><label style={labelStyle}>Role</label>
              <select value={form.role} onChange={e=>set('role',e.target.value)} style={{...inputStyle,appearance:'none',cursor:'pointer'}}>
                <option>Admin</option><option>Auditor</option><option>Reviewer</option>
              </select>
            </div>
          </div>
          <div><label style={labelStyle}>Email</label><input type='email' value={form.email} onChange={e=>set('email',e.target.value)} placeholder='email@lixil.com' style={inputStyle}/></div>
        </div>
        <div style={{padding:'0 24px 24px',display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{background:'transparent',color:C.text2,border:`1px solid ${C.border2}`,padding:'9px 16px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'Sora,sans-serif'}}>Cancel</button>
          <button onClick={()=>onAdd(form)} style={{background:C.teal,color:'#fff',border:'none',padding:'9px 18px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'Sora,sans-serif'}}>Add Member</button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function AuditFlow(){
  const [view,setView]=useState('templates');
  const [projects,setProjects]=useState(INIT_PROJECTS.slice(0,1).map(project=>({...project,templateId:'hr-auditing'})));
  const [auditMembers,setAuditMembers]=useState([]);
  const [membersLoading,setMembersLoading]=useState(false);
  const [membersError,setMembersError]=useState('');
  const [members,setMembers]=useState(INIT_MEMBERS);
  const [selectedTemplateId,setSelectedTemplateId]=useState(null);
  const [currentProjId,setCurrentProjId]=useState(null);
  const [activeTab,setActiveTab]=useState('table');
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [drawerTask,setDrawerTask]=useState(null);
  const [drawerProcIdx,setDrawerProcIdx]=useState(null);
  const [drawerStepIdx,setDrawerStepIdx]=useState(null);
  const [newProjModal,setNewProjModal]=useState(false);
  const [addMemberModal,setAddMemberModal]=useState(false);
  const [importModal,setImportModal]=useState(false);
  const [search,setSearch]=useState('');
  const {toasts,show:showToast}=useToast();

  useEffect(()=>{
    let active = true;
    const loadAuditMembers = async () => {
      try {
        setMembersLoading(true);
        setMembersError('');
        const response = await fetch('/Auditing/api/team', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to load team members.');
        if (!active) return;
        setAuditMembers(Array.isArray(result.members) ? result.members : []);
      } catch (error) {
        if (!active) return;
        setMembersError(error.message || 'Failed to load team members.');
      } finally {
        if (active) setMembersLoading(false);
      }
    };
    loadAuditMembers();
    return () => {
      active = false;
    };
  }, []);

  const selectedTemplate = AUDIT_TEMPLATES.find(t=>t.id===selectedTemplateId) || null;
  const isPdplTemplate = selectedTemplateId === 'pdpl-template';
  const isCstTemplate = selectedTemplateId === 'cst-audit-template';
  const templateProjects = selectedTemplateId ? projects.filter(p=>p.templateId===selectedTemplateId) : [];
  const backToTemplateLibrary = ()=>{setSelectedTemplateId(null);setCurrentProjId(null);setView('templates');setSearch('');};
  const currentProj=projects.find(p=>p.id===currentProjId);

  const openProject=id=>{setCurrentProjId(id);setView('project');setActiveTab('table');};
  const openTemplate=templateId=>{setSelectedTemplateId(templateId);setCurrentProjId(null);setView('dashboard');setSearch('');};

  const openTask=(pi,si)=>{
    const s=currentProj.procedures[pi].steps[si];
    setDrawerProcIdx(pi);setDrawerStepIdx(si);
    setDrawerTask({...s,docs:[...(s.docs||[])],comments:[...(s.comments||[])]});
    setDrawerOpen(true);
  };

  const saveTask=updated=>{
    setProjects(ps=>ps.map(p=>{
      if(p.id!==currentProjId)return p;
      return{...p,procedures:p.procedures.map((proc,pi)=>pi!==drawerProcIdx?proc:{...proc,steps:proc.steps.map((s,si)=>si===drawerStepIdx?{...s,...updated}:s)})};
    }));
    setDrawerOpen(false);
    showToast('success','Step saved successfully');
  };

  const addStep=pi=>{
    setProjects(ps=>ps.map(p=>{
      if(p.id!==currentProjId)return p;
      const proc=p.procedures[pi];
      const parts=(proc.steps.length?proc.steps[proc.steps.length-1].id:pi+1+'.0').split('.');
      const newId=parts[0]+'.'+(parseInt(parts[1]||0)+1);
      const newStep={...mkStep(newId,'New audit step — click to edit','todo','pending','medium',null,'',''),docs:[],comments:[]};
      return{...p,procedures:p.procedures.map((pr,i)=>i===pi?{...pr,steps:[...pr.steps,newStep]}:pr)};
    }));
    showToast('info','New step added — click to edit');
  };

  const deleteStep=(pi,si)=>{
    if(!window.confirm('Delete this audit step?'))return;
    setProjects(ps=>ps.map(p=>{
      if(p.id!==currentProjId)return p;
      return{...p,procedures:p.procedures.map((proc,i)=>i===pi?{...proc,steps:proc.steps.filter((_,j)=>j!==si)}:proc)};
    }));
    showToast('success','Step deleted');
  };

  const createProject=(form,importedProcedures)=>{
    const projectName = form.projectName || form.name;
    const clientName = form.clientName || form.unit;
    if(!selectedTemplateId){showToast('error','Select an audit category first');return;}
    if(!projectName||!clientName){showToast('error','Project name and client name are required');return;}
    const icons={hr:'👤',fin:'💰',inv:'📦',bil:'🧾',it:'💻',ops:'⚙️'};
    const procs=importedProcedures||[];
    setProjects(ps=>[{
      id:Date.now(),
      templateId:selectedTemplateId,
      name:projectName,
      unit:form.unit || clientName,
      clientName,
      projectLeader:form.projectLeader || '',
      projectLength:form.projectLength || '',
      coordinatorName:form.coordinatorName || '',
      type:form.type,
      icon:icons[form.type]||'??',
      status:form.status,
      start:form.start,
      end:form.end,
      lead:parseInt(form.lead)||null,
      desc:form.desc || `${selectedTemplate?.name || 'Audit'} engagement for ${clientName}`,
      procedures:procs
    },...ps]);
    setNewProjModal(false);
    const msg=procs.length?`Company workspace created with ${procs.length} procedures and ${procs.reduce((a,p)=>a+p.steps.length,0)} steps from CSV`:'Company workspace created successfully';
    showToast('success',msg);
  };

  const addMember=form=>{
    if(!form.name){showToast('error','Name is required');return;}
    const initials=form.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    setMembers(ms=>[...ms,{id:ms.length+1,name:form.name,role:form.role,email:form.email,initials}]);
    setAddMemberModal(false);
    showToast('success',`${form.name} added to team`);
  };

  const importToCurrent=procs=>{
    setProjects(ps=>ps.map(p=>{
      if(p.id!==currentProjId)return p;
      return{...p,procedures:[...p.procedures,...procs]};
    }));
    showToast('success',`Imported ${procs.length} procedures (${procs.reduce((a,p)=>a+p.steps.length,0)} steps)`);
  };

  const exportCurrentProject=()=>{
    if(!currentProj)return;
    let csv='Ref,Audit Step,Status,AQC,Risk,Assigned To,Due Date,Observations,Files\n';
    currentProj.procedures.forEach(proc=>{
      csv+=`"PROCEDURE: ${proc.name}",,,,,,,,\n`;
      proc.steps.forEach(s=>{
        const m=s.assignee?members.find(t=>t.id===s.assignee):null;
        const fileNames=(s.docs||[]).map(d=>d.name).join(' | ');
        csv+=`"${s.id}","${s.step.replace(/"/g,'""')}","${s.status}","${s.aqc}","${s.risk}","${m?m.name:'Unassigned'}","${s.due||''}","${(s.obs||'').replace(/"/g,'""')}","${fileNames}"\n`;
      });
    });
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`${currentProj.name.replace(/ /g,'_')}_Audit.csv`;a.click();
    showToast('success','Export downloaded');
  };

  const filteredProjects=templateProjects.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||p.unit.toLowerCase().includes(search.toLowerCase())||String(p.clientName||'').toLowerCase().includes(search.toLowerCase()));
  const allSteps=templateProjects.flatMap(p=>getProjectSteps(p));
  const inProgress=allSteps.filter(s=>s.status==='progress').length;
  const done=allSteps.filter(s=>s.status==='done').length;
  const totalDocs=allSteps.reduce((a,s)=>a+(s.docs||[]).length,0);

  const Btn=({children,onClick,primary,small,style:sx={}})=>(
    <button onClick={onClick} style={{display:'inline-flex',alignItems:'center',gap:6,padding:small?'6px 12px':'9px 16px',borderRadius:8,fontSize:small?12:13,fontWeight:600,cursor:'pointer',border:primary?'none':`1px solid ${C.border2}`,background:primary?C.teal:'transparent',color:primary?'#fff':C.text2,fontFamily:'Sora,sans-serif',transition:'all .15s',...sx}}>{children}</button>
  );

  const topbarStyle={display:'flex',alignItems:'center',gap:14,padding:'14px 24px',borderBottom:`1px solid ${C.border}`,background:'#fff',flexShrink:0,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'};

  return(
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:C.bg,fontFamily:'Sora,sans-serif'}}>
      <FontLink/>

      <main style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {view==='templates'&&(
          <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
            <div style={{...topbarStyle,padding:'18px 28px'}}>
              <div style={{display:'flex',flexDirection:'column',gap:8,flex:1}}>
                <div style={{fontSize:30,fontWeight:800,color:C.teal,letterSpacing:'-0.8px'}}>AuditFlow</div>
                <div style={{fontSize:13.5,color:C.text2}}>Select types of auditing structure</div>
              </div>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'24px 28px 34px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:20}}>
                {AUDIT_TEMPLATES.map(template=>{
                  const templateItems = projects.filter(p=>p.templateId===template.id);
                  const stepCount = templateItems.reduce((sum,project)=>sum+getProjectSteps(project).length,0);
                  return <TemplateCard key={template.id} template={template} projectCount={templateItems.length} stepCount={stepCount} onClick={()=>openTemplate(template.id)}/>;
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {isPdplTemplate && view!=='templates' ? (
          <PdplWorkspace
            selectedTemplate={selectedTemplate}
            projects={projects}
            setProjects={setProjects}
            auditMembers={auditMembers}
            search={search}
            setSearch={setSearch}
            showToast={showToast}
            onBackToTemplates={backToTemplateLibrary}
          />
        ) : isCstTemplate && view!=='templates' ? (
          <CstAuditWorkspace
            selectedTemplate={selectedTemplate}
            projects={projects}
            setProjects={setProjects}
            auditMembers={auditMembers}
            search={search}
            setSearch={setSearch}
            showToast={showToast}
            onBackToTemplates={backToTemplateLibrary}
          />
        ) : (
          <>
        {view==='dashboard'&&selectedTemplate&&(
          <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
            <div style={{...topbarStyle,padding:'20px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'minmax(260px,1fr) auto minmax(360px,1fr)',alignItems:'center',gap:22,width:'100%'}}>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  <div style={{fontSize:30,fontWeight:800,color:C.teal,letterSpacing:'-0.8px'}}>AuditFlow</div>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <div style={{fontSize:16,fontWeight:700,color:C.text1}}>{selectedTemplate ? selectedTemplate.name : 'HR Audit'}</div>
                    <span style={{width:5,height:5,borderRadius:'50%',background:C.border2}} />
                    <div style={{fontSize:12.5,color:C.text3}}>Audit category workspace</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                  <button onClick={()=>setView('templates')} style={{background:'transparent',border:`1px solid ${C.border2}`,borderRadius:999,padding:'8px 14px',fontSize:12.5,fontWeight:700,color:C.text2,cursor:'pointer',fontFamily:'Sora,sans-serif'}}>Audit Categories</button>
                  <button onClick={()=>setView('dashboard')} style={{background:C.tealBg,border:`1px solid ${C.tealBorder}`,borderRadius:999,padding:'8px 14px',fontSize:12.5,fontWeight:700,color:C.teal,cursor:'pointer',fontFamily:'Sora,sans-serif'}}>Dashboard</button>
                  <button onClick={()=>setView('team')} style={{background:'transparent',border:`1px solid ${C.border2}`,borderRadius:999,padding:'8px 14px',fontSize:12.5,fontWeight:700,color:C.text2,cursor:'pointer',fontFamily:'Sora,sans-serif'}}>Team Members</button>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,background:'#fff',border:`1px solid ${C.border}`,borderRadius:999,padding:'9px 14px',minWidth:300}}>
                    <span style={{color:C.text3,fontSize:12.5,fontWeight:600}}>Find</span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search companies...' style={{background:'none',border:'none',outline:'none',color:C.text1,fontSize:13,fontFamily:'Sora,sans-serif',width:'100%'}}/>
                  </div>
                  <Btn primary onClick={()=>setNewProjModal(true)}>+ Add Company Project</Btn>
                </div>
              </div>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'24px 28px 32px'}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <div style={{fontSize:15,fontWeight:700,color:C.text1}}>Company Projects</div>
                  <div style={{fontSize:12.5,color:C.text3}}>Open a company workspace to manage audit steps, imports, and manual updates.</div>
                </div>
                <Btn small onClick={()=>setNewProjModal(true)}>+ Add Company Project</Btn>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
                {filteredProjects.map(p=><ProjectCard key={p.id} project={p} members={members} onClick={()=>openProject(p.id)}/>)}
              </div>
            </div>
          </div>
        )}

        {/* ── PROJECT DETAIL ── */}
        {view==='project'&&currentProj&&(
          <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
            <div style={{padding:'18px 24px',borderBottom:`1px solid ${C.border}`,background:'#fff',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:C.text3,marginBottom:10,fontFamily:MONO}}>
                <span onClick={()=>setView('dashboard')} style={{color:C.teal,cursor:'pointer'}}>Dashboard</span>
                <span>/</span><span>Companies</span><span>/</span>
                <span style={{color:C.text2}}>{currentProj.name}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:46,height:46,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,background:(TYPE_COLORS[currentProj.type]||TYPE_COLORS.hr).bg,border:`1px solid ${(TYPE_COLORS[currentProj.type]||TYPE_COLORS.hr).border}`}}>{currentProj.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:20,fontWeight:800,color:C.text1,letterSpacing:'-0.4px'}}>{currentProj.name}</div>
                  <div style={{display:'flex',alignItems:'center',gap:14,marginTop:5,flexWrap:'wrap'}}>
                    {[['📅',currentProj.start],['🏢',currentProj.projectLeader],['📊',`${calcProgress(currentProj)}% Complete`],['📎',`${getProjectSteps(currentProj).reduce((a,s)=>a+(s.docs||[]).length,0)} files`]].map(([icon,val])=>val&&(
                      <span key={val} style={{fontSize:12,color:C.text2,display:'flex',alignItems:'center',gap:4}}>{icon} {val}</span>
                    ))}
                  </div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
                  <Btn small onClick={()=>{
                    setProjects(ps=>ps.map(p=>{
                      if(p.id!==currentProjId)return p;
                      const num=p.procedures.length+1;
                      return{...p,procedures:[...p.procedures,{id:'proc'+Date.now(),name:`Procedure ${num}`,desc:'New procedure',steps:[{...mkStep(`${num}.1`,'New audit step — click to edit','todo','pending','medium',null,'',''),docs:[],comments:[]}]}]};
                    }));showToast('success','Procedure added');
                  }}>＋ Procedure</Btn>
                  <Btn small onClick={()=>setImportModal(true)}>⬆ Import CSV</Btn>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{display:'flex',gap:2,padding:'12px 24px 0',borderBottom:`1px solid ${C.border}`,background:'#fff',flexShrink:0}}>
              {[['table','⊞ Table View'],['kanban','⊟ Kanban Board']].map(([k,l])=>(
                <div key={k} onClick={()=>setActiveTab(k)} style={{padding:'8px 16px',borderRadius:'8px 8px 0 0',fontSize:13,fontWeight:600,cursor:'pointer',color:activeTab===k?C.teal:C.text3,background:activeTab===k?C.bg:'transparent',border:activeTab===k?`1px solid ${C.border}`:'1px solid transparent',borderBottom:activeTab===k?`1px solid ${C.bg}`:'1px solid transparent',position:'relative',top:1,transition:'all .15s'}}>{l}</div>
              ))}
            </div>
            <div style={{flex:1,overflow:'auto',background:C.bg}}>
              {activeTab==='table'&&<TableView project={currentProj} members={members} onOpenTask={openTask} onAddStep={addStep} onDeleteStep={deleteStep} onRenameProcedure={(pi,updates)=>{
                setProjects(ps=>ps.map(p=>p.id!==currentProjId?p:{...p,procedures:p.procedures.map((pr,i)=>i===pi?{...pr,...updates}:pr)}));
              }}/>}
              {activeTab==='kanban'&&<KanbanView project={currentProj} members={members} onOpenTask={openTask}/>}
            </div>
          </div>
        )}

        {/* ── TEAM ── */}
        {view==='team'&&(
          <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
            <div style={{...topbarStyle,padding:'18px 28px'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,flex:1}}>
                <button onClick={()=>setView('dashboard')} style={{border:`1px solid ${C.border2}`,background:'#fff',color:C.text2,borderRadius:999,padding:'7px 12px',fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'Sora,sans-serif'}}>? Back</button>
                <div style={{fontSize:19,fontWeight:700,color:C.text1}}>Team Members</div>
              </div>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'24px 28px 32px'}}>
              <div style={{fontSize:13,color:C.text2,marginBottom:18}}>Employees with auditing module access from HRM are shown automatically here.</div>
              {membersLoading ? (
                <div style={{padding:'28px 0',fontSize:13,color:C.text3}}>Loading auditing members...</div>
              ) : membersError ? (
                <div style={{padding:'18px 20px',border:`1px solid ${C.redBorder}`,background:C.redBg,borderRadius:14,color:C.red,fontSize:13}}>{membersError}</div>
              ) : !auditMembers.length ? (
                <div style={{padding:'24px 20px',border:`1px solid ${C.border}`,background:'#fff',borderRadius:14,color:C.text3,fontSize:13}}>No auditing members are available yet.</div>
              ) : (
                <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:18,overflow:'hidden'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr>
                        {['Employee','Employee ID','Role / Designation','Status'].map((heading)=>(
                          <th key={heading} style={{background:C.bg2,padding:'14px 16px',textAlign:'left',fontSize:10.5,fontWeight:700,fontFamily:MONO,letterSpacing:'0.5px',textTransform:'uppercase',color:C.text3,borderBottom:`1px solid ${C.border}`}}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {auditMembers.map((member)=>{
                        const badgeMap = {
                          active:{label:'Active',bg:'#ecfeff',color:'#0f766e',border:'#67e8f9',dot:'#06b6d4'},
                          inactive:{label:'Inactive',bg:'#ffffff',color:'#475569',border:'#cbd5e1',dot:'#94a3b8'},
                          separated:{label:'Separated',bg:'#fef2f2',color:'#b91c1c',border:'#fca5a5',dot:'#ef4444'},
                          probation:{label:'Active - Probation',bg:'#f0fdf4',color:'#15803d',border:'#86efac',dot:'#22c55e'},
                          notice:{label:'Active - Notice',bg:'#fff7ed',color:'#b45309',border:'#fdba74',dot:'#f59e0b'},
                        };
                        const badgeKey = member.status === 'separated' ? 'separated' : member.status === 'inactive' ? 'inactive' : member.stage === 'probation' ? 'probation' : member.stage === 'notice_period' ? 'notice' : 'active';
                        return (
                          <tr key={member.id}>
                            <td style={{padding:'14px 16px',borderBottom:`1px solid ${C.border}`}}>
                              <div style={{display:'flex',alignItems:'center',gap:12}}>
                                <Avatar member={{id:member.id,name:member.name,initials:member.initials}} size={36}/>
                                <div>
                                  <div style={{fontSize:13.5,fontWeight:700,color:C.text1}}>{member.name}</div>
                                  <div style={{fontSize:12,color:C.text3}}>{member.email || 'No email available'}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{padding:'14px 16px',borderBottom:`1px solid ${C.border}`,fontSize:12.5,color:C.text2,fontFamily:MONO}}>{member.employeeId || '?'}</td>
                            <td style={{padding:'14px 16px',borderBottom:`1px solid ${C.border}`,fontSize:12.5,color:C.text2}}>{member.designation || member.role || 'Employee'}</td>
                            <td style={{padding:'14px 16px',borderBottom:`1px solid ${C.border}`}}><Badge map={badgeMap} val={badgeKey} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {view==='my-tasks'&&(
          <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
            <div style={topbarStyle}>
              <div style={{fontSize:19,fontWeight:700,color:C.text1,flex:1}}>Tasks <span style={{color:C.teal}}>Assigned to Me</span></div>
            </div>
            <div style={{flex:1,overflowY:'auto'}}>
              {(()=>{
                const myTasks=[];
                projects.forEach(p=>p.procedures.forEach((proc,pi)=>proc.steps.forEach((s,si)=>{if(s.assignee===1)myTasks.push({p,proc,s,pi,si});})));
                if(!myTasks.length)return<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:60,color:C.text3,gap:12}}><div style={{fontSize:48,opacity:.4}}>📭</div><div style={{fontSize:14}}>No tasks assigned to you</div></div>;
                const th={background:C.bg2,padding:'10px 14px',textAlign:'left',fontSize:10.5,fontWeight:600,fontFamily:MONO,letterSpacing:'0.5px',textTransform:'uppercase',color:C.text3,borderBottom:`2px solid ${C.border2}`,position:'sticky',top:0,zIndex:10};
                const td={padding:'11px 14px',borderBottom:`1px solid ${C.border}`,verticalAlign:'middle',fontSize:13};
                return<table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Project','Ref','Step','Status','AQC','Due Date','Files',''].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{myTasks.map(({p,proc,s,pi,si})=>(
                  <tr key={s.id} onClick={()=>{openProject(p.id);setTimeout(()=>openTask(pi,si),100);}} style={{cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background=C.bg2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{...td,color:C.teal,fontSize:12}}>{p.icon} {p.name}</td>
                    <td style={{...td,fontFamily:MONO,fontSize:11.5,color:C.text3}}>{s.id}</td>
                    <td style={{...td,maxWidth:260,color:C.text1}}>{s.step.substring(0,80)}{s.step.length>80?'…':''}</td>
                    <td style={td}><Badge map={STATUS_MAP} val={s.status}/></td>
                    <td style={td}><Badge map={AQC_MAP} val={s.aqc}/></td>
                    <td style={{...td,fontFamily:MONO,fontSize:11.5,color:C.text3}}>{s.due||'—'}</td>
                    <td style={td}>{(s.docs||[]).length>0?<span style={{fontSize:11,color:C.teal,fontFamily:MONO}}>📎{s.docs.length}</span>:<span style={{color:C.text3}}>—</span>}</td>
                    <td style={td}><button onClick={e=>{e.stopPropagation();openProject(p.id);setTimeout(()=>openTask(pi,si),100);}} style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:'transparent',cursor:'pointer',fontSize:13,color:C.text3}}>✏</button></td>
                  </tr>
                ))}</tbody></table>;
              })()}
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* Task Drawer */}
      {!isPdplTemplate && !isCstTemplate && currentProj&&<TaskDrawer open={drawerOpen} task={drawerTask} procName={currentProj.procedures[drawerProcIdx]?.name||''} members={members} onClose={()=>setDrawerOpen(false)} onSave={saveTask}/>}

      {/* Import Modal (from project header) */}
      {!isPdplTemplate && !isCstTemplate && importModal&&<ImportModal open={importModal} onClose={()=>setImportModal(false)} onImport={importToCurrent}/>}

      {/* Modals */}
      {!isPdplTemplate && !isCstTemplate && <NewProjectModal open={newProjModal} members={members} onClose={()=>setNewProjModal(false)} onCreate={createProject}/>}
      {!isPdplTemplate && !isCstTemplate && <AddMemberModal open={addMemberModal} onClose={()=>setAddMemberModal(false)} onAdd={addMember}/>}
      <ToastContainer toasts={toasts}/>
    </div>
  );
}












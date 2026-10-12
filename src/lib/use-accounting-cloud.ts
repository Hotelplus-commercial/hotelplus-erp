import { useCallback, useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { readAccountingCloud, saveAccountingCloud } from './ac-cloud.functions';

export function useAccountingCloud<T>(namespace:'crm'|'hotels', value:T, hydrated:boolean, apply:(next:T)=>void) {
  const read=useServerFn(readAccountingCloud);
  const save=useServerFn(saveAccountingCloud);
  const revision=useRef(0);
  const last=useRef('');
  const latest=useRef(value);
  latest.current=value;
  const [status,setStatus]=useState<'local'|'loading'|'cloud'|'error'>('local');
  const busy=useRef(false);
  const initialized=useRef(false);
  const refresh=useCallback(async()=>{
    if(busy.current) return;
    if(last.current && JSON.stringify(latest.current)!==last.current) {
      toast.error('มีข้อมูลที่ยังไม่บันทึก กรุณารอการบันทึกก่อนโหลดใหม่');
      return;
    }
    setStatus('loading');
    try {
      const row=await read({data:namespace});
      if(row) {
        const next=(namespace==='hotels' ? (row.payload as {hotels?:T})?.hotels : row.payload) as T;
        if(!next || (namespace==='hotels' && !Array.isArray(next))) throw new Error('Invalid accounting document');
        revision.current=row.revision;
        const backupKey='meridia.accounting-cloud-backup.'+namespace;
        if(!window.localStorage.getItem(backupKey)) window.localStorage.setItem(backupKey,JSON.stringify(latest.current));
        last.current=JSON.stringify(next);
        apply(next);
        setStatus('cloud');
      } else setStatus('local');
    } catch {setStatus('error');}
  },[namespace,read,apply]);
  useEffect(()=>{
    if(!hydrated || initialized.current || !import.meta.env.DEV) return;
    initialized.current=true;
    void refresh();
  },[hydrated,refresh]);
  const migrate=useCallback(async()=>{
    if(busy.current) return;
    busy.current=true;
    try {
      const source=latest.current;
      const payload=namespace==='hotels'?{hotels:source}:source;
      const result=await save({data:{namespace,revision:revision.current,payload:payload as Record<string,unknown>}});
      revision.current=result.revision;
      last.current=JSON.stringify(source);
      setStatus('cloud');
      toast.success('ย้ายข้อมูลเดิมไป Lovable Cloud แล้ว');
    } catch(e) {setStatus('error');toast.error(e instanceof Error?e.message:'ย้ายข้อมูลไม่สำเร็จ');}
    finally {busy.current=false;}
  },[namespace,save]);
  useEffect(()=>{
    if(status!=='cloud') return;
    const timer=setInterval(async()=>{
      const next=JSON.stringify(latest.current);
      if(busy.current || next===last.current) return;
      busy.current=true;
      try {
        const payload=namespace==='hotels'?{hotels:latest.current}:latest.current;
        const result=await save({data:{namespace,revision:revision.current,payload:payload as Record<string,unknown>}});
        revision.current=result.revision;
        last.current=next;
      } catch(e) {last.current='';setStatus('error');toast.error(e instanceof Error?e.message:'บันทึก Cloud ไม่สำเร็จ');}
      finally {busy.current=false;}
    },600);
    return ()=>clearInterval(timer);
  },[namespace,save,status]);
  return {status,migrate,refresh};
}
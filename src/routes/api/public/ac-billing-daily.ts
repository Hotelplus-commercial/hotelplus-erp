import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';

export const Route=createFileRoute('/api/public/ac-billing-daily')({server:{handlers:{POST:async({request})=>{
  const rejected=await authenticateCronRequest(request);
  if(rejected) return rejected;
  const parsed=z.object({kind:z.literal('daily')}).strict().safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return new Response('Invalid request',{status:400});
  try {
    const {processAccountingDaily}=await import('@/lib/ac-daily.server');
    return Response.json(await processAccountingDaily());
  } catch {return Response.json({error:'Daily accounting run failed'},{status:500});}
}}}});
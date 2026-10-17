import { describe, expect, test } from 'bun:test';
import { summaryRules, SMALL_N, STABLE_BAND } from '../src/lib/summaryRules';
describe('presentation summaries',()=>{
  test('stable band is exactly ten percent',()=>{ expect(STABLE_BAND).toBe(.10); expect(summaryRules({metric:'M',values:[90,100,110]},['R-STABLE'])).toHaveLength(1); expect(summaryRules({metric:'M',values:[80,100,120]},['R-STABLE'])).toEqual(['ยังไม่มีข้อมูลพอสรุป']); });
  test('small bases are strictly below thirty',()=>{ expect(SMALL_N).toBe(30); expect(summaryRules({metric:'M',current:5,base:29},['R-SMALLN'])[0]).toContain('ฐานเล็ก'); expect(summaryRules({metric:'M',current:5,base:30},['R-SMALLN'])).toEqual(['ยังไม่มีข้อมูลพอสรุป']); });
  test('at most two insights and comparison first',()=>{ const lines=summaryRules({metric:'M',values:[1,2,3],current:3,previous:2,compare:true},['R-MAX','R-TREND']); expect(lines).toHaveLength(2); expect(lines[0]).toContain('เพิ่มขึ้น'); });
  test('missing data never becomes zero',()=>{ expect(summaryRules({metric:'M',empty:true},['R-MAX'])).toEqual(['ยังไม่มีข้อมูลพอสรุป']); });
  test('three periods are required for trend',()=>{ expect(summaryRules({metric:'M',values:[2,1]},['R-TREND'])).toEqual(['ยังไม่มีข้อมูลพอสรุป']); expect(summaryRules({metric:'M',values:[3,2,1]},['R-TREND'])[0]).toContain('3 เดือน'); });
});
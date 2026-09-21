# PS App v3.0 — Flat Template Architecture

อัปเดตระบบ Contract Template ตามไฟล์ v3.0 โดยยกเลิกแนวคิด Block Group และเปลี่ยนเป็น 1 SKU = 1 flat contract template สำหรับ contract templates เท่านั้น ส่วน Quote templates จะคงแบบเดิมตาม default ในไฟล์

## สิ่งที่จะเปลี่ยน

1. **Template data model / seed**
   - เพิ่ม `applies_to_sku` ให้ contract template
   - สร้าง contract templates ใหม่ 10 รายการตาม SKU list ในไฟล์ v3.0
   - ทำให้ทุก template เป็นเอกสาร flat/self-contained ไม่มี block group placeholder หรือ variant resolution
   - คง Quote templates เดิมไว้ 2 รายการ: `TPL-Q-ORM`, `TPL-Q-MARCOM`

2. **PS Templates dashboard**
   - หน้า Templates แสดง Contract Templates 10 rows พร้อม KPI `Contract Templates: 10 · Active 10`
   - เพิ่ม filter service line และ tier
   - ลบ Block Groups tab และ KPI/card ที่เกี่ยวข้อง
   - แสดง badge `Applies to: {SKU}` ต่อ template

3. **Contract Template editor**
   - แสดง SKU เป็น read-only chip แทน SKU switcher
   - Right panel เหลือเฉพาะ Auto-fields และ Signature blocks
   - ลบ Block Groups subsection/drawer จาก editor UI
   - ใส่ soft warning ให้ boilerplate sections ที่ควร review กับ legal ก่อนแก้
   - คง customer type toggle, cover page, A4 canvas, preview button

4. **Full Render Preview**
   - โหลด template ตรงจาก `applies_to_sku` โดยไม่ resolve block groups
   - เพิ่ม multi-SKU preview mode สำหรับทดสอบ package โดย render หลาย template ต่อกัน

5. **Wizard Step 4 rendering**
   - เปลี่ยนเป็น direct template lookup ตาม SKU
   - multi-SKU package render เป็นเอกสาร standalone ต่อ SKU แล้วต่อกัน ไม่มี dedupe shared clauses
   - คง flow หน้าจอ wizard ตามที่มีอยู่ในแอปปัจจุบัน ยกเว้น pipeline การ render template ที่ต้องเรียบง่ายขึ้นตาม v3.0

6. **Remove dead Block Group surfaces**
   - ลบเมนู/ลิงก์ Block Groups จาก sidebar และหน้า Templates
   - route block group เดิมให้ไม่เป็นหน้าใช้งานอีกต่อไป
   - เลิกใช้ BlockGroupDrawer และ block group resolution ใน UX หลัก

7. **Integrity rules carried forward**
   - ใช้ผล v2.3 ต่อ: canonical `ORM-MTH-LITE`, ไม่มี phantom Lite SKU
   - ใช้ `hotel.address_full` และไม่ให้ contract body ใช้ address breakdown fields

## รายละเอียดทางเทคนิค

- โปรเจกต์นี้ยังเป็น prototype/localStorage ไม่มีฐานข้อมูลจริง จึงจะทำ migration ใน store/seed/normalizer แทน SQL migration
- Old templates `TPL-C-ORM` และ `TPL-C-MARCOM` จะถูก retained/deprecated ใน data model ถ้าจำเป็นเพื่อ rollback แต่จะไม่เป็น active contract templates
- Signed snapshot migration จะทำในระดับ mock/localStorage เท่าที่ข้อมูล prototype มี ไม่สามารถทำ byte-compare PDF จริงแบบ production database ได้
- ไม่เพิ่ม backend/API RBAC จริง เพราะโปรเจกต์ยังไม่มี Lovable Cloud; จะบังคับ read-only/edit controls ใน prototype UI เท่านั้น
- จะตรวจ TypeScript, route health, และ browser preview หลังแก้

## Assumptions

- ใช้ template code standard ตามไฟล์: `TPL-C-ORM-FULL-SMART`, `TPL-C-ORM-LITE`, `TPL-C-META`, ฯลฯ
- Quote templates ยังไม่ flatten ต่อ SKU
- Multi-contract package ไม่ dedupe clauses
- v2.3 Phase 3 validator ไม่ทำ เพราะ Block Group Editor ถูกยกเลิกใน v3.0

# HotelPlus CRM Suite — แผน build (Prototype)

ต่อยอดบน ERP เดิม: BD / PS / AC App ที่มีอยู่จะได้แท็บใหม่เพิ่ม โดย Hotel Profile, สัญญา & บริการ, ต้นทุนค่าระบบ ของเดิมยังอยู่ครบไม่ถูกแตะ

ทุกอย่างเป็น prototype: ข้อมูลเก็บในเครื่อง (เหมือน Hotel Profile ปัจจุบัน) พร้อม seed 32 สินค้า, 5 deals, 3 quotes, 2 contracts, 1 invoice · ระบบภายนอก (Pipedrive, OCR, payment, e-signature) จำลองทั้งหมด

## กติกาที่ยึดตอนคำนวณ

- VAT 7% ทุกบรรทัด
- WHT 3% เฉพาะลูกค้านิติบุคคล หักจากมูลค่าก่อน VAT ทุกบรรทัด (รวมค่าคอมมิชชั่น) · บุคคลธรรมดาไม่หัก
- ยอดสุทธิ = Subtotal + VAT − WHT · ปัดทศนิยม 2 ตำแหน่ง
- สินค้าที่ราคายัง TBD: BD กรอกราคาเองในใบเสนอราคาได้ แต่ระบบจะไม่ให้กด Approve จนกว่าทุกบรรทัดมีราคา

## สิ่งที่จะสร้าง

### AC App (แท็บใหม่)
- **Products** — dashboard 32 SKU + KPI + ฟิลเตอร์ service line / tier group, เพิ่ม/แก้ไข/ปิดการใช้งานสินค้า พร้อม validation SKU ซ้ำ และ commission_rate ตาม pricing_model
- **Customers & Hotels** — master ลูกค้า/โรงแรม เชื่อมกับ Hotel Profile เดิม (โรงแรมใน Hotel Profile ใช้เป็นตัวเลือกได้เลย)
- **Request INV Inbox** — เคสจาก PS พร้อม Case # CS-69-XXXX
- **Invoice** — สร้างจาก contract + production report, พรีวิวแบบเอกสาร, ออกเลข INV69XXX
- **Tax Receipt** — RE69XXX เลขต่อจาก invoice เดียวกัน สร้างอัตโนมัติเมื่อยืนยันรับเงิน + รองรับ void

### BD App (แท็บใหม่)
- **Deals** — รายการ deal (จำลอง Pipedrive) + ปุ่ม Sync จำลอง + หน้า deal detail
- **Quotation Calculator** — เลือกแบบ cascading: Service Line → Category → Product → Package พร้อมบังคับกติกา R1–R4 แบบเรียลไทม์ (tier group ห้ามซ้ำ, add-on ต้องมีสินค้าแม่, จำกัดจำนวน, ต้องเลือกแพ็กเกจ)
- **Quotation Preview & Approve** — พรีวิวเอกสาร, Approve แล้วล็อกถาวร, ปุ่ม Revise สร้างฉบับ -R2 ที่โยงกลับฉบับเดิม
- **Quotation Dashboard** — โฟลเดอร์ ปี/เดือน/วัน + ฟิลเตอร์สถานะ

### PS App (แท็บใหม่)
- **Contract Wizard 5 ขั้น** — เลือกประเภทผู้เซ็น (บุคคล 4 เอกสาร / นิติบุคคล 5 เอกสาร), อัปโหลดไฟล์, หน้าจอ OCR แบบจำลอง (เติมข้อมูลให้แก้ได้), จับคู่ SKU กับ template, พรีวิว, สร้างสัญญา (แยกสัญญาเมื่อ template ต่างกัน)
- **Contract Dashboard** — 7 สถานะ + Case #
- **Templates** — ตารางเวอร์ชัน (ดูอย่างเดียวตามสเปก)
- **Production Report** — เลือกเดือน/ปี, KPI, อัปโหลด CSV, ธงเตือนรายงานที่ยังขาด และบล็อกการออก invoice ถ้ายังไม่มีรายงานของ SKU คอมมิชชั่น

### LIVE Link (หน้าสาธารณะ)
มือถือเป็นหลัก: การ์ดสัญญาซ้อนกัน + สรุป invoice + ลายเซ็น + ปุ่ม Sign & Pay (จำลองการจ่าย) → อัปเดตสถานะสัญญาและออกใบกำกับภาษีอัตโนมัติ

## จุดที่ผมปรับจาก prompt (พร้อมเหตุผล)

- **Contract เก็บได้หลาย SKU** — สเปกเดิมให้ 1 สัญญา = 1 SKU แต่กติกา R8 ต้องรวมหลาย SKU ที่ใช้ template เดียวกันไว้ในสัญญาเดียว
- **Customer ถูกสร้าง/เลือกตั้งแต่ตอน Approve ใบเสนอราคา** — เพราะใบเสนอราคาต้อง freeze ข้อมูลลูกค้า แต่สเปกเดิมให้สร้างลูกค้าทีหลังตอน Request INV
- **เพิ่มสายการแก้ไขเอกสาร** (ฉบับนี้แก้มาจากฉบับไหน) และ **บันทึกผู้ทำรายการ** ทุกครั้งที่ approve / issue เพราะเอกสารล็อกแล้วแก้ไม่ได้ ต้องตามรอยได้
- **ไม่มีระบบ login ใน prototype** — ใช้ตัวสลับผู้ใช้จำลองแทน (ตัวจริงค่อยทำตอนเปิดฐานข้อมูล)
- **แจ้งเตือนวันที่ 4 ของเดือน** ทำเป็นแบนเนอร์/ธงในหน้า Production Report แทนงานตั้งเวลา (prototype ไม่มี server)
- ใช้สี identity ต่อแอป (BD น้ำเงิน / PS ม่วง / AC เขียว) เป็น accent บน design system เดิม ไม่เปลี่ยนธีมทั้งระบบ

## รายละเอียดทางเทคนิค

- แปลง stack ใน prompt (React Router v6 + Zustand) มาเป็นของโปรเจกต์นี้: TanStack Router + React Context store แบบเดียวกับ `src/lib/hotel-store.tsx`, shadcn/ui, date-fns
- store ใหม่ `src/lib/crm-store.tsx` (products, customers, deals, quotations, contracts, production reports, invoices, tax receipts, live links) persist ลง localStorage พร้อม date reviver
- `src/lib/crm-rules.ts` — R1–R14, ภาษี, การออกเลขเอกสารแบบ sequential ต่อปี พ.ศ., snapshot freeze
- seed แยกไฟล์ `src/lib/crm-seed.ts` (32 SKU จาก prompt ตรงตัว)
- routes ใหม่: `bd.deals*`, `bd.quotations*`, `ps.contract-wizard`, `ps.contract-dashboard`, `ps.templates`, `ps.production-report`, `ac.products*`, `ac.customers*`, `ac.inv-requests`, `ac.invoices*`, `ac.tax-receipts.$id`, และ `l.$token` (สาธารณะ ไม่มี shell)
- ไม่แตะ route/ไฟล์เดิมของ Hotel Profile และต้นทุนค่าระบบ นอกจากเพิ่มแท็บและเมนู sidebar

## ลำดับการ build

1. Store + กติกา + seed 32 สินค้า
2. AC · Products + Customers
3. BD · Deals + Quotation Calculator + Preview/Approve + Dashboard
4. PS · Contract Wizard + Contract Dashboard + Templates
5. PS · Production Report
6. AC · Request INV + Invoice + Tax Receipt
7. LIVE Link + ปิด loop สถานะ

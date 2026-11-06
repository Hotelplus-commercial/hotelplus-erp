# O-26 · เปลี่ยนแพ็กเกจในการต่อสัญญา (PK1–PK14): คำตอบ §0 + แผน

## §0 คำตอบ

1. **แพ็กเกจของสัญญาเก็บที่ไหน:** แพ็กเกจอยู่ในรายการ `lines[]` ของแต่ละสัญญา (ข้อมูลสัญญาหลัก: `sku_snapshot`, `unit_price`, `commission_rate`, `billing` = monthly / one_time)
   - ฝั่งต่อสัญญาเก็บเป็นข้อความ `terms.package` ส่วน `skuForPackage()` แปลงเป็น `ORM-MTH-FULL` / `ORM-MTH-LITE` / `MARCOM-MTH-META`
   - Servicing รู้ว่าเป็น ORM Lite จากรหัสสัญญาที่มี `ORM-LITE` ในตัว (ตั้ง `orm_lite` = handover 3 OTA)
   - **Catalog มี SKU ORM Lite อยู่แล้ว:** `ORM-MTH-LITE` (Monthly fee + Commission) แพ็กเกจ `ORM-MTH-LITE-STD` "Lite" **ราคา ฿8,000 + 5%** ซึ่งไม่ตรงกับราคามาตรฐาน ฿3,900 ในสเปก (ดูข้อตัดสินใจ D1)
   - Add-on ORM 5 ตัว (`ORM-ADDON-*`) ผูกกับ `ORM-MTH-LITE` ทั้งหมด
2. **Marcom แยกตามช่องทาง:** ใช้แผนที่ช่องทางของ Header R3 ใน `header-contract-join.ts` ตามเดิม
   - Meta = META / META-LITE-CONTENT / META-LITE-ADS / ADDON-META-LITE-CONTENT4
   - TikTok = TIKTOK (+BASIC/STD/PRO), TIKTOK-LITE, ADDON-TIKTOK-KOL2, ADDON-KOL-TRAVEL
   - Google = MTH-GMB
   - `MARCOM-SETUP-*` (SOCIAL/GMB/META/TIKTOK) ไม่นับเป็นช่องทาง
   - **`ADDON-KOL-TRAVEL` ตั้งเป็น inactive ใน catalog** (ดูข้อตัดสินใจ D2)
3. **Wizard ต่อสัญญา:** หน้าเปิดจาก `/ps/contract-wizard/renew/$contractId` มี 3 ขั้น
   - ขั้น 2 = `TermsEditor` (กล่องคำแนะนำ + ตัวเลือกรูปแบบคิดเงิน + ช่องราคา + ค่าเฉลี่ยที่คาดหวังแบบสด)
   - กติกาอนุมัติ = `evaluate()` ใน `renewal-rules.ts` (แถว §6.3 ของ v1.4 = เปลี่ยนรูปแบบคิดเงิน → ต้องอนุมัติ + ต้องกรอกเหตุผล)
   - คำขอต่อสัญญา (`renewal_request`) เก็บ old/new_terms, changed_fields, reason_code/text, approval_required, status, reco_snapshot, entity_* และ offer snapshot
4. **ตอนเซ็นวันนี้:** `buildRenewedContract()` คัดลอกรายการรายเดือนของบริการเดิม แล้วกระจายค่าบริการใหม่ตามสัดส่วนราคาเดิม
   - SKU และชื่อคงเดิม (มีบันทึกว่า "service package unchanged (O-26)") รายการ setup ไม่ยกไปสัญญาใหม่
   - วันเริ่ม = วันสิ้นสุดเดิม + 1 และเพิ่มสัญญาใหม่แบบทั้งหมดหรือไม่เพิ่มเลย

## ข้อตัดสินใจที่รอ OK
- **D1:** ราคา ORM Lite ใน catalog เป็น ฿8,000 + 5% จะปรับแพ็กเกจ `ORM-MTH-LITE-STD` เป็น **฿3,900 + 5%** (ไม่สร้าง SKU ซ้ำ) และใช้รหัสสัญญา `ORM-LITE` หรือไม่
- **D2:** `ADDON-KOL-TRAVEL` เป็น inactive ใน catalog เสนอ: ไม่แสดงเป็นตัวเลือกใหม่ (PK3 = เฉพาะ SKU active) แต่ถ้าสัญญาเดิมมีอยู่ให้แสดงเป็น "คงเดิม" ได้
- **D3:** ORM (เต็ม) มี 3 แพ็กเกจ (Smart / Fixed / Performance) เสนอ: เมื่อเปลี่ยน Lite → เต็ม ให้ AE เลือก 1 แพ็กเกจ ราคาตั้งต้นใช้คำแนะนำ Renewal Offer ถ้ามี ไม่มีก็ใช้ราคา catalog

## แผน (ไฟล์ · หนึ่งบรรทัด)
- `src/lib/renewal-package.ts` (ใหม่, pure): ตัวเลือกจาก catalog, แยกช่องทาง, เทียบรายการเพิ่ม / ตัด / คงเดิม, ค่าแนะนำ setup (PK6), ตรวจ ≥1 ช่องทาง, ค่าตั้งต้น ORM Lite, รายการเหตุผล PK8
- `src/lib/renewal-rules.ts`: เพิ่ม field ที่ไม่บังคับใน `RenewalRequest` + เพิ่ม 1 แถวใน `evaluate()` (เปลี่ยนแพ็กเกจ → PM อนุมัติ + ต้องกรอกเหตุผล) กรณีคงแพ็กเกจทำงานเหมือนเดิม
- `src/lib/renewalOffer.ts`: แก้ข้อความคำแนะนำ RP134 เท่านั้น และ `matchOffer` ใช้ค่าคลาดเคลื่อนแบบเปลี่ยนรูปแบบคิดเงินเมื่อเปลี่ยนแพ็กเกจ
- `src/lib/renewal-contract.ts`: `buildRenewedContract()` ใช้ `new_lines` เมื่อ `package_changed` (สัญญาเดิมไม่ถูกแก้) และใส่รหัสสัญญา ORM-LITE
- `src/lib/renewal-store.ts`: บันทึกแถว `PACKAGE_CHANGE` ใน price history ตอนเซ็น + สร้าง ticket ORM Lite 1 ใบผ่านทางเขียน ticket เดิม (มี dedupe key) + แจ้ง Partner เมื่อเลิกใช้ระบบ Partner ผ่าน flow เดิม
- `src/lib/crm-products.ts`: ปรับราคา ORM Lite ตาม D1
- `src/components/ps/renewal-package-card.tsx` (ใหม่): การ์ด "แพ็กเกจบริการ" + ตารางเทียบก่อน / หลัง + เหตุผล วางใน ขั้น 2 ของ `renewal-wizard-mode.tsx`
- หน้าอนุมัติของ PM + การ์ดต่อสัญญา (AE Workspace) + PS card ③: แถวแพ็กเกจ และชิป `เปลี่ยนแพ็กเกจ: เดิม → ใหม่`
- `src/lib/renewal-offer-demo.ts` / ข้อมูล renewal demo: เพิ่ม 3 ตัวอย่าง DEMO (เพิ่มอย่างเดียว ในหน่วยความจำ)
- Tests: `renewal-package.test.ts` + test ตามเกณฑ์รับงานข้อ 2–8 ส่วน test เดิมต้องผ่านโดยไม่แก้
- Rules: อัปเดต RULES_TAB_R2 / RULES_TAB_R5_Q58 / AC / ไฟล์กติกา On-board ให้ทุกไฟล์เล็กกว่า 8,192 bytes และปิด O-26

ไม่มีการแก้ฐานข้อมูล มีเพียง field แบบไม่บังคับในข้อมูลที่เก็บในเบราว์เซอร์

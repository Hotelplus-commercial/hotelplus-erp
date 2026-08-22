import type { Product } from "@/lib/crm-types";

export const seedProducts: Product[] = [
  {
    "product_id": "p_001",
    "sku": "ORM-SETUP-REVPLUS",
    "name_th": "RevPlus+",
    "name_en": "RevPlus+",
    "service_line": "ORM",
    "category": "setup",
    "tier_group": null,
    "billing": "one_time",
    "pricing_model": "fixed",
    "base_price": 3500,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Setup RevPlus tool",
      "Integration with PMS",
      "Initial training"
    ],
    "note": null,
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_002",
    "sku": "ORM-SETUP-OTA",
    "name_th": "Register OTA",
    "name_en": "Register OTA",
    "service_line": "ORM",
    "category": "setup",
    "tier_group": null,
    "billing": "one_time",
    "pricing_model": "fixed",
    "base_price": 5000,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Register with major OTAs",
      "Booking.com, Agoda, Expedia setup"
    ],
    "note": null,
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_003",
    "sku": "ORM-MTH-FULL",
    "name_th": "ORM Full Service",
    "name_en": "ORM Full Service",
    "service_line": "ORM",
    "category": "monthly",
    "tier_group": "ORM",
    "billing": "monthly",
    "pricing_model": "fixed_plus_commission",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Full revenue management",
      "Daily rate optimization",
      "Compset monitoring"
    ],
    "note": null,
    "packages": [
      {
        "package_id": "pk_001",
        "package_sku": "ORM-MTH-FULL-SMART",
        "name": "Smart",
        "base_price": 16000,
        "commission_rate": 0.03
      },
      {
        "package_id": "pk_002",
        "package_sku": "ORM-MTH-FULL-FIXED",
        "name": "Fixed",
        "base_price": 25000,
        "commission_rate": null
      },
      {
        "package_id": "pk_003",
        "package_sku": "ORM-MTH-FULL-PERFORMANCE",
        "name": "Performance",
        "base_price": null,
        "commission_rate": 0.08
      }
    ],
    "active": true
  },
  {
    "product_id": "p_004",
    "sku": "ORM-MTH-LITE",
    "name_th": "ORM Lite Service",
    "name_en": "ORM Lite Service",
    "service_line": "ORM",
    "category": "monthly",
    "tier_group": "ORM",
    "billing": "monthly",
    "pricing_model": "fixed_plus_commission",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Basic revenue management",
      "Weekly rate check"
    ],
    "note": null,
    "packages": [
      {
        "package_id": "pk_004",
        "package_sku": "ORM-MTH-LITE-STD",
        "name": "Lite",
        "base_price": 8000,
        "commission_rate": 0.05
      }
    ],
    "active": true
  },
  {
    "product_id": "p_005",
    "sku": "ORM-ADDON-SHOP-RATE",
    "name_th": "Shop Rate Monitoring",
    "name_en": "Shop Rate Monitoring",
    "service_line": "ORM",
    "category": "addon",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "fixed",
    "base_price": 1500,
    "commission_rate": null,
    "parent_sku": "ORM-MTH-LITE",
    "max_quantity": null,
    "includes": [
      "ตรวจสอบราคาแข่ง 1 ครั้ง"
    ],
    "note": "available for ORM Lite only",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_006",
    "sku": "ORM-ADDON-COMPSET",
    "name_th": "Compset Survey",
    "name_en": "Compset Survey",
    "service_line": "ORM",
    "category": "addon",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "fixed",
    "base_price": 2000,
    "commission_rate": null,
    "parent_sku": "ORM-MTH-LITE",
    "max_quantity": null,
    "includes": [
      "Competitor set survey · 1 ครั้ง"
    ],
    "note": "available for ORM Lite only",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_007",
    "sku": "ORM-ADDON-VISIBILITY",
    "name_th": "Visibility Management",
    "name_en": "Visibility Management",
    "service_line": "ORM",
    "category": "addon",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "fixed",
    "base_price": 2000,
    "commission_rate": null,
    "parent_sku": "ORM-MTH-LITE",
    "max_quantity": null,
    "includes": [
      "ปรับ visibility บน OTA · 1 ครั้ง"
    ],
    "note": "available for ORM Lite only",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_008",
    "sku": "ORM-ADDON-EXTRA-OTA",
    "name_th": "Extra OTA Channel",
    "name_en": "Extra OTA Channel",
    "service_line": "ORM",
    "category": "addon",
    "tier_group": null,
    "billing": "monthly",
    "pricing_model": "fixed",
    "base_price": 800,
    "commission_rate": null,
    "parent_sku": "ORM-MTH-LITE",
    "max_quantity": null,
    "includes": [
      "1 additional OTA channel"
    ],
    "note": "per channel per month · available for ORM Lite only",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_009",
    "sku": "ORM-ADDON-RESERVATION",
    "name_th": "Reservation Management",
    "name_en": "Reservation Management",
    "service_line": "ORM",
    "category": "addon",
    "tier_group": null,
    "billing": "monthly",
    "pricing_model": "fixed",
    "base_price": 4500,
    "commission_rate": null,
    "parent_sku": "ORM-MTH-LITE",
    "max_quantity": null,
    "includes": [
      "จัดการ reservation จาก OTA ให้"
    ],
    "note": "available for ORM Lite only",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_010",
    "sku": "MARCOM-SETUP-SOCIAL",
    "name_th": "SocialPlus+",
    "name_en": "SocialPlus+",
    "service_line": "MARCOM",
    "category": "setup",
    "tier_group": null,
    "billing": "one_time",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Setup social media assets"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_011",
    "sku": "MARCOM-SETUP-GMB",
    "name_th": "Register GMB",
    "name_en": "Register Google My Business",
    "service_line": "MARCOM",
    "category": "setup",
    "tier_group": null,
    "billing": "one_time",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "GMB profile setup"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_012",
    "sku": "MARCOM-SETUP-META",
    "name_th": "Register Meta",
    "name_en": "Register Meta (FB/IG)",
    "service_line": "MARCOM",
    "category": "setup",
    "tier_group": null,
    "billing": "one_time",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "FB Page + IG Business account"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_013",
    "sku": "MARCOM-SETUP-TIKTOK",
    "name_th": "Register TikTok",
    "name_en": "Register TikTok",
    "service_line": "MARCOM",
    "category": "setup",
    "tier_group": null,
    "billing": "one_time",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "TikTok Business account"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_014",
    "sku": "MARCOM-MTH-META",
    "name_th": "Meta Full Service",
    "name_en": "Meta Full Service",
    "service_line": "MARCOM",
    "category": "monthly",
    "tier_group": "META",
    "billing": "monthly",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "10 content posts / เดือน",
      "Meta Ads management",
      "1 KOL Basic post"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_015",
    "sku": "MARCOM-MTH-META-LITE-CONTENT",
    "name_th": "Meta Lite — Content Posts",
    "name_en": "Meta Lite Content Posts",
    "service_line": "MARCOM",
    "category": "monthly",
    "tier_group": "META",
    "billing": "monthly",
    "pricing_model": "fixed",
    "base_price": 4000,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "4 content posts / เดือน",
      "Caption + hashtag"
    ],
    "note": null,
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_016",
    "sku": "MARCOM-MTH-META-LITE-ADS",
    "name_th": "Meta Lite — Ads Management",
    "name_en": "Meta Lite Ads Management",
    "service_line": "MARCOM",
    "category": "monthly",
    "tier_group": "META",
    "billing": "monthly",
    "pricing_model": "fixed",
    "base_price": 4000,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Meta Ads campaign management",
      "Weekly performance review"
    ],
    "note": "ยังไม่รวมค่า boost",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_017",
    "sku": "MARCOM-ADDON-META-LITE-CONTENT4",
    "name_th": "+4 More Content Posts",
    "name_en": "+4 More Content Posts",
    "service_line": "MARCOM",
    "category": "addon",
    "tier_group": null,
    "billing": "monthly",
    "pricing_model": "fixed",
    "base_price": 2000,
    "commission_rate": null,
    "parent_sku": "MARCOM-MTH-META-LITE-CONTENT",
    "max_quantity": 3,
    "includes": [
      "+4 content posts / เดือน"
    ],
    "note": "max 3× per deal · rồi = 16 posts total max",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_018",
    "sku": "MARCOM-MTH-TIKTOK",
    "name_th": "TikTok Full Service",
    "name_en": "TikTok Full Service",
    "service_line": "MARCOM",
    "category": "monthly",
    "tier_group": "TIKTOK",
    "billing": "monthly",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "TikTok posts + KOL"
    ],
    "note": "KOL travel/accommodation ให้ลูกค้าจัดเอง",
    "packages": [
      {
        "package_id": "pk_005",
        "package_sku": "MARCOM-MTH-TIKTOK-BASIC",
        "name": "Basic",
        "base_price": null,
        "commission_rate": null
      },
      {
        "package_id": "pk_006",
        "package_sku": "MARCOM-MTH-TIKTOK-STD",
        "name": "Standard",
        "base_price": null,
        "commission_rate": null
      },
      {
        "package_id": "pk_007",
        "package_sku": "MARCOM-MTH-TIKTOK-PRO",
        "name": "Professional",
        "base_price": null,
        "commission_rate": null
      }
    ],
    "active": true
  },
  {
    "product_id": "p_019",
    "sku": "MARCOM-MTH-TIKTOK-LITE",
    "name_th": "TikTok Lite Basic",
    "name_en": "TikTok Lite Basic",
    "service_line": "MARCOM",
    "category": "monthly",
    "tier_group": "TIKTOK",
    "billing": "monthly",
    "pricing_model": "fixed",
    "base_price": 4000,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Basic TikTok posting"
    ],
    "note": null,
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_020",
    "sku": "MARCOM-ADDON-TIKTOK-KOL2",
    "name_th": "+2 More KOL Basic Posts",
    "name_en": "+2 More KOL Basic Posts",
    "service_line": "MARCOM",
    "category": "addon",
    "tier_group": null,
    "billing": "monthly",
    "pricing_model": "fixed",
    "base_price": 2500,
    "commission_rate": null,
    "parent_sku": "MARCOM-MTH-TIKTOK-LITE",
    "max_quantity": null,
    "includes": [
      "+2 KOL Basic posts"
    ],
    "note": null,
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_021",
    "sku": "MARCOM-MTH-GMB",
    "name_th": "Google My Business + IBE",
    "name_en": "Google My Business + IBE",
    "service_line": "MARCOM",
    "category": "monthly",
    "tier_group": null,
    "billing": "monthly",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "GMB management",
      "IBE integration"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_022",
    "sku": "PROD-PHOTO-HALF",
    "name_th": "Photoshoot Half Day",
    "name_en": "Photoshoot Half Day",
    "service_line": "PROD",
    "category": "per_use",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "4-hour photoshoot"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_023",
    "sku": "PROD-PHOTO-FULL",
    "name_th": "Photoshoot Full Day",
    "name_en": "Photoshoot Full Day",
    "service_line": "PROD",
    "category": "per_use",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "8-hour photoshoot"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_024",
    "sku": "PROD-PHOTO-VDO",
    "name_th": "Photoshoot + VDO",
    "name_en": "Photoshoot + Video",
    "service_line": "PROD",
    "category": "per_use",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Photo + video production"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_025",
    "sku": "PROD-DRONE",
    "name_th": "Drone",
    "name_en": "Drone",
    "service_line": "PROD",
    "category": "per_use",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Drone photography/video"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_026",
    "sku": "PP-MARKET-SURVEY",
    "name_th": "Marketing Survey Analysis",
    "name_en": "Marketing Survey Analysis",
    "service_line": "PP",
    "category": "per_use",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Market analysis report"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_027",
    "sku": "PP-CONCEPT-DESIGN",
    "name_th": "Concept Design",
    "name_en": "Concept Design",
    "service_line": "PP",
    "category": "per_use",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Hotel concept design"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_028",
    "sku": "PP-FIN-FEASIBILITY",
    "name_th": "Financial Feasibility",
    "name_en": "Financial Feasibility",
    "service_line": "PP",
    "category": "per_use",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Financial feasibility study"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_029",
    "sku": "PP-SOP-SETUP",
    "name_th": "SOP Setup",
    "name_en": "SOP Setup",
    "service_line": "PP",
    "category": "per_use",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Standard Operating Procedures"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_030",
    "sku": "PP-ANNUAL-BUDGET",
    "name_th": "Annual Budget",
    "name_en": "Annual Budget Planning",
    "service_line": "PP",
    "category": "per_use",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Annual budget preparation"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_031",
    "sku": "PP-OTA-SETUP",
    "name_th": "OTAs & System Setup",
    "name_en": "OTAs & System Setup",
    "service_line": "PP",
    "category": "per_use",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Full OTAs and system setup"
    ],
    "note": "TBD pricing",
    "packages": [],
    "active": true
  },
  {
    "product_id": "p_032",
    "sku": "MARCOM-ADDON-KOL-TRAVEL",
    "name_th": "KOL Travel + Accommodation",
    "name_en": "KOL Travel + Accommodation",
    "service_line": "MARCOM",
    "category": "addon",
    "tier_group": null,
    "billing": "per_use",
    "pricing_model": "tbd",
    "base_price": null,
    "commission_rate": null,
    "parent_sku": null,
    "max_quantity": null,
    "includes": [
      "Custom KOL travel arrangement"
    ],
    "note": "typically handled by hotel directly · listed but inactive",
    "packages": [],
    "active": false
  }
];

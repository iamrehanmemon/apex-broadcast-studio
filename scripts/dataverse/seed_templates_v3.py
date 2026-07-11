# -*- coding: utf-8 -*-
import json
import subprocess
import urllib.request
import urllib.error

import os

ORG_URL = os.environ.get("DATAVERSE_ORG_URL", "https://your-org.crm.dynamics.com")
BASE_URL = f"{ORG_URL}/api/data/v9.2"

TOKEN = subprocess.run(
    ["az", "account", "get-access-token", "--resource", ORG_URL, "--query", "accessToken", "-o", "tsv"],
    capture_output=True, text=True, check=True
).stdout.strip()


def call(method, path, body=None):
    url = f"{BASE_URL}/{path}".replace(" ", "%20")
    h = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
        "Prefer": "return=representation",
    }
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        print(f"ERROR {method} {url} -> {e.code}\n{raw.decode('utf-8', errors='replace')}")
        raise


def T(key, labelEn, labelAr, exEn, exAr):
    return {"key": key, "labelEn": labelEn, "labelAr": labelAr, "type": "text", "exampleEn": exEn, "exampleAr": exAr}


def TA(key, labelEn, labelAr, exEn, exAr):
    return {"key": key, "labelEn": labelEn, "labelAr": labelAr, "type": "textarea", "exampleEn": exEn, "exampleAr": exAr}


def IMG(key, labelEn, labelAr):
    return {"key": key, "labelEn": labelEn, "labelAr": labelAr, "type": "image"}


def BUL(key, labelEn, labelAr, items):
    return {"key": key, "labelEn": labelEn, "labelAr": labelAr, "type": "bullets", "exampleItems": items}


def MET(key, labelEn, labelAr, items):
    return {"key": key, "labelEn": labelEn, "labelAr": labelAr, "type": "metrics", "exampleItems": items}


def CTA(exEn, exAr, url="#"):
    return {"key": "cta", "labelEn": "Call to Action", "labelAr": "دعوة لاتخاذ إجراء", "type": "cta", "exampleEn": exEn, "exampleAr": exAr, "exampleUrl": url}


def schema(fields, subjEn, subjAr):
    return json.dumps({"fields": fields, "subjectExampleEn": subjEn, "subjectExampleAr": subjAr}, ensure_ascii=False)


LAYOUT = {
    "message": 100000000, "spotlight": 100000001, "celebration": 100000002, "memoriam": 100000003,
    "condolence": 100000004, "stats": 100000005, "event": 100000006, "bulletins": 100000007,
}
CATEGORY = {
    "Promotions": 100000000, "Internal Guidelines": 100000001, "New Policy": 100000002,
    "Employee Birthday": 100000003, "New Baby": 100000004, "Condolences": 100000005,
    "Structural Changes": 100000006, "Company Achievements": 100000007, "Newsletter": 100000008,
    "Awards": 100000009, "Employee of the Month": 100000010, "Training Programs": 100000011,
    "Initiatives": 100000012,
}

templates = [
    {
        "cr133_name": "Promotion Announcement", "cr133_category": CATEGORY["Promotions"], "cr133_layout": LAYOUT["spotlight"],
        "cr133_description": "Announce an employee promotion, with photo", "cr133_requiresimage": True, "cr133_sortorder": 1,
        "cr133_fieldschema": schema([
            IMG("photo", "Photo", "صورة"),
            T("name", "Employee Name", "اسم الموظف", "Ahmed Al-Farsi", "أحمد الفارسي"),
            T("subtitle", "New Role", "الدور الجديد", "Head of Regional Operations", "رئيس العمليات الإقليمية"),
            TA("message", "Message", "الرسالة",
               "Ahmed's leadership and results have earned him this well-deserved step up. Please join us in congratulating him on his new role.",
               "قيادة أحمد ونتائجه أهّلته لهذه الخطوة المستحقة. انضموا إلينا في تهنئته على دوره الجديد."),
            T("badge", "Badge", "شارة", "Promoted", "ترقية"),
        ], "A Well-Earned Promotion", "ترقية مستحقة"),
    },
    {
        "cr133_name": "Internal Guidelines", "cr133_category": CATEGORY["Internal Guidelines"], "cr133_layout": LAYOUT["bulletins"],
        "cr133_description": "Share best-practice guidelines with the team", "cr133_requiresimage": False, "cr133_sortorder": 2,
        "cr133_fieldschema": schema([
            T("subtitle", "Applies To", "ينطبق على", "All teams · Effective now", "جميع الفرق · ساري الآن"),
            T("title", "Title", "العنوان", "Brand Communication Guidelines", "إرشادات التواصل المؤسسي"),
            BUL("changes", "Key Points", "أبرز النقاط", [
                {"en": "Use approved templates for all internal communications", "ar": "استخدم القوالب المعتمدة لجميع المراسلات الداخلية"},
                {"en": "Keep messaging clear, bilingual, and on-brand", "ar": "اجعل الرسائل واضحة وثنائية اللغة ومتوافقة مع الهوية"},
                {"en": "Route sensitive announcements through HR for review", "ar": "مرر الإعلانات الحساسة عبر الموارد البشرية للمراجعة"},
            ]),
            CTA("View the Full Guide", "عرض الدليل الكامل"),
        ], "Updated Communication Guidelines", "تحديث إرشادات التواصل"),
    },
    {
        "cr133_name": "New Policy Enforcement", "cr133_category": CATEGORY["New Policy"], "cr133_layout": LAYOUT["bulletins"],
        "cr133_description": "Distribute a new or updated policy, bilingual by default", "cr133_requiresimage": False, "cr133_sortorder": 3,
        "cr133_fieldschema": schema([
            T("subtitle", "Effective Date", "تاريخ السريان", "Effective 1 August 2026", "ساري المفعول 1 أغسطس 2026"),
            T("title", "Policy Title", "عنوان السياسة", "Hybrid Work Policy Update", "تحديث سياسة العمل الهجين"),
            BUL("changes", "Key Changes", "أبرز التغييرات", [
                {"en": "Minimum 3 days on-site per week", "ar": "ثلاثة أيام على الأقل في الموقع أسبوعياً"},
                {"en": "Core collaboration hours: 10 AM – 3 PM", "ar": "ساعات التعاون الأساسية: 10 ص – 3 م"},
                {"en": "Remote-work requests approved automatically for eligible roles", "ar": "الموافقة على طلبات العمل عن بُعد تلقائياً للأدوار المؤهلة"},
            ]),
            CTA("Download Full Policy (PDF)", "تحميل السياسة كاملة (PDF)"),
        ], "Updated Hybrid Work Policy", "تحديث سياسة العمل الهجين"),
    },
    {
        "cr133_name": "Employee Birthday", "cr133_category": CATEGORY["Employee Birthday"], "cr133_layout": LAYOUT["celebration"],
        "cr133_description": "A warm birthday message for a team member", "cr133_requiresimage": True, "cr133_sortorder": 4,
        "cr133_fieldschema": schema([
            IMG("photo", "Photo", "صورة"),
            T("name", "Name", "الاسم", "Layla Hassan", "ليلى حسن"),
            T("title", "Headline", "العنوان", "Wishing You a Wonderful Day!", "نتمنى لك يوماً رائعاً!"),
            TA("body", "Message", "الرسالة",
               "Happy birthday from everyone on the team! Thank you for everything you bring to us. Enjoy your special day.",
               "عيد ميلاد سعيد من جميع زملائك! شكراً لكل ما تقدمينه للفريق. استمتعي بيومك المميز."),
        ], "Happy Birthday!", "عيد ميلاد سعيد!"),
    },
    {
        "cr133_name": "New Baby Announcement", "cr133_category": CATEGORY["New Baby"], "cr133_layout": LAYOUT["celebration"],
        "cr133_description": "Share the joy when a colleague welcomes a new baby", "cr133_requiresimage": False, "cr133_sortorder": 5,
        "cr133_fieldschema": schema([
            T("name", "Parent's Name", "اسم الوالد/الوالدة", "Sara Al-Otaibi", "سارة العتيبي"),
            T("title", "Headline", "العنوان", "Welcoming a Beautiful Baby Girl", "نرحب بمولودة جميلة"),
            TA("body", "Message", "الرسالة",
               "Warmest congratulations to Sara and her family on their new arrival. Wishing the little one a lifetime of health and happiness.",
               "أحرّ التهاني لسارة وعائلتها بمولودتها الجديدة. نتمنى للصغيرة حياة مليئة بالصحة والسعادة."),
        ], "A New Arrival!", "مولود جديد!"),
    },
    {
        "cr133_name": "Condolences", "cr133_category": CATEGORY["Condolences"], "cr133_layout": LAYOUT["condolence"],
        "cr133_description": "Offer sympathy to a colleague on the loss of a relative", "cr133_requiresimage": False, "cr133_sortorder": 6,
        "cr133_fieldschema": schema([
            T("name", "Colleague's Name", "اسم الزميل", "Faisal Rahman", "فيصل رحمن"),
            TA("body", "Message", "الرسالة",
               "We extend our deepest condolences to Faisal and his family on their recent loss. Our thoughts are with them during this difficult time.",
               "نتقدم بأحرّ التعازي لفيصل وعائلته في هذا المصاب. قلوبنا معهم في هذا الوقت الصعب."),
        ], "With Heartfelt Condolences", "خالص العزاء"),
    },
    {
        "cr133_name": "Structural Changes in Reporting", "cr133_category": CATEGORY["Structural Changes"], "cr133_layout": LAYOUT["message"],
        "cr133_description": "Announce a change in reporting lines or org structure", "cr133_requiresimage": False, "cr133_sortorder": 7,
        "cr133_fieldschema": schema([
            T("eyebrow", "Eyebrow", "شعار علوي", "Organization Update", "تحديث تنظيمي"),
            T("title", "Headline", "العنوان", "Updates to the Operations Reporting Line", "تحديثات على هيكل تقارير العمليات"),
            TA("body", "Message", "الرسالة",
               "Effective next month, the Operations team will report directly to the VP of Supply Chain. This change strengthens coordination across regional hubs.",
               "اعتباراً من الشهر المقبل، سيرفع فريق العمليات تقاريره مباشرة إلى نائب رئيس سلسلة التوريد. يعزز هذا التغيير التنسيق بين المراكز الإقليمية."),
        ], "A Change in Our Reporting Structure", "تغيير في هيكل التقارير"),
    },
    {
        "cr133_name": "Company Achievement", "cr133_category": CATEGORY["Company Achievements"], "cr133_layout": LAYOUT["stats"],
        "cr133_description": "Share monthly KPIs and headline numbers", "cr133_requiresimage": False, "cr133_sortorder": 8,
        "cr133_fieldschema": schema([
            T("title", "Period", "الفترة", "May 2026 Performance", "أداء مايو 2026"),
            TA("intro", "Summary", "الملخص",
               "Another strong month across the network. Here are the headline numbers the team delivered.",
               "شهر قوي آخر عبر الشبكة. إليكم أبرز الأرقام التي حققها الفريق."),
            MET("metrics", "Key Metrics", "المؤشرات الرئيسية", [
                {"en": "Revenue", "ar": "الإيرادات", "num": "$9.4M", "chg": "+15%"},
                {"en": "On-Time Delivery", "ar": "التسليم في الوقت", "num": "97.2%", "chg": "+2.1%"},
                {"en": "New Clients", "ar": "عملاء جدد", "num": "31", "chg": "+12"},
            ]),
            CTA("View Full Dashboard", "عرض لوحة البيانات"),
        ], "Another Strong Month", "شهر قوي آخر"),
    },
    {
        "cr133_name": "Newsletter", "cr133_category": CATEGORY["Newsletter"], "cr133_layout": LAYOUT["message"],
        "cr133_description": "Company-wide newsletter update", "cr133_requiresimage": False, "cr133_sortorder": 9,
        "cr133_fieldschema": schema([
            T("eyebrow", "Eyebrow", "شعار علوي", "Monthly Newsletter", "النشرة الشهرية"),
            T("title", "Headline", "العنوان", "Here's What's New This Month", "إليكم ما هو جديد هذا الشهر"),
            TA("body", "Message", "الرسالة",
               "From new hires to product launches, here's a quick roundup of what happened across the company this month.",
               "من الموظفين الجدد إلى إطلاق المنتجات، إليكم ملخصاً سريعاً لما حدث في الشركة هذا الشهر."),
            CTA("Read the Full Newsletter", "اقرأ النشرة كاملة"),
        ], "This Month at a Glance", "لمحة عن هذا الشهر"),
    },
    {
        "cr133_name": "Award Recognition", "cr133_category": CATEGORY["Awards"], "cr133_layout": LAYOUT["spotlight"],
        "cr133_description": "Recognize an individual's standout contribution", "cr133_requiresimage": True, "cr133_sortorder": 10,
        "cr133_fieldschema": schema([
            IMG("photo", "Photo", "صورة"),
            T("name", "Name", "الاسم", "Noura Al-Qahtani", "نورة القحطاني"),
            T("subtitle", "Role", "الدور", "Senior Operations Lead", "قائد العمليات الأول"),
            TA("message", "Recognition", "التقدير",
               "Noura redesigned our last-mile routing, cutting average delivery time by 28% and setting a new benchmark for the team.",
               "أعادت نورة تصميم مسارات التوصيل النهائية، ما قلّص متوسط وقت التسليم بنسبة 28٪ وأرسى معياراً جديداً للفريق."),
            T("badge", "Badge", "شارة", "Innovation Award", "جائزة الابتكار"),
        ], "Recognizing Excellence", "تكريم التميز"),
    },
    {
        "cr133_name": "Employee of the Month", "cr133_category": CATEGORY["Employee of the Month"], "cr133_layout": LAYOUT["spotlight"],
        "cr133_description": "Crown your monthly standout performer", "cr133_requiresimage": True, "cr133_sortorder": 11,
        "cr133_fieldschema": schema([
            IMG("photo", "Photo", "صورة"),
            T("name", "Name", "الاسم", "Tariq Bashir", "طارق بشير"),
            T("subtitle", "Role", "الدور", "Customer Success", "نجاح العملاء"),
            TA("message", "Why They Won", "سبب الفوز",
               "For consistently going above and beyond — Tariq resolved a record number of escalations this month with a 99% satisfaction score.",
               "لتجاوزه التوقعات باستمرار — حلّ طارق عدداً قياسياً من التصعيدات هذا الشهر بنسبة رضا 99٪."),
            T("badge", "Badge", "شارة", "May 2026", "مايو 2026"),
        ], "Employee of the Month", "موظف الشهر"),
    },
    {
        "cr133_name": "Training Program", "cr133_category": CATEGORY["Training Programs"], "cr133_layout": LAYOUT["event"],
        "cr133_description": "Promote a training program or workshop", "cr133_requiresimage": False, "cr133_sortorder": 12,
        "cr133_fieldschema": schema([
            T("title", "Title", "العنوان", "Leadership Academy 2026", "أكاديمية القيادة 2026"),
            T("date", "Date", "التاريخ", "Applications open until 20 June 2026", "التسجيل مفتوح حتى 20 يونيو 2026"),
            T("time", "Time", "الوقت", "Sessions run Wednesdays, 2–4 PM", "الجلسات كل أربعاء، 2–4 مساءً"),
            T("host", "Host", "المضيف", "People & Culture Team", "فريق الموارد البشرية"),
            TA("body", "Description", "الوصف",
               "A six-week program covering strategic decision-making, leading high-performing teams, and coaching skills.",
               "برنامج مدته ستة أسابيع يغطي صنع القرار الاستراتيجي وقيادة الفرق عالية الأداء ومهارات التوجيه."),
            CTA("Apply Now", "سجّل الآن"),
        ], "New: Leadership Academy", "جديد: أكاديمية القيادة"),
    },
    {
        "cr133_name": "Initiative", "cr133_category": CATEGORY["Initiatives"], "cr133_layout": LAYOUT["message"],
        "cr133_description": "Promote a company initiative or program", "cr133_requiresimage": False, "cr133_sortorder": 13,
        "cr133_fieldschema": schema([
            T("eyebrow", "Eyebrow", "شعار علوي", "Wellbeing Initiative", "مبادرة العافية"),
            T("title", "Headline", "العنوان", "Step Challenge: Walk the Distance", "تحدي الخطوات: امشِ المسافة"),
            TA("body", "Message", "الرسالة",
               "Join our month-long team step challenge. Form a team, get moving, and help us collectively hit our distance goal — with prizes for top teams.",
               "انضم إلى تحدي الخطوات الجماعي لمدة شهر. كوّن فريقاً وتحرّك وساعدنا على تحقيق هدف المسافة الجماعي — مع جوائز للفرق المتميزة."),
            BUL("changes", "How to Join", "كيفية الانضمام", [
                {"en": "Form a team of 4–6 colleagues", "ar": "كوّن فريقاً من 4 إلى 6 زملاء"},
                {"en": "Track steps via the wellness app", "ar": "تتبع الخطوات عبر تطبيق العافية"},
                {"en": "Top 3 teams win a wellness day off", "ar": "الفرق الثلاثة الأولى تفوز بيوم عافية إجازة"},
            ]),
            CTA("Join the Challenge", "انضم إلى التحدي"),
        ], "Introducing: Walk the Distance", "تقديم: امشِ المسافة"),
    },
]

# --- delete old rows, recreate with example content ---
status, existing = call("GET", "cr133_announcementtemplates?$select=cr133_announcementtemplateid,cr133_name")
for row in existing["value"]:
    call("DELETE", f"cr133_announcementtemplates({row['cr133_announcementtemplateid']})")
    print(f"[DELETE] {row['cr133_name']}")

for t in templates:
    t["cr133_isactive"] = True
    status, res = call("POST", "cr133_announcementtemplates", t)
    print(f"[CREATE] {t['cr133_name']} -> {res['cr133_announcementtemplateid']}")

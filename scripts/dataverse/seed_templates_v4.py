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
    "New Policy": 100000002, "Condolences": 100000005, "Newsletter": 100000008, "Initiatives": 100000012,
    "Recognition": 100000013, "Events & Social": 100000014, "Operations Updates": 100000015,
}

templates = [
    {
        "cr133_name": "Graduation / Degree", "cr133_category": CATEGORY["Recognition"], "cr133_layout": LAYOUT["celebration"],
        "cr133_description": "Celebrate a colleague's degree or professional certification", "cr133_requiresimage": True, "cr133_sortorder": 14,
        "cr133_fieldschema": schema([
            IMG("photo", "Photo", "صورة"),
            T("name", "Name", "الاسم", "Ahmed Khan", "أحمد خان"),
            T("title", "Headline", "العنوان", "Master's in Supply Chain Management", "ماجستير في إدارة سلسلة التوريد"),
            TA("body", "Message", "الرسالة",
               "We're proud to celebrate Ahmed completing his Master's degree while leading our regional operations. A true reflection of dedication and growth.",
               "نفخر بتهنئة أحمد على إتمام درجة الماجستير أثناء قيادته لعملياتنا الإقليمية. مثال حقيقي للتفاني والتطور."),
        ], "Congratulations, Ahmed!", "مبروك يا أحمد!"),
    },
    {
        "cr133_name": "Wedding / Marriage", "cr133_category": CATEGORY["Recognition"], "cr133_layout": LAYOUT["celebration"],
        "cr133_description": "Congratulate a colleague on their marriage", "cr133_requiresimage": False, "cr133_sortorder": 15,
        "cr133_fieldschema": schema([
            T("name", "Name", "الاسم", "Omar Farouk", "عمر فاروق"),
            T("title", "Headline", "العنوان", "On the Occasion of His Marriage", "بمناسبة زواجه"),
            TA("body", "Message", "الرسالة",
               "Heartfelt congratulations to Omar on this joyful milestone. Wishing you a lifetime of happiness together.",
               "أطيب التهاني لعمر بهذه المناسبة السعيدة. نتمنى لكم حياة مليئة بالسعادة معاً."),
        ], "Congratulations on Your Wedding!", "مبروك الزواج!"),
    },
    {
        "cr133_name": "Work Anniversary", "cr133_category": CATEGORY["Recognition"], "cr133_layout": LAYOUT["spotlight"],
        "cr133_description": "Recognize years of service and loyalty", "cr133_requiresimage": True, "cr133_sortorder": 16,
        "cr133_fieldschema": schema([
            IMG("photo", "Photo", "صورة"),
            T("name", "Name", "الاسم", "Khalid Mansour", "خالد منصور"),
            T("subtitle", "Role", "الدور", "Fleet Operations Manager", "مدير عمليات الأسطول"),
            TA("message", "Message", "الرسالة",
               "Five years of dedication, leadership and impact. Thank you, Khalid, for being part of our journey.",
               "خمس سنوات من التفاني والقيادة والتأثير. شكراً خالد على كونك جزءاً من مسيرتنا."),
            T("badge", "Badge", "شارة", "5 Years", "5 سنوات"),
        ], "Celebrating 5 Years with Khalid", "نحتفل بخمس سنوات مع خالد"),
    },
    {
        "cr133_name": "Welcome New Joiner", "cr133_category": CATEGORY["Recognition"], "cr133_layout": LAYOUT["spotlight"],
        "cr133_description": "Introduce a new team member to the organization", "cr133_requiresimage": True, "cr133_sortorder": 17,
        "cr133_fieldschema": schema([
            IMG("photo", "Photo", "صورة"),
            T("name", "Name", "الاسم", "Maryam Saeed", "مريم سعيد"),
            T("subtitle", "Role", "الدور", "Data Analyst — Technology", "محللة بيانات — قسم التقنية"),
            TA("message", "Welcome Note", "رسالة الترحيب",
               "Maryam joins us from the analytics world and will help shape our data-driven decisions. Please give her a warm welcome!",
               "تنضم إلينا مريم من عالم التحليلات وستساهم في قراراتنا المبنية على البيانات. رحبوا بها!"),
            T("badge", "Badge", "شارة", "Technology", "قسم التقنية"),
        ], "Please Welcome Maryam", "رحبوا بمريم"),
    },
    {
        "cr133_name": "Retirement / Farewell", "cr133_category": CATEGORY["Recognition"], "cr133_layout": LAYOUT["spotlight"],
        "cr133_description": "Honor a colleague leaving or retiring", "cr133_requiresimage": True, "cr133_sortorder": 18,
        "cr133_fieldschema": schema([
            IMG("photo", "Photo", "صورة"),
            T("name", "Name", "الاسم", "Abdullah Nasser", "عبدالله ناصر"),
            T("subtitle", "Tenure", "مدة الخدمة", "20 Years · Warehouse Operations", "20 عاماً · عمليات المستودعات"),
            TA("message", "Tribute", "كلمة وداع",
               "After two decades of dedication, Abdullah begins a new chapter. Thank you for your legacy — you will be deeply missed.",
               "بعد عقدين من التفاني، يبدأ عبدالله فصلاً جديداً. شكراً على إرثك — سنفتقدك كثيراً."),
            T("badge", "Badge", "شارة", "Thank You", "شكراً لك"),
        ], "A Fond Farewell to Abdullah", "وداع عزيز لعبدالله"),
    },
    {
        "cr133_name": "Team Appreciation", "cr133_category": CATEGORY["Recognition"], "cr133_layout": LAYOUT["message"],
        "cr133_description": "Say thank you to a team for a job well done", "cr133_requiresimage": False, "cr133_sortorder": 19,
        "cr133_fieldschema": schema([
            T("eyebrow", "Eyebrow", "شعار علوي", "Thank You, Team", "شكراً للفريق"),
            T("title", "Headline", "العنوان", "You Made the Peak Season a Success", "لقد جعلتم موسم الذروة نجاحاً"),
            TA("body", "Message", "الرسالة",
               "To everyone in Operations and Logistics — thank you for the long hours and commitment that delivered our strongest peak season yet.",
               "إلى فريق العمليات والخدمات اللوجستية — شكراً على الساعات الطويلة والالتزام الذي حقق أقوى موسم ذروة لنا."),
        ], "Thank You for an Incredible Season", "شكراً على موسم رائع"),
    },
    {
        "cr133_name": "Town Hall", "cr133_category": CATEGORY["Events & Social"], "cr133_layout": LAYOUT["event"],
        "cr133_description": "Invite the organization to an all-hands town hall", "cr133_requiresimage": False, "cr133_sortorder": 20,
        "cr133_fieldschema": schema([
            T("title", "Title", "العنوان", "FY2027 Strategy Town Hall", "اللقاء العام لاستراتيجية 2027"),
            T("date", "Date", "التاريخ", "Thursday, 22 August 2026", "الخميس، 22 أغسطس 2026"),
            T("time", "Time", "الوقت", "4:00 – 5:00 PM", "4:00 – 5:00 مساءً"),
            T("location", "Location", "المكان", "Main Auditorium + Teams", "القاعة الرئيسية + تيمز"),
            T("host", "Host", "المضيف", "Executive Leadership Team", "فريق القيادة التنفيذية"),
            TA("body", "Description", "الوصف",
               "Join us as we share our vision and goals for the year ahead, followed by a live Q&A with leadership.",
               "انضموا إلينا لمشاركة رؤيتنا وأهدافنا للعام المقبل، تليها جلسة أسئلة مباشرة مع القيادة."),
            CTA("Register & Add to Calendar", "سجّل وأضف إلى التقويم"),
        ], "You're Invited: FY2027 Town Hall", "أنتم مدعوون: اللقاء العام 2027"),
    },
    {
        "cr133_name": "Event / Webinar", "cr133_category": CATEGORY["Events & Social"], "cr133_layout": LAYOUT["event"],
        "cr133_description": "A flexible invite for workshops, webinars and sessions", "cr133_requiresimage": False, "cr133_sortorder": 21,
        "cr133_fieldschema": schema([
            T("title", "Title", "العنوان", "Lunch & Learn: AI in Logistics", "جلسة تعلم: الذكاء الاصطناعي في اللوجستيات"),
            T("date", "Date", "التاريخ", "Wednesday, 10 June 2026", "الأربعاء، 10 يونيو 2026"),
            T("time", "Time", "الوقت", "1:00 – 2:00 PM", "1:00 – 2:00 ظهراً"),
            T("location", "Location", "المكان", "Main Conference Room + Teams", "قاعة الاجتماعات الرئيسية + تيمز"),
            T("host", "Speaker", "المتحدث", "Dr. Reem Saleh, Head of Innovation", "د. ريم صالح، رئيس الابتكار"),
            TA("body", "Description", "الوصف",
               "An interactive session on how AI is reshaping last-mile delivery. Lunch provided for in-person attendees.",
               "جلسة تفاعلية حول كيفية إعادة الذكاء الاصطناعي تشكيل التوصيل النهائي. يُقدّم الغداء للحضور."),
            CTA("Save Your Seat", "احجز مقعدك"),
        ], "Lunch & Learn: AI in Logistics", "جلسة تعلم: الذكاء الاصطناعي"),
    },
    {
        "cr133_name": "Team / Festive Lunch", "cr133_category": CATEGORY["Events & Social"], "cr133_layout": LAYOUT["event"],
        "cr133_description": "Invite the team to a social lunch or festive gathering", "cr133_requiresimage": False, "cr133_sortorder": 22,
        "cr133_fieldschema": schema([
            T("title", "Title", "العنوان", "Eid Al-Adha Team Lunch", "غداء العيد للفريق"),
            T("date", "Date", "التاريخ", "Sunday, 15 June 2026", "الأحد، 15 يونيو 2026"),
            T("time", "Time", "الوقت", "12:30 PM Onwards", "12:30 ظهراً وما بعدها"),
            T("location", "Location", "المكان", "Rooftop Terrace, HQ", "السطح، المقر الرئيسي"),
            T("host", "Host", "المضيف", "People & Culture Team", "فريق الموارد البشرية"),
            TA("body", "Description", "الوصف",
               "Let's celebrate Eid together! Join us for a relaxed lunch and a chance to connect across teams.",
               "لنحتفل بالعيد معاً! انضموا إلينا لغداء ودي وفرصة للتواصل بين الفرق."),
            CTA("RSVP", "أكّد حضورك"),
        ], "Join Us for Eid Lunch", "انضموا إلينا لغداء العيد"),
    },
    {
        "cr133_name": "Festive Greeting", "cr133_category": CATEGORY["Events & Social"], "cr133_layout": LAYOUT["celebration"],
        "cr133_description": "Season's greetings for Eid, National Day, or New Year", "cr133_requiresimage": False, "cr133_sortorder": 23,
        "cr133_fieldschema": schema([
            T("title", "Headline", "العنوان", "Wishing You a Joyful Eid", "نتمنى لكم عيداً سعيداً"),
            TA("body", "Message", "الرسالة",
               "From all of us, we wish you and your loved ones a blessed Eid filled with peace, joy and togetherness.",
               "من جميعنا، نتمنى لكم ولأحبائكم عيداً مباركاً مليئاً بالسلام والفرح."),
        ], "Eid Mubarak!", "عيد مبارك!"),
    },
    {
        "cr133_name": "Facility Launch", "cr133_category": CATEGORY["Operations Updates"], "cr133_layout": LAYOUT["message"],
        "cr133_description": "Announce a new facility, hub or site going live", "cr133_requiresimage": True, "cr133_sortorder": 24,
        "cr133_fieldschema": schema([
            IMG("photo", "Hero Image", "صورة رئيسية"),
            T("eyebrow", "Eyebrow", "شعار علوي", "Now Operational", "بدأ التشغيل"),
            T("title", "Headline", "العنوان", "Our New Jeddah Facility Is Live", "منشأتنا الجديدة في جدة تبدأ التشغيل"),
            TA("body", "Message", "الرسالة",
               "Spanning 12,000 m², our newest fulfilment hub brings faster delivery and greater capacity to the western region — and 140 new roles to the team.",
               "بمساحة 12,000 م²، يوفر مركزنا الجديد توصيلاً أسرع وسعة أكبر للمنطقة الغربية — و140 وظيفة جديدة."),
            CTA("See the Facility", "تعرّف على المنشأة"),
        ], "Our New Facility Is Live", "منشأتنا الجديدة تبدأ التشغيل"),
    },
    {
        "cr133_name": "Product / Service Launch", "cr133_category": CATEGORY["Operations Updates"], "cr133_layout": LAYOUT["message"],
        "cr133_description": "Internal launch announcement with hero visual and highlights", "cr133_requiresimage": True, "cr133_sortorder": 25,
        "cr133_fieldschema": schema([
            IMG("photo", "Hero Image", "صورة رئيسية"),
            T("eyebrow", "Launch Date", "تاريخ الإطلاق", "Launching 15 August 2026", "الإطلاق في 15 أغسطس 2026"),
            T("title", "Product Name", "اسم المنتج", "Introducing SmartTrack 2.0", "تقديم سمارت تراك 2.0"),
            TA("body", "Tagline", "الشعار", "Real-time visibility, end to end.", "رؤية لحظية، من البداية إلى النهاية."),
            BUL("changes", "Highlights", "أبرز المزايا", [
                {"en": "Live shipment tracking on every order", "ar": "تتبع مباشر للشحنات لكل طلب"},
                {"en": "Predictive ETA powered by AI", "ar": "توقع وقت الوصول بالذكاء الاصطناعي"},
                {"en": "One dashboard for all partners", "ar": "لوحة واحدة لجميع الشركاء"},
            ]),
            CTA("Explore the Beta", "استكشف النسخة التجريبية"),
        ], "Introducing SmartTrack 2.0", "تقديم سمارت تراك 2.0"),
    },
    {
        "cr133_name": "Quarterly Business Review", "cr133_category": CATEGORY["Operations Updates"], "cr133_layout": LAYOUT["stats"],
        "cr133_description": "Executive-grade quarterly summary with wins and priorities", "cr133_requiresimage": False, "cr133_sortorder": 26,
        "cr133_fieldschema": schema([
            T("title", "Department / Period", "القطاع / الفترة", "Commercial — Q2 2026 Review", "القطاع التجاري — مراجعة الربع الثاني 2026"),
            TA("intro", "Summary", "الملخص",
               "A strong quarter across the board. Here's a look at our performance and what's next.",
               "ربع قوي على جميع الأصعدة. إليكم أداؤنا وما هو قادم."),
            MET("metrics", "KPIs", "مؤشرات الأداء", [
                {"en": "Revenue", "ar": "الإيرادات", "num": "$21.6M", "chg": "+22% YoY"},
                {"en": "Retention", "ar": "الاحتفاظ", "num": "96%", "chg": "+4%"},
                {"en": "Pipeline (Q3)", "ar": "خط الأعمال", "num": "$44M", "chg": "+18%"},
            ]),
            BUL("wins", "Key Wins", "أبرز الإنجازات", [
                {"en": "45 new enterprise partners signed", "ar": "توقيع 45 شريكاً مؤسسياً جديداً"},
                {"en": "Launched route-to-market in 3 new cities", "ar": "إطلاق خدمات الوصول للسوق في 3 مدن"},
            ]),
            BUL("priorities", "Next-Quarter Priorities", "أولويات الربع القادم", [
                {"en": "Scale cold-chain capacity by 40%", "ar": "زيادة سعة سلسلة التبريد بنسبة 40٪"},
                {"en": "Roll out SmartTrack to all partners", "ar": "تعميم سمارت تراك على جميع الشركاء"},
            ]),
            CTA("View Full Report", "عرض التقرير الكامل"),
        ], "Q2 2026 Business Review", "مراجعة أعمال الربع الثاني 2026"),
    },
    {
        "cr133_name": "Mid-Year Performance Review", "cr133_category": CATEGORY["Operations Updates"], "cr133_layout": LAYOUT["event"],
        "cr133_description": "Mid-year / annual review reminder with key dates and steps", "cr133_requiresimage": False, "cr133_sortorder": 27,
        "cr133_fieldschema": schema([
            T("title", "Title", "العنوان", "Mid-Year Performance Reviews Are Open", "فتح تقييمات منتصف العام"),
            T("date", "Window", "الموعد", "Submit by 30 June 2026", "آخر موعد 30 يونيو 2026"),
            TA("body", "Intro", "مقدمة",
               "It's time for mid-year check-ins. Take a moment to reflect on your goals and complete your self-assessment.",
               "حان وقت مراجعات منتصف العام. راجع أهدافك وأكمل التقييم الذاتي."),
            BUL("steps", "How to Complete", "خطوات الإكمال", [
                {"en": "Open your goals in the HR portal", "ar": "افتح أهدافك في بوابة الموارد البشرية"},
                {"en": "Complete your self-assessment", "ar": "أكمل التقييم الذاتي"},
                {"en": "Book a 1:1 with your manager", "ar": "احجز لقاءً فردياً مع مديرك"},
            ]),
            CTA("Start Self-Assessment", "ابدأ التقييم الذاتي"),
        ], "Mid-Year Reviews Are Open", "فتح تقييمات منتصف العام"),
    },
    {
        "cr133_name": "Survey / Feedback", "cr133_category": CATEGORY["Operations Updates"], "cr133_layout": LAYOUT["message"],
        "cr133_description": "Request input via an engagement or feedback survey", "cr133_requiresimage": False, "cr133_sortorder": 28,
        "cr133_fieldschema": schema([
            T("eyebrow", "Eyebrow", "شعار علوي", "5 Minutes · Anonymous", "5 دقائق · سري"),
            T("title", "Headline", "العنوان", "Your Voice Shapes Our Workplace", "صوتك يشكّل بيئة عملنا"),
            TA("body", "Message", "الرسالة",
               "Our annual engagement survey is open. Your honest feedback helps us build a better workplace for everyone. It's completely anonymous.",
               "استبيان المشاركة السنوي مفتوح الآن. ملاحظاتك تساعدنا على بناء بيئة عمل أفضل. الاستبيان سري بالكامل."),
            CTA("Take the Survey", "ابدأ الاستبيان"),
        ], "Your Voice Shapes Our Workplace", "صوتك يشكّل بيئة عملنا"),
    },
    {
        "cr133_name": "Office Closure / Holiday", "cr133_category": CATEGORY["Operations Updates"], "cr133_layout": LAYOUT["message"],
        "cr133_description": "Notify staff of closures, public holidays or reduced hours", "cr133_requiresimage": False, "cr133_sortorder": 29,
        "cr133_fieldschema": schema([
            T("eyebrow", "Eyebrow", "شعار علوي", "Public Holiday Notice", "إشعار إجازة رسمية"),
            T("title", "Headline", "العنوان", "Offices Closed for Eid Al-Adha", "إغلاق المكاتب بمناسبة عيد الأضحى"),
            TA("body", "Message", "الرسالة",
               "All offices will be closed from 15–18 June 2026, reopening on the 19th. Operations and on-call teams will follow the holiday rota shared by your manager.",
               "ستُغلق جميع المكاتب من 15 إلى 18 يونيو 2026، وتُستأنف الأعمال في 19. ستعمل فرق العمليات وفق الجدول الذي يشاركه مديركم."),
        ], "Office Closure Notice: Eid Al-Adha", "إشعار إغلاق: عيد الأضحى"),
    },
    {
        "cr133_name": "Wellness Awareness Week", "cr133_category": CATEGORY["Operations Updates"], "cr133_layout": LAYOUT["message"],
        "cr133_description": "Promote a wellbeing or CSR initiative", "cr133_requiresimage": True, "cr133_sortorder": 30,
        "cr133_fieldschema": schema([
            IMG("photo", "Hero Image", "صورة رئيسية"),
            T("eyebrow", "Eyebrow", "شعار علوي", "Wellbeing at Work", "العافية في العمل"),
            T("title", "Headline", "العنوان", "Mental Health Awareness Week", "أسبوع التوعية بالصحة النفسية"),
            TA("body", "Message", "الرسالة",
               "This week, we're hosting free counseling sessions, mindfulness workshops, and manager training on supporting team wellbeing.",
               "هذا الأسبوع، نقدّم جلسات استشارية مجانية وورش يقظة ذهنية وتدريباً للمدراء على دعم عافية الفريق."),
            CTA("See the Schedule", "عرض الجدول"),
        ], "Mental Health Awareness Week", "أسبوع التوعية بالصحة النفسية"),
    },
    {
        "cr133_name": "Quarterly Newsletter", "cr133_category": CATEGORY["Newsletter"], "cr133_layout": LAYOUT["message"],
        "cr133_description": "A second newsletter variant for quarterly roundups", "cr133_requiresimage": False, "cr133_sortorder": 31,
        "cr133_fieldschema": schema([
            T("eyebrow", "Eyebrow", "شعار علوي", "Quarterly Newsletter", "النشرة الفصلية"),
            T("title", "Headline", "العنوان", "Q2 Highlights Across the Company", "أبرز أحداث الربع الثاني"),
            TA("body", "Message", "الرسالة",
               "A quarter full of milestones — new offices, new hires, and a few surprises. Here's the full roundup.",
               "ربع مليء بالإنجازات — مكاتب جديدة وموظفون جدد وبعض المفاجآت. إليكم الملخص الكامل."),
            CTA("Read the Full Issue", "اقرأ العدد كاملاً"),
        ], "Q2 Highlights Across the Company", "أبرز أحداث الربع الثاني"),
    },
    {
        "cr133_name": "Code of Conduct Update", "cr133_category": CATEGORY["New Policy"], "cr133_layout": LAYOUT["bulletins"],
        "cr133_description": "A second policy variant for conduct/compliance updates", "cr133_requiresimage": False, "cr133_sortorder": 32,
        "cr133_fieldschema": schema([
            T("subtitle", "Effective Date", "تاريخ السريان", "Effective Immediately", "ساري المفعول فوراً"),
            T("title", "Policy Title", "عنوان السياسة", "Updated Code of Conduct", "تحديث ميثاق السلوك المهني"),
            BUL("changes", "Key Changes", "أبرز التغييرات", [
                {"en": "Zero tolerance for workplace harassment", "ar": "عدم التسامح مطلقاً مع التحرش في مكان العمل"},
                {"en": "New process for anonymous reporting", "ar": "آلية جديدة للإبلاغ السري"},
                {"en": "Mandatory annual training for all staff", "ar": "تدريب سنوي إلزامي لجميع الموظفين"},
            ]),
            CTA("Read the Full Code", "اقرأ الميثاق كاملاً"),
        ], "Updated Code of Conduct", "تحديث ميثاق السلوك المهني"),
    },
    {
        "cr133_name": "Sustainability Initiative", "cr133_category": CATEGORY["Initiatives"], "cr133_layout": LAYOUT["message"],
        "cr133_description": "A second initiative variant for sustainability/ESG programs", "cr133_requiresimage": False, "cr133_sortorder": 33,
        "cr133_fieldschema": schema([
            T("eyebrow", "Eyebrow", "شعار علوي", "Sustainability", "الاستدامة"),
            T("title", "Headline", "العنوان", "Our Path to Net Zero by 2030", "طريقنا نحو الحياد الكربوني بحلول 2030"),
            TA("body", "Message", "الرسالة",
               "We're launching a company-wide sustainability program to reduce our environmental footprint across every facility.",
               "نطلق برنامجاً للاستدامة على مستوى الشركة لتقليل أثرنا البيئي في جميع منشآتنا."),
            BUL("changes", "Highlights", "أبرز النقاط", [
                {"en": "Solar power at all major hubs by 2027", "ar": "الطاقة الشمسية في جميع المراكز الرئيسية بحلول 2027"},
                {"en": "50% fleet electrification by 2028", "ar": "كهربة 50٪ من الأسطول بحلول 2028"},
                {"en": "Zero single-use plastics in offices", "ar": "صفر بلاستيك أحادي الاستخدام في المكاتب"},
            ]),
            CTA("Learn More", "اعرف المزيد"),
        ], "Our Path to Net Zero by 2030", "طريقنا نحو الحياد الكربوني"),
    },
    {
        "cr133_name": "In Memoriam", "cr133_category": CATEGORY["Condolences"], "cr133_layout": LAYOUT["memoriam"],
        "cr133_description": "A dignified tribute on the passing of a colleague", "cr133_requiresimage": True, "cr133_sortorder": 34,
        "cr133_fieldschema": schema([
            IMG("photo", "Photo", "صورة"),
            T("name", "Name", "الاسم", "Hassan Al-Amin", "حسن الأمين"),
            T("subtitle", "Role · Tenure", "الدور · مدة الخدمة", "Logistics Coordinator · 2009–2026", "منسق لوجستي · 2009–2026"),
            TA("body", "Tribute", "كلمة تأبين",
               "It is with deep sorrow that we share the passing of our colleague Hassan. A valued member of our team for many years, he will be remembered with great affection. Our thoughts are with his family.",
               "ببالغ الحزن ننعى زميلنا حسن، الذي كان عضواً غالياً في فريقنا لسنوات طويلة. سنذكره بكل محبة. قلوبنا مع عائلته."),
        ], "In Loving Memory of Hassan", "في ذكرى حسن"),
    },
]

for t in templates:
    t["cr133_isactive"] = True
    status, res = call("POST", "cr133_announcementtemplates", t)
    print(f"[CREATE] {t['cr133_name']} -> {res['cr133_announcementtemplateid']}")

print(f"\nTotal new templates created: {len(templates)}")

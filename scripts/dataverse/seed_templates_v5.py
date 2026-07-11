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


def GAL(key, labelEn, labelAr, items):
    return {"key": key, "labelEn": labelEn, "labelAr": labelAr, "type": "gallery", "exampleItems": items}


def CTA(exEn, exAr, url="#"):
    return {"key": "cta", "labelEn": "Call to Action", "labelAr": "دعوة لاتخاذ إجراء", "type": "cta", "exampleEn": exEn, "exampleAr": exAr, "exampleUrl": url}


def schema(fields, subjEn, subjAr):
    return json.dumps({"fields": fields, "subjectExampleEn": subjEn, "subjectExampleAr": subjAr}, ensure_ascii=False)


CATEGORY = {"Recognition": 100000013, "Events & Social": 100000014}
LAYOUT_GALLERY = 100000008

templates = [
    {
        "cr133_name": "Top 3 Performers", "cr133_category": CATEGORY["Recognition"], "cr133_layout": LAYOUT_GALLERY,
        "cr133_description": "Recognize multiple top performers side by side, each with their own photo", "cr133_requiresimage": False, "cr133_sortorder": 35,
        "cr133_fieldschema": schema([
            T("eyebrow", "Eyebrow", "شعار علوي", "This Month's Top Performers", "أبرز المتميزين هذا الشهر"),
            T("title", "Headline", "العنوان", "Congratulations to Our Top 3", "مبروك لأفضل 3"),
            TA("intro", "Message", "الرسالة",
               "Recognizing the three colleagues who went above and beyond this month.",
               "نكرّم الزملاء الثلاثة الذين تميزوا هذا الشهر."),
            GAL("performers", "Performers", "المتميزون", [
                {"en": "Ahmed Al-Farsi — Operations", "ar": "أحمد الفارسي — العمليات"},
                {"en": "Noura Al-Qahtani — Logistics", "ar": "نورة القحطاني — اللوجستيات"},
                {"en": "Tariq Bashir — Customer Success", "ar": "طارق بشير — نجاح العملاء"},
            ]),
        ], "Congratulations to Our Top 3 Performers", "مبروك لأفضل 3 متميزين"),
    },
    {
        "cr133_name": "Event Photo Roundup", "cr133_category": CATEGORY["Events & Social"], "cr133_layout": LAYOUT_GALLERY,
        "cr133_description": "Share highlight photos from a recent company event", "cr133_requiresimage": False, "cr133_sortorder": 36,
        "cr133_fieldschema": schema([
            T("eyebrow", "Eyebrow", "شعار علوي", "Event Recap", "ملخص الفعالية"),
            T("title", "Headline", "العنوان", "Highlights from Our Annual Town Hall", "أبرز لحظات اللقاء العام السنوي"),
            TA("intro", "Message", "الرسالة",
               "Thank you to everyone who joined us. Here are a few favorite moments from the day.",
               "شكراً لكل من انضم إلينا. إليكم بعض اللحظات المميزة من اليوم."),
            GAL("photos", "Photos", "الصور", [
                {"en": "Opening Keynote", "ar": "الكلمة الافتتاحية"},
                {"en": "Team Awards", "ar": "جوائز الفريق"},
                {"en": "Closing Celebration", "ar": "احتفال الختام"},
            ]),
        ], "Highlights from Our Annual Town Hall", "أبرز لحظات اللقاء العام"),
    },
]

for t in templates:
    t["cr133_isactive"] = True
    status, res = call("POST", "cr133_announcementtemplates", t)
    print(f"[CREATE] {t['cr133_name']} -> {res['cr133_announcementtemplateid']}")

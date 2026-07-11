import json
import subprocess
import urllib.request
import urllib.error

import os

ORG_URL = os.environ.get("DATAVERSE_ORG_URL", "https://your-org.crm.dynamics.com")
BASE_URL = f"{ORG_URL}/api/data/v9.2"
SOLUTION_UNIQUE_NAME = "BroadcastStudio"
TPL_LOGICAL = "cr133_announcementtemplate"

TOKEN = subprocess.run(
    ["az", "account", "get-access-token", "--resource", ORG_URL, "--query", "accessToken", "-o", "tsv"],
    capture_output=True, text=True, check=True
).stdout.strip()


def call(method, path, body=None, solution=None):
    url = f"{BASE_URL}/{path}".replace(" ", "%20")
    h = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
    }
    if solution:
        h["MSCRM.SolutionUniqueName"] = solution
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


def label(text):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": text, "LanguageCode": 1033}],
    }


new_options = [
    (100000013, "Recognition"),
    (100000014, "Events & Social"),
    (100000015, "Operations Updates"),
]

for value, name in new_options:
    body = {
        "AttributeLogicalName": "cr133_category",
        "EntityLogicalName": TPL_LOGICAL,
        "Value": value,
        "Label": label(name),
    }
    try:
        call("POST", "InsertOptionValue", body, solution=SOLUTION_UNIQUE_NAME)
        print(f"[CREATE] category option {name} = {value}")
    except urllib.error.HTTPError:
        print(f"[SKIP/ERROR] {name} (may already exist)")

call("POST", "PublishAllXml", {})
print("Published.")

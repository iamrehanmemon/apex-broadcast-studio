import json
import subprocess
import urllib.request
import urllib.error

ORG_URL = "https://your-org.crm.dynamics.com"
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
        "Prefer": "return=representation",
    }
    if solution:
        h["MSCRM.SolutionUniqueName"] = solution
    data = json.dumps(body).encode("utf-8") if body is not None else None
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


try:
    call("GET", f"EntityDefinitions(LogicalName='{TPL_LOGICAL}')/Attributes(LogicalName='cr133_layout')?$select=LogicalName")
    print("[SKIP] cr133_layout already exists")
except urllib.error.HTTPError as e:
    if e.code != 404:
        raise
    options = [
        (100000000, "Message"),
        (100000001, "Spotlight"),
        (100000002, "Celebration"),
        (100000003, "Memoriam"),
        (100000004, "Condolence"),
        (100000005, "Stats"),
        (100000006, "Event"),
        (100000007, "Bulletins"),
    ]
    body = {
        "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
        "SchemaName": "cr133_Layout",
        "AttributeType": "Picklist",
        "DisplayName": label("Layout"),
        "OptionSet": {
            "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
            "IsGlobal": False,
            "OptionSetType": "Picklist",
            "Options": [{"Value": v, "Label": label(l)} for v, l in options],
        },
    }
    call("POST", f"EntityDefinitions(LogicalName='{TPL_LOGICAL}')/Attributes", body, solution=SOLUTION_UNIQUE_NAME)
    print("[CREATE] cr133_layout created")

call("POST", "PublishAllXml", {})
print("Published.")

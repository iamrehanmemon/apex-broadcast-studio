import json
import subprocess
import sys
import urllib.request
import urllib.error

ORG_URL = "https://your-org.crm.dynamics.com"
BASE_URL = f"{ORG_URL}/api/data/v9.2"
SOLUTION_UNIQUE_NAME = "BroadcastStudio"
ROLE_NAME = "Broadcast Studio Author"
USER_EMAIL = "you@your-org.onmicrosoft.com"
TPL_LOGICAL = "cr133_announcementtemplate"
ANN_LOGICAL = "cr133_announcement"
TPL_SCHEMA = "cr133_AnnouncementTemplate"  # privilege names use SchemaName casing, not logical name
ANN_SCHEMA = "cr133_Announcement"


def get_token():
    out = subprocess.run(
        ["az", "account", "get-access-token", "--resource", ORG_URL, "--query", "accessToken", "-o", "tsv"],
        capture_output=True, text=True, check=True
    )
    return out.stdout.strip()


TOKEN = get_token()


def headers(solution=None, prefer_representation=True):
    h = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
    }
    if prefer_representation:
        h["Prefer"] = "return=representation"
    if solution:
        h["MSCRM.SolutionUniqueName"] = solution
    return h


def call(method, path, body=None, solution=None, extra_headers=None):
    url = path if path.startswith("http") else f"{BASE_URL}/{path}"
    url = url.replace(" ", "%20")
    h = headers(solution=solution)
    if extra_headers:
        for k, v in extra_headers.items():
            if v is None:
                h.pop(k, None)
            else:
                h[k] = v
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            resp_body = json.loads(raw) if raw else None
            return resp.status, resp_body, resp.headers.get("OData-EntityId")
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            err = json.loads(raw)
        except Exception:
            err = raw.decode("utf-8", errors="replace")
        print(f"ERROR {method} {url} -> {e.code}\n{json.dumps(err, indent=2) if isinstance(err, dict) else err}", file=sys.stderr)
        raise


# --- root business unit ---
status, bu, _ = call("GET", "businessunits?$select=businessunitid,name&$filter=_parentbusinessunitid_value eq null")
root_bu = bu["value"][0]
BU_ID = root_bu["businessunitid"]
print(f"Root business unit: {root_bu['name']} ({BU_ID})")

# --- current user ---
status, users, _ = call("GET", f"systemusers?$select=systemuserid,fullname,domainname&$filter=domainname eq '{USER_EMAIL}'")
if not users["value"]:
    print(f"User {USER_EMAIL} not found by domainname, trying internalemailaddress...")
    status, users, _ = call("GET", f"systemusers?$select=systemuserid,fullname,domainname,internalemailaddress&$filter=internalemailaddress eq '{USER_EMAIL}'")
user = users["value"][0]
USER_ID = user["systemuserid"]
print(f"User: {user.get('fullname')} ({USER_ID})")

# --- check if role already exists ---
status, existing_roles, _ = call("GET", f"roles?$select=roleid,name&$filter=name eq '{ROLE_NAME}' and _businessunitid_value eq {BU_ID}")
if existing_roles["value"]:
    ROLE_ID = existing_roles["value"][0]["roleid"]
    print(f"Role '{ROLE_NAME}' already exists: {ROLE_ID}")
else:
    role_body = {
        "name": ROLE_NAME,
        "businessunitid@odata.bind": f"/businessunits({BU_ID})",
    }
    status, role, _ = call("POST", "roles", role_body, solution=SOLUTION_UNIQUE_NAME)
    ROLE_ID = role["roleid"]
    print(f"Created role '{ROLE_NAME}': {ROLE_ID}")


def get_object_type_code(logical_name):
    status, res, _ = call("GET", f"EntityDefinitions(LogicalName='{logical_name}')?$select=ObjectTypeCode")
    return res["ObjectTypeCode"]


def get_privilege_id(name):
    status, res, _ = call("GET", f"privileges?$select=privilegeid,name&$filter=name eq '{name}'")
    if not res["value"]:
        raise RuntimeError(f"Privilege '{name}' not found")
    return res["value"][0]["privilegeid"]


def add_privilege(role_id, privilege_id, depth):
    body = {
        "Privileges": [
            {"PrivilegeId": privilege_id, "Depth": depth}
        ]
    }
    call("POST", f"roles({role_id})/Microsoft.Dynamics.CRM.AddPrivilegesRole", body, extra_headers={"Prefer": None})


def grant(table_schema, actions_depths):
    """actions_depths: list of (PrivilegeVerb, Depth) e.g. [("Read","Global"), ("Write","Local")]"""
    for verb, depth in actions_depths:
        priv_name = f"prv{verb}{table_schema}"
        try:
            priv_id = get_privilege_id(priv_name)
        except RuntimeError as e:
            print(f"    [WARN] {e}")
            continue
        add_privilege(ROLE_ID, priv_id, depth)
        print(f"    [GRANT] {verb} on {table_schema} @ {depth}")


print(f"\nGranting privileges on {TPL_SCHEMA} (Read @ Global)...")
grant(TPL_SCHEMA, [("Read", "Global")])

print(f"\nGranting privileges on {ANN_SCHEMA} (Create/Read/Write/Append/AppendTo @ Local)...")
grant(ANN_SCHEMA, [
    ("Create", "Local"),
    ("Read", "Local"),
    ("Write", "Local"),
    ("Append", "Local"),
    ("AppendTo", "Local"),
])

# --- assign role to user ---
status, existing_assoc, _ = call("GET", f"systemusers({USER_ID})/systemuserroles_association?$select=roleid&$filter=roleid eq {ROLE_ID}")
if existing_assoc["value"]:
    print(f"\nRole already assigned to {USER_EMAIL}")
else:
    assoc_body = {"@odata.id": f"{BASE_URL}/roles({ROLE_ID})"}
    call("POST", f"systemusers({USER_ID})/systemuserroles_association/$ref", assoc_body, extra_headers={"Prefer": None})
    print(f"\nAssigned role '{ROLE_NAME}' to {USER_EMAIL}")

print("\nDone.")
print(f"RoleId: {ROLE_ID}")

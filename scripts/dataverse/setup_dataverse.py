import json
import subprocess
import sys
import urllib.request
import urllib.error

import os

ORG_URL = os.environ.get("DATAVERSE_ORG_URL", "https://your-org.crm.dynamics.com")
BASE_URL = f"{ORG_URL}/api/data/v9.2"
SOLUTION_UNIQUE_NAME = "BroadcastStudio"


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


def call(method, path, body=None, solution=None, extra_headers=None, ok_statuses=(200, 201, 204)):
    url = path if path.startswith("http") else f"{BASE_URL}/{path}"
    url = url.replace(" ", "%20")
    h = headers(solution=solution)
    if extra_headers:
        h.update(extra_headers)
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            raw = resp.read()
            resp_body = json.loads(raw) if raw else None
            loc = resp.headers.get("OData-EntityId")
            return status, resp_body, loc
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            err = json.loads(raw)
        except Exception:
            err = raw.decode("utf-8", errors="replace")
        print(f"ERROR {method} {url} -> {e.code}\n{json.dumps(err, indent=2) if isinstance(err, dict) else err}", file=sys.stderr)
        raise


def label(text):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        "LocalizedLabels": [
            {"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": text, "LanguageCode": 1033}
        ],
    }


# --- Step 1: publisher prefix + id ---
status, pub, _ = call("GET", "publishers?$filter=friendlyname eq 'CDS Default Publisher'&$select=customizationprefix,friendlyname,publisherid")
publisher = pub["value"][0]
PREFIX = publisher["customizationprefix"]
PUBLISHER_ID = publisher["publisherid"]
print(f"Publisher prefix: {PREFIX}, id: {PUBLISHER_ID}")


def p(name):
    return f"{PREFIX}_{name}"


# --- Step 2: create solution (skip if exists) ---
status, existing_sol, _ = call("GET", f"solutions?$filter=uniquename eq '{SOLUTION_UNIQUE_NAME}'&$select=solutionid,uniquename")
if existing_sol["value"]:
    print(f"Solution '{SOLUTION_UNIQUE_NAME}' already exists, skipping creation.")
else:
    sol_body = {
        "uniquename": SOLUTION_UNIQUE_NAME,
        "friendlyname": "Broadcast Studio",
        "description": "Internal HR/Comms announcements app - tables, security role, flow",
        "version": "1.0.0.0",
        "publisherid@odata.bind": f"/publishers({PUBLISHER_ID})",
    }
    status, sol, _ = call("POST", "solutions", sol_body)
    print(f"Created solution '{SOLUTION_UNIQUE_NAME}': {sol.get('solutionid')}")


def table_exists(logical_name):
    try:
        call("GET", f"EntityDefinitions(LogicalName='{logical_name}')?$select=LogicalName")
        return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        raise


def column_exists(table_logical, col_logical):
    try:
        call("GET", f"EntityDefinitions(LogicalName='{table_logical}')/Attributes(LogicalName='{col_logical}')?$select=LogicalName")
        return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        raise


def create_table(schema_name, display_name, plural_display_name, description=""):
    logical = schema_name.lower()
    if table_exists(logical):
        print(f"  [SKIP] table {schema_name} exists")
        return logical
    body = {
        "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
        "SchemaName": schema_name,
        "DisplayName": label(display_name),
        "DisplayCollectionName": label(plural_display_name),
        "Description": label(description),
        "OwnershipType": "UserOwned",
        "HasNotes": False,
        "HasActivities": False,
        "PrimaryNameAttribute": p("name"),
        "Attributes": [
            {
                "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
                "SchemaName": p("name"),
                "AttributeType": "String",
                "FormatName": {"Value": "Text"},
                "MaxLength": 200,
                "DisplayName": label("Name"),
                "IsPrimaryName": True,
            }
        ],
    }
    call("POST", "EntityDefinitions", body, solution=SOLUTION_UNIQUE_NAME)
    print(f"  [CREATE] table {schema_name} created")
    return logical


def add_string(table_logical, schema_name, display_name, maxlength=200, fmt="Text"):
    col_logical = schema_name.lower()
    if column_exists(table_logical, col_logical):
        print(f"    [SKIP] {schema_name}")
        return
    body = {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        "SchemaName": schema_name,
        "AttributeType": "String",
        "FormatName": {"Value": fmt},
        "MaxLength": maxlength,
        "DisplayName": label(display_name),
    }
    call("POST", f"EntityDefinitions(LogicalName='{table_logical}')/Attributes", body, solution=SOLUTION_UNIQUE_NAME)
    print(f"    [CREATE] {schema_name} (String)")


def add_memo(table_logical, schema_name, display_name, maxlength=100000):
    col_logical = schema_name.lower()
    if column_exists(table_logical, col_logical):
        print(f"    [SKIP] {schema_name}")
        return
    body = {
        "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
        "SchemaName": schema_name,
        "AttributeType": "Memo",
        "MaxLength": maxlength,
        "DisplayName": label(display_name),
    }
    call("POST", f"EntityDefinitions(LogicalName='{table_logical}')/Attributes", body, solution=SOLUTION_UNIQUE_NAME)
    print(f"    [CREATE] {schema_name} (Memo)")


def add_boolean(table_logical, schema_name, display_name, default_value=False):
    col_logical = schema_name.lower()
    if column_exists(table_logical, col_logical):
        print(f"    [SKIP] {schema_name}")
        return
    body = {
        "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
        "SchemaName": schema_name,
        "AttributeType": "Boolean",
        "DisplayName": label(display_name),
        "DefaultValue": default_value,
        "OptionSet": {
            "@odata.type": "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata",
            "TrueOption": {"Value": 1, "Label": label("Yes")},
            "FalseOption": {"Value": 0, "Label": label("No")},
        },
    }
    call("POST", f"EntityDefinitions(LogicalName='{table_logical}')/Attributes", body, solution=SOLUTION_UNIQUE_NAME)
    print(f"    [CREATE] {schema_name} (Boolean)")


def add_integer(table_logical, schema_name, display_name):
    col_logical = schema_name.lower()
    if column_exists(table_logical, col_logical):
        print(f"    [SKIP] {schema_name}")
        return
    body = {
        "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
        "SchemaName": schema_name,
        "AttributeType": "Integer",
        "MinValue": -2147483648,
        "MaxValue": 2147483647,
        "DisplayName": label(display_name),
    }
    call("POST", f"EntityDefinitions(LogicalName='{table_logical}')/Attributes", body, solution=SOLUTION_UNIQUE_NAME)
    print(f"    [CREATE] {schema_name} (Integer)")


def add_datetime(table_logical, schema_name, display_name, fmt="DateAndTime"):
    col_logical = schema_name.lower()
    if column_exists(table_logical, col_logical):
        print(f"    [SKIP] {schema_name}")
        return
    body = {
        "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
        "SchemaName": schema_name,
        "AttributeType": "DateTime",
        "Format": fmt,
        "DisplayName": label(display_name),
    }
    call("POST", f"EntityDefinitions(LogicalName='{table_logical}')/Attributes", body, solution=SOLUTION_UNIQUE_NAME)
    print(f"    [CREATE] {schema_name} (DateTime)")


def add_picklist(table_logical, schema_name, display_name, options):
    """options: list of (value:int, label:str)"""
    col_logical = schema_name.lower()
    if column_exists(table_logical, col_logical):
        print(f"    [SKIP] {schema_name}")
        return
    body = {
        "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
        "SchemaName": schema_name,
        "AttributeType": "Picklist",
        "DisplayName": label(display_name),
        "OptionSet": {
            "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
            "IsGlobal": False,
            "OptionSetType": "Picklist",
            "Options": [{"Value": v, "Label": label(l)} for v, l in options],
        },
    }
    call("POST", f"EntityDefinitions(LogicalName='{table_logical}')/Attributes", body, solution=SOLUTION_UNIQUE_NAME)
    print(f"    [CREATE] {schema_name} (Picklist)")


def add_image(table_logical, schema_name, display_name):
    col_logical = schema_name.lower()
    if column_exists(table_logical, col_logical):
        print(f"    [SKIP] {schema_name}")
        return
    body = {
        "@odata.type": "Microsoft.Dynamics.CRM.ImageAttributeMetadata",
        "AttributeType": "Virtual",
        "AttributeTypeName": {"Value": "ImageType"},
        "SchemaName": schema_name,
        "DisplayName": label(display_name),
        "IsPrimaryImage": False,
        "CanStoreFullImage": True,
        "MaxSizeInKB": 30720,
    }
    call("POST", f"EntityDefinitions(LogicalName='{table_logical}')/Attributes", body, solution=SOLUTION_UNIQUE_NAME)
    print(f"    [CREATE] {schema_name} (Image)")


def add_lookup(source_table_logical, target_table_logical, schema_name, display_name, relationship_schema_name):
    col_logical = schema_name.lower()
    if column_exists(source_table_logical, col_logical):
        print(f"    [SKIP] lookup {schema_name}")
        return
    body = {
        "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
        "SchemaName": relationship_schema_name,
        "ReferencedEntity": target_table_logical,
        "ReferencingEntity": source_table_logical,
        "Lookup": {
            "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
            "SchemaName": schema_name,
            "DisplayName": label(display_name),
        },
        "CascadeConfiguration": {
            "Assign": "NoCascade",
            "Delete": "RemoveLink",
            "Merge": "NoCascade",
            "Reparent": "NoCascade",
            "Share": "NoCascade",
            "Unshare": "NoCascade",
        },
    }
    call("POST", "RelationshipDefinitions", body, solution=SOLUTION_UNIQUE_NAME)
    print(f"    [CREATE] lookup {schema_name} -> {target_table_logical}")


def get_entity_set_name(logical_name):
    status, res, _ = call("GET", f"EntityDefinitions(LogicalName='{logical_name}')?$select=EntitySetName")
    return res["EntitySetName"]


# ===================== BUILD =====================

print("\n=== Table 1: Announcement Template ===")
tpl_logical = create_table(p("AnnouncementTemplate"), "Announcement Template", "Announcement Templates",
                            "Admin-managed catalog of announcement templates")

print("Columns:")
add_picklist(tpl_logical, p("Category"), "Category", [
    (100000000, "Promotions"),
    (100000001, "Internal Guidelines"),
    (100000002, "New Policy"),
    (100000003, "Employee Birthday"),
    (100000004, "New Baby"),
    (100000005, "Condolences"),
    (100000006, "Structural Changes"),
    (100000007, "Company Achievements"),
    (100000008, "Newsletter"),
    (100000009, "Awards"),
    (100000010, "Employee of the Month"),
    (100000011, "Training Programs"),
    (100000012, "Initiatives"),
])
add_memo(tpl_logical, p("HtmlSkeleton"), "HTML Skeleton", maxlength=100000)
add_memo(tpl_logical, p("FieldSchema"), "Field Schema", maxlength=20000)
add_boolean(tpl_logical, p("RequiresImage"), "Requires Image", default_value=False)
add_boolean(tpl_logical, p("IsActive"), "Is Active", default_value=True)
add_integer(tpl_logical, p("SortOrder"), "Sort Order")
add_string(tpl_logical, p("Description"), "Description", maxlength=500)

print("\n=== Table 2: Announcement ===")
ann_logical = create_table(p("Announcement"), "Announcement", "Announcements",
                            "A single announcement send record (draft/test/sent)")

print("Columns:")
add_string(ann_logical, p("SubjectEn"), "Subject (EN)", maxlength=300)
add_string(ann_logical, p("SubjectAr"), "Subject (AR)", maxlength=300)
add_memo(ann_logical, p("BodyFieldsJson"), "Body Fields JSON", maxlength=50000)
add_image(ann_logical, p("Image"), "Image")
add_memo(ann_logical, p("RenderedHtml"), "Rendered HTML", maxlength=200000)
add_picklist(ann_logical, p("Status"), "Status", [
    (100000000, "Draft"),
    (100000001, "Test Sent"),
    (100000002, "Sent"),
])
add_string(ann_logical, p("Recipients"), "Recipients", maxlength=1000)
add_datetime(ann_logical, p("TestSentAt"), "Test Sent At")
add_string(ann_logical, p("TestSentTo"), "Test Sent To", maxlength=300)
add_datetime(ann_logical, p("SentAt"), "Sent At")

print("Lookup:")
add_lookup(ann_logical, tpl_logical, p("Template"), "Template", p(f"{tpl_logical}_{ann_logical}"))

print("\n=== Publish customizations ===")
call("POST", "PublishAllXml", {})
print("Published.")

print("\n=== Entity set names ===")
tpl_set = get_entity_set_name(tpl_logical)
ann_set = get_entity_set_name(ann_logical)
print(f"AnnouncementTemplate: logical={tpl_logical} entitySet={tpl_set}")
print(f"Announcement: logical={ann_logical} entitySet={ann_set}")
print(f"Publisher prefix: {PREFIX}")

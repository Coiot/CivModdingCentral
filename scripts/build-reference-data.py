#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET
from zipfile import ZipFile

XLSX_NS = {
    "x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkg": "http://schemas.openxmlformats.org/package/2006/relationships",
}

DEFAULT_CORE_DB_PATH = Path(
    "/Users/coiot/Library/Application Support/Sid Meier's Civilization 5/cache/Civ5CoreDatabase.db"
)
DEFAULT_DEBUG_DB_PATH = Path(
    "/Users/coiot/Library/Application Support/Sid Meier's Civilization 5/cache/Civ5DebugDatabase.db"
)
DEFAULT_METHODS_PATH = Path("/Users/coiot/Sites/LandofSnows/Methods.xlsx")
DEFAULT_GAME_EVENTS_PATH = Path("/Users/coiot/Sites/LandofSnows/GameEvents.xlsx")
DEFAULT_SCHEMA_OUT = Path("src/lib/generated/civ-schema.json")
DEFAULT_LUA_OUT = Path("src/lib/generated/civ-lua-api.json")
DEFAULT_LUA_DOCS_PATH = Path("src/lib/data/civ-lua-api-docs.json")
TYPE_TABLE_MAP = {
    "BeliefTypes": ["Beliefs"],
    "BuildingClassTypes": ["BuildingClasses"],
    "BuildingTypes": ["Buildings"],
    "BuildTypes": ["Builds"],
    "CivilizationTypes": ["Civilizations"],
    "ControlTypes": ["Controls"],
    "DomainTypes": ["Domains"],
    "EraTypes": ["Eras"],
    "FeatureTypes": ["Features"],
    "GreatWorkTypes": ["GreatWorks"],
    "ImprovementTypes": ["Improvements"],
    "LeagueProjectTypes": ["LeagueProjects"],
    "MinorCivQuestTypes": ["MinorCivQuests"],
    "MovementRateTypes": ["MovementRates"],
    "PlayerColorTypes": ["PlayerColors"],
    "PolicyBranchTypes": ["PolicyBranchTypes"],
    "PolicyTypes": ["Policies"],
    "ProjectTypes": ["Projects"],
    "PromotionTypes": ["UnitPromotions"],
    "ReligionTypes": ["Religions"],
    "ResolutionTypes": ["Resolutions"],
    "ResourceTypes": ["Resources"],
    "RouteTypes": ["Routes"],
    "SpecialUnitTypes": ["SpecialUnits"],
    "SpecialistTypes": ["Specialists"],
    "TechTypes": ["Technologies"],
    "TerrainTypes": ["Terrains"],
    "TraitTypes": ["Traits"],
    "UnitAITypes": ["UnitAIInfos"],
    "UnitClassTypes": ["UnitClasses"],
    "UnitCombatTypes": ["UnitCombatInfos"],
    "UnitPromotionTypes": ["UnitPromotions"],
    "UnitTypes": ["Units"],
    "VictoryTypes": ["Victories"],
    "YieldTypes": ["Yields"],
}

PLURAL_SUFFIX_RULES = (
    ("y", "ies"),
    ("s", "ses"),
    ("x", "xes"),
    ("ch", "ches"),
    ("sh", "shes"),
)
ENTRY_FAMILY_PREFIXES = ("City", "Game", "Player", "Plot", "Team", "Unit")
EVENT_TO_METHOD_COUNTERPARTS = {
    "CanDeclareWar": ("Team", "CanDeclareWar"),
    "CanRaze": ("Player", "CanRaze"),
    "CanStartMission": ("Unit", "CanStartMission"),
    "DeclareWar": ("Team", "DeclareWar"),
    "GetFounderBenefitsReligion": ("Game", "GetFounderBenefitsReligion"),
    "MakePeace": ("Team", "MakePeace"),
    "SetPopulation": ("City", "SetPopulation"),
}
AUTO_SCHEMA_NOTE_LIMIT = 3
AUTO_SEE_ALSO_LIMIT = 3


def resolve_default_db_path() -> Path:
    if DEFAULT_DEBUG_DB_PATH.exists():
        return DEFAULT_DEBUG_DB_PATH
    return DEFAULT_CORE_DB_PATH


DEFAULT_DB_PATH = resolve_default_db_path()


def slugify(value: str) -> str:
    lowered = value.lower()
    output = []
    last_dash = False
    for char in lowered:
        if char.isalnum():
            output.append(char)
            last_dash = False
        elif not last_dash:
            output.append("-")
            last_dash = True
    return "".join(output).strip("-")


def quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def normalize_sql_value(value: Any) -> Any:
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8")
        except UnicodeDecodeError:
            return value.hex()
    return value


def load_optional_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return payload if isinstance(payload, dict) else {}


def normalize_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def normalize_example(value: Any) -> dict[str, str] | None:
    if not isinstance(value, dict):
        return None
    summary = value.get("summary")
    code = value.get("code")
    language = value.get("language")
    normalized = {
        "summary": summary.strip() if isinstance(summary, str) else "",
        "code": code.strip() if isinstance(code, str) else "",
        "language": language.strip() if isinstance(language, str) else "",
    }
    return normalized if any(normalized.values()) else None


def normalize_related_schema_notes(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    normalized: list[dict[str, str]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        table = item.get("table")
        note = item.get("note")
        if not isinstance(table, str) or not table.strip():
            continue
        normalized.append(
            {
                "table": table.strip(),
                "note": note.strip() if isinstance(note, str) else "",
            }
        )
    return normalized


def normalize_see_also(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    normalized: list[dict[str, str]] = []
    for item in value:
        if isinstance(item, str) and item.strip():
            normalized.append({"ref": item.strip()})
            continue
        if not isinstance(item, dict):
            continue
        entry: dict[str, str] = {}
        for key in ("entryId", "entryKey", "ref", "label", "note"):
            value = item.get(key)
            if isinstance(value, str) and value.strip():
                entry[key] = value.strip()
        if entry:
            normalized.append(entry)
    return normalized


def apply_lua_docs_overlay(
    snapshot: dict[str, Any], docs_overlay: dict[str, Any]
) -> dict[str, Any]:
    method_docs = docs_overlay.get("methods")
    event_docs = docs_overlay.get("gameEvents")
    method_docs = method_docs if isinstance(method_docs, dict) else {}
    event_docs = event_docs if isinstance(event_docs, dict) else {}

    def merge_entry(entry: dict[str, Any], overlay: Any) -> dict[str, Any]:
        overlay = overlay if isinstance(overlay, dict) else {}
        summary = overlay.get("summary")
        return {
            **entry,
            "summary": summary.strip() if isinstance(summary, str) else "",
            "notes": normalize_string_list(overlay.get("notes")),
            "example": normalize_example(overlay.get("example")),
            "gotchas": normalize_string_list(overlay.get("gotchas")),
            "relatedSchemaNotes": normalize_related_schema_notes(
                overlay.get("relatedSchemaNotes")
            ),
            "seeAlso": normalize_see_also(overlay.get("seeAlso")),
        }

    snapshot["methods"] = [
        merge_entry(entry, method_docs.get(entry["id"]))
        for entry in snapshot["methods"]
    ]
    snapshot["gameEvents"] = [
        merge_entry(entry, event_docs.get(entry["id"]))
        for entry in snapshot["gameEvents"]
    ]
    return snapshot


def build_schema_touchpoints(entry: dict[str, Any]) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()

    def remember(table: Any) -> None:
        if not isinstance(table, str):
            return
        normalized = table.strip()
        if not normalized or normalized in seen:
            return
        seen.add(normalized)
        ordered.append(normalized)

    for table in entry.get("schemaTables") or []:
        remember(table)

    for parameter in entry.get("parameters") or []:
        if not isinstance(parameter, dict):
            continue
        for table in parameter.get("schemaTables") or []:
            remember(table)

    return ordered


def describe_schema_note(entry: dict[str, Any], table: str) -> str:
    descriptors: list[str] = []
    seen: set[str] = set()
    for parameter in entry.get("parameters") or []:
        if not isinstance(parameter, dict):
            continue
        parameter_tables = parameter.get("schemaTables") or []
        if table not in parameter_tables:
            continue
        for candidate in (
            parameter.get("type"),
            parameter.get("name"),
            parameter.get("raw"),
        ):
            if not isinstance(candidate, str):
                continue
            normalized = candidate.strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            descriptors.append(normalized)
            break
        if len(descriptors) >= 2:
            break

    subject = "hook" if "scope" in entry else "method"
    if descriptors:
        label = " and ".join(descriptors[:2])
        return (
            f"This {subject} uses {label} values backed by {table}; inspect that "
            "table for the concrete rows and gameplay fields behind the IDs passed here."
        )
    return (
        f"This {subject} touches {table} rows; inspect that table for the concrete "
        "records and gameplay fields behind the values involved here."
    )


def build_see_also_key(item: dict[str, str]) -> tuple[str, str] | None:
    for key in ("entryId", "entryKey", "ref"):
        value = item.get(key)
        if value:
            return key, value
    return None


def build_method_to_event_note(method_name: str) -> str:
    if method_name.startswith("Can"):
        return "GameEvents hook for overriding or observing the same validation."
    if method_name.startswith("Get"):
        return "GameEvents hook for supplying or altering the same resolved value."
    if method_name.startswith("Set"):
        return "GameEvents callback touching the same state change."
    return "Related GameEvents callback touching the same operation."


def build_event_to_method_note(action_name: str) -> str:
    if action_name.startswith("Can"):
        return "Method-side validation for the same rule path."
    if action_name.startswith("Get"):
        return "Method-side accessor for the same resolved value."
    if action_name.startswith("Set"):
        return "Method-side mutator for the same state change."
    return "Method-side API touching the same operation."


def resolve_counterpart_method(
    event_entry: dict[str, Any], by_family_method: dict[tuple[str, str], str]
) -> tuple[str, str] | None:
    event_name = event_entry.get("name")
    if not isinstance(event_name, str) or not event_name:
        return None

    for family in ENTRY_FAMILY_PREFIXES:
        if not event_name.startswith(family):
            continue
        action_name = event_name[len(family) :]
        counterpart_id = by_family_method.get((family, action_name))
        if counterpart_id:
            return counterpart_id, action_name

    mapped = EVENT_TO_METHOD_COUNTERPARTS.get(event_name)
    if not mapped:
        return None
    counterpart_id = by_family_method.get(mapped)
    if not counterpart_id:
        return None
    return counterpart_id, mapped[1]


def build_reverse_event_counterparts(
    snapshot: dict[str, Any],
) -> dict[tuple[str, str], tuple[str, str]]:
    by_family_method: dict[tuple[str, str], str] = {}
    for entry in snapshot["methods"]:
        by_family_method[(entry["family"], entry["methodName"])] = entry["id"]

    reverse: dict[tuple[str, str], tuple[str, str]] = {}
    for entry in snapshot["gameEvents"]:
        counterpart = resolve_counterpart_method(entry, by_family_method)
        if not counterpart:
            continue
        counterpart_id, action_name = counterpart
        reverse[(counterpart_id, action_name)] = (entry["id"], action_name)
    return reverse


def augment_entry_docs(
    entry: dict[str, Any], counterpart_item: dict[str, str] | None
) -> dict[str, Any]:
    related_schema_notes = normalize_related_schema_notes(
        entry.get("relatedSchemaNotes")
    )
    related_tables = {item["table"] for item in related_schema_notes}
    for table in build_schema_touchpoints(entry):
        if (
            table in related_tables
            or len(related_schema_notes) >= AUTO_SCHEMA_NOTE_LIMIT
        ):
            continue
        related_schema_notes.append(
            {"table": table, "note": describe_schema_note(entry, table)}
        )
        related_tables.add(table)

    see_also = normalize_see_also(entry.get("seeAlso"))
    seen_see_also = {
        key for item in see_also if (key := build_see_also_key(item)) is not None
    }

    def append_see_also(item: dict[str, str]) -> None:
        key = build_see_also_key(item)
        if key is None or key in seen_see_also or len(see_also) >= AUTO_SEE_ALSO_LIMIT:
            return
        see_also.append(item)
        seen_see_also.add(key)

    if counterpart_item:
        append_see_also(counterpart_item)

    return {
        **entry,
        "relatedSchemaNotes": related_schema_notes,
        "seeAlso": see_also,
    }


def augment_lua_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    reverse_event_counterparts = build_reverse_event_counterparts(snapshot)

    snapshot["methods"] = [
        augment_entry_docs(
            entry,
            (
                {
                    "entryId": counterpart_id,
                    "note": build_method_to_event_note(action_name),
                }
                if (
                    counterpart := reverse_event_counterparts.get(
                        (entry["id"], entry["methodName"])
                    )
                )
                and (counterpart_id := counterpart[0])
                and (action_name := counterpart[1])
                else None
            ),
        )
        for entry in snapshot["methods"]
    ]

    by_family_method = {
        (entry["family"], entry["methodName"]): entry["id"]
        for entry in snapshot["methods"]
    }
    snapshot["gameEvents"] = [
        augment_entry_docs(
            entry,
            (
                {
                    "entryId": counterpart_id,
                    "note": build_event_to_method_note(action_name),
                }
                if (counterpart := resolve_counterpart_method(entry, by_family_method))
                and (counterpart_id := counterpart[0])
                and (action_name := counterpart[1])
                else None
            ),
        )
        for entry in snapshot["gameEvents"]
    ]
    return snapshot


def load_sheet_rows(path: Path) -> list[dict[str, Any]]:
    with ZipFile(path) as zip_file:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in zip_file.namelist():
            shared_root = ET.fromstring(zip_file.read("xl/sharedStrings.xml"))
            for item in shared_root.findall("x:si", XLSX_NS):
                text = "".join(
                    node.text or "" for node in item.iterfind(".//x:t", XLSX_NS)
                )
                shared_strings.append(text)

        workbook_root = ET.fromstring(zip_file.read("xl/workbook.xml"))
        rels_root = ET.fromstring(zip_file.read("xl/_rels/workbook.xml.rels"))
        rel_map = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in rels_root.findall("pkg:Relationship", XLSX_NS)
        }

        sheets: list[dict[str, Any]] = []
        for sheet in workbook_root.findall("x:sheets/x:sheet", XLSX_NS):
            relationship_id = sheet.attrib[
                "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
            ]
            target = rel_map[relationship_id]
            target_path = target if target.startswith("xl/") else f"xl/{target}"
            worksheet_root = ET.fromstring(zip_file.read(target_path))
            rows: list[list[str]] = []
            for row in worksheet_root.findall("x:sheetData/x:row", XLSX_NS):
                values: list[str] = []
                for cell in row.findall("x:c", XLSX_NS):
                    ref = cell.attrib.get("r", "")
                    index = column_index_from_ref(ref)
                    while len(values) <= index:
                        values.append("")
                    values[index] = read_cell_value(cell, shared_strings)
                while values and values[-1] == "":
                    values.pop()
                if values:
                    rows.append(values)
            sheets.append({"name": sheet.attrib["name"], "rows": rows})
        return sheets


def column_index_from_ref(reference: str) -> int:
    letters = "".join(char for char in reference if char.isalpha())
    value = 0
    for char in letters:
        value = value * 26 + (ord(char.upper()) - 64)
    return max(value - 1, 0)


def read_cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    value_node = cell.find("x:v", XLSX_NS)
    if cell_type == "inlineStr":
        return "".join(
            node.text or "" for node in cell.findall(".//x:t", XLSX_NS)
        ).strip()
    if value_node is None:
        return ""
    raw = (value_node.text or "").strip()
    if cell_type == "s" and raw.isdigit():
        index = int(raw)
        if 0 <= index < len(shared_strings):
            return shared_strings[index].strip()
    return raw


def resolve_type_tables(type_name: str, schema_table_names: set[str]) -> list[str]:
    cleaned = type_name.strip().strip("[]")
    if not cleaned:
        return []
    mapped = [
        name for name in TYPE_TABLE_MAP.get(cleaned, []) if name in schema_table_names
    ]
    if mapped:
        return mapped
    if cleaned.endswith("Types"):
        stem = cleaned[:-5]
        candidates = {f"{stem}s"}
        for suffix, replacement in PLURAL_SUFFIX_RULES:
            if stem.endswith(suffix):
                candidates.add(f"{stem[: -len(suffix)]}{replacement}")
        candidates.add(f"{stem}es")
        return sorted(name for name in candidates if name in schema_table_names)
    return []


def parse_parameter(raw: str, schema_table_names: set[str]) -> dict[str, Any]:
    source = raw.strip()
    optional = source.startswith("[") and source.endswith("]")
    inner = source[1:-1] if optional else source
    parts = inner.split(":")
    if len(parts) >= 2:
        type_name = parts[0].strip()
        parameter_name = parts[1].strip()
        default_value = ":".join(parts[2:]).strip() if len(parts) > 2 else ""
    else:
        type_name = inner.strip()
        parameter_name = ""
        default_value = ""
    schema_tables = resolve_type_tables(type_name, schema_table_names)
    return {
        "raw": source,
        "type": type_name,
        "name": parameter_name,
        "defaultValue": default_value,
        "optional": optional,
        "schemaTables": schema_tables,
    }


def build_schema_snapshot(db_path: Path) -> dict[str, Any]:
    connection = sqlite3.connect(str(db_path))
    connection.row_factory = sqlite3.Row
    try:
        table_rows = connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
        table_names = [row["name"] for row in table_rows]
        reverse_links: dict[str, list[dict[str, str]]] = defaultdict(list)
        tables: list[dict[str, Any]] = []
        total_columns = 0
        total_foreign_keys = 0
        total_rows = 0

        for table_name in table_names:
            column_rows = connection.execute(
                f"PRAGMA table_info({quote_identifier(table_name)})"
            ).fetchall()
            foreign_key_rows = connection.execute(
                f"PRAGMA foreign_key_list({quote_identifier(table_name)})"
            ).fetchall()
            row_count = connection.execute(
                f"SELECT COUNT(*) AS count FROM {quote_identifier(table_name)}"
            ).fetchone()["count"]
            all_row_rows = connection.execute(
                f"SELECT * FROM {quote_identifier(table_name)}"
            ).fetchall()
            total_rows += row_count
            columns = []
            foreign_keys = []
            all_rows = []
            for row in column_rows:
                column = {
                    "name": row["name"],
                    "type": row["type"] or "",
                    "notNull": bool(row["notnull"]),
                    "defaultValue": row["dflt_value"],
                    "primaryKey": bool(row["pk"]),
                }
                columns.append(column)
            for row in foreign_key_rows:
                foreign_key = {
                    "from": row["from"],
                    "toTable": row["table"],
                    "toColumn": row["to"],
                }
                foreign_keys.append(foreign_key)
                reverse_links[row["table"]].append(
                    {
                        "fromTable": table_name,
                        "fromColumn": row["from"],
                        "toColumn": row["to"],
                    }
                )
            for row in all_row_rows:
                normalized_row = {}
                for key in row.keys():
                    value = normalize_sql_value(row[key])
                    if value is None or value == "":
                        continue
                    normalized_row[key] = value
                all_rows.append(normalized_row)
            total_columns += len(columns)
            total_foreign_keys += len(foreign_keys)
            tables.append(
                {
                    "id": slugify(table_name),
                    "name": table_name,
                    "rowCount": row_count,
                    "columnCount": len(columns),
                    "foreignKeyCount": len(foreign_keys),
                    "columns": columns,
                    "foreignKeys": foreign_keys,
                    "rows": all_rows,
                    "incomingForeignKeys": [],
                }
            )

        by_name = {table["name"]: table for table in tables}
        for table_name, incoming in reverse_links.items():
            if table_name in by_name:
                by_name[table_name]["incomingForeignKeys"] = sorted(
                    incoming,
                    key=lambda item: (
                        item["fromTable"],
                        item["fromColumn"],
                        item["toColumn"],
                    ),
                )

        tables.sort(key=lambda item: item["name"])
        top_columns = sorted(
            tables, key=lambda item: (-item["columnCount"], item["name"])
        )[:12]
        top_foreign_keys = sorted(
            tables, key=lambda item: (-item["foreignKeyCount"], item["name"])
        )[:12]
        top_rows = sorted(tables, key=lambda item: (-item["rowCount"], item["name"]))[
            :12
        ]

        return {
            "stats": {
                "tableCount": len(tables),
                "columnCount": total_columns,
                "foreignKeyCount": total_foreign_keys,
                "rowCount": total_rows,
            },
            "highlights": {
                "largestTables": [
                    {"name": item["name"], "rowCount": item["rowCount"]}
                    for item in top_rows
                ],
                "widestTables": [
                    {"name": item["name"], "columnCount": item["columnCount"]}
                    for item in top_columns
                ],
                "linkedTables": [
                    {"name": item["name"], "foreignKeyCount": item["foreignKeyCount"]}
                    for item in top_foreign_keys
                ],
            },
            "tables": tables,
        }
    finally:
        connection.close()


def build_lua_snapshot(
    methods_path: Path, game_events_path: Path, schema_table_names: set[str]
) -> dict[str, Any]:
    method_sheets = load_sheet_rows(methods_path)
    game_event_sheets = load_sheet_rows(game_events_path)

    method_entries: list[dict[str, Any]] = []
    family_counts: Counter[str] = Counter()
    return_types: Counter[str] = Counter()

    for sheet in method_sheets:
        family = sheet["name"]
        for index, row in enumerate(sheet["rows"], start=1):
            if not row or not row[0].strip():
                continue
            method_name = row[0].strip()
            call_surface = row[2].strip() if len(row) > 2 else method_name
            return_type = row[3].strip() if len(row) > 3 else ""
            raw_parameters = [value.strip() for value in row[4:] if value.strip()]
            parameters = [
                parse_parameter(value, schema_table_names) for value in raw_parameters
            ]
            schema_tables = sorted(
                {
                    table
                    for parameter in parameters
                    for table in parameter["schemaTables"]
                }
            )
            call_kind = (
                "instance"
                if call_surface.startswith(":")
                else "static"
                if call_surface.startswith(".")
                else "unknown"
            )
            display_signature = f"{family}{call_surface}({', '.join(parameter['raw'] for parameter in parameters)})"
            method_entries.append(
                {
                    "id": f"{slugify(family)}-{slugify(method_name)}-{index}",
                    "family": family,
                    "methodName": method_name,
                    "callSurface": call_surface,
                    "callKind": call_kind,
                    "returnType": return_type,
                    "parameters": parameters,
                    "parameterCount": len(parameters),
                    "schemaTables": schema_tables,
                    "displaySignature": display_signature,
                }
            )
            family_counts[family] += 1
            if return_type:
                return_types[return_type] += 1

    game_event_entries: list[dict[str, Any]] = []
    scope_counts: Counter[str] = Counter()
    for sheet in game_event_sheets:
        for index, row in enumerate(sheet["rows"], start=1):
            if not row or not row[0].strip():
                continue
            event_name = row[0].strip()
            scope = row[1].strip() if len(row) > 1 else ""
            raw_parameters = [value.strip() for value in row[2:] if value.strip()]
            parameters = [
                parse_parameter(value, schema_table_names) for value in raw_parameters
            ]
            schema_tables = sorted(
                {
                    table
                    for parameter in parameters
                    for table in parameter["schemaTables"]
                }
            )
            game_event_entries.append(
                {
                    "id": f"game-event-{slugify(event_name)}-{index}",
                    "name": event_name,
                    "scope": scope,
                    "parameters": parameters,
                    "parameterCount": len(parameters),
                    "schemaTables": schema_tables,
                    "displaySignature": f"GameEvents.{event_name}({', '.join(parameter['raw'] for parameter in parameters)})",
                }
            )
            if scope:
                scope_counts[scope] += 1

    return {
        "stats": {
            "familyCount": len(method_sheets),
            "methodCount": len(method_entries),
            "gameEventCount": len(game_event_entries),
        },
        "families": [
            {"name": family, "methodCount": family_counts[family]}
            for family in sorted(family_counts)
        ],
        "gameEventScopes": [
            {"name": scope, "eventCount": scope_counts[scope]}
            for scope in sorted(scope_counts)
        ],
        "topReturnTypes": [
            {"name": return_type, "count": count}
            for return_type, count in return_types.most_common(12)
        ],
        "methods": method_entries,
        "gameEvents": game_event_entries,
        "plannedTracks": ["Events", "LuaEvents", "GameInfoTypes"],
    }


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build static reference data for the Civ Modding Central explorers."
    )
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument("--methods", type=Path, default=DEFAULT_METHODS_PATH)
    parser.add_argument("--game-events", type=Path, default=DEFAULT_GAME_EVENTS_PATH)
    parser.add_argument("--lua-docs", type=Path, default=DEFAULT_LUA_DOCS_PATH)
    parser.add_argument("--schema-out", type=Path, default=DEFAULT_SCHEMA_OUT)
    parser.add_argument("--lua-out", type=Path, default=DEFAULT_LUA_OUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    schema_snapshot = build_schema_snapshot(args.db)
    schema_table_names = {table["name"] for table in schema_snapshot["tables"]}
    lua_snapshot = build_lua_snapshot(
        args.methods, args.game_events, schema_table_names
    )
    lua_docs_overlay = load_optional_json(args.lua_docs)
    lua_snapshot = apply_lua_docs_overlay(lua_snapshot, lua_docs_overlay)
    lua_snapshot = augment_lua_snapshot(lua_snapshot)
    write_json(args.schema_out, schema_snapshot)
    write_json(args.lua_out, lua_snapshot)
    print(f"Wrote {args.schema_out}")
    print(f"Wrote {args.lua_out}")


if __name__ == "__main__":
    main()

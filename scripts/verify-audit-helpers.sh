#!/usr/bin/env bash
# Requires Java 21+ and Node 22.6+; no package installation or production data access.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP="$(mktemp -d)"
trap 'rm -rf "$TEMP"' EXIT
PACKAGE="$ROOT/backend/src/main/java/cm/indyli/timeflow/billing/application"
javac -d "$TEMP" "$PACKAGE/CsvCell.java" "$PACKAGE/MoneyTotal.java" "$PACKAGE/MoneyTotals.java" "$ROOT/scripts/AuditHelperCheck.java"
java -cp "$TEMP" AuditHelperCheck
cd "$ROOT/frontend"
node --experimental-strip-types --test tests/training-time.test.mjs tests/money-format.test.mjs

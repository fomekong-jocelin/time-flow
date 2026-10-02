#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT
src=backend/src/main/java/cm/indyli/timeflow/training/domain
javac -d "$out" "$src/ParticipantStatus.java" "$src/TrainingStatus.java"   "$src/TrainingValidationException.java" "$src/TrainingParticipantPolicy.java"   scripts/TrainingParticipantPolicyCheck.java
java -cp "$out" TrainingParticipantPolicyCheck

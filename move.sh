#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <old_user_id> <new_user_id>" >&2
  echo "Ensure LOGS_TABLE and HIGHLIGHTS_TABLE env vars are set (or defined in .env/.env.local)." >&2
  exit 1
fi

old_id="$1"
new_id="$2"

load_env_if_present() {
  for env_file in .env .env.local; do
    if [[ -f "$env_file" ]]; then
      echo "Loading environment from $env_file"
      # shellcheck disable=SC1090
      set -a
      source "$env_file"
      set +a
    fi
  done
}

require_env() {
  local var_name="$1"
  local value
  value="${!var_name:-}"
  if [[ -z "$value" ]]; then
    echo "Error: $var_name environment variable is required. Set it or add it to .env/.env.local." >&2
    exit 1
  fi
}

load_env_if_present

require_env LOGS_TABLE
require_env HIGHLIGHTS_TABLE

update_highlights() {
  echo "Updating highlights from userId=$old_id to userId=$new_id in $HIGHLIGHTS_TABLE"

  aws dynamodb scan \
    --table-name "$HIGHLIGHTS_TABLE" \
    --filter-expression "#userId = :old" \
    --expression-attribute-names '{"#userId":"userId", "#id":"id"}' \
    --expression-attribute-values '{":old":{"S":"'"$old_id"'"}}' \
    --projection-expression "#id" \
    --output json \
    | jq -c '.Items[] | {id: .id.S}' \
    | while IFS= read -r item; do
        highlight_id=$(echo "$item" | jq -r '.id')
        echo "  -> $highlight_id"
        aws dynamodb update-item \
          --table-name "$HIGHLIGHTS_TABLE" \
          --key '{"id":{"S":"'"$highlight_id"'"}}' \
          --update-expression "SET userId = :new" \
          --expression-attribute-values '{":new":{"S":"'"$new_id"'"}}' \
          --output text >/dev/null
      done
}

update_logs() {
  echo "Updating logs from userId=$old_id to userId=$new_id in $LOGS_TABLE"

  aws dynamodb scan \
    --table-name "$LOGS_TABLE" \
    --filter-expression "#userId = :old" \
    --expression-attribute-names '{"#userId":"userId", "#ts":"timestamp"}' \
    --expression-attribute-values '{":old":{"S":"'"$old_id"'"}}' \
    --projection-expression "id, #ts" \
    --output json \
    | jq -c '.Items[] | {id: .id.S, timestamp: .timestamp.S}' \
    | while IFS= read -r item; do
        log_id=$(echo "$item" | jq -r '.id')
        log_ts=$(echo "$item" | jq -r '.timestamp')
        echo "  -> $log_id @ $log_ts"
        aws dynamodb update-item \
          --table-name "$LOGS_TABLE" \
          --key '{"id":{"S":"'"$log_id"'"},"timestamp":{"S":"'"$log_ts"'"}}' \
          --update-expression "SET userId = :new" \
          --expression-attribute-values '{":new":{"S":"'"$new_id"'"}}' \
          --output text >/dev/null
      done
}

update_highlights
update_logs

echo "Done."

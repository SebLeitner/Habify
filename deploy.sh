#!/bin/bash
set -e

### ───────────────────────────────────────────
### 1) CONFIG
### ───────────────────────────────────────────
API_URL="https://v2thu7qsrd.execute-api.eu-central-1.amazonaws.com/dev"
APP_DOMAIN="habify.leitnersoft.com"
CLOUDFRONT_URL="d2ufe2249q2zrf.cloudfront.net"
COGNITO_POOL_ID="eu-central-1_t8xE8WR5L"
COGNITO_CLIENT_ID="69hbfjjmcjs6438gm0ir2b275s"

FRONTEND_DIR="$(pwd)"
TERRAFORM_DIR="$FRONTEND_DIR/infra/terraform"
BUILD_DIR="$FRONTEND_DIR/dist"

### Name deines S3 Buckets (Terraform output wäre besser)
S3_BUCKET="habify-dev-frontend"

### ───────────────────────────────────────────
### 2) Prüfen ob benötigte Tools vorhanden sind
### ───────────────────────────────────────────
for cmd in aws terraform npm; do
  if ! command -v $cmd >/dev/null 2>&1; then
    echo "❌ Fehler: '$cmd' ist nicht installiert!"
    exit 1
  fi
done

echo "✔ Alle benötigten Tools vorhanden."

### ───────────────────────────────────────────
### 3) ENV Variablen in Vite einfügen
###    Deine App nutzt sicher 'import.meta.env'
### ───────────────────────────────────────────
ENV_FILE="$FRONTEND_DIR/.env.production"

echo "🔧 Erzeuge $ENV_FILE …"

cat > "$ENV_FILE" <<EOF
VITE_API_URL="$API_URL"
VITE_APP_DOMAIN="$APP_DOMAIN"
VITE_CLOUDFRONT_URL="$CLOUDFRONT_URL"
VITE_COGNITO_POOL_ID="$COGNITO_POOL_ID"
VITE_COGNITO_CLIENT_ID="$COGNITO_CLIENT_ID"
EOF

echo "✔ .env.production aktualisiert."

### ───────────────────────────────────────────
### 4) Frontend bauen
### ───────────────────────────────────────────
echo "🏗 Baue Frontend…"
npm install
npm run build

echo "✔ Build abgeschlossen: $BUILD_DIR"

### ───────────────────────────────────────────
### 5) Upload auf S3
### ───────────────────────────────────────────
echo "📤 Lade Dateien zu S3 ($S3_BUCKET) hoch …"

aws s3 sync "$BUILD_DIR" "s3://$S3_BUCKET" \
    --delete \
    --cache-control "max-age=3600,public"

echo "✔ Upload abgeschlossen."

### ───────────────────────────────────────────
### 6) CloudFront Cache invalidieren
### ───────────────────────────────────────────
echo "🧹 Invalidiere CloudFront Cache …"

CF_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[0]=='$APP_DOMAIN'].Id | [0]" --output text)

if [ "$CF_ID" = "None" ] || [ -z "$CF_ID" ]; then
    echo "❌ Fehler: CloudFront Distribution für $APP_DOMAIN nicht gefunden!"
    exit 1
fi

INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$CF_ID" \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text)

echo "✔ Invalidierung gestartet: $INVALIDATION_ID"

### ───────────────────────────────────────────
### 7) Terraform ausführen
### ───────────────────────────────────────────
echo "🌍 Starte Terraform…"

cd "$TERRAFORM_DIR"

terraform init -upgrade
terraform apply -auto-approve

echo "✔ Terraform Apply abgeschlossen."

cd "$FRONTEND_DIR"

### ───────────────────────────────────────────
### 8) Ausgabe finaler Deploy-Infos
### ───────────────────────────────────────────
echo ""
echo "🎉 Deployment abgeschlossen!"
echo "─────────────────────────────────────────────"
echo "Frontend Domain: https://$APP_DOMAIN"
echo "CloudFront:      https://$CLOUDFRONT_URL"
echo "API URL:         $API_URL"
echo ""
echo "Cognito:"
echo "  - User Pool ID:        $COGNITO_POOL_ID"
echo "  - Client ID:           $COGNITO_CLIENT_ID"
echo "─────────────────────────────────────────────"

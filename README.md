# Habify

Habify ist eine moderne Habit-Tracking-Anwendung, die komplett serverlos auf AWS betrieben wird. Dieses Repository enthält ein React-Frontend (Vite + TypeScript) sowie Terraform-Code für die Infrastruktur (S3, CloudFront, DynamoDB, Lambda, API Gateway und Cognito-Integration). Die App ermöglicht das Verwalten von Aktivitäten, das Erstellen von Logbuch-Einträgen, die Visualisierung von Statistiken und eine einfache Authentifizierung via Mock-Cognito.

## Projektstruktur

```
.
├── index.html
├── package.json
├── src/
│   ├── api/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   ├── styles/
│   └── main.tsx
├── infra/
│   └── terraform/
│       ├── main.tf
│       └── variables.tf
└── README.md
```

## Voraussetzungen

- Node.js ≥ 18
- npm oder pnpm

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Die App ist anschließend unter http://localhost:5173 erreichbar. Ein Mock-Login erlaubt das Testen sämtlicher Funktionen ohne echte Cognito-Anbindung.

### Build & Preview

```bash
npm run build
npm run preview
```

## Terraform-Infrastruktur

Im Verzeichnis `infra/terraform` befindet sich eine vollständige Terraform-Konfiguration, die folgende Ressourcen erzeugt:

- S3-Bucket + CloudFront-Distribution für das Frontend
- DynamoDB-Tabellen (`activities`, `logs`)
- Lambda-Funktion (Node.js 20) mit API-Gateway-HTTP-API (v2)
- IAM-Rollen und Policies
- CloudWatch-Log-Gruppen

### Deployment

1. Erstelle ein ZIP der Lambda-Funktion und definiere den Pfad via `-var="lambda_package_path=pfad/zur/lambda.zip"`.
2. Führe Terraform-Befehle aus:

```bash
cd infra/terraform
terraform init
terraform apply \
  -var="environment=dev" \
  -var="lambda_package_path=../dist/lambda.zip" \
  -var="app_callback_url=https://example.com/callback" \
  -var="app_logout_url=https://example.com"
```

Nach erfolgreicher Bereitstellung liefern die Outputs `cloudfront_url` die CDN-URL, `api_url` die API-Basis sowie `cognito_user_pool_id` und `cognito_user_pool_client_id` die Authentifizierungs-Ressourcen.

## Tests

Für das Frontend können mit `npm run lint` statische Analysen ausgeführt werden. Unit-Tests können bei Bedarf ergänzt werden.

## Weiterentwicklung

- Austausch des Mock-Auth-Mechanismus durch echte AWS-Cognito-Integration
- Implementierung der REST-Endpunkte in der Lambda-Funktion
- Ergänzung automatisierter Tests (Vitest/React Testing Library)

## Lizenz

MIT

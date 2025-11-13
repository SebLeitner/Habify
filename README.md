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
- Route-53-DNS-Einträge und ACM-Zertifikat für `habify.leitnersoft.com`

> **Hinweis:** Für das automatische DNS-Setup muss die Root-Domain (Standard: `leitnersoft.com`) bereits als öffentliche Hosted Zone in Route 53 existieren.

### Deployment

1. Stelle sicher, dass der Lambda-Code im Verzeichnis `lambda/` liegt. Terraform erstellt beim Deploy automatisch ein ZIP-Paket.
2. Führe Terraform-Befehle aus:

```bash
cd infra/terraform
terraform init
terraform apply \
  -var="environment=dev" \
  -var="root_domain=leitnersoft.com" \
  -var="app_subdomain=habify"
```

Nach erfolgreicher Bereitstellung ist das Frontend automatisch unter `https://habify.leitnersoft.com` erreichbar (bzw. unter der angegebenen Domain). Terraform leitet die Cognito-Callback- und Logout-URLs automatisch aus dieser Domain ab. Die Outputs liefern zusätzlich `cloudfront_url` (CDN-URL), `api_url` (API-Basis), `app_domain` (konfigurierte Domain) sowie `cognito_user_pool_id` und `cognito_user_pool_client_id` für die Authentifizierung.

## Tests

Für das Frontend können mit `npm run lint` statische Analysen ausgeführt werden. Unit-Tests können bei Bedarf ergänzt werden.

## Weiterentwicklung

- Austausch des Mock-Auth-Mechanismus durch echte AWS-Cognito-Integration
- Implementierung der REST-Endpunkte in der Lambda-Funktion
- Ergänzung automatisierter Tests (Vitest/React Testing Library)

## Lizenz

MIT

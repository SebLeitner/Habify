# Entwicklerleitfaden: Cognito-Login

Diese Anleitung beschreibt die Schritte, um die Cognito-Authentifizierung lokal und in der Cloud bereitzustellen.

## 1. Terraform bereitstellen
1. Wechsel ins Terraform-Verzeichnis:
   ```bash
   cd infra/terraform
   terraform init
   ```
2. Infrastruktur ausrollen (Beispiel):
   ```bash
   terraform apply \
     -var="environment=dev" \
     -var="root_domain=leitnersoft.com" \
     -var="app_subdomain=habify"
   ```
3. Wichtige Outputs nach dem Apply:
   - `api_url`: Basis-URL der API (für `VITE_API_URL`).
   - `cognito_user_pool_client_id`: Client-ID des SPA.
   - `cognito_domain`: Hosted-UI-Domain (z. B. `https://habify-dev.auth.eu-central-1.amazoncognito.com`).

## 2. Lokale Umgebungsvariablen setzen
Lege eine `.env.local` im Projektwurzelverzeichnis an und befülle sie mit den Cognito- und API-Daten:

```
VITE_API_URL=<API_URL_AUS_TERRAFORM>
VITE_COGNITO_DOMAIN=<COGNITO_DOMAIN_AUS_TERRAFORM>
VITE_COGNITO_USER_POOL_CLIENT_ID=<CLIENT_ID_AUS_TERRAFORM>
VITE_COGNITO_REDIRECT_URI=http://localhost:5173/login
```

> Hinweis: `VITE_COGNITO_REDIRECT_URI` muss genau der Callback-URL entsprechen, die im User-Pool-Client hinterlegt ist (Terraform setzt standardmäßig `/login`).

## 3. Entwicklungsserver starten
```bash
npm install
npm run dev
```

## 4. Anmelden und Registrieren
1. Rufe `http://localhost:5173/login` auf.
2. Klicke auf „Mit Cognito anmelden“ (oder „Cognito-Konto erstellen“). Du wirst zum Cognito-Hosted-UI weitergeleitet.
3. Nach erfolgreichem Login/Signup leitet Cognito zurück zur App. Der Auth-Code wird automatisch gegen Tokens getauscht und gespeichert.
4. Die Tokens werden lokal vorgehalten und kurz vor Ablauf automatisch via Refresh-Token erneuert (falls verfügbar).

## 5. Benutzerverwaltung
- Test-User können direkt im Cognito-User-Pool (AWS-Konsole) angelegt oder über das Hosted-UI registriert werden.
- Der Logout-Button leitet auf die Cognito-Logout-URL um und löscht alle lokalen Token.

## 6. Fehlerbehebung
- Leere Login-Seite? Prüfe die .env-Werte und ob die Cognito-Domain erreichbar ist.
- „PKCE-State“ Fehler: Logout ausführen und Login erneut starten, damit ein neuer Code-Verifier erzeugt wird.
- Redirect-Loop: Sicherstellen, dass `VITE_COGNITO_REDIRECT_URI` exakt mit der Callback-URL im User-Pool-Client übereinstimmt.

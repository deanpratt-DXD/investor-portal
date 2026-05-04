# Assured Workloads Migration Runbook

This runbook is a generic operating guide for moving a Cloud Run web application into a Google Cloud Assured Workloads controlled environment. It covers the common path for a browser-facing app with Cloud Run, Secret Manager, Cloud Storage, a Google Cloud external Application Load Balancer, Cloud Armor, DNS, and OIDC/Entra sign-in.

It intentionally does not contain organization IDs, billing account IDs, project IDs, public IPs, customer domains, service account emails, secret values, or previous migration outputs. Fill those values in locally as variables while executing the migration.

The implementation path is command-line first and uses `gcloud`. If Terraform is used later, keep the same control points: controlled folder/project placement, regional resources, secret replication, load-balancer-only ingress, managed certificate readiness, DNS cutover, and rollback.

## Safety Rules

- Do not paste, print, commit, or log API keys, client secrets, session secrets, OIDC authorization codes, cookies, refresh tokens, service account keys, or downloaded secret payloads.
- Keep tenant-specific values in shell variables, Secret Manager, GitHub Actions variables/secrets, or a private operator note. Do not commit filled-in migration records unless the repository is approved for those identifiers.
- Prefer Workload Identity Federation for CI/CD. Do not create long-lived service account keys unless an approved exception exists.
- Do not create globally replicated secrets or multi-region storage in an Assured Workloads project unless the compliance authority explicitly approves those locations.
- Verify the final host list. Do not leave stale host rules, retired API subdomains, or temporary staging hosts in Cloud Armor, DNS, SSO redirect URIs, or app allowlists.

## When To Use This Runbook

Use this runbook when an application needs to move into a new Assured Workloads project and keep, stage, or cut over a public URL.

It assumes:

- The app can run on Cloud Run.
- Secrets can be represented as Secret Manager secrets.
- Persistent uploaded/generated objects can live in a regional Cloud Storage bucket.
- The public entry point is an external Application Load Balancer with serverless NEG backend.
- Authentication is handled by the application or an upstream identity provider, not by Cloud Run IAM.

If the application needs private networking, VPC connectors, Cloud SQL, Pub/Sub, Artifact Registry, Cloud Tasks, or other services, add those resources to the preflight and location validation steps before deploying.

## Operator Variable Template

Create a private local shell file such as `.migration.env.local` and source it while operating. Do not commit the filled file.

```bash
# Organization and billing.
export ORG_ID="<organization-id>"
export BILLING_ACCOUNT_ID="<short-billing-account-id>"
export BILLING_ACCOUNT="billingAccounts/${BILLING_ACCOUNT_ID}"

# Assured Workloads.
export AW_LOCATION="<assured-workloads-location>"
export COMPLIANCE_REGIME="<assured-workloads-compliance-regime>"
export AW_DISPLAY_NAME="<workload-display-name>"
export AW_WORKLOAD_NAME=""          # Filled after workload creation.
export CONTROLLED_FOLDER=""         # Filled from workload resources.

# Existing application.
export OLD_PROJECT="<source-project-id>"
export OLD_SERVICE="<source-cloud-run-service>"
export OLD_REGION="<source-cloud-run-region>"
export OLD_BUCKET="<source-bucket-name>"

# New application.
export APP_SLUG="<app-slug>"
export NEW_PROJECT="<target-project-id>"
export NEW_SERVICE="<target-cloud-run-service>"
export REGION="<target-cloud-run-region>"
export NEW_BUCKET="<target-regional-bucket-name>"

# Runtime identity.
export RUNTIME_SA_NAME="${APP_SLUG}-runtime"
export RUNTIME_SA="${RUNTIME_SA_NAME}@${NEW_PROJECT}.iam.gserviceaccount.com"

# Public hosts.
export FINAL_HOST="<final-public-hostname>"
export TEMP_HOST="<temporary-staging-hostname>" # Optional. Leave empty if unused.
export FINAL_URL="https://${FINAL_HOST}"
export OIDC_REDIRECT_URI="${FINAL_URL}/api/auth/callback"

# Load balancer names.
export WAF_POLICY="${APP_SLUG}-waf"
export NEG_NAME="${APP_SLUG}-neg"
export BACKEND_NAME="${APP_SLUG}-backend"
export URL_MAP_NAME="${APP_SLUG}-url-map"
export HTTP_REDIRECT_MAP_NAME="${APP_SLUG}-http-redirect-url-map"
export HTTPS_PROXY_NAME="${APP_SLUG}-https-proxy"
export HTTP_REDIRECT_PROXY_NAME="${APP_SLUG}-http-redirect-proxy"
export CERT_NAME="${APP_SLUG}-managed-cert"
export IPV4_NAME="${APP_SLUG}-ipv4"
export IPV6_NAME="${APP_SLUG}-ipv6"
export HTTPS_FR_NAME="${APP_SLUG}-https-fr"
export HTTPS_IPV6_FR_NAME="${APP_SLUG}-https-ipv6-fr"
export HTTP_FR_NAME="${APP_SLUG}-http-fr"
export HTTP_IPV6_FR_NAME="${APP_SLUG}-http-ipv6-fr"
```

Load the variables when operating:

```bash
set -a
source ./.migration.env.local
set +a
```

## Migration Record Template

Keep this table in a private execution note or fill it only after deciding the repository may contain these identifiers.

| Item | Value |
| --- | --- |
| Operator account | `<email>` |
| Organization | `<organization-id>` |
| Billing account | `<billing-account-id>` |
| Assured Workloads location | `<location>` |
| Compliance regime | `<regime>` |
| Workload name | `<organizations/.../locations/.../workloads/...>` |
| Controlled folder | `<folder-id>` |
| Source project | `<source-project-id>` |
| Target project | `<target-project-id>` |
| Target project number | `<target-project-number>` |
| Cloud Run service | `<service-name>` |
| Cloud Run region | `<region>` |
| Runtime service account | `<service-account-email>` |
| Upload/cache bucket | `<bucket-name>` |
| Final host | `<hostname>` |
| Temporary host | `<hostname-or-none>` |
| Managed certificate | `<certificate-name>` |
| Load balancer IPv4 | `<ipv4-address>` |
| Load balancer IPv6 | `<ipv6-address>` |
| Cloud Armor policy | `<policy-name>` |
| DNS provider | `<provider>` |
| Cutover time | `<timestamp>` |
| Rollback owner | `<name>` |

## Required Permissions

The operator or automation identity needs permissions equivalent to these roles at the appropriate scope. Use least privilege in production; this list is a planning checklist, not a blanket grant request.

- Assured Workloads admin.
- Billing account user or billing project manager for the selected billing account.
- Project creator under the controlled folder or organization.
- Project IAM admin for initial service accounts and bindings.
- Service Usage admin for API enablement.
- Cloud Run admin and service account user.
- Secret Manager admin for setup and Secret Manager secret accessor for runtime.
- Storage admin for bucket creation and object migration.
- Compute load balancer admin for global load balancer, certificates, backend services, URL maps, forwarding rules, and Cloud Armor.
- DNS admin in the DNS provider that hosts the final public domain.
- Identity provider application admin for redirect URI changes.
- GitHub repository admin if updating Actions variables, secrets, or environments.

## High-Level Order Of Operations

1. Confirm compliance target, region, billing, organization, DNS ownership, identity provider access, and rollback owner.
2. Enable the Assured Workloads API in a bootstrap or source project.
3. Create the Assured Workloads workload and capture the controlled folder.
4. Create the target project under the controlled folder and link billing.
5. Enable required APIs in the target project.
6. Create regional storage, regional secrets, and runtime service account.
7. Migrate object data and copy/recreate secret versions without exposing payloads.
8. Grant runtime IAM permissions.
9. Deploy Cloud Run with target environment variables and Secret Manager references.
10. Create Cloud Armor, serverless NEG, backend service, URL maps, managed certificate, proxies, IPs, and forwarding rules.
11. Configure the identity provider redirect URI for the final host.
12. Validate the load balancer before DNS cutover with Host-header or DNS override tests.
13. Update DNS A and AAAA records to the new load balancer.
14. Wait for managed certificate activation.
15. Point HTTP forwarding rules at an HTTPS redirect URL map.
16. Lock Cloud Run ingress to load-balancer-only and disable the default Cloud Run URL.
17. Smoke-test app, auth, API errors, rate limits, WAF, redirects, logs, and storage access.
18. Update repo documentation, deployment variables, and rollback notes.

## Step 1: Preflight Discovery

Confirm the active account and gcloud context.

```bash
gcloud auth list
gcloud config get-value account
gcloud config set disable_prompts true
```

List available organizations and billing accounts.

```bash
gcloud organizations list
gcloud billing accounts list
```

Confirm the source service and source bucket exist.

```bash
gcloud run services describe "$OLD_SERVICE" \
  --project="$OLD_PROJECT" \
  --region="$OLD_REGION" \
  --format='yaml(metadata.name,status.url,spec.template.spec.serviceAccountName,spec.template.spec.containers[0].env)'

gcloud storage buckets describe "gs://${OLD_BUCKET}" \
  --format='yaml(name,location,uniformBucketLevelAccess,publicAccessPrevention,retentionPolicy)'
```

Confirm the final public host and DNS authority before making any load balancer changes.

```bash
dig +short NS "${FINAL_HOST#*.}"
dig +short A "$FINAL_HOST"
dig +short AAAA "$FINAL_HOST"
```

Inventory identity provider redirect URIs and confirm the final callback URL can be added before cutover.

```text
Required callback: ${OIDC_REDIRECT_URI}
```

## Step 2: Enable Assured Workloads API

Assured Workloads operations may require the API enabled in the bootstrap or source project that supplies quota for the operator.

```bash
gcloud services enable assuredworkloads.googleapis.com \
  --project="$OLD_PROJECT" \
  --quiet
```

If a separate bootstrap project is used, set `BOOTSTRAP_PROJECT` and enable the API there instead.

```bash
export BOOTSTRAP_PROJECT="<bootstrap-project-id>"

gcloud services enable assuredworkloads.googleapis.com \
  --project="$BOOTSTRAP_PROJECT" \
  --quiet
```

## Step 3: Create The Assured Workloads Environment

Create the workload. Use the compliance regime and location approved for the application.

```bash
gcloud assured workloads create \
  --organization="$ORG_ID" \
  --location="$AW_LOCATION" \
  --display-name="$AW_DISPLAY_NAME" \
  --compliance-regime="$COMPLIANCE_REGIME" \
  --billing-account="$BILLING_ACCOUNT" \
  --labels=app="$APP_SLUG",environment=production,managed-by=runbook \
  --format='yaml(name,displayName,resources,complianceRegime,createTime,billingAccount,labels)'
```

Capture the workload name from the output.

```bash
export AW_WORKLOAD_NAME="<organizations/.../locations/.../workloads/...>"
```

Describe it and capture the controlled folder resource. Assured Workloads commonly returns a `CONSUMER_FOLDER`; create the application project under that folder.

```bash
gcloud assured workloads describe "$AW_WORKLOAD_NAME" \
  --format='yaml(name,displayName,complianceRegime,resources,labels)'
```

Set `CONTROLLED_FOLDER` to the `resourceId` whose `resourceType` is `CONSUMER_FOLDER`.

```bash
export CONTROLLED_FOLDER="<consumer-folder-id>"
```

## Step 4: Create The Target Project

Create the project under the controlled folder.

```bash
gcloud projects create "$NEW_PROJECT" \
  --folder="$CONTROLLED_FOLDER" \
  --name="$AW_DISPLAY_NAME"
```

Link billing.

```bash
gcloud beta billing projects link "$NEW_PROJECT" \
  --billing-account="$BILLING_ACCOUNT_ID" \
  --quiet
```

Verify the project parent is the controlled folder.

```bash
gcloud projects describe "$NEW_PROJECT" \
  --format='yaml(projectId,projectNumber,name,parent,lifecycleState,createTime)'
```

Record the project number.

```bash
export NEW_PROJECT_NUMBER="$(gcloud projects describe "$NEW_PROJECT" --format='value(projectNumber)')"
```

## Step 5: Enable Target Project APIs

Enable the APIs required by the base portal pattern. Add app-specific APIs before deploy.

```bash
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  compute.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  --project="$NEW_PROJECT" \
  --quiet
```

Verify enablement.

```bash
gcloud services list \
  --enabled \
  --project="$NEW_PROJECT" \
  --filter='config.name:(run.googleapis.com OR secretmanager.googleapis.com OR storage.googleapis.com OR compute.googleapis.com)' \
  --format='table(config.name,state)'
```

## Step 6: Create Regional Storage

Create a regional bucket inside the approved location.

```bash
gcloud storage buckets create "gs://${NEW_BUCKET}" \
  --project="$NEW_PROJECT" \
  --location="$REGION" \
  --uniform-bucket-level-access \
  --public-access-prevention
```

Enable versioning unless the application owner explicitly rejects it.

```bash
gcloud storage buckets update "gs://${NEW_BUCKET}" \
  --versioning
```

Verify location and access controls.

```bash
gcloud storage buckets describe "gs://${NEW_BUCKET}" \
  --format='yaml(name,location,uniformBucketLevelAccess,publicAccessPrevention,versioning)'
```

Migrate objects from the source bucket. Review object count and size first.

```bash
gcloud storage du -s "gs://${OLD_BUCKET}"
gcloud storage ls -r "gs://${OLD_BUCKET}/**" | wc -l

gcloud storage rsync -r \
  "gs://${OLD_BUCKET}" \
  "gs://${NEW_BUCKET}"
```

Verify target object count and spot-check expected prefixes.

```bash
gcloud storage du -s "gs://${NEW_BUCKET}"
gcloud storage ls -r "gs://${NEW_BUCKET}/**" | head
```

## Step 7: Create Regional Secrets

Create every application secret with user-managed regional replication. Do not use automatic replication in the controlled project unless approved.

Define the required secret names for the app.

```bash
SECRETS=(
  SESSION_SECRET
  OIDC_TENANT_ID
  OIDC_CLIENT_ID
  OIDC_CLIENT_SECRET
)

# Add app-specific provider secrets as needed, for example:
# SECRETS+=(NEWS_API_KEY POLYGON_API_KEY ALPHA_VANTAGE_API_KEY)
```

Create missing target secrets.

```bash
for SECRET_NAME in "${SECRETS[@]}"; do
  if gcloud secrets describe "$SECRET_NAME" --project="$NEW_PROJECT" >/dev/null 2>&1; then
    echo "exists: ${SECRET_NAME}"
    continue
  fi

  gcloud secrets create "$SECRET_NAME" \
    --project="$NEW_PROJECT" \
    --replication-policy=user-managed \
    --locations="$REGION"
done
```

Copy secret payloads without printing them. This streams values from the source secret version into the target secret version.

```bash
for SECRET_NAME in "${SECRETS[@]}"; do
  gcloud secrets versions access latest \
    --project="$OLD_PROJECT" \
    --secret="$SECRET_NAME" \
  | gcloud secrets versions add "$SECRET_NAME" \
      --project="$NEW_PROJECT" \
      --data-file=-
done
```

If secret names changed, copy one at a time with explicit source and target names.

```bash
SOURCE_SECRET="<source-secret-name>"
TARGET_SECRET="<target-secret-name>"

gcloud secrets versions access latest \
  --project="$OLD_PROJECT" \
  --secret="$SOURCE_SECRET" \
| gcloud secrets versions add "$TARGET_SECRET" \
    --project="$NEW_PROJECT" \
    --data-file=-
```

Verify replication and version existence without printing payloads.

```bash
for SECRET_NAME in "${SECRETS[@]}"; do
  gcloud secrets describe "$SECRET_NAME" \
    --project="$NEW_PROJECT" \
    --format='yaml(name,replication)'

  gcloud secrets versions list "$SECRET_NAME" \
    --project="$NEW_PROJECT" \
    --format='table(name,state,createTime)'
done
```

## Step 8: Create Runtime Service Account And IAM

Use a dedicated runtime service account instead of the default compute service account.

```bash
gcloud iam service-accounts create "$RUNTIME_SA_NAME" \
  --project="$NEW_PROJECT" \
  --display-name="${APP_SLUG} Cloud Run runtime"
```

Grant runtime access to secrets and bucket objects.

```bash
gcloud projects add-iam-policy-binding "$NEW_PROJECT" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None

gcloud storage buckets add-iam-policy-binding "gs://${NEW_BUCKET}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectAdmin"
```

If the app only reads objects, prefer `roles/storage.objectViewer`. If it writes user uploads or generated files, use the narrowest role that supports the write path.

## Step 9: Deploy Cloud Run

Deploy from source or from an already built image. Use Secret Manager references for sensitive settings.

Example source deployment:

```bash
gcloud run deploy "$NEW_SERVICE" \
  --project="$NEW_PROJECT" \
  --region="$REGION" \
  --source=. \
  --service-account="$RUNTIME_SA" \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,UPLOADS_BUCKET=${NEW_BUCKET},PORTAL_ALLOWED_HOSTS=${FINAL_HOST}${TEMP_HOST:+,${TEMP_HOST}},OIDC_REDIRECT_URI=${OIDC_REDIRECT_URI}" \
  --update-secrets="SESSION_SECRET=SESSION_SECRET:latest,OIDC_TENANT_ID=OIDC_TENANT_ID:latest,OIDC_CLIENT_ID=OIDC_CLIENT_ID:latest,OIDC_CLIENT_SECRET=OIDC_CLIENT_SECRET:latest"
```

If the application has optional provider clients, add those secret references only after the target secrets exist.

```bash
gcloud run services update "$NEW_SERVICE" \
  --project="$NEW_PROJECT" \
  --region="$REGION" \
  --update-secrets="NEWS_API_KEY=NEWS_API_KEY:latest,POLYGON_API_KEY=POLYGON_API_KEY:latest,ALPHA_VANTAGE_API_KEY=ALPHA_VANTAGE_API_KEY:latest"
```

Verify the deployed revision and environment mapping. Secret values will not be printed.

```bash
gcloud run services describe "$NEW_SERVICE" \
  --project="$NEW_PROJECT" \
  --region="$REGION" \
  --format='yaml(status.url,status.latestReadyRevisionName,spec.template.spec.serviceAccountName,spec.template.spec.containers[0].env)'
```

## Step 10: Create Cloud Armor Policy

Create a baseline WAF policy. Tune rules for the app before production traffic.

```bash
gcloud compute security-policies create "$WAF_POLICY" \
  --project="$NEW_PROJECT" \
  --description="${APP_SLUG} baseline WAF and throttling"
```

Add managed WAF rules in preview first if the app has not been tested behind Cloud Armor.

```bash
gcloud compute security-policies rules create 1000 \
  --project="$NEW_PROJECT" \
  --security-policy="$WAF_POLICY" \
  --expression="evaluatePreconfiguredWaf('sqli-v33-stable')" \
  --action=deny-403 \
  --preview

gcloud compute security-policies rules create 1010 \
  --project="$NEW_PROJECT" \
  --security-policy="$WAF_POLICY" \
  --expression="evaluatePreconfiguredWaf('xss-v33-stable')" \
  --action=deny-403 \
  --preview
```

Add an API throttle appropriate for the app. This example uses a single-path API matcher; adjust the threshold and paths to the application.

```bash
gcloud compute security-policies rules create 2000 \
  --project="$NEW_PROJECT" \
  --security-policy="$WAF_POLICY" \
  --expression="request.path.matches('/api/.*')" \
  --action=rate-based-ban \
  --rate-limit-threshold-count="<requests-per-window>" \
  --rate-limit-threshold-interval-sec="<window-seconds>" \
  --ban-duration-sec="<ban-seconds>" \
  --conform-action=allow \
  --exceed-action=deny-429 \
  --enforce-on-key=IP
```

Review rules and remove any host-specific deny rules for retired domains or subdomains before cutover.

```bash
gcloud compute security-policies describe "$WAF_POLICY" \
  --project="$NEW_PROJECT" \
  --format='yaml(name,rules)'
```

## Step 11: Create Load Balancer Backend

Create a serverless NEG for Cloud Run.

```bash
gcloud compute network-endpoint-groups create "$NEG_NAME" \
  --project="$NEW_PROJECT" \
  --region="$REGION" \
  --network-endpoint-type=serverless \
  --cloud-run-service="$NEW_SERVICE"
```

Create and attach the backend service.

```bash
gcloud compute backend-services create "$BACKEND_NAME" \
  --project="$NEW_PROJECT" \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --protocol=HTTP \
  --security-policy="$WAF_POLICY"

gcloud compute backend-services add-backend "$BACKEND_NAME" \
  --project="$NEW_PROJECT" \
  --global \
  --network-endpoint-group="$NEG_NAME" \
  --network-endpoint-group-region="$REGION"
```

Create the app URL map.

```bash
gcloud compute url-maps create "$URL_MAP_NAME" \
  --project="$NEW_PROJECT" \
  --default-service="$BACKEND_NAME"
```

## Step 12: Create Certificates, Proxies, IPs, And Forwarding Rules

Create a managed certificate for the final host. If using a temporary staging host, create a separate cert for it or include both hosts in the cert only if DNS validation is planned for both.

```bash
gcloud compute ssl-certificates create "$CERT_NAME" \
  --project="$NEW_PROJECT" \
  --global \
  --domains="$FINAL_HOST"
```

Create the HTTPS proxy.

```bash
gcloud compute target-https-proxies create "$HTTPS_PROXY_NAME" \
  --project="$NEW_PROJECT" \
  --ssl-certificates="$CERT_NAME" \
  --url-map="$URL_MAP_NAME"
```

Reserve global IPv4 and IPv6 addresses.

```bash
gcloud compute addresses create "$IPV4_NAME" \
  --project="$NEW_PROJECT" \
  --global \
  --ip-version=IPV4

gcloud compute addresses create "$IPV6_NAME" \
  --project="$NEW_PROJECT" \
  --global \
  --ip-version=IPV6
```

Capture the addresses.

```bash
export LB_IPV4="$(gcloud compute addresses describe "$IPV4_NAME" --project="$NEW_PROJECT" --global --format='value(address)')"
export LB_IPV6="$(gcloud compute addresses describe "$IPV6_NAME" --project="$NEW_PROJECT" --global --format='value(address)')"
```

Create HTTPS forwarding rules.

```bash
gcloud compute forwarding-rules create "$HTTPS_FR_NAME" \
  --project="$NEW_PROJECT" \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --address="$LB_IPV4" \
  --ports=443 \
  --target-https-proxy="$HTTPS_PROXY_NAME"

gcloud compute forwarding-rules create "$HTTPS_IPV6_FR_NAME" \
  --project="$NEW_PROJECT" \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --address="$LB_IPV6" \
  --ports=443 \
  --target-https-proxy="$HTTPS_PROXY_NAME"
```

Create an HTTP redirect URL map and proxy.

```bash
gcloud compute url-maps create "$HTTP_REDIRECT_MAP_NAME" \
  --project="$NEW_PROJECT" \
  --global \
  --default-url-redirect='https-redirect=true,redirect-response-code=MOVED_PERMANENTLY_DEFAULT'

gcloud compute target-http-proxies create "$HTTP_REDIRECT_PROXY_NAME" \
  --project="$NEW_PROJECT" \
  --url-map="$HTTP_REDIRECT_MAP_NAME"
```

Create HTTP forwarding rules pointing at the redirect proxy.

```bash
gcloud compute forwarding-rules create "$HTTP_FR_NAME" \
  --project="$NEW_PROJECT" \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --address="$LB_IPV4" \
  --ports=80 \
  --target-http-proxy="$HTTP_REDIRECT_PROXY_NAME"

gcloud compute forwarding-rules create "$HTTP_IPV6_FR_NAME" \
  --project="$NEW_PROJECT" \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --address="$LB_IPV6" \
  --ports=80 \
  --target-http-proxy="$HTTP_REDIRECT_PROXY_NAME"
```

## Step 13: Configure Identity Provider Redirect URI

Before DNS cutover, add the final callback URL to the identity provider application registration.

```text
${OIDC_REDIRECT_URI}
```

If a temporary host is used for pre-cutover HTTPS testing, add its callback URL only for the migration window and remove it after cutover.

Do not configure a separate API hostname unless the application intentionally uses one. For a same-origin portal, browser API routes should stay under the final public host, for example `/api/...`.

## Step 14: Pre-DNS Load Balancer Validation

Validate the backend with a Host-header override or local DNS override before changing authoritative DNS.

```bash
curl -kIs \
  --resolve "${FINAL_HOST}:443:${LB_IPV4}" \
  "https://${FINAL_HOST}/healthz"

curl -kIs \
  --resolve "${FINAL_HOST}:443:${LB_IPV4}" \
  "https://${FINAL_HOST}/login.html"

curl -kIs \
  --resolve "${FINAL_HOST}:443:${LB_IPV4}" \
  "https://${FINAL_HOST}/api/auth-config"
```

Expected pre-DNS results:

- `/healthz` returns `200`.
- Login page returns `200` with no indexing headers.
- Anonymous protected API endpoints return `401` or the app's documented unauthenticated response.
- Unknown API endpoints return JSON `404`.
- The app does not redirect to a retired or temporary hostname.

Check the managed certificate status. It may remain provisioning until DNS points to the load balancer.

```bash
gcloud compute ssl-certificates describe "$CERT_NAME" \
  --project="$NEW_PROJECT" \
  --global \
  --format='yaml(name,managed.status,managed.domainStatus,creationTimestamp,expireTime)'
```

## Step 15: DNS Cutover

Lower TTL before cutover if the DNS provider allows it.

At cutover, update DNS records for the final host:

```text
A     ${FINAL_HOST} -> ${LB_IPV4}
AAAA  ${FINAL_HOST} -> ${LB_IPV6}
```

Verify public resolution from multiple resolvers.

```bash
dig +short A "$FINAL_HOST"
dig +short AAAA "$FINAL_HOST"
dig @8.8.8.8 +short A "$FINAL_HOST"
dig @1.1.1.1 +short A "$FINAL_HOST"
```

Wait for the managed certificate to become active.

```bash
gcloud compute ssl-certificates describe "$CERT_NAME" \
  --project="$NEW_PROJECT" \
  --global \
  --format='value(managed.status)'
```

## Step 16: Lock Down Cloud Run

After the load balancer and certificate are healthy, restrict Cloud Run ingress and disable the default URL.

```bash
gcloud run services update "$NEW_SERVICE" \
  --project="$NEW_PROJECT" \
  --region="$REGION" \
  --ingress=internal-and-cloud-load-balancing \
  --no-default-url
```

Verify lockdown.

```bash
gcloud run services describe "$NEW_SERVICE" \
  --project="$NEW_PROJECT" \
  --region="$REGION" \
  --format='yaml(status.url,spec.template.metadata.annotations,metadata.annotations)'
```

The final public load balancer should still work. The default Cloud Run URL should not be usable as a public bypass.

## Step 17: Smoke Test The Final Host

Run these after DNS and certificate activation.

```bash
curl -sS -o /dev/null -w 'healthz %{http_code}\n' "https://${FINAL_HOST}/healthz"
curl -sS -o /dev/null -w 'login %{http_code}\n' "https://${FINAL_HOST}/login.html"
curl -sS -o /dev/null -w 'auth-config %{http_code}\n' "https://${FINAL_HOST}/api/auth-config"
curl -sS -o /dev/null -w 'api-me %{http_code}\n' "https://${FINAL_HOST}/api/me"
curl -sS -o /dev/null -w 'missing-api %{http_code}\n' "https://${FINAL_HOST}/api/does-not-exist"
curl -sS -o /dev/null -w 'http-redirect %{http_code} %{redirect_url}\n' "http://${FINAL_HOST}/healthz"
```

Expected results for the base same-origin portal pattern:

- `/healthz`: `200`.
- `/login.html`: `200` for unauthenticated users, or `302` to the app if already authenticated.
- `/api/auth-config`: `200` and JSON.
- `/api/me`: `401` when unauthenticated.
- Missing `/api/...`: JSON `404`.
- HTTP: permanent redirect to HTTPS.

Check OIDC sign-in without exposing tokens. The redirect location should contain the final callback URL.

```bash
curl -sS -D - -o /dev/null "https://${FINAL_HOST}/api/auth/login" \
  | grep -i '^location:'
```

Validate security headers.

```bash
curl -sSI "https://${FINAL_HOST}/" \
  | grep -Ei 'strict-transport-security|x-robots-tag|x-content-type-options|referrer-policy|permissions-policy|content-security-policy|x-frame-options'
```

Validate regional storage access through an application workflow, not by making the bucket public.

Validate logs.

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="'"$NEW_SERVICE"'"' \
  --project="$NEW_PROJECT" \
  --limit=20 \
  --format='table(timestamp,severity,textPayload,jsonPayload.message)'
```

## Step 18: Error Handling And Rate Limit Checks

Run a narrow local or staging smoke before production traffic.

Malformed JSON should return a client error and not crash the process.

```bash
curl -sS -X POST "https://${FINAL_HOST}/api/login" \
  -H 'Content-Type: application/json' \
  --data '{not-json' \
  -o /dev/null \
  -w 'malformed-json %{http_code}\n'
```

Oversized bodies should return the documented body-size error.

```bash
python3 - <<'PY' | curl -sS -X POST "https://${FINAL_HOST}/api/login" \
  -H 'Content-Type: application/json' \
  --data-binary @- \
  -o /dev/null \
  -w 'oversized-body %{http_code}\n'
import json
print(json.dumps({'x': 'a' * (1024 * 1024 + 1)}))
PY
```

Application rate limits should return `429` with no-store headers. Adjust path and count to the app's configured limiter.

```bash
for i in $(seq 1 "<request-count>"); do
  curl -sS -o /dev/null -w "%{http_code}\n" "https://${FINAL_HOST}/api/auth-config"
done | sort | uniq -c
```

Cloud Armor rate limits should be tested from a controlled IP and with a threshold that will not affect real users.

## Step 19: GitHub Actions And Deployment Variables

If the repository deploys to Cloud Run through GitHub Actions, configure variables and secrets with placeholders replaced locally.

```bash
gh variable set GCP_PROJECT_ID --repo "<owner>/<repo>" --body "$NEW_PROJECT"
gh variable set GCP_REGION --repo "<owner>/<repo>" --body "$REGION"
gh variable set CLOUD_RUN_SERVICE --repo "<owner>/<repo>" --body "$NEW_SERVICE"
gh variable set PORTAL_UPLOADS_BUCKET --repo "<owner>/<repo>" --body "$NEW_BUCKET"
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo "<owner>/<repo>" --body "<provider-resource-name>"
gh variable set GCP_DEPLOY_SERVICE_ACCOUNT --repo "<owner>/<repo>" --body "<deploy-service-account-email>"
```

Store sensitive values as repository or environment secrets, not variables.

```bash
gh secret set <SECRET_NAME> --repo "<owner>/<repo>"
```

Verify CI deploys into the controlled project and does not recreate resources outside the Assured Workloads folder.

## Step 20: Documentation Updates

Update project documentation with generic values or private placeholders unless the repository is approved for real infrastructure identifiers.

At minimum, update:

- Deployment target project and region.
- Required Secret Manager secret names.
- Runtime environment variables.
- Public host and callback path.
- Cloud Run ingress expectation.
- Storage bucket purpose and retention expectations.
- Operational smoke tests.
- Rollback owner and escalation path.

Do not add retired hostnames, stale API subdomains, old load balancer IPs, or one-off migration observations to reusable docs.

## Rollback Plan

Prepare rollback before DNS cutover.

1. Keep the source project, old load balancer, old certificate, old bucket, and old Cloud Run service unchanged until the migration has passed the agreed soak period.
2. Record the old DNS A and AAAA records in a private operator note.
3. Keep the old identity provider redirect URI until rollback is no longer needed.
4. If production traffic fails after cutover, restore DNS to the old load balancer records and verify the old app.
5. If the new app fails but DNS is healthy, roll Cloud Run back to the previous known-good revision in the target project.
6. If the managed certificate does not activate, verify DNS, certificate domains, target proxy attachment, and forwarding rules before changing more resources.
7. If Cloud Armor blocks legitimate traffic, switch previewed WAF rules back to preview or temporarily detach the policy from the backend service while preserving request logs.

Useful rollback commands:

```bash
gcloud run revisions list \
  --project="$NEW_PROJECT" \
  --region="$REGION" \
  --service="$NEW_SERVICE"

gcloud run services update-traffic "$NEW_SERVICE" \
  --project="$NEW_PROJECT" \
  --region="$REGION" \
  --to-revisions="<revision-name>=100"
```

## Cleanup After Soak

After the migration is accepted:

- Remove temporary DNS records.
- Remove temporary identity provider redirect URIs.
- Remove temporary Cloud Armor allow/preview exceptions.
- Remove temporary hosts from app allowlists.
- Decommission old Cloud Run services only after data retention and rollback requirements are met.
- Archive private migration notes according to compliance policy.
- Confirm no service account keys were created; if any were approved temporarily, rotate and delete them.

## Genericization Checklist

Before committing this runbook or derivative docs, verify:

- No organization IDs.
- No billing account IDs.
- No project IDs from a real tenant.
- No project numbers.
- No public IPv4 or IPv6 addresses from a real migration.
- No real domains, callback URLs, or DNS nameservers.
- No service account emails from a real project.
- No Assured Workloads resource names from a real organization.
- No Secret Manager payloads or screenshots.
- No stale API hostnames or retired subdomains.
- Commands use variables for operator-specific values.
- Any completed migration record is stored in an approved private location.

Suggested scan before commit:

```bash
grep -nE '([0-9]{12,}|billingAccounts/[A-Z0-9-]+|[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com|https://[^ ]+|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)' ASSURED_WORKLOADS_MIGRATION_RUNBOOK.md || true
```

Review every match. Generic placeholders and command examples are fine; real tenant values should be removed or moved to a private operator note.
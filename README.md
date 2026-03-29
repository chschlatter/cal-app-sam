# cal-app-sam

A shared calendar web app for managing bookings at the Zürcherhaus Adelboden. Built with [Hono](https://hono.dev/) on AWS Lambda, server-rendered HTML with [htmx](https://htmx.org/) and [FullCalendar](https://fullcalendar.io/). Events are stored in DynamoDB. Admin users authenticate via Google Sign-In; regular users via username + JWT cookie.

## Architecture

- **Lambda** (`calApi`) — serves all pages and API routes via API Gateway
- **Lambda** (`loginGSI`) — handles Google Sign-In and issues JWT cookies
- **Lambda** (`BackupEventsLockDb`) — daily scheduled backup of events to S3
- **DynamoDB** — stores calendar events
- **S3** — stores event backups

## Prerequisites

- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- AWS credentials configured for `default` (dev) and `prod` profiles

## SSM Parameters

The app reads secrets from AWS SSM Parameter Store. Create the following parameters before deploying (see [`docs/AWS_SSM_params.txt`](docs/AWS_SSM_params.txt) for the parameter paths):

| Parameter | Type | Stack | Description |
|---|---|---|---|
| `/cal-app-sam/GOOGLE_CLIENT_ID` | `SecureString` | prod + dev | Google OAuth client ID for admin Sign-In |
| `/cal-app-sam/JWT_SECRET` | `SecureString` | prod | Secret used to sign JWT cookies |
| `/cal-app-sam/API_TOKEN` | `String` | prod | Token for backup/restore API endpoints |
| `/cal-app-sam/CLAUDE_TOKEN` | `String` | prod | Read-only token for Claude to fetch booking data |
| `/cal-app-sam-dev/JWT_SECRET` | `SecureString` | dev | Secret used to sign JWT cookies |
| `/cal-app-sam-dev/API_TOKEN` | `String` | dev | Token for backup/restore API endpoints |
| `/cal-app-sam-dev/CLAUDE_TOKEN` | `String` | dev | Read-only token for Claude to fetch booking data |

```bash
# GOOGLE_CLIENT_ID (shared between prod and dev)
aws ssm put-parameter \
  --name "/cal-app-sam/GOOGLE_CLIENT_ID" --value "<from Google Console>" \
  --type "SecureString" --region eu-central-2

# JWT_SECRET
TOKEN=$(openssl rand -base64 32) && echo "Token: $TOKEN" && \
aws ssm put-parameter \
  --name "/cal-app-sam/JWT_SECRET" --value "$TOKEN" \
  --type "SecureString" --region eu-central-2 --profile prod

TOKEN=$(openssl rand -base64 32) && echo "Token: $TOKEN" && \
aws ssm put-parameter \
  --name "/cal-app-sam-dev/JWT_SECRET" --value "$TOKEN" \
  --type "SecureString" --region eu-central-2

# API_TOKEN
TOKEN=$(openssl rand -base64 32) && echo "Token: $TOKEN" && \
aws ssm put-parameter \
  --name "/cal-app-sam/API_TOKEN" --value "$TOKEN" \
  --type "String" --region eu-central-2 --profile prod

TOKEN=$(openssl rand -base64 32) && echo "Token: $TOKEN" && \
aws ssm put-parameter \
  --name "/cal-app-sam-dev/API_TOKEN" --value "$TOKEN" \
  --type "String" --region eu-central-2

# CLAUDE_TOKEN
TOKEN=$(openssl rand -base64 32) && echo "Token: $TOKEN" && \
aws ssm put-parameter \
  --name "/cal-app-sam/CLAUDE_TOKEN" --value "$TOKEN" \
  --type "String" --region eu-central-2 --profile prod

TOKEN=$(openssl rand -base64 32) && echo "Token: $TOKEN" && \
aws ssm put-parameter \
  --name "/cal-app-sam-dev/CLAUDE_TOKEN" --value "$TOKEN" \
  --type "String" --region eu-central-2
```

## Deploy

```bash
# Dev
npm run build
npm run deploy

# Production
npm run build-prod
npm run deploy-prod
```

## Custom Domain (API Gateway)

To add a custom domain (e.g. `adelboden.schlatter.net`) in the AWS Console:

1. **Request a certificate** in ACM (us-east-1 for CloudFront, or your region for API Gateway regional)
2. In **API Gateway → Custom domain names**, click *Create*
3. Enter the domain name and select the ACM certificate
4. Set *API mappings*: select the API and stage (`Prod`)
5. Copy the *API Gateway domain name* (e.g. `d-xxxx.execute-api.eu-central-2.amazonaws.com`)
6. In your **DNS provider**, add a CNAME record pointing your domain to the API Gateway domain name

## MCP Endpoint

The `calApi` Lambda exposes an MCP (Model Context Protocol) server at `/mcp/<CLAUDE_TOKEN>`, compatible with Claude.ai custom connectors and Claude Code.

**Tools:**
- `list_bookings` — list all bookings in a date range
- `get_booking` — retrieve a single booking by ID
- `calculate_price` — calculate rental cost with tariff breakdown (CHF)
- `check_availability` — check if a date range is free
- `get_tariffs` — return the full tariff price table (price per night, validity dates)

**Claude.ai custom connector URL:**
```
https://<api-id>.execute-api.eu-central-2.amazonaws.com/Prod/mcp/<CLAUDE_TOKEN>
```

**Test with curl:**

Set `CLAUDE_TOKEN` and `MCP_URL` in `~/.zshenv`:
```bash
export CLAUDE_TOKEN="<token>"
export MCP_URL="https://sam-cal-dev.schlatter.net/mcp/$CLAUDE_TOKEN"
```

```bash
# Initialize
curl -s -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | jq .

# List tools
curl -s -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | jq '.result.tools[].name'

# Call a tool
curl -s -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_bookings","arguments":{"start":"2025-01-01","end":"2025-12-31"}}}' | jq '.result.content[0].text | fromjson'
```

**Test with MCP Inspector:**
```bash
npx @modelcontextprotocol/inspector
```

## Conventions

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

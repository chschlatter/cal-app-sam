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

| Parameter | Description |
|---|---|
| `/cal-app-sam/JWT_SECRET` | Secret used to sign JWT cookies |
| `/cal-app-sam/GOOGLE_CLIENT_ID` | Google OAuth client ID for admin Sign-In |
| `/cal-app-sam/API_TOKEN` | Token for backup/restore API endpoints |
| `/cal-app-sam-dev/JWT_SECRET` | JWT secret for dev stack |
| `/cal-app-sam-dev/API_TOKEN` | API token for dev stack |

```bash
aws ssm put-parameter --name "/cal-app-sam/JWT_SECRET" --value "..." --type SecureString
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

## Conventions

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

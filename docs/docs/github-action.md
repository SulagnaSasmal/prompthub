# GitHub Action

PromptHub includes a local composite GitHub Action for pull request style checks.

## Required secrets

Configure these repository or organization secrets:

| Secret | Purpose |
|--------|---------|
| `PROMPTHUB_API_URL` | Base URL for the deployed PromptHub app |
| `PROMPTHUB_TOKEN` | Bearer token for a PromptHub user that can call style checks |
| `PROMPTHUB_STYLE_PROFILE_ID` | UUID of the approved style profile |

## Example workflow

The repository includes `.github/workflows/prompthub-docs-check.yml`.

It runs on documentation pull requests, collects changed Markdown files, and calls:

```text
POST /api/v1/style-check
```

The action emits GitHub warning or error annotations for flagged terminology. Error-severity flags fail the check by default.

## Local action path

```yaml
- uses: ./.github/actions/prompthub-docs-check
  with:
    api-url: ${{ secrets.PROMPTHUB_API_URL }}
    token: ${{ secrets.PROMPTHUB_TOKEN }}
    style-profile-id: ${{ secrets.PROMPTHUB_STYLE_PROFILE_ID }}
```

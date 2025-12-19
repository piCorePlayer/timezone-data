# Timezone Database Update Workflow - Usage Guide

## Overview

This repository includes an automated workflow that keeps the `timezones.db` file up-to-date with the latest IANA timezone data.

## How to Manually Trigger the Workflow

1. Go to the repository on GitHub
2. Click on the "Actions" tab
3. Select "Update Timezone Database" from the workflows list
4. Click "Run workflow" button
5. Select the branch (typically `main`)
6. Click the green "Run workflow" button

## Automatic Updates

The workflow runs automatically every Monday at 00:00 UTC (midnight). No manual intervention is required.

## What the Workflow Does

1. **Checks out gh-pages branch** - Where the timezones.db file is stored
2. **Downloads latest timezone data** - From https://data.iana.org/time-zones/releases/
3. **Version check** - Compares downloaded version with existing file; skips update if unchanged
4. **Generates timezones.db** - Processes the data using the update_timezones.py script (only if version changed)
5. **Validates the file** - Ensures it has proper format and sufficient entries
6. **Commits changes** - Only if the file has been updated
7. **Cleans up** - Removes temporary files

## Validation Checks

The workflow validates that the generated file:
- Exists and has content
- Contains the expected header with tzdata version
- Has at least 100 timezone entries (sanity check)
- Follows the correct format: `Timezone/Name TZ_STRING`

## Troubleshooting

### Workflow Failed

If the workflow fails, check the Actions tab for error logs:
- Download errors: IANA website may be temporarily unavailable
- Extraction errors: Downloaded file may be corrupted
- Validation errors: Generated file doesn't meet requirements

### File Not Updated

If you run the workflow but the file doesn't change:
- The timezone data version hasn't been updated since the last run
- Check the workflow run logs - should show "Timezone data is already up to date (version XXXX). No update needed."
- This is expected behavior and prevents unnecessary commits

### Local Testing

To test the script locally:
```bash
python3 update_timezones.py
```

Requirements:
- Python 3.x
- wget
- tzdata package (for `zic` tool)

## File Locations

- Script: `update_timezones.py` (main branch)
- Workflow: `.github/workflows/update-timezones.yml` (main branch)
- Output: `timezones.db` (gh-pages branch)

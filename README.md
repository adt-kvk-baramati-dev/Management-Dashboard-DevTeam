# KVK-Digital

## Import Complaints From Excel

Use this script to import AI-generated complaint Excel data into MongoDB while preserving the existing complaint registration format.

### Command

```bash
pnpm run seed:complaints:excel -- --file ./data/complaints.xlsx --count 500 --image-rate 0.4 --images-dir ./data/complaint-images
```

### What the script does

- Reads rows from Excel (`xlsx`)
- Maps data to the same complaint structure used by employee complaint registration
- Matches farmer by `prn`/`prn_no` or phone; if no match, randomly assigns an existing farmer
- Copies farmer location fields (`state`, `district`, `taluka`, `village`) into complaint
- Generates domain-specific complaint descriptions
- Assigns weighted status distribution (`Pending` > `In Progress` > `Solved`)
- Attaches images for roughly `30%-50%` of records when image sources are available (S3 upload when configured, otherwise local `public/seed-uploads/...` URLs)
- Inserts complaints in batches with error handling and JSON summary output

### Required environment variables

- `MONGODB_URI`

### Optional environment variables

- `MONGODB_DB_NAME` (default: `kvk_portal`)
- `BATCH_SIZE` (default: `200`)
- `IMAGE_ATTACH_RATE` (default: `0.4`, range `0.3-0.5`)
- `SEED_IMAGE_DIR` (fallback folder for image uploads)
- `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_S3_PREFIX`, `AWS_S3_PUBLIC_BASE_URL` (for uploading local images to S3 and storing public URLs)

### Notes

- Insert range is constrained to `200-1000` complaints per run.
- Run with `--dry-run` to validate and preview summary without DB insertion.
- Output includes inserted/failed counts, status-wise totals, and image attachment totals.

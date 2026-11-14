ALTER TABLE build_jobs ADD COLUMN project_snapshot TEXT;
ALTER TABLE build_jobs ADD COLUMN workflow_run_id TEXT;
ALTER TABLE build_jobs ADD COLUMN workflow_url TEXT;
ALTER TABLE build_jobs ADD COLUMN artifact_name TEXT;

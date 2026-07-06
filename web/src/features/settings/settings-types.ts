export type Settings = {
  db_path: string
  backup_dir: string
  migrations_dir: string
  service_version: string
  migration_version: string
}

export type UpdateSettingsInput = {
  backup_dir: string
}


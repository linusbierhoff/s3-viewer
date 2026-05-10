import { invoke } from "@tauri-apps/api/core";
import type { BucketInfo, S3Item, StoredCredentials } from "@/lib/types";

export const s3 = {
  saveCredentials: (creds: StoredCredentials) =>
    invoke<void>("save_credentials", {
      accessKey: creds.access_key,
      secretKey: creds.secret_key,
      region: creds.region,
      endpoint: creds.endpoint ?? null,
    }),

  getCredentials: () => invoke<StoredCredentials | null>("get_credentials"),

  loadCredentials: () => invoke<boolean>("load_credentials"),

  listBuckets: () => invoke<BucketInfo[]>("list_buckets"),

  listObjects: (bucket: string, prefix: string) =>
    invoke<S3Item[]>("list_objects", { bucket, prefix }),

  downloadFile: (bucket: string, key: string, savePath: string) =>
    invoke<void>("download_file", { bucket, key, savePath }),
};

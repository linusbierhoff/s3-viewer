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

  uploadFile: (bucket: string, key: string, localPath: string) =>
    invoke<void>("upload_file", { bucket, key, localPath }),

  uploadFolder: (bucket: string, prefix: string, localDir: string) =>
    invoke<number>("upload_folder", { bucket, prefix, localDir }),

  isDirectory: (path: string) =>
    invoke<boolean>("is_directory", { path }),

  objectExists: (bucket: string, key: string) =>
    invoke<boolean>("object_exists", { bucket, key }),

  deleteObject: (bucket: string, key: string) =>
    invoke<void>("delete_object", { bucket, key }),

  deleteFolder: (bucket: string, prefix: string) =>
    invoke<void>("delete_folder", { bucket, prefix }),

  renameObject: (bucket: string, oldKey: string, newKey: string) =>
    invoke<void>("rename_object", { bucket, oldKey, newKey }),

  renameFolder: (bucket: string, oldPrefix: string, newPrefix: string) =>
    invoke<void>("rename_folder", { bucket, oldPrefix, newPrefix }),
};

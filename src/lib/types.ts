export interface StoredCredentials {
  access_key: string;
  secret_key: string;
  region: string;
  endpoint?: string;
}

export interface BucketInfo {
  name: string;
}

export interface S3Item {
  key: string;
  name: string;
  is_folder: boolean;
  size?: number;
  last_modified?: string;
}

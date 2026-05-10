use aws_config::BehaviorVersion;
use aws_credential_types::Credentials;
use aws_sdk_s3::config::Region;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredCredentials {
    pub access_key: String,
    pub secret_key: String,
    pub region: String,
    pub endpoint: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BucketInfo {
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct S3Item {
    pub key: String,
    pub name: String,
    pub is_folder: bool,
    pub size: Option<i64>,
    pub last_modified: Option<String>,
}

pub struct AppState {
    pub client: Mutex<Option<aws_sdk_s3::Client>>,
}

fn credentials_path(app: &AppHandle) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .expect("app data dir")
        .join("credentials.json")
}

async fn build_client(creds: &StoredCredentials) -> aws_sdk_s3::Client {
    let provider = Credentials::new(
        &creds.access_key,
        &creds.secret_key,
        None,
        None,
        "s3-viewer",
    );
    let config = aws_config::defaults(BehaviorVersion::latest())
        .credentials_provider(provider)
        .region(Region::new(creds.region.clone()))
        .load()
        .await;

    let mut builder = aws_sdk_s3::config::Builder::from(&config);
    if let Some(ep) = &creds.endpoint {
        builder = builder.endpoint_url(ep).force_path_style(true);
    }
    aws_sdk_s3::Client::from_conf(builder.build())
}

#[tauri::command]
pub async fn save_credentials(
    app: AppHandle,
    state: State<'_, AppState>,
    access_key: String,
    secret_key: String,
    region: String,
    endpoint: Option<String>,
) -> Result<(), String> {
    let creds = StoredCredentials { access_key, secret_key, region, endpoint };
    let client = build_client(&creds).await;
    *state.client.lock().unwrap() = Some(client);

    let path = credentials_path(&app);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string(&creds).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_credentials(app: AppHandle) -> Option<StoredCredentials> {
    let path = credentials_path(&app);
    let data = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

#[tauri::command]
pub async fn load_credentials(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let path = credentials_path(&app);
    let Ok(data) = std::fs::read_to_string(path) else { return Ok(false) };
    let Ok(creds) = serde_json::from_str::<StoredCredentials>(&data) else { return Ok(false) };
    let client = build_client(&creds).await;
    *state.client.lock().unwrap() = Some(client);
    Ok(true)
}

#[tauri::command]
pub async fn list_buckets(state: State<'_, AppState>) -> Result<Vec<BucketInfo>, String> {
    let client = state.client.lock().unwrap().clone().ok_or("Not configured")?;
    let resp = client.list_buckets().send().await.map_err(|e| e.to_string())?;
    let buckets = resp
        .buckets()
        .iter()
        .filter_map(|b| b.name().map(|n| BucketInfo { name: n.to_string() }))
        .collect();
    Ok(buckets)
}

#[tauri::command]
pub async fn list_objects(
    state: State<'_, AppState>,
    bucket: String,
    prefix: String,
) -> Result<Vec<S3Item>, String> {
    let client = state.client.lock().unwrap().clone().ok_or("Not configured")?;
    let mut items: Vec<S3Item> = Vec::new();

    let resp = client
        .list_objects_v2()
        .bucket(&bucket)
        .prefix(&prefix)
        .delimiter("/")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    for cp in resp.common_prefixes() {
        if let Some(p) = cp.prefix() {
            let name = p.trim_end_matches('/').rsplit('/').next().unwrap_or(p).to_string();
            items.push(S3Item {
                key: p.to_string(),
                name,
                is_folder: true,
                size: None,
                last_modified: None,
            });
        }
    }

    for obj in resp.contents() {
        let key = obj.key().unwrap_or("").to_string();
        if key == prefix {
            continue;
        }
        let name = key.rsplit('/').next().unwrap_or(&key).to_string();
        let last_modified = obj
            .last_modified()
            .map(|t| (t.secs() * 1000).to_string());
        items.push(S3Item {
            key: key.clone(),
            name,
            is_folder: false,
            size: obj.size(),
            last_modified,
        });
    }

    Ok(items)
}

#[tauri::command]
pub async fn download_file(
    state: State<'_, AppState>,
    bucket: String,
    key: String,
    save_path: String,
) -> Result<(), String> {
    let client = state.client.lock().unwrap().clone().ok_or("Not configured")?;
    let resp = client
        .get_object()
        .bucket(&bucket)
        .key(&key)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data = resp.body.collect().await.map_err(|e| e.to_string())?.into_bytes();
    tokio::fs::write(&save_path, &data).await.map_err(|e| e.to_string())?;
    Ok(())
}

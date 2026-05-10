mod s3;

use s3::AppState;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState { client: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![
            s3::save_credentials,
            s3::get_credentials,
            s3::load_credentials,
            s3::list_buckets,
            s3::list_objects,
            s3::download_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

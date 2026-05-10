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
            s3::upload_file,
            s3::upload_folder,
            s3::is_directory,
            s3::object_exists,
            s3::delete_object,
            s3::delete_folder,
            s3::rename_object,
            s3::rename_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

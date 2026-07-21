import zipfile
import os
import shutil

tutorial_dir = r"D:\Eval PM\Monitoring logbook\MP\MP\tutorial"
public_images_dir = r"D:\Eval PM\Monitoring logbook\MP\MP\sap-input-app\public\images"

# Map of docx filename keywords to target tcode subfolders
docx_mapping = {
    "zesthlp16pa": "zesthlp16pa",
    "TUTORIAL BUAT WO PM": "iw31",
    "CARA TECO": "iw32",
    "CARA GI MM": "migo",
    "ZESTHLC003PA": "zesthlc003pa"
}

def extract_images_from_docx(docx_name, target_folder):
    docx_path = os.path.join(tutorial_dir, docx_name)
    if not os.path.exists(docx_path):
        print(f"File not found: {docx_path}")
        return
        
    dest_dir = os.path.join(public_images_dir, target_folder)
    os.makedirs(dest_dir, exist_ok=True)
    
    print(f"Extracting images from {docx_name} to {dest_dir}...")
    
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            media_files = [f for f in z.namelist() if f.startswith('word/media/')]
            
            # Sort files to maintain chronological order in the document
            # Usually named word/media/image1.png, word/media/image2.png etc.
            # Simple sorting might not be perfect for numbers like image10 vs image2,
            # so let's parse the numbers for sorting
            def get_image_number(filename):
                base = os.path.basename(filename)
                name_part = os.path.splitext(base)[0]
                num_str = ''.join(c for c in name_part if c.isdigit())
                return int(num_str) if num_str else 0
                
            media_files.sort(key=get_image_number)
            
            for idx, media_file in enumerate(media_files, start=1):
                ext = os.path.splitext(media_file)[1]
                new_filename = f"step_{idx}{ext}"
                dest_path = os.path.join(dest_dir, new_filename)
                
                with z.open(media_file) as source, open(dest_path, 'wb') as target:
                    shutil.copyfileobj(source, target)
                    
                print(f"  Extracted: {media_file} -> {new_filename}")
                
        print(f"Successfully extracted {len(media_files)} images from {docx_name}.\n")
    except Exception as e:
        print(f"Error extracting {docx_name}: {str(e)}\n")

if __name__ == "__main__":
    # Create public/images directory if not exists
    os.makedirs(public_images_dir, exist_ok=True)
    
    # List files in tutorial folder
    if not os.path.exists(tutorial_dir):
        print(f"Tutorial folder not found at: {tutorial_dir}")
        exit(1)
        
    tutorial_files = os.listdir(tutorial_dir)
    
    for docx_file in tutorial_files:
        if docx_file.endswith('.docx'):
            # Match files based on keywords
            matched = False
            for keyword, target_folder in docx_mapping.items():
                if keyword in docx_file:
                    extract_images_from_docx(docx_file, target_folder)
                    matched = True
                    break
            if not matched:
                # If no keyword matched, use a cleaned version of the filename
                folder_name = os.path.splitext(docx_file)[0].replace(" ", "_").lower()
                extract_images_from_docx(docx_file, folder_name)

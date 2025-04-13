import os
import shutil

# Path to the file
file_path = '.pio/libdeps/adafruit_matrixportal_esp32s3/Adafruit Protomatter/library.properties'
# Path to the directory to remove
directory_to_remove = '.pio/libdeps/adafruit_matrixportal_esp32s3/Adafruit TinyUSB Library'

# Check if the file exists
if not os.path.isfile(file_path):
  print(f"The file {file_path} does not exist.")
else:
  # Read the file content
  with open(file_path, 'r') as file:
    lines = file.readlines()

  # Modify the specific line
  with open(file_path, 'w') as file:
    for line in lines:
      if line.startswith('depends='):
        # Remove "Adafruit TinyUSB Library" from the line
        line = line.replace('Adafruit TinyUSB Library', '').replace(', ,', ',').strip()
        if line.endswith(','):
          line = line[:-1]
        file.write(line + '\n')
      else:
        file.write(line)

  print(f"Modification made in the file {file_path}.")

# Check if the directory exists before attempting to remove it
if os.path.exists(directory_to_remove):
  shutil.rmtree(directory_to_remove)
  print(f"The directory {directory_to_remove} has been removed.")
else:
  print(f"The directory {directory_to_remove} does not exist.")

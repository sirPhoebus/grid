from PIL import Image
import os

# Config
input_image_path = "grid.jpeg"  # Replace with your actual file name/path
output_folder = "split_images"
os.makedirs(output_folder, exist_ok=True)

# How many pixels to crop inward from each tile edge to remove gutters/dividers
# Start with 4 for your image (adjust if dividers look thicker/thinner in other grids)
gutter = 4

# Open the image
img = Image.open(input_image_path)
width, height = img.size
print(f"Original size: {width}x{height}")

# Calculate base tile size
tile_width = width // 3
tile_height = height // 3

print(f"Base tile size: {tile_width}x{tile_height}")

# Split into 3x3, cropping inward to remove dividers
tile_number = 0
for row in range(3):
    for col in range(3):
        left = col * tile_width + gutter
        upper = row * tile_height + gutter
        right = (col + 1) * tile_width - gutter
        lower = (row + 1) * tile_height - gutter
        
        # For edge tiles, reduce gutter on outer sides to avoid negative coords or zero width
        if col == 0:
            left = 0
        if col == 2:
            right = width
        if row == 0:
            upper = 0
        if row == 2:
            lower = height
        
        tile = img.crop((left, upper, right, lower))
        tile_path = os.path.join(output_folder, f"tile_{tile_number:02d}.jpg")
        tile.save(tile_path)
        print(f"Saved {tile_path} ({tile.width}x{tile.height})")
        tile_number += 1

print("Done! 9 clean images saved in", output_folder)
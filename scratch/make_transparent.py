import os
from PIL import Image

ico_path = r"c:\Users\Irvin\Desktop\Desenvolvimento\SEMOB\FINAIS-DE-LINHA-main\public\assets\Feira Logo.ico"
png_path = r"c:\Users\Irvin\Desktop\Desenvolvimento\SEMOB\FINAIS-DE-LINHA-main\public\assets\Feira Logo.png"

if os.path.exists(ico_path):
    try:
        img = Image.open(ico_path)
        # Convert to RGBA
        rgba = img.convert("RGBA")
        datas = rgba.getdata()
        
        newData = []
        for item in datas:
            # If the pixel is pure black (0, 0, 0) or very close to black, make it transparent
            # Let's check if it is pure black
            if item[0] < 15 and item[1] < 15 and item[2] < 15:
                newData.append((255, 255, 255, 0))  # Transparent
            else:
                newData.append(item)
                
        rgba.putdata(newData)
        # Save as PNG
        rgba.save(png_path, "PNG")
        print("Success: Converted ICO to transparent PNG!")
    except Exception as e:
        print(f"Error: {e}")
else:
    print("Error: ICO file not found.")

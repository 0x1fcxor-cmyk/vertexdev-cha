# App Icons

This directory should contain application icons for the Windows desktop build.

## Required Files

- `icon.png` - 512x512 PNG icon for Linux/Mac
- `icon.ico` - Windows ICO icon (multiple sizes: 16x16, 32x32, 48x48, 256x256)

## How to Create Icons

1. Create a 512x512 PNG image with your app logo
2. Save as `icon.png`
3. Convert to ICO format using an online tool or ImageMagick:
   ```bash
   magick icon.png -define icon:auto-resize=256,48,32,16 icon.ico
   ```
4. Save as `icon.ico`

## Online Tools

- https://icoconvert.com/ - Convert PNG to ICO
- https://www.favicon-generator.org/ - Generate multiple icon sizes

## Note

If you don't have custom icons, the build will use Electron's default icon.

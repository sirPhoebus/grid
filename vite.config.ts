import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/kling-api': {
          target: 'https://api.klingai.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/kling-api/, ''),
          secure: false, // In case of SSL issues, though usually true is fine
        },
        '/sd-api': {
          target: 'http://127.0.0.1:7860',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/sd-api/, ''),
        },
        '/comfy-api': {
          target: 'http://127.0.0.1:8188',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/comfy-api/, ''),
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.setHeader('Origin', 'http://127.0.0.1:8188');
            });
            proxy.on('proxyReqWs', (proxyReq, _req, _socket, _options, _head) => {
              proxyReq.setHeader('Origin', 'http://127.0.0.1:8188');
            });
          },
        }
      }
    },
    plugins: [
      react(),
      {
        name: 'save-sliced-images',
        configureServer(server) {
          // Middleware to list media folders
          server.middlewares.use('/list-media', (req, res, next) => {
            if (req.method === 'GET') {
              const mediaDir = path.resolve(process.cwd(), 'media');
              const result: any = { sliced_img: [], upscale: [] };

              const types = ['sliced_img', 'upscale', 'individual_upscale'];
              types.forEach(type => {
                const typeDir = path.join(mediaDir, type);
                if (fs.existsSync(typeDir)) {
                  try {
                    const entries = fs.readdirSync(typeDir, { withFileTypes: true });

                    // Get subdirectories
                    const folders = entries
                      .filter(dirent => dirent.isDirectory())
                      .map(dirent => {
                        const folderPath = path.join(typeDir, dirent.name);
                        const files = fs.readdirSync(folderPath)
                          .filter(file => /\.(png|jpg|jpeg|mp4|webm)$/i.test(file));
                        return {
                          name: dirent.name,
                          files: files.map(f => `/media/${type}/${dirent.name}/${f}`)
                        };
                      });

                    // Get root files
                    const rootFiles = entries
                      .filter(dirent => !dirent.isDirectory() && /\.(png|jpg|jpeg|mp4|webm)$/i.test(dirent.name))
                      .map(dirent => `/media/${type}/${dirent.name}`);

                    if (rootFiles.length > 0) {
                      folders.unshift({
                        name: 'Miscellaneous',
                        files: rootFiles
                      });
                    }

                    // Sort folders by creation time or name (desc) to show newest first?
                    // readdirSync doesn't give time, would need stat. Let's sort by name desc as it contains timestamp.
                    folders.sort((a, b) => b.name.localeCompare(a.name));
                    result[type] = folders;
                  } catch (e) {
                    console.error("Error reading dir", e);
                  }
                }
              });

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } else {
              next();
            }
          });

          // Middleware to serve static media files
          server.middlewares.use('/media', (req, res, next) => {
            const url = req.url || '';
            // Security check: ensure no traversal
            if (url.includes('..')) {
              res.statusCode = 403;
              res.end('Forbidden');
              return;
            }
            const filePath = path.join(process.cwd(), 'media', url);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const ext = path.extname(filePath).toLowerCase();
              const mime: Record<string, string> = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm'
              };
              res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
              fs.createReadStream(filePath).pipe(res);
            } else {
              next();
            }
          });

          // Middleware to delete media folders
          server.middlewares.use('/delete-media', (req, res, next) => {
            if (req.method === 'POST') {
              const chunks: Uint8Array[] = [];
              req.on('data', chunk => chunks.push(chunk));
              req.on('end', () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { type, name } = body;

                  if (!type || !name) {
                    res.statusCode = 400;
                    res.end('Missing params');
                    return;
                  }

                  const safeName = name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                  const safeType = type === 'sliced_img' ? 'sliced_img' : 'upscale';

                  const targetDir = path.resolve(process.cwd(), 'media', safeType, safeName);

                  // Safety check
                  if (!targetDir.startsWith(path.join(process.cwd(), 'media'))) {
                    res.statusCode = 403;
                    res.end('Invalid path');
                    return;
                  }

                  if (fs.existsSync(targetDir)) {
                    fs.rmSync(targetDir, { recursive: true, force: true });
                    res.statusCode = 200;
                    res.end('deleted');
                  } else {
                    res.statusCode = 404;
                    res.end('Not found');
                  }
                } catch (e) {
                  console.error("Delete error", e);
                  res.statusCode = 500;
                  res.end('error');
                }
              });
            } else {
              next();
            }
          });

          server.middlewares.use('/save-slice', (req, res, next) => {
            if (req.method === 'POST') {
              // console.log("Received /save-slice request");
              const chunks: Uint8Array[] = [];
              req.on('data', chunk => chunks.push(chunk));
              req.on('end', () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { image, filename, folder, targetDir } = body;

                  // Use provided folder or default
                  const safeFolder = folder ? folder.replace(/[^a-zA-Z0-9_\-\.]/g, '_') : 'default';

                  // Default to sliced_img if no targetDir, or use provided targetDir (relative to media/)
                  // Security: Ensure targetDir doesn't contain traversing characters like ..
                  const safeTargetDir = (targetDir || 'sliced_img').replace(/(\.\.(\/|\\|$))+/g, '');

                  const dir = path.resolve(process.cwd(), 'media', safeTargetDir, safeFolder);

                  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
                  fs.writeFileSync(path.join(dir, filename), base64Data, 'base64');
                  // console.log(`Saved ${safeTargetDir}/${safeFolder}/${filename}`);
                  res.statusCode = 200;
                  res.end('saved');
                } catch (e) {
                  console.error('Failed to save slice', e);
                  res.statusCode = 500;
                  res.end('error');
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

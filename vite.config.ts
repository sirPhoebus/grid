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

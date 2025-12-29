import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { execSync } from 'child_process';

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

              const types = ['sliced_img', 'upscale', 'individual_upscale', 'turbowan', 'stitched', 'z_image', 'inverse'];
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
                          .filter(file => /\.(png|jpg|jpeg|mp4|webm)$/i.test(file))
                          .map(f => {
                            const relativePath = `/media/${type}/${dirent.name}/${f}`;
                            const fullPath = path.join(folderPath, f);
                            let duration = undefined;
                            let time = undefined;
                            try {
                              const stats = fs.statSync(fullPath);
                              time = stats.mtime.toISOString();
                            } catch (e) { }

                            if (type === 'stitched' && /\.(mp4|webm)$/i.test(f)) {
                              try {
                                const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullPath}"`;
                                const out = execSync(cmd).toString().trim();
                                if (out) duration = parseFloat(out).toFixed(1) + 's';
                              } catch (e) { }
                            }
                            return { url: relativePath, duration, time };
                          });
                        return {
                          name: dirent.name,
                          files
                        };
                      });

                    // Get root files
                    const rootFiles = entries
                      .filter(dirent => !dirent.isDirectory() && /\.(png|jpg|jpeg|mp4|webm)$/i.test(dirent.name))
                      .map(dirent => {
                        const relativePath = `/media/${type}/${dirent.name}`;
                        const fullPath = path.join(typeDir, dirent.name);
                        let duration = undefined;
                        let time = undefined;
                        try {
                          const stats = fs.statSync(fullPath);
                          time = stats.mtime.toISOString();
                        } catch (e) { }

                        if (type === 'stitched' && /\.(mp4|webm)$/i.test(dirent.name)) {
                          try {
                            const cmd = `ffprobe -v error -show_entries format=duration -of default=nokey=1:nokey=1:noprint_wrappers=1 "${fullPath}"`;
                            const out = execSync(cmd).toString().trim();
                            if (out) duration = parseFloat(out).toFixed(1) + 's';
                          } catch (e) { }
                        }
                        return { url: relativePath, duration, time };
                      });

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
              res.setHeader('Access-Control-Allow-Origin', '*'); // Allow cross-origin for ComfyUI if needed
              fs.createReadStream(filePath).pipe(res);
            } else {
              next();
            }
          });

          // Middleware to extract last frame from video
          server.middlewares.use('/extract-last-frame', (req, res, next) => {
            if (req.method === 'POST') {
              const chunks: Uint8Array[] = [];
              req.on('data', chunk => chunks.push(chunk));
              req.on('end', async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { videoPath } = body; // Path relative to media/
                  if (!videoPath) {
                    res.statusCode = 400;
                    res.end('Missing videoPath');
                    return;
                  }

                  const fullVideoPath = path.join(process.cwd(), 'media', videoPath);
                  const outputPath = path.join(process.cwd(), 'media', 'temp_last_frame.png');

                  const { exec } = await import('child_process');
                  const { promisify } = await import('util');
                  const execPromise = promisify(exec);

                  // ffmpeg command to extract last frame
                  // 1. Get exact frame count using ffprobe
                  const { stdout: frameCountStr } = await execPromise(`ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of default=nokey=1:noprint_wrappers=1 "${fullVideoPath}"`);
                  const frameCount = parseInt(frameCountStr.trim());

                  // 2. Extract that specific frame
                  // n is 0-indexed, so we want frameCount - 1
                  await execPromise(`ffmpeg -i "${fullVideoPath}" -vf "select=eq(n\\,${frameCount - 1})" -vframes 1 -update 1 -q:v 2 "${outputPath}" -y`);

                  const imageData = fs.readFileSync(outputPath);
                  const base64 = `data:image/png;base64,${imageData.toString('base64')}`;

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ base64 }));
                } catch (e) {
                  console.error("Extraction error", e);
                  res.statusCode = 500;
                  res.end('error');
                }
              });
            } else {
              next();
            }
          });

          // Middleware to stitch videos
          server.middlewares.use('/stitch-videos', (req, res, next) => {
            if (req.method === 'POST') {
              const chunks: Uint8Array[] = [];
              req.on('data', chunk => chunks.push(chunk));
              req.on('end', async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { videos, outputName } = body; // Array of paths relative to media/
                  if (!videos || !Array.isArray(videos) || videos.length === 0) {
                    res.statusCode = 400;
                    res.end('Missing videos');
                    return;
                  }

                  const timestamp = Date.now();
                  const listFilePath = path.join(process.cwd(), 'media', `list_${timestamp}.txt`);
                  const content = videos.map(v => `file '${path.join(process.cwd(), 'media', v).replace(/\\/g, '/')}'`).join('\n');
                  fs.writeFileSync(listFilePath, content);

                  const safeOutputName = (outputName || `stitched_${timestamp}.mp4`).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                  const outputDir = path.join(process.cwd(), 'media', 'stitched');
                  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
                  const finalOutputPath = path.join(outputDir, safeOutputName);

                  const { exec } = await import('child_process');
                  const { promisify } = await import('util');
                  const execPromise = promisify(exec);

                  // ffmpeg concat demuxer
                  await execPromise(`ffmpeg -f concat -safe 0 -i "${listFilePath}" -c copy "${finalOutputPath}" -y`);

                  // Cleanup
                  fs.unlinkSync(listFilePath);

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ url: `/media/stitched/${safeOutputName}` }));
                } catch (e) {
                  console.error("Stitch error", e);
                  res.statusCode = 500;
                  res.end('error');
                }
              });
            } else {
              next();
            }
          });

          // Middleware to reverse video
          server.middlewares.use('/reverse-video', (req, res, next) => {
            if (req.method === 'POST') {
              const chunks: Uint8Array[] = [];
              req.on('data', chunk => chunks.push(chunk));
              req.on('end', async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { videoPath } = body; // Path relative to media/
                  if (!videoPath) {
                    res.statusCode = 400;
                    res.end('Missing videoPath');
                    return;
                  }

                  const fullVideoPath = path.join(process.cwd(), 'media', videoPath);
                  const timestamp = Date.now();
                  const filename = `reversed_${timestamp}.mp4`;
                  const outputDir = path.join(process.cwd(), 'media', 'inverse');
                  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
                  const outputPath = path.join(outputDir, filename);

                  const { exec } = await import('child_process');
                  const { promisify } = await import('util');
                  const execPromise = promisify(exec);

                  // ffmpeg command to reverse video and audio
                  // -vf reverse (video reverse)
                  // -af areverse (audio reverse)
                  await execPromise(`ffmpeg -i "${fullVideoPath}" -vf reverse -af areverse "${outputPath}" -y`);

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ url: `/media/inverse/${filename}` }));
                } catch (e) {
                  console.error("Reverse error", e);
                  res.statusCode = 500;
                  res.end('error');
                }
              });
            } else {
              next();
            }
          });

          // Middleware to save video from ComfyUI URL or external URL
          server.middlewares.use('/save-video', (req, res, next) => {
            if (req.method === 'POST') {
              const chunks: Uint8Array[] = [];
              req.on('data', chunk => chunks.push(chunk));
              req.on('end', async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { url, folder, filename } = body;
                  if (!url) {
                    res.statusCode = 400;
                    res.end('Missing url');
                    return;
                  }

                  const safeFolder = folder ? folder.replace(/[^a-zA-Z0-9_\-\.]/g, '_') : 'turbowan';
                  const dir = path.resolve(process.cwd(), 'media', safeFolder);
                  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                  const safeFilename = filename ? filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_') : `video_${Date.now()}.mp4`;
                  const targetPath = path.join(dir, safeFilename);

                  // If URL is from ComfyUI through proxy, we might need to fetch it
                  // We must use absolute URLs in Node context
                  let targetUrl = url;
                  if (url.startsWith('/comfy-api')) {
                    targetUrl = url.replace('/comfy-api', 'http://127.0.0.1:8188');
                  } else if (url.startsWith('/')) {
                    // Fallback to local server if it's another relative path
                    targetUrl = `http://127.0.0.1:3000${url}`;
                  }

                  const response = await fetch(targetUrl);
                  const arrayBuffer = await response.arrayBuffer();
                  fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ path: `${safeFolder}/${safeFilename}` }));
                } catch (e) {
                  console.error("Save video error", e);
                  res.statusCode = 500;
                  res.end('error');
                }
              });
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
                  const { type, name, file } = body;

                  if (!type || !name) {
                    res.statusCode = 400;
                    res.end('Missing params');
                    return;
                  }

                  const safeName = name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                  const validTypes = ['sliced_img', 'upscale', 'individual_upscale', 'turbowan', 'stitched', 'z_image', 'inverse'];
                  const safeType = validTypes.includes(type) ? type : 'upscale';

                  let targetPath;
                  if (file) {
                    const safeFile = file.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                    if (name === 'Miscellaneous') {
                      targetPath = path.resolve(process.cwd(), 'media', safeType, safeFile);
                    } else {
                      targetPath = path.resolve(process.cwd(), 'media', safeType, safeName, safeFile);
                    }
                  } else {
                    targetPath = path.resolve(process.cwd(), 'media', safeType, safeName);
                  }

                  // Safety check
                  if (!targetPath.startsWith(path.join(process.cwd(), 'media'))) {
                    res.statusCode = 403;
                    res.end('Invalid path');
                    return;
                  }

                  if (fs.existsSync(targetPath)) {
                    if (fs.statSync(targetPath).isDirectory()) {
                      fs.rmSync(targetPath, { recursive: true, force: true });
                    } else {
                      fs.unlinkSync(targetPath);
                    }
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

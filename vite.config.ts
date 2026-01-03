import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { execSync } from 'child_process';
import { serverConfig } from './server.config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: serverConfig.server.port,
      host: serverConfig.server.host,
      proxy: {
        '/kling-api': {
          target: serverConfig.proxies.kling.target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/kling-api/, ''),
          secure: serverConfig.proxies.kling.secure,
        },
        '/sd-api': {
          target: serverConfig.proxies.stableDiffusion.target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/sd-api/, ''),
        },
        '/comfy-api': {
          target: serverConfig.proxies.comfyUI.target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/comfy-api/, ''),
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.error('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // console.log('Sending Request to the Target:', req.method, req.url);
              proxyReq.setHeader('Origin', serverConfig.proxies.comfyUI.target);
            });
            proxy.on('proxyReqWs', (proxyReq, _req, _socket, _options, _head) => {
              proxyReq.setHeader('Origin', serverConfig.proxies.comfyUI.target);
            });
            // proxy.on('proxyRes', (proxyRes, req, _res) => {
            //   // console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            // });
          },
        },
      }
    },
    plugins: [
      react(),
      {
        name: 'save-sliced-images',
        configureServer(server) {
          const extractMetadataFromPng = (filePath: string) => {
            try {
              if (!filePath.toLowerCase().endsWith('.png')) return null;
              const buffer = fs.readFileSync(filePath);
              let offset = 8;
              const results: any = {};

              while (offset < buffer.length - 12) {
                const length = buffer.readUInt32BE(offset);
                const type = buffer.toString('utf8', offset + 4, offset + 8);

                if (type === 'tEXt' || type === 'iTXt') {
                  const data = buffer.slice(offset + 8, offset + 8 + length);
                  if (type === 'tEXt') {
                    const parts = data.toString('utf8').split('\0');
                    results[parts[0]] = parts[1];
                  } else {
                    let nullCount = 0;
                    let textStart = 0;
                    for (let i = 0; i < data.length; i++) {
                      if (data[i] === 0) {
                        nullCount++;
                        if (nullCount === 5) { textStart = i + 1; break; }
                      }
                    }
                    if (textStart > 0) {
                      const keywordEnd = data.indexOf(0);
                      const key = data.toString('utf8', 0, keywordEnd);
                      results[key] = data.toString('utf8', textStart);
                    }
                  }
                }
                offset += length + 12;
                if (type === 'IEND') break;
              }

              // Post-process ComfyUI prompt to extract text
              if (results.prompt) {
                try {
                  const promptGraph = JSON.parse(results.prompt);
                  // Look for CLIPTextEncode nodes
                  for (const id in promptGraph) {
                    const node = promptGraph[id];
                    if (node.class_type === 'CLIPTextEncode' && node.inputs?.text) {
                      // Try to avoid negative prompts if we can guess
                      if (node._meta?.title?.toLowerCase().includes('negative')) continue;
                      if (node.inputs.text.length > 5) {
                        results.extracted_prompt = node.inputs.text;
                        break;
                      }
                    }
                  }
                } catch (e) { }
              }

              return results;
            } catch (e) {
              return null;
            }
          };

          // Middleware to list media folders
          server.middlewares.use('/list-media', (req, res, next) => {
            if (req.method === 'GET') {
              const mediaDir = path.resolve(process.cwd(), serverConfig.paths.mediaDir);
              const result: any = { sliced_img: [], upscale: [] };

              const types = serverConfig.paths.mediaTypes;
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
                            let prompt = undefined;
                            let metadata = undefined;
                            try {
                              const stats = fs.statSync(fullPath);
                              time = stats.mtime.toISOString();

                              // Check for metadata file
                              const metaPath = fullPath.replace(/\.[^/.]+$/, "") + ".json";
                              if (fs.existsSync(metaPath)) {
                                const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                                metadata = meta;
                                prompt = meta.prompt;
                              } else if (f.toLowerCase().endsWith('.png')) {
                                const pngMeta = extractMetadataFromPng(fullPath);
                                if (pngMeta) {
                                  metadata = pngMeta;
                                  prompt = pngMeta.extracted_prompt || pngMeta.prompt;
                                }
                              }
                            } catch (e) { }

                            if (/\.(mp4|webm)$/i.test(f)) {
                              try {
                                const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullPath}"`;
                                const out = execSync(cmd).toString().trim();
                                if (out) duration = parseFloat(out).toFixed(1) + 's';
                              } catch (e) { }
                            }
                            return { url: relativePath, duration, time, prompt, metadata };
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
                        let prompt = undefined;
                        let metadata = undefined;
                        try {
                          const stats = fs.statSync(fullPath);
                          time = stats.mtime.toISOString();

                          // Check for metadata file
                          const metaPath = fullPath.replace(/\.[^/.]+$/, "") + ".json";
                          if (fs.existsSync(metaPath)) {
                            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                            metadata = meta;
                            prompt = meta.prompt;
                          } else if (dirent.name.toLowerCase().endsWith('.png')) {
                            const pngMeta = extractMetadataFromPng(fullPath);
                            if (pngMeta) {
                              metadata = pngMeta;
                              prompt = pngMeta.extracted_prompt || pngMeta.prompt;
                            }
                          }
                        } catch (e) { }

                        if (/\.(mp4|webm)$/i.test(dirent.name)) {
                          try {
                            const cmd = `ffprobe -v error -show_entries format=duration -of default=nokey=1:nokey=1:noprint_wrappers=1 "${fullPath}"`;
                            const out = execSync(cmd).toString().trim();
                            if (out) duration = parseFloat(out).toFixed(1) + 's';
                          } catch (e) { }
                        }
                        return { url: relativePath, duration, time, prompt, metadata };
                      });

                    if (rootFiles.length > 0) {
                      const miscFolder = folders.find(f => f.name === 'Miscellaneous');
                      if (miscFolder) {
                        miscFolder.files = [...rootFiles, ...miscFolder.files];
                      } else {
                        folders.unshift({
                          name: 'Miscellaneous',
                          files: rootFiles
                        });
                      }
                    }

                    // Sort folders by name (desc) to show newest first?
                    // Excluding Miscellaneous from sort to keep it at top if added via unshift?
                    // Actually, let's just sort and then maybe move Misc to top if needed.
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
            const filePath = path.join(process.cwd(), serverConfig.paths.mediaDir, url);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const ext = path.extname(filePath).toLowerCase();
              const mime = serverConfig.files.mimeTypes;
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

                  const fullVideoPath = path.join(process.cwd(), serverConfig.paths.mediaDir, videoPath);
                  const outputPath = path.join(process.cwd(), serverConfig.paths.mediaDir, 'temp_last_frame.png');

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
                  const listFilePath = path.join(process.cwd(), serverConfig.paths.mediaDir, `list_${timestamp}.txt`);
                  const content = videos.map(v => `file '${path.join(process.cwd(), serverConfig.paths.mediaDir, v).replace(/\\/g, '/')}'`).join('\n');
                  fs.writeFileSync(listFilePath, content);

                  const safeOutputName = (outputName || `stitched_${timestamp}.mp4`).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                  const outputDir = path.join(process.cwd(), serverConfig.paths.mediaDir, 'stitched');
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

                  const fullVideoPath = path.join(process.cwd(), serverConfig.paths.mediaDir, videoPath);
                  const timestamp = Date.now();
                  const filename = `reversed_${timestamp}.mp4`;
                  const outputDir = path.join(process.cwd(), serverConfig.paths.mediaDir, 'inverse');
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
                  const dir = path.resolve(process.cwd(), serverConfig.paths.mediaDir, safeFolder);
                  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                  const safeFilename = filename ? filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_') : `video_${Date.now()}.mp4`;
                  const targetPath = path.join(dir, safeFilename);

                  // If URL is from ComfyUI through proxy, we might need to fetch it
                  // We must use absolute URLs in Node context
                  let targetUrl = url;
                  if (url.startsWith('/comfy-api')) {
                    targetUrl = url.replace('/comfy-api', serverConfig.proxies.comfyUI.target);
                  } else if (url.startsWith('/')) {
                    // Fallback to local server if it's another relative path
                    targetUrl = `http://${serverConfig.server.host}:${serverConfig.server.port}${url}`;
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
                  const validTypes = serverConfig.paths.mediaTypes;
                  const safeType = validTypes.includes(type) ? type : 'upscale';

                  let targetPath;
                  if (file) {
                    const safeFile = file.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                    if (name === 'Miscellaneous') {
                      targetPath = path.resolve(process.cwd(), serverConfig.paths.mediaDir, safeType, safeFile);
                    } else {
                      targetPath = path.resolve(process.cwd(), serverConfig.paths.mediaDir, safeType, safeName, safeFile);
                    }
                  } else {
                    targetPath = path.resolve(process.cwd(), serverConfig.paths.mediaDir, safeType, safeName);
                  }

                  // Safety check
                  if (!targetPath.startsWith(path.join(process.cwd(), serverConfig.paths.mediaDir))) {
                    res.statusCode = 403;
                    res.end('Invalid path');
                    return;
                  }

                  if (fs.existsSync(targetPath)) {
                    const stats = fs.statSync(targetPath);
                    if (stats.isDirectory()) {
                      fs.rmSync(targetPath, { recursive: true, force: true });
                    } else {
                      fs.unlinkSync(targetPath);
                      // Also delete associated metadata file if it exists
                      const metaPath = targetPath.replace(/\.[^/.]+$/, "") + ".json";
                      if (fs.existsSync(metaPath)) {
                        fs.unlinkSync(metaPath);
                        console.log(`[DELETE] Also deleted metadata: ${metaPath}`);
                      }
                    }
                    res.statusCode = 200;
                    res.end('deleted');
                  } else {
                    // Fallback: If it's a 'Miscellaneous' folder but the user meant the literal folder 'Miscellaneous'
                    if (name === 'Miscellaneous' && file) {
                      const literalPath = path.resolve(process.cwd(), serverConfig.paths.mediaDir, safeType, 'Miscellaneous', file.replace(/[^a-zA-Z0-9_\-\.]/g, '_'));
                      if (fs.existsSync(literalPath)) {
                        fs.unlinkSync(literalPath);
                        const metaPath = literalPath.replace(/\.[^/.]+$/, "") + ".json";
                        if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
                        res.statusCode = 200;
                        res.end('deleted');
                        return;
                      }
                    }
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

          server.middlewares.use('/list-loras', (req, res, next) => {
            if (req.method === 'GET') {
              const loraDir = serverConfig.paths.loraDir;
              try {
                if (!fs.existsSync(loraDir)) {
                  console.warn(`LoRA directory not found: ${loraDir}`);
                  res.statusCode = 200;
                  res.end(JSON.stringify([]));
                  return;
                }

                const getFilesRecursively = (dir: string, baseDir: string): string[] => {
                  let results: string[] = [];
                  const list = fs.readdirSync(dir);
                  list.forEach(file => {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);
                    if (stat && stat.isDirectory()) {
                      results = results.concat(getFilesRecursively(filePath, baseDir));
                    } else if (file.endsWith(serverConfig.files.loraExtension)) {
                      // Get relative path from baseDir
                      // Even on Windows, ComfyUI API/Python usually prefers forward slashes for internal logic
                      const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
                      results.push(relativePath);
                    }
                  });
                  return results;
                };

                const loras = getFilesRecursively(loraDir, loraDir);
                console.log(`[LORAS] Found ${loras.length} LoRAs in ${loraDir}`);
                if (loras.length > 0) console.log(`[LORAS] Sample: ${loras[0]}`);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(loras));
              } catch (e) {
                console.error("Failed to list LoRAs", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to list LoRAs' }));
              }
            } else {
              next();
            }
          });

          server.middlewares.use('/save-slice', (req, res, next) => {
            if (req.method === 'POST') {
              const chunks: Uint8Array[] = [];
              req.on('data', chunk => chunks.push(chunk));
              req.on('end', async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { image, filename, folder, targetDir, metadata } = body;

                  // Use provided folder or default
                  const safeFolder = folder ? folder.replace(/[^a-zA-Z0-9_\-\.]/g, '_') : 'default';
                  const safeTargetDir = (targetDir || 'sliced_img').replace(/(\.\.(\/|\\|$))+/g, '');
                  const dir = path.resolve(process.cwd(), serverConfig.paths.mediaDir, safeTargetDir, safeFolder);

                  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                  const targetPath = path.join(dir, filename);

                  if (image.startsWith('http') || image.startsWith('/') || image.startsWith('blob:')) {
                    // It's a URL, fetch it
                    let fetchUrl = image;
                    if (image.startsWith('/comfy-api')) {
                      fetchUrl = image.replace('/comfy-api', serverConfig.proxies.comfyUI.target);
                    } else if (image.startsWith('/')) {
                      const host = req.headers.host || `127.0.0.1:${serverConfig.server.port}`;
                      fetchUrl = `http://${host}${image}`;
                    }

                    try {
                      console.log(`[SAVE] Fetching from: ${fetchUrl}`);
                      const urlObj = new URL(fetchUrl);
                      const response = await fetch(urlObj.toString(), { method: 'GET' });
                      if (!response.ok) {
                        console.error(`[SAVE] Fetch failed with status ${response.status}: ${response.statusText}`);
                        throw new Error(`HTTP error! status: ${response.status}`);
                      }
                      const arrayBuffer = await response.arrayBuffer();
                      fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
                    } catch (e) {
                      console.error(`[SAVE] Error fetching image: ${e}`);
                      // Fallback: if it's a local media URL, try direct file copy
                      if (image.startsWith('/media/')) {
                        const localPath = path.join(process.cwd(), serverConfig.paths.mediaDir, image.replace('/media/', ''));
                        console.log(`[SAVE] Attempting fallback copy from: ${localPath}`);
                        if (fs.existsSync(localPath)) {
                          fs.copyFileSync(localPath, targetPath);
                        } else {
                          throw e;
                        }
                      } else {
                        throw e;
                      }
                    }
                  } else {
                    // It's a base64 string
                    const base64Data = image.replace(/^data:\w+\/[\w\-]+;base64,/, "");
                    fs.writeFileSync(targetPath, base64Data, 'base64');
                  }

                  // Save metadata if provided
                  if (metadata) {
                    const metaPath = targetPath.replace(/\.[^/.]+$/, "") + ".json";
                    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
                    console.log(`[SAVE] Saved metadata to ${metaPath}`);
                  }

                  console.log(`[SAVE] Successfully saved to ${targetPath}`);

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

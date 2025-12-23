import websocket #NOTE: websocket-client (https://github.com/websocket-client/websocket-client)
import uuid
import json
import urllib.request
import urllib.parse

server_address = "127.0.0.1:8188"
client_id = str(uuid.uuid4())

def queue_prompt(prompt, prompt_id):
    p = {"prompt": prompt, "client_id": client_id, "prompt_id": prompt_id}
    data = json.dumps(p).encode('utf-8')
    req = urllib.request.Request("http://{}/prompt".format(server_address), data=data)
    urllib.request.urlopen(req).read()

def get_image(filename, subfolder, folder_type):
    data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
    url_values = urllib.parse.urlencode(data)
    with urllib.request.urlopen("http://{}/view?{}".format(server_address, url_values)) as response:
        return response.read()

def get_history(prompt_id):
    with urllib.request.urlopen("http://{}/history/{}".format(server_address, prompt_id)) as response:
        return json.loads(response.read())

def get_images(ws, prompt):
    prompt_id = str(uuid.uuid4())
    queue_prompt(prompt, prompt_id)
    output_images = {}
    while True:
        out = ws.recv()
        if isinstance(out, str):
            message = json.loads(out)
            if message['type'] == 'executing':
                data = message['data']
                if data['node'] is None and data['prompt_id'] == prompt_id:
                    break #Execution is done
        else:
            # If you want to be able to decode the binary stream for latent previews, here is how you can do it:
            # bytesIO = BytesIO(out[8:])
            # preview_image = Image.open(bytesIO) # This is your preview in PIL image format, store it in a global
            continue #previews are binary data

    history = get_history(prompt_id)[prompt_id]
    for node_id in history['outputs']:
        node_output = history['outputs'][node_id]
        images_output = []
        if 'images' in node_output:
            for image in node_output['images']:
                image_data = get_image(image['filename'], image['subfolder'], image['type'])
                images_output.append(image_data)
        output_images[node_id] = images_output

    return output_images

prompt_text = """
{
  "10": {
    "inputs": {
      "seed": 42,
      "resolution": 4096,
      "max_resolution": 4096,
      "batch_size": 1,
      "uniform_batch_size": false,
      "color_correction": "lab",
      "temporal_overlap": 0,
      "prepend_frames": 0,
      "input_noise_scale": 0,
      "latent_noise_scale": 0,
      "offload_device": "cpu",
      "enable_debug": false,
      "image": [
        "17",
        0
      ],
      "dit": [
        "14",
        0
      ],
      "vae": [
        "13",
        0
      ]
    },
    "class_type": "SeedVR2VideoUpscaler",
    "_meta": {
      "title": "SeedVR2 Video Upscaler (v2.5.22)"
    }
  },
  "13": {
    "inputs": {
      "model": "ema_vae_fp16.safetensors",
      "device": "cuda:0",
      "encode_tiled": true,
      "encode_tile_size": 1024,
      "encode_tile_overlap": 128,
      "decode_tiled": true,
      "decode_tile_size": 1024,
      "decode_tile_overlap": 128,
      "tile_debug": "false",
      "offload_device": "cpu",
      "cache_model": false
    },
    "class_type": "SeedVR2LoadVAEModel",
    "_meta": {
      "title": "SeedVR2 (Down)Load VAE Model"
    }
  },
  "14": {
    "inputs": {
      "model": "seedvr2_ema_7b_sharp_fp16.safetensors",
      "device": "cuda:0",
      "blocks_to_swap": 36,
      "swap_io_components": false,
      "offload_device": "cpu",
      "cache_model": false,
      "attention_mode": "sdpa"
    },
    "class_type": "SeedVR2LoadDiTModel",
    "_meta": {
      "title": "SeedVR2 (Down)Load DiT Model"
    }
  },
  "15": {
    "inputs": {
      "filename_prefix": "ComfyUI",
      "images": [
        "10",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  },
  "16": {
    "inputs": {
      "image": "tile_2_1.png"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load Image"
    }
  },
  "17": {
    "inputs": {
      "image": [
        "16",
        0
      ],
      "alpha": [
        "16",
        1
      ]
    },
    "class_type": "JoinImageWithAlpha",
    "_meta": {
      "title": "Join Image with Alpha"
    }
  }
}
"""

prompt = json.loads(prompt_text)
#set the text prompt for our positive CLIPTextEncode
# prompt["6"]["inputs"]["text"] = "masterpiece best quality man"

# #set the seed for our KSampler node
# prompt["3"]["inputs"]["seed"] = 5

ws = websocket.WebSocket()
ws.connect("ws://{}/ws?clientId={}".format(server_address, client_id))
images = get_images(ws, prompt)
ws.close() # for in case this example is used in an environment where it will be repeatedly called, like in a Gradio app. otherwise, you'll randomly receive connection timeouts
#Commented out code to display the output images:

# for node_id in images:
#     for image_data in images[node_id]:
#         from PIL import Image
#         import io
#         image = Image.open(io.BytesIO(image_data))
#         image.show()


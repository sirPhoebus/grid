<div align="center">
<img width="100%" alt="GridToVideo Pro" src="promo.png" />
</div>

# GridToVideo Pro

**Transform static 3x3 grid images into dynamic, cinematic video sequences using AI.**

Powered by **Gemini 1.5 Pro**, **Veo 3.1**, and **Kling AI**, this application automates the process of slicing grid images, upscaling them to HD, and generating smooth video transitions between frames.

## ✨ Features

- **Multi-Provider Support**: Choose between **Google's Veo 3.1** or **Kling AI** for video generation.
- **Auto-Slicing**: Automatically detects and slices 3x3 grid layouts into individual frames.
- **HD Upscaling**: Uses **Gemini 2.5 Flash** and **Gemini 3 Pro** to enhance frame detail before generation.
- **Smart Settings**: Configure your API keys and provider preferences directly in the UI.
- **CORS Proxy**: Built-in development proxy for seamless API access.

## 🚀 Run Locally

**Prerequisites:** Node.js 18+

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Configure API Keys:**
    - Create a `.env.local` file (optional, or use the UI Settings):
      ```env
      GEMINI_API_KEY=your_key_here
      ```
    - OR launch the app and use the Settings menu (Gear Icon) to enter your keys reliably.

3.  **Run the app:**
    ```bash
    npm run dev
    ```

4.  **Open in Browser:**
    Navigate to `http://localhost:5173`

## 🛠️ Configuration

Click the **Settings (⚙️)** icon in the top right to:
- Switch between **Gemini (Veo)** and **Kling AI** backends.
- Enter/Update your **Kling Access/Secret Keys**.
- Enter your **Gemini API Key** (for local use).

> **Note**: Keys entered in the UI are stored securely in your browser's `localStorage`.

---
*Built with React, Vite, and TailwindCSS.*

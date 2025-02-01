# Kokoro on browser - Browser-based Text-to-Speech Application

## Project Overview
Kokoro on browser is a fully offline, local web-based text-to-speech application built using React and Vite. Powered by Kokoro.js, it downloads the speech model once and runs entirely in your browser without requiring an internet connection after initial setup. Experience fast, private text-to-speech conversion directly on your device with no ongoing data transmission.

## Features
- Browser-based text-to-speech conversion
- Powered by Kokoro.js library
- Responsive React application
- Fast development with Vite

## Technologies
- React 18
- Vite
- Kokoro.js
- ESLint for code quality

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Run the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`

### Building for Production
```bash
npm run build
```

### Deployment
#### Netlify Deployment
This project is ready for easy deployment on Netlify:

1. Ensure you have a Netlify account
2. Connect your GitHub repository to Netlify
3. Set the following build settings:
   - Build Command: `npm run build`
   - Publish Directory: `dist`

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/kokoro-on-browser)

*Note: Replace `yourusername` with your actual GitHub username*

## Contributing
Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the LICENSE.md file for details.

## Test Audio Comparisons

### Kokoro vs Piper Comparison

#### GB English: Cori (Piper)
[Piper Audio Sample](https://github.com/user-attachments/assets/54fb5142-9570-413d-9ed3-b8ff0a496d85)

#### Kokoro: AF_BELLA
[Kokoro Audio Sample](https://github.com/user-attachments/assets/3f39e4f1-9a79-4af1-b173-c8fd0ffa2381)
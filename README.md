# GitHub Repository Explorer

A simple web application for exploring GitHub repositories. Enter any public GitHub repository URL to browse its file structure and view file contents.

## Features

- 🔍 **Repository Exploration**: Browse any public GitHub repository
- 📁 **File Tree Navigation**: Interactive file and folder browser
- 📄 **File Viewer**: View file contents with syntax highlighting detection
- 📊 **Repository Stats**: View stars, forks, and other repository metrics
- 🔍 **File Search**: Search through repository files
- 💾 **File Download**: Download individual files

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd github-repository-explorer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Enter a GitHub repository URL in the input field (e.g., `https://github.com/facebook/react`)
2. Click "Explore Repository" to load the repository
3. Browse the file tree on the left side
4. Click on files to view their contents
5. Use the search bar to find specific files
6. Download files using the download button

## Supported Repository URL Formats

- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`
- `git@github.com:owner/repo.git`
- `owner/repo`

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **Icons**: Lucide React
- **API**: GitHub REST API

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/          # React components
├── services/           # API services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── main.tsx           # Application entry point
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the MIT License.
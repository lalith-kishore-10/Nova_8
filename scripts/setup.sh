#!/bin/bash

# Git Repository Explorer Setup Script

set -e

echo "🚀 Setting up Git Repository Explorer..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env .env.example
    echo "✅ .env file created. Please edit it with your API keys."
else
    echo "✅ .env file already exists."
fi

# Function to prompt for environment setup
setup_environment() {
    echo ""
    echo "🔧 Environment Setup Options:"
    echo "1. Development (with hot reload)"
    echo "2. Production (optimized build)"
    echo "3. Local LLM (with Ollama)"
    echo "4. Full stack (with Redis caching)"
    
    read -p "Choose setup type (1-4): " choice
    
    case $choice in
        1)
            echo "🔨 Setting up development environment..."
            docker-compose --profile dev up --build -d
            ;;
        2)
            echo "🏭 Setting up production environment..."
            docker-compose --profile prod up --build -d
            ;;
        3)
            echo "🤖 Setting up with local LLM..."
            docker-compose --profile dev --profile local-llm up --build -d
            echo "📥 Pulling Llama2 model (this may take a while)..."
            docker-compose exec ollama ollama pull llama2
            ;;
        4)
            echo "🚀 Setting up full stack..."
            docker-compose --profile dev --profile cache up --build -d
            ;;
        *)
            echo "❌ Invalid choice. Setting up development environment..."
            docker-compose --profile dev up --build -d
            ;;
    esac
}

# Check for API keys
check_api_keys() {
    if [ -f .env ]; then
        source .env
        if [ -z "$VITE_OPENAI_API_KEY" ] && [ -z "$VITE_ANTHROPIC_API_KEY" ]; then
            echo "⚠️  Warning: No LLM API keys found in .env file."
            echo "   The system will work with limited functionality."
            echo "   Please add your API keys to enable full AI analysis."
        else
            echo "✅ LLM API keys configured."
        fi
    fi
}

# Main setup
main() {
    check_api_keys
    setup_environment
    
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Edit .env file with your API keys (if not done already)"
    echo "   2. Access the application:"
    echo "      - Development: http://localhost:5173"
    echo "      - Production: http://localhost:80"
    echo "   3. Check logs: docker-compose logs -f"
    echo "   4. Stop services: docker-compose down"
    echo ""
    echo "📚 Documentation: README.md"
    echo "🐛 Issues: Check the logs or GitHub issues"
}

# Run main function
main
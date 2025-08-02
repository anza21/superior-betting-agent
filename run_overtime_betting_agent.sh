#!/bin/bash
# Script to run the Superior Betting Agent with Overtime Protocol support

echo "=== Superior Betting Agent - Overtime Protocol Integration ==="
echo "Date: $(date)"
echo

# Step 1: Restart Docker containers
echo "Step 1: Restarting Docker containers..."
docker-compose -f docker-compose.quickstart.yml down
docker-compose -f docker-compose.quickstart.yml up -d --build

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Step 2: Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Ethereum Configuration
ETH_PRIVATE_KEY=your_private_key_here
INFURA_PROJECT_ID=your_infura_project_id_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# CoinGecko Configuration
COINGECKO_API_KEY=your_coingecko_api_key_here

# DuckDuckGo (no API key needed)
DUCKDUCKGO_API_KEY=

# RAG Service
RAG_SERVICE_URL=http://localhost:8080

# Trading Configuration
TRADING_INSTRUMENTS=spot,sports_betting
EOF
    echo "Please edit .env file and add your API keys before continuing."
    exit 1
fi

# Step 3: Run agent setup
echo "Step 3: Running agent setup..."
docker exec -it superior-betting-agent-agent-1 python scripts/main.py

echo
echo "=== Setup Complete ==="
echo "The agent is now configured with Overtime Protocol support."
echo "Monitor logs with: docker logs -f superior-betting-agent-agent-1"
echo
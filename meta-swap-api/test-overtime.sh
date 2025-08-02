#!/bin/bash

echo "=== Testing Overtime Protocol Integration in Meta Swap API ==="
echo

# Base URL
BASE_URL="http://localhost:9009/api/v1/overtime"

# Test 1: Get active markets
echo "1. Fetching active sports betting markets..."
curl -X GET "$BASE_URL/markets" \
  -H "Content-Type: application/json" | jq .

echo
echo "2. Getting odds for a specific market..."
# Use a sample market address (would need real one in production)
MARKET_ADDRESS="0x1234567890abcdef1234567890abcdef12345678"
curl -X GET "$BASE_URL/market/$MARKET_ADDRESS/odds" \
  -H "Content-Type: application/json" | jq .

echo
echo "3. Placing a test bet..."
curl -X POST "$BASE_URL/bet" \
  -H "Content-Type: application/json" \
  -H "x-superior-agent-id: test_agent_001" \
  -H "x-superior-session-id: test_session_001" \
  -d '{
    "market_address": "0x1234567890abcdef1234567890abcdef12345678",
    "position": "home",
    "amount": "1",
    "odds": "2.15",
    "deadline": "'$(date -d '+1 hour' +%s)'"
  }' | jq .

echo
echo "4. Checking bet status..."
BET_ID="bet_test_001"
curl -X GET "$BASE_URL/bet/$BET_ID" \
  -H "Content-Type: application/json" \
  -H "x-superior-agent-id: test_agent_001" \
  -H "x-superior-session-id: test_session_001" | jq .

echo
echo "=== Test Complete ==="
#!/bin/bash

# Test Overtime Protocol GraphQL endpoint
echo "Testing Overtime Protocol GraphQL API..."

# The Graph endpoint for Overtime on Arbitrum
GRAPH_URL="https://api.thegraph.com/subgraphs/name/thales-markets/overtime-arbitrum"

# GraphQL query for active markets
QUERY='{
  "query": "{ sportMarkets(first: 10, where: {isOpen: true, maturityDate_gt: \"'$(date +%s)'\"}) { id address homeTeam awayTeam homeOdds awayOdds drawOdds tags isOpen maturityDate } }"
}'

echo "Querying The Graph for Overtime markets on Arbitrum..."
curl -X POST \
  -H "Content-Type: application/json" \
  -d "$QUERY" \
  "$GRAPH_URL" | jq .
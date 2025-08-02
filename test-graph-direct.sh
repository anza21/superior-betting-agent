#!/bin/bash

# Direct test to The Graph API
echo "Testing direct query to The Graph..."

GRAPH_URL="https://api.thegraph.com/subgraphs/name/thales-markets/overtime-arbitrum"
TIMESTAMP=$(date +%s)

QUERY='{
  "query": "{ sportMarkets(first: 5, where: {isOpen: true, maturityDate_gt: \"'$TIMESTAMP'\"}) { id address homeTeam awayTeam homeOdds awayOdds drawOdds isOpen maturityDate } }"
}'

echo "Query: $QUERY"
echo "Sending to: $GRAPH_URL"

curl -X POST \
  -H "Content-Type: application/json" \
  -d "$QUERY" \
  "$GRAPH_URL" | python3 -m json.tool
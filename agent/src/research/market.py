from dotenv import load_dotenv
import os
import requests
import json
from loguru import logger

load_dotenv()

def get_trending_coins():
    url = "https://api.coingecko.com/api/v3/search/trending"
    headers = {
        "Accept": "application/json"
    }
    logger.info("Fetching trending coins from CoinGecko...")
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    data = response.json()
    logger.info("Successfully fetched trending coins data")
    return data

def get_token_data(symbol):
    url = f"https://api.coingecko.com/api/v3/search?query={symbol}"
    headers = {
        "Accept": "application/json"
    }
    logger.info(f"Searching for token data: {symbol}")
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    data = response.json()
    logger.info(f"Successfully fetched token data for {symbol}")
    return data

def main():
    try:
        # Get trending coins
        trending_data = get_trending_coins()
        coins = trending_data.get("coins", [])
        if not coins:
            logger.warning("No trending coins found")
        else:
            logger.info("Top trending coins:")
            for coin in coins[:5]:  # Show top 5
                item = coin.get("item", {})
                name = item.get("name", "N/A")
                symbol = item.get("symbol", "N/A")
                rank = item.get("market_cap_rank", "N/A")
                logger.info(f"- {name} ({symbol}) - Rank: {rank}")

        # Get WETH data
        weth_data = get_token_data("WETH")
        coins = weth_data.get("coins", [])
        weth_info = next((coin for coin in coins if coin.get("symbol", "").upper() == "WETH"), None)
        
        if weth_info:
            logger.info(f"WETH found - ID: {weth_info.get('id')}, Name: {weth_info.get('name')}, Market Cap Rank: {weth_info.get('market_cap_rank')}")
        else:
            logger.warning("WETH not found in search results")

    except Exception as e:
        logger.error(f"Error in market research: {e}")
        raise

if __name__ == "__main__":
    main()
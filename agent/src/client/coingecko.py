import os
import requests
from typing import Dict, Any, Optional
from loguru import logger

class CoinGeckoClient:
    def __init__(self):
        self.base_url = "https://api.coingecko.com/api/v3"
        self.headers = {
            "Accept": "application/json"
        }

    def get_trending(self) -> Dict[str, Any]:
        url = f"{self.base_url}/search/trending"
        logger.info(f"Fetching trending coins from CoinGecko...")
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            logger.info("Successfully fetched trending coins data")
            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching trending coins data: {e}")
            raise

    def get_coin_price(self, coin_id: str, vs_currency: str = "usd") -> Dict[str, Any]:
        url = f"{self.base_url}/simple/price"
        params = {
            "ids": coin_id,
            "vs_currencies": vs_currency,
            "include_24hr_change": "true"
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            logger.info(f"Successfully fetched price data for {coin_id}")
            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching price data for {coin_id}: {e}")
            raise
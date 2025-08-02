#!/usr/bin/env python3
"""
Test script to demonstrate Overtime Protocol v2 betting functionality
"""

import os
import sys
sys.path.append('/app')

from src.overtime_protocol import OvertimeProtocolClient
from loguru import logger
import json
import time

def main():
    """Test the Overtime Protocol betting functionality"""
    
    logger.info("=== Overtime Protocol v2 Betting Test ===")
    
    # Get environment variables
    infura_project_id = os.getenv("INFURA_PROJECT_ID", "demo_key")
    private_key = os.getenv("ETH_PRIVATE_KEY", "0x" + "0" * 64)  # Demo key
    
    # Initialize the Overtime client
    logger.info("Initializing Overtime Protocol client...")
    client = OvertimeProtocolClient(infura_project_id, private_key)
    
    # Step 1: Get active sports markets
    logger.info("Fetching active sports markets...")
    markets = client.get_active_markets()
    
    if not markets:
        logger.warning("No active markets found!")
        return
    
    logger.info(f"Found {len(markets)} active markets")
    
    # Display first few markets
    for i, market in enumerate(markets[:3]):
        logger.info(f"\nMarket {i+1}:")
        logger.info(f"  Sport: {market.get('sport', 'Unknown')}")
        logger.info(f"  Home Team: {market.get('homeTeam', 'Unknown')}")
        logger.info(f"  Away Team: {market.get('awayTeam', 'Unknown')}")
        logger.info(f"  Market Address: {market.get('address', 'Unknown')}")
        logger.info(f"  Start Time: {market.get('maturityDate', 'Unknown')}")
    
    # Step 2: Get odds for the first market
    if markets:
        first_market = markets[0]
        market_address = first_market.get('address')
        
        if market_address:
            logger.info(f"\nGetting odds for market: {market_address}")
            odds = client.get_market_odds(market_address)
            
            logger.info("Current Odds:")
            logger.info(f"  Home: {odds['home']:.2f}")
            logger.info(f"  Away: {odds['away']:.2f}")
            if odds['draw']:
                logger.info(f"  Draw: {odds['draw']:.2f}")
            
            # Step 3: Simulate a bet
            logger.info("\nSimulating a bet...")
            bet_amount = 10.0  # 10 sUSD
            position = "home"  # Betting on home team
            
            bet_result = client.simulate_bet(market_address, position, bet_amount)
            
            if 'error' in bet_result and bet_result['status'] != 'simulated':
                logger.error(f"Bet simulation failed: {bet_result['error']}")
            else:
                logger.success("Bet simulation successful!")
                logger.info(f"Bet Details: {json.dumps(bet_result, indent=2)}")
                
                # Step 4: Verify bet on-chain (for simulated bet)
                logger.info("\nVerifying bet on-chain...")
                verification = client.verify_bet_onchain(bet_result['tx_hash'])
                logger.info(f"Verification result: {json.dumps(verification, indent=2)}")
    
    logger.info("\n=== Test Complete ===")

if __name__ == "__main__":
    main()
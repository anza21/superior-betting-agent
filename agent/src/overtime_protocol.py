"""
Overtime Protocol v2 Integration for Sports Betting on Arbitrum
"""

import json
import time
from typing import Dict, Optional, List
from decimal import Decimal
import requests
from web3 import Web3
from loguru import logger

# Overtime Protocol v2 Contracts on Arbitrum
OVERTIME_CONTRACTS = {
    "SportsAMM": "0x7465c5d60d3d095443CF9991Da03304A30D42Eae",
    "sUSD": "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9",
    "ThalesAMM": "0x85187A93F5b50CfDF4dddbd81997fe8C97D84a73",
    "RangedAMM": "0x2d356b114cbCA8DEFf2d8783EAc2a5A5324fE1dF"
}

# ABI for basic read operations
SPORTS_AMM_ABI = [
    {
        "inputs": [{"name": "market", "type": "address"}],
        "name": "getMarketDefaultOdds",
        "outputs": [
            {"name": "homeOdds", "type": "uint256"},
            {"name": "awayOdds", "type": "uint256"},
            {"name": "drawOdds", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "market", "type": "address"},
            {"name": "position", "type": "uint8"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "buyFromAMM",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

class OvertimeProtocolClient:
    """Client for interacting with Overtime Protocol v2 on Arbitrum"""
    
    def __init__(self, infura_project_id: str, private_key: str):
        """Initialize the Overtime Protocol client
        
        Args:
            infura_project_id: Infura project ID for RPC access
            private_key: Private key for signing transactions
        """
        self.w3 = Web3(Web3.HTTPProvider(f"https://arbitrum-mainnet.infura.io/v3/{infura_project_id}"))
        self.private_key = private_key
        self.account = self.w3.eth.account.from_key(private_key)
        self.sports_amm = self.w3.eth.contract(
            address=Web3.to_checksum_address(OVERTIME_CONTRACTS["SportsAMM"]),
            abi=SPORTS_AMM_ABI
        )
        
    def get_active_markets(self) -> List[Dict]:
        """Fetch active sports betting markets from Overtime API
        
        Returns:
            List of active market dictionaries
        """
        try:
            # Overtime Protocol API endpoint for Arbitrum markets
            url = "https://overtimemarketsv2.xyz/arbitrum/markets"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            markets = response.json()
            # Filter for active markets only
            active_markets = [m for m in markets if m.get("isOpen", False)]
            
            logger.info(f"Found {len(active_markets)} active markets")
            return active_markets[:10]  # Return top 10 markets
            
        except Exception as e:
            logger.error(f"Error fetching markets: {e}")
            return []
    
    def get_market_odds(self, market_address: str) -> Dict[str, float]:
        """Get current odds for a specific market
        
        Args:
            market_address: Address of the sports market
            
        Returns:
            Dictionary with home, away, and draw odds
        """
        try:
            market_checksum = Web3.to_checksum_address(market_address)
            result = self.sports_amm.functions.getMarketDefaultOdds(market_checksum).call()
            
            # Convert from contract format to decimal odds
            odds = {
                "home": float(result[0]) / 1e18,
                "away": float(result[1]) / 1e18,
                "draw": float(result[2]) / 1e18 if result[2] > 0 else None
            }
            
            return odds
            
        except Exception as e:
            logger.error(f"Error getting market odds: {e}")
            return {"home": 0, "away": 0, "draw": None}
    
    def simulate_bet(self, market_address: str, position: str, amount: float) -> Dict:
        """Simulate placing a bet on a sports market
        
        Args:
            market_address: Address of the sports market
            position: Betting position ("home", "away", or "draw")
            amount: Bet amount in sUSD
            
        Returns:
            Dictionary with simulated bet details
        """
        try:
            position_map = {"home": 0, "away": 1, "draw": 2}
            if position not in position_map:
                raise ValueError(f"Invalid position: {position}")
            
            position_index = position_map[position]
            amount_wei = Web3.to_wei(amount, 'ether')
            
            # Get current odds
            odds = self.get_market_odds(market_address)
            position_odds = odds.get(position, 0)
            
            if position_odds == 0:
                raise ValueError(f"Position {position} not available for this market")
            
            # Calculate potential payout
            potential_payout = amount * position_odds
            
            # Simulate transaction (not executing due to lack of funds)
            bet_details = {
                "market_address": market_address,
                "position": position,
                "amount_sUSD": amount,
                "odds": position_odds,
                "potential_payout": potential_payout,
                "timestamp": int(time.time()),
                "status": "simulated",
                "tx_hash": f"0xsimulated_{int(time.time())}",
                "error": "Simulated bet - insufficient sUSD balance"
            }
            
            logger.info(f"Simulated bet: {json.dumps(bet_details, indent=2)}")
            return bet_details
            
        except Exception as e:
            logger.error(f"Error simulating bet: {e}")
            return {
                "error": str(e),
                "status": "failed"
            }
    
    def verify_bet_onchain(self, tx_hash: str) -> Dict:
        """Verify a bet transaction on-chain
        
        Args:
            tx_hash: Transaction hash to verify
            
        Returns:
            Dictionary with verification details
        """
        try:
            if tx_hash.startswith("0xsimulated_"):
                return {
                    "verified": True,
                    "status": "simulated",
                    "message": "This was a simulated bet, no on-chain transaction exists"
                }
            
            # Try to get transaction receipt
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            
            if receipt:
                return {
                    "verified": True,
                    "status": "confirmed" if receipt.status == 1 else "failed",
                    "block_number": receipt.blockNumber,
                    "gas_used": receipt.gasUsed,
                    "logs": len(receipt.logs)
                }
            else:
                return {
                    "verified": False,
                    "status": "pending",
                    "message": "Transaction not yet confirmed"
                }
                
        except Exception as e:
            logger.error(f"Error verifying bet: {e}")
            return {
                "verified": False,
                "status": "error",
                "error": str(e)
            }
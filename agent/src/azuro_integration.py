"""
Azuro Protocol Integration for Arbitrum Sports Oracle Agent

This module provides integration with the Azuro Protocol for decentralized sports betting
on the Arbitrum network. It allows the agent to place real bets, check odds, and manage positions.
"""

import os
import json
import asyncio
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account
import requests
from dotenv import load_dotenv

load_dotenv()

class AzuroIntegration:
    """
    Integration class for Azuro Protocol betting operations
    """
    
    def __init__(self):
        """Initialize Azuro integration with environment variables"""
        self.private_key = os.getenv('ETH_PRIVATE_KEY')
        self.rpc_url = os.getenv('ARBITRUM_ONE_RPC_URL')
        self.wallet_address = os.getenv('ETHER_ADDRESS')
        
        if not all([self.private_key, self.rpc_url, self.wallet_address]):
            raise ValueError("Missing required environment variables for Azuro integration")
        
        # Initialize Web3 connection to Arbitrum
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        
        # Initialize account
        self.account = Account.from_key(self.private_key)
        
        # Azuro Protocol addresses on Arbitrum
        self.azuro_addresses = {
            'core': '0x0000000000000000000000000000000000000000',  # Replace with actual Azuro core address
            'liquidity': '0x0000000000000000000000000000000000000000',  # Replace with actual liquidity address
            'betting': '0x0000000000000000000000000000000000000000',  # Replace with actual betting address
        }
        
        # ABI definitions for Azuro contracts (simplified)
        self.core_abi = [
            {
                "inputs": [
                    {"name": "conditionId", "type": "uint256"},
                    {"name": "outcomeId", "type": "uint256"},
                    {"name": "amount", "type": "uint256"}
                ],
                "name": "placeBet",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "payable",
                "type": "function"
            },
            {
                "inputs": [{"name": "betId", "type": "uint256"}],
                "name": "claimReward",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"name": "conditionId", "type": "uint256"}],
                "name": "getCondition",
                "outputs": [
                    {"name": "outcomes", "type": "uint256[]"},
                    {"name": "odds", "type": "uint256[]"},
                    {"name": "status", "type": "uint8"}
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        
        # Initialize contract instances
        self.core_contract = self.w3.eth.contract(
            address=self.w3.to_checksum_address(self.azuro_addresses['core']),
            abi=self.core_abi
        )
    
    def get_wallet_balance(self) -> Dict[str, float]:
        """Get current wallet balance and token holdings"""
        try:
            eth_balance = self.w3.eth.get_balance(self.wallet_address)
            eth_balance_eth = self.w3.from_wei(eth_balance, 'ether')
            
            return {
                'wallet_address': self.wallet_address,
                'eth_balance': float(eth_balance_eth),
                'eth_balance_wei': eth_balance,
                'network': 'Arbitrum One'
            }
        except Exception as e:
            print(f"Error getting wallet balance: {e}")
            return {}
    
    def get_available_bets(self, sport: str = None) -> List[Dict]:
        """
        Get available betting markets from Azuro
        This would typically call Azuro's API or scan their events
        """
        try:
            # This is a placeholder - in reality, you'd call Azuro's API
            # or scan their smart contract events for available markets
            sample_bets = [
                {
                    'condition_id': 1,
                    'sport': 'Football',
                    'event': 'Manchester United vs Liverpool',
                    'outcomes': ['Home Win', 'Draw', 'Away Win'],
                    'odds': [2.5, 3.2, 2.8],
                    'start_time': '2025-07-26T20:00:00Z',
                    'status': 'active'
                },
                {
                    'condition_id': 2,
                    'sport': 'Basketball',
                    'event': 'Lakers vs Warriors',
                    'outcomes': ['Lakers Win', 'Warriors Win'],
                    'odds': [1.8, 2.1],
                    'start_time': '2025-07-26T22:00:00Z',
                    'status': 'active'
                }
            ]
            
            if sport:
                sample_bets = [bet for bet in sample_bets if bet['sport'].lower() == sport.lower()]
            
            return sample_bets
        except Exception as e:
            print(f"Error getting available bets: {e}")
            return []
    
    def analyze_bet_opportunity(self, condition_id: int, outcome_id: int, amount_eth: float) -> Dict:
        """
        Analyze a betting opportunity for profitability
        """
        try:
            # Get condition details
            condition = self.core_contract.functions.getCondition(condition_id).call()
            outcomes, odds, status = condition
            
            if status != 1:  # Assuming 1 = active
                return {'error': 'Condition is not active'}
            
            if outcome_id >= len(odds):
                return {'error': 'Invalid outcome ID'}
            
            # Calculate potential profit
            bet_amount_wei = self.w3.to_wei(amount_eth, 'ether')
            potential_profit = (bet_amount_wei * odds[outcome_id]) // 10000  # Assuming odds are in basis points
            potential_profit_eth = self.w3.from_wei(potential_profit, 'ether')
            
            # Calculate ROI
            roi = ((potential_profit_eth - amount_eth) / amount_eth) * 100
            
            return {
                'condition_id': condition_id,
                'outcome_id': outcome_id,
                'bet_amount_eth': amount_eth,
                'odds': odds[outcome_id] / 10000,  # Convert from basis points
                'potential_profit_eth': float(potential_profit_eth),
                'roi_percent': float(roi),
                'risk_level': 'high' if roi > 50 else 'medium' if roi > 20 else 'low'
            }
        except Exception as e:
            print(f"Error analyzing bet opportunity: {e}")
            return {'error': str(e)}
    
    def place_bet(self, condition_id: int, outcome_id: int, amount_eth: float) -> Dict:
        """
        Place a bet on Azuro Protocol
        """
        try:
            # Validate inputs
            if amount_eth <= 0:
                return {'error': 'Bet amount must be positive'}
            
            # Check wallet balance
            balance = self.get_wallet_balance()
            if balance['eth_balance'] < amount_eth:
                return {'error': f'Insufficient balance. Available: {balance["eth_balance"]} ETH'}
            
            # Prepare transaction
            bet_amount_wei = self.w3.to_wei(amount_eth, 'ether')
            
            # Build transaction
            transaction = self.core_contract.functions.placeBet(
                condition_id,
                outcome_id,
                bet_amount_wei
            ).build_transaction({
                'from': self.wallet_address,
                'value': bet_amount_wei,
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.wallet_address),
            })
            
            # Sign and send transaction
            signed_txn = self.w3.eth.account.sign_transaction(transaction, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Wait for transaction confirmation
            tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            return {
                'success': True,
                'tx_hash': tx_hash.hex(),
                'bet_id': tx_receipt['logs'][0]['topics'][1].hex(),  # Extract bet ID from event
                'condition_id': condition_id,
                'outcome_id': outcome_id,
                'amount_eth': amount_eth,
                'gas_used': tx_receipt['gasUsed'],
                'status': 'confirmed'
            }
            
        except Exception as e:
            print(f"Error placing bet: {e}")
            return {'error': str(e)}
    
    def claim_reward(self, bet_id: int) -> Dict:
        """
        Claim reward for a winning bet
        """
        try:
            # Build transaction
            transaction = self.core_contract.functions.claimReward(bet_id).build_transaction({
                'from': self.wallet_address,
                'gas': 150000,
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.wallet_address),
            })
            
            # Sign and send transaction
            signed_txn = self.w3.eth.account.sign_transaction(transaction, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Wait for transaction confirmation
            tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            return {
                'success': True,
                'tx_hash': tx_hash.hex(),
                'bet_id': bet_id,
                'gas_used': tx_receipt['gasUsed'],
                'status': 'claimed'
            }
            
        except Exception as e:
            print(f"Error claiming reward: {e}")
            return {'error': str(e)}
    
    def get_betting_history(self) -> List[Dict]:
        """
        Get betting history for the wallet
        """
        try:
            # This would typically scan blockchain events for the wallet
            # For now, return sample data
            return [
                {
                    'bet_id': 1,
                    'condition_id': 1,
                    'outcome_id': 0,
                    'amount_eth': 0.1,
                    'odds': 2.5,
                    'status': 'pending',
                    'placed_at': '2025-07-25T14:30:00Z'
                }
            ]
        except Exception as e:
            print(f"Error getting betting history: {e}")
            return []

# Utility functions for the agent
def analyze_sports_data_for_betting(sports_data: Dict) -> List[Dict]:
    """
    Analyze sports data to identify betting opportunities
    """
    opportunities = []
    
    # This would analyze the sports data and identify profitable betting opportunities
    # For now, return sample opportunities
    opportunities.append({
        'condition_id': 1,
        'sport': 'Football',
        'event': 'Manchester United vs Liverpool',
        'recommended_outcome': 0,  # Home Win
        'confidence': 0.75,
        'reasoning': 'Strong home form, key players returning from injury',
        'recommended_amount': 0.05  # 0.05 ETH
    })
    
    return opportunities

def calculate_optimal_bet_size(wallet_balance: float, confidence: float, risk_tolerance: float = 0.1) -> float:
    """
    Calculate optimal bet size based on Kelly Criterion
    """
    # Kelly Criterion: f = (bp - q) / b
    # where f = fraction of bankroll to bet
    # b = odds received on bet - 1
    # p = probability of winning
    # q = probability of losing (1 - p)
    
    # For now, use a simplified approach
    max_bet_fraction = min(confidence * risk_tolerance, 0.1)  # Max 10% of balance
    return wallet_balance * max_bet_fraction

# Example usage
if __name__ == "__main__":
    # Test the integration
    try:
        azuro = AzuroIntegration()
        
        # Get wallet balance
        balance = azuro.get_wallet_balance()
        print(f"Wallet Balance: {balance}")
        
        # Get available bets
        bets = azuro.get_available_bets()
        print(f"Available Bets: {bets}")
        
        # Analyze a betting opportunity
        if bets:
            analysis = azuro.analyze_bet_opportunity(1, 0, 0.1)
            print(f"Bet Analysis: {analysis}")
        
    except Exception as e:
        print(f"Error testing Azuro integration: {e}") 
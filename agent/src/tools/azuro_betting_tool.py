"""
Azuro Betting Tool for Arbitrum Sports Oracle Agent

This tool provides the agent with the ability to place real bets on Azuro Protocol
and analyze betting opportunities using sports data.
"""

import os
import json
from typing import Dict, List, Optional
from dotenv import load_dotenv
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from azuro_integration import AzuroIntegration, analyze_sports_data_for_betting, calculate_optimal_bet_size

load_dotenv()

class AzuroBettingTool:
    """
    Tool for the agent to interact with Azuro Protocol for sports betting
    """
    
    def __init__(self):
        """Initialize the Azuro betting tool"""
        try:
            self.azuro = AzuroIntegration()
            self.available = True
        except Exception as e:
            print(f"Warning: Azuro integration not available: {e}")
            self.available = False
    
    def get_wallet_status(self) -> Dict:
        """
        Get current wallet status and balance
        """
        if not self.available:
            return {'error': 'Azuro integration not available'}
        
        try:
            balance = self.azuro.get_wallet_balance()
            history = self.azuro.get_betting_history()
            
            return {
                'wallet_address': balance.get('wallet_address'),
                'eth_balance': balance.get('eth_balance', 0),
                'network': balance.get('network', 'Arbitrum One'),
                'active_bets': len([bet for bet in history if bet['status'] == 'pending']),
                'total_bets': len(history),
                'status': 'active'
            }
        except Exception as e:
            return {'error': f'Failed to get wallet status: {e}'}
    
    def analyze_betting_opportunities(self, sports_data: Dict = None) -> List[Dict]:
        """
        Analyze available betting opportunities
        """
        if not self.available:
            return [{'error': 'Azuro integration not available'}]
        
        try:
            # Get available bets from Azuro
            available_bets = self.azuro.get_available_bets()
            
            # Analyze sports data if provided
            if sports_data:
                sports_opportunities = analyze_sports_data_for_betting(sports_data)
            else:
                sports_opportunities = []
            
            # Combine and analyze opportunities
            opportunities = []
            
            for bet in available_bets:
                # Analyze each outcome
                for outcome_id, (outcome, odds) in enumerate(zip(bet['outcomes'], bet['odds'])):
                    # Calculate potential profit for 0.1 ETH bet
                    analysis = self.azuro.analyze_bet_opportunity(bet['condition_id'], outcome_id, 0.1)
                    
                    if 'error' not in analysis:
                        opportunities.append({
                            'condition_id': bet['condition_id'],
                            'sport': bet['sport'],
                            'event': bet['event'],
                            'outcome': outcome,
                            'outcome_id': outcome_id,
                            'odds': odds,
                            'roi_percent': analysis.get('roi_percent', 0),
                            'risk_level': analysis.get('risk_level', 'unknown'),
                            'start_time': bet['start_time'],
                            'recommended_amount': 0.05  # Conservative bet size
                        })
            
            # Sort by ROI (highest first)
            opportunities.sort(key=lambda x: x.get('roi_percent', 0), reverse=True)
            
            return opportunities[:10]  # Return top 10 opportunities
            
        except Exception as e:
            return [{'error': f'Failed to analyze opportunities: {e}'}]
    
    def place_bet(self, condition_id: int, outcome_id: int, amount_eth: float) -> Dict:
        """
        Place a bet on Azuro Protocol
        """
        if not self.available:
            return {'error': 'Azuro integration not available'}
        
        try:
            # Validate bet amount
            if amount_eth <= 0:
                return {'error': 'Bet amount must be positive'}
            
            # Check wallet balance
            balance = self.azuro.get_wallet_balance()
            if balance['eth_balance'] < amount_eth:
                return {'error': f'Insufficient balance. Available: {balance["eth_balance"]} ETH'}
            
            # Place the bet
            result = self.azuro.place_bet(condition_id, outcome_id, amount_eth)
            
            if 'success' in result:
                return {
                    'success': True,
                    'message': f'Bet placed successfully! TX: {result["tx_hash"]}',
                    'bet_id': result['bet_id'],
                    'amount_eth': amount_eth,
                    'condition_id': condition_id,
                    'outcome_id': outcome_id,
                    'gas_used': result['gas_used']
                }
            else:
                return {'error': result.get('error', 'Unknown error placing bet')}
                
        except Exception as e:
            return {'error': f'Failed to place bet: {e}'}
    
    def get_betting_history(self) -> List[Dict]:
        """
        Get betting history for analysis
        """
        if not self.available:
            return [{'error': 'Azuro integration not available'}]
        
        try:
            history = self.azuro.get_betting_history()
            
            # Calculate performance metrics
            total_bets = len(history)
            pending_bets = len([bet for bet in history if bet['status'] == 'pending'])
            completed_bets = total_bets - pending_bets
            
            return {
                'bets': history,
                'metrics': {
                    'total_bets': total_bets,
                    'pending_bets': pending_bets,
                    'completed_bets': completed_bets
                }
            }
            
        except Exception as e:
            return [{'error': f'Failed to get betting history: {e}'}]
    
    def calculate_optimal_bet_size(self, confidence: float, risk_tolerance: float = 0.1) -> float:
        """
        Calculate optimal bet size based on Kelly Criterion
        """
        if not self.available:
            return 0.0
        
        try:
            balance = self.azuro.get_wallet_balance()
            wallet_balance = balance.get('eth_balance', 0)
            
            return calculate_optimal_bet_size(wallet_balance, confidence, risk_tolerance)
            
        except Exception as e:
            print(f"Error calculating optimal bet size: {e}")
            return 0.0

# Tool functions for the agent
def azuro_get_wallet_status() -> Dict:
    """Get current wallet status and balance"""
    tool = AzuroBettingTool()
    return tool.get_wallet_status()

def azuro_analyze_opportunities(sports_data: Dict = None) -> List[Dict]:
    """Analyze available betting opportunities"""
    tool = AzuroBettingTool()
    return tool.analyze_betting_opportunities(sports_data)

def azuro_place_bet(condition_id: int, outcome_id: int, amount_eth: float) -> Dict:
    """Place a bet on Azuro Protocol"""
    tool = AzuroBettingTool()
    return tool.place_bet(condition_id, outcome_id, amount_eth)

def azuro_get_history() -> List[Dict]:
    """Get betting history for analysis"""
    tool = AzuroBettingTool()
    return tool.get_betting_history()

def azuro_calculate_bet_size(confidence: float, risk_tolerance: float = 0.1) -> float:
    """Calculate optimal bet size based on Kelly Criterion"""
    tool = AzuroBettingTool()
    return tool.calculate_optimal_bet_size(confidence, risk_tolerance)

# Example usage for testing
if __name__ == "__main__":
    # Test the betting tool
    tool = AzuroBettingTool()
    
    # Get wallet status
    status = tool.get_wallet_status()
    print(f"Wallet Status: {json.dumps(status, indent=2)}")
    
    # Analyze opportunities
    opportunities = tool.analyze_betting_opportunities()
    print(f"Betting Opportunities: {json.dumps(opportunities, indent=2)}")
    
    # Get history
    history = tool.get_betting_history()
    print(f"Betting History: {json.dumps(history, indent=2)}") 
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { ChainId } from "../swap/interfaces/swap.interface";
import type {
	SwapParams,
	SwapQuote,
	TokenInfo,
	UnsignedSwapTransaction,
} from "../swap/interfaces/swap.interface";
import { BaseSwapProvider } from "./base-swap.provider";

// Import the Python module functionality (we'll create a service for this)
interface OvertimeMarket {
	address: string;
	sport: string;
	homeTeam: string;
	awayTeam: string;
	homeOdds: number;
	awayOdds: number;
	drawOdds?: number;
	maturityDate: string;
	isOpen: boolean;
}

interface BetParams {
	marketAddress: string;
	position: "home" | "away" | "draw";
	amount: string;
	odds: string;
	deadline?: string;
}

interface BetResult {
	success: boolean;
	betId?: string;
	txHash?: string;
	status: string;
	message: string;
	details?: any;
}

@Injectable()
export class OvertimeProvider extends BaseSwapProvider {
	private readonly logger = new Logger(OvertimeProvider.name);
	readonly supportedChains: ChainId[] = [ChainId.ARBITRUM]; // Arbitrum One
	private provider: ethers.providers.JsonRpcProvider;
	private signer: ethers.Wallet;

	// Overtime Protocol v2 Contracts on Arbitrum
	private readonly OVERTIME_CONTRACTS = {
		SportsAMM: "0x7465c5d60d3d095443CF9991Da03304A30D42Eae",
		sUSD: "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9",
		ThalesAMM: "0x85187A93F5b50CfDF4dddbd81997fe8C97D84a73",
		RangedAMM: "0x2d356b114cbCA8DEFf2d8783EAc2a5A5324fE1dF",
	};

	// Minimal ABI for SportsAMM
	private readonly SPORTS_AMM_ABI = [
		{
			inputs: [{ name: "market", type: "address" }],
			name: "getMarketDefaultOdds",
			outputs: [
				{ name: "homeOdds", type: "uint256" },
				{ name: "awayOdds", type: "uint256" },
				{ name: "drawOdds", type: "uint256" },
			],
			stateMutability: "view",
			type: "function",
		},
		{
			inputs: [
				{ name: "market", type: "address" },
				{ name: "position", type: "uint8" },
				{ name: "amount", type: "uint256" },
			],
			name: "buyFromAMM",
			outputs: [{ name: "", type: "uint256" }],
			stateMutability: "nonpayable",
			type: "function",
		},
	];

	constructor(private readonly configService: ConfigService) {
		super("overtime");
		this.initializeProvider();
	}

	private initializeProvider(): void {
		const rpcUrl = this.configService.get<string>(
			"ETH_RPC_URL",
			"https://arbitrum-mainnet.infura.io/v3/YOUR_INFURA_KEY"
		);
		const privateKey = this.configService.get<string>("ETH_PRIVATE_KEY");

		this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
		if (privateKey) {
			this.signer = new ethers.Wallet(privateKey, this.provider);
		}
	}

	async getActiveMarkets(): Promise<OvertimeMarket[]> {
		try {
			// In production, this would call the Overtime API
			// For now, we'll return mock data
			const response = await fetch(
				"https://overtimemarketsv2.xyz/arbitrum/markets"
			);
			if (!response.ok) {
				throw new Error(`Failed to fetch markets: ${response.statusText}`);
			}
			const markets = await response.json();
			return markets.filter((m: any) => m.isOpen);
		} catch (error) {
			this.logger.error("Error fetching active markets", error);
			return [];
		}
	}

	async getMarketOdds(marketAddress: string): Promise<{
		home: number;
		away: number;
		draw: number | null;
	}> {
		try {
			const sportsAMM = new ethers.Contract(
				this.OVERTIME_CONTRACTS.SportsAMM,
				this.SPORTS_AMM_ABI,
				this.provider
			);

			const [homeOdds, awayOdds, drawOdds] =
				await sportsAMM.getMarketDefaultOdds(marketAddress);

			return {
				home: parseFloat(ethers.utils.formatEther(homeOdds)),
				away: parseFloat(ethers.utils.formatEther(awayOdds)),
				draw: drawOdds.gt(0)
					? parseFloat(ethers.utils.formatEther(drawOdds))
					: null,
			};
		} catch (error) {
			this.logger.error("Error getting market odds", error);
			throw error;
		}
	}

	async placeBet(params: BetParams): Promise<BetResult> {
		try {
			if (!this.signer) {
				throw new Error("No signer available for transactions");
			}

			const positionMap = { home: 0, away: 1, draw: 2 };
			const positionIndex = positionMap[params.position];

			const sportsAMM = new ethers.Contract(
				this.OVERTIME_CONTRACTS.SportsAMM,
				this.SPORTS_AMM_ABI,
				this.signer
			);

			const amountWei = ethers.utils.parseEther(params.amount);

			// Estimate gas
			const gasEstimate = await sportsAMM.estimateGas.buyFromAMM(
				params.marketAddress,
				positionIndex,
				amountWei
			);

			// Execute transaction
			const tx = await sportsAMM.buyFromAMM(
				params.marketAddress,
				positionIndex,
				amountWei,
				{
					gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
				}
			);

			this.logger.log(`Bet transaction sent: ${tx.hash}`);

			// Wait for confirmation
			const receipt = await tx.wait();

			return {
				success: true,
				betId: `bet_${Date.now()}`,
				txHash: receipt.transactionHash,
				status: "confirmed",
				message: "Bet placed successfully",
				details: {
					blockNumber: receipt.blockNumber,
					gasUsed: receipt.gasUsed.toString(),
				},
			};
		} catch (error: any) {
			this.logger.error("Error placing bet", error);

			// Handle specific errors
			if (error.code === "INSUFFICIENT_FUNDS") {
				return {
					success: false,
					status: "failed",
					message: "Insufficient balance for bet",
					details: { error: error.message },
				};
			}

			if (error.code === "NETWORK_ERROR") {
				return {
					success: false,
					status: "failed",
					message: "Network error occurred",
					details: { error: error.message },
				};
			}

			return {
				success: false,
				status: "failed",
				message: "Failed to place bet",
				details: { error: error.message },
			};
		}
	}

	async getBetStatus(betId: string): Promise<any> {
		// In a real implementation, this would query the blockchain
		// or a database for bet status
		return {
			betId,
			status: "pending",
			message: "Bet status check not yet implemented",
		};
	}

	// Required abstract methods from BaseSwapProvider
	async getUnsignedTransaction(
		params: SwapParams
	): Promise<UnsignedSwapTransaction> {
		throw new Error(
			"Overtime provider does not support standard swap transactions"
		);
	}

	async getSwapQuote(params: SwapParams): Promise<SwapQuote> {
		throw new Error("Overtime provider does not support standard swaps");
	}

	async isSwapSupported(
		fromToken: TokenInfo,
		toToken: TokenInfo
	): Promise<boolean> {
		// Overtime only supports sUSD for betting
		return false;
	}
}
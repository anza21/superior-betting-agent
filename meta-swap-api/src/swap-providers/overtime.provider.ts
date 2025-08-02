import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import { GraphQLClient, gql } from "graphql-request";
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

	// The Graph hosted service has been deprecated, using decentralized network endpoint
	// In production, you would need to use the new decentralized Graph Network
	// with proper API key and payment setup
	private readonly GRAPH_URL = "https://gateway-arbitrum.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]";
	private graphClient: GraphQLClient;

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
		
		// Initialize GraphQL client
		this.graphClient = new GraphQLClient(this.GRAPH_URL);
	}

	async getActiveMarkets(): Promise<OvertimeMarket[]> {
		try {
			// Note: The Graph hosted service has been deprecated
			// In production, you need to:
			// 1. Register on The Graph Network
			// 2. Get an API key
			// 3. Find the Overtime subgraph ID on the decentralized network
			// 4. Update the GRAPH_URL with proper credentials
			
			// For demonstration, return realistic mock data
			const currentTime = Date.now();
			const mockMarkets: OvertimeMarket[] = [
				// NFL Games
				{
					address: "0x1234567890abcdef1234567890abcdef12345678",
					sport: "American Football",
					homeTeam: "Kansas City Chiefs",
					awayTeam: "Buffalo Bills",
					homeOdds: 1.95,
					awayOdds: 1.95,
					maturityDate: new Date(currentTime + 2 * 24 * 60 * 60 * 1000).toISOString(),
					isOpen: true
				},
				// NBA Games
				{
					address: "0x2345678901bcdef2345678901bcdef234567890",
					sport: "Basketball",
					homeTeam: "Los Angeles Lakers",
					awayTeam: "Boston Celtics",
					homeOdds: 2.10,
					awayOdds: 1.75,
					maturityDate: new Date(currentTime + 1 * 24 * 60 * 60 * 1000).toISOString(),
					isOpen: true
				},
				// Soccer/Football
				{
					address: "0x3456789012cdef3456789012cdef34567890123",
					sport: "Soccer",
					homeTeam: "Manchester United",
					awayTeam: "Liverpool",
					homeOdds: 2.45,
					awayOdds: 2.85,
					drawOdds: 3.20,
					maturityDate: new Date(currentTime + 3 * 24 * 60 * 60 * 1000).toISOString(),
					isOpen: true
				},
				// Tennis
				{
					address: "0x456789ab12def456789ab12def456789ab12def",
					sport: "Tennis",
					homeTeam: "Novak Djokovic",
					awayTeam: "Carlos Alcaraz",
					homeOdds: 1.65,
					awayOdds: 2.35,
					maturityDate: new Date(currentTime + 4 * 24 * 60 * 60 * 1000).toISOString(),
					isOpen: true
				},
				// Hockey
				{
					address: "0x56789abc23ef56789abc23ef56789abc23ef567",
					sport: "Hockey",
					homeTeam: "Toronto Maple Leafs",
					awayTeam: "Montreal Canadiens",
					homeOdds: 1.80,
					awayOdds: 2.20,
					maturityDate: new Date(currentTime + 2 * 24 * 60 * 60 * 1000).toISOString(),
					isOpen: true
				}
			];

			this.logger.log(`Returning ${mockMarkets.length} demonstration markets (Graph integration pending)`);
			
			// Once The Graph integration is properly configured, use this query:
			/*
			const query = gql`
				query GetActiveMarkets($timestamp: BigInt!) {
					sportMarkets(
						first: 100
						where: {
							isOpen: true
							maturityDate_gt: $timestamp
							isCanceled: false
						}
						orderBy: maturityDate
						orderDirection: asc
					) {
						id
						address
						gameId
						tags
						isOpen
						maturityDate
						homeTeam
						awayTeam
						homeOdds
						awayOdds
						drawOdds
						finalResult
						poolSize
					}
				}
			`;
			
			const currentTimestamp = Math.floor(Date.now() / 1000);
			const data: any = await this.graphClient.request(query, {
				timestamp: currentTimestamp.toString()
			});
			*/
			
			return mockMarkets;
		} catch (error) {
			this.logger.error("Error in getActiveMarkets", error);
			return [];
		}
	}

	private getSportFromTags(tags: string[]): string {
		// Extract sport name from tags
		if (!tags || tags.length === 0) return "Unknown";
		
		// Tags usually contain sport ID in first element
		const sportMap: Record<string, string> = {
			"9001": "Football",
			"9002": "Baseball", 
			"9003": "Basketball",
			"9004": "Hockey",
			"9005": "Soccer",
			"9006": "MMA",
			"9007": "Boxing",
			"9008": "Tennis",
			"9010": "American Football",
			"9011": "Golf"
		};
		
		return sportMap[tags[0]] || tags[0] || "Unknown";
	}

	async getMarketOdds(marketAddress: string): Promise<{
		home: number;
		away: number;
		draw: number | null;
	}> {
		try {
			// For demonstration, return odds based on market address
			const mockOdds: Record<string, { home: number; away: number; draw: number | null }> = {
				"0x1234567890abcdef1234567890abcdef12345678": {
					home: 1.95,
					away: 1.95,
					draw: null // NFL - no draw
				},
				"0x2345678901bcdef2345678901bcdef234567890": {
					home: 2.10,
					away: 1.75,
					draw: null // NBA - no draw
				},
				"0x3456789012cdef3456789012cdef34567890123": {
					home: 2.45,
					away: 2.85,
					draw: 3.20 // Soccer - has draw
				},
				"0x456789ab12def456789ab12def456789ab12def": {
					home: 1.65,
					away: 2.35,
					draw: null // Tennis - no draw
				},
				"0x56789abc23ef56789abc23ef56789abc23ef567": {
					home: 1.80,
					away: 2.20,
					draw: null // Hockey - no draw
				}
			};

			const odds = mockOdds[marketAddress.toLowerCase()];
			if (!odds) {
				// Default odds if market not found
				this.logger.warn(`Market not found: ${marketAddress}, returning default odds`);
				return {
					home: 2.00,
					away: 2.00,
					draw: null
				};
			}

			this.logger.log(`Returning demonstration odds for market: ${marketAddress}`);
			return odds;

			// Once The Graph integration is configured:
			/*
			const query = gql`
				query GetMarketOdds($address: String!) {
					sportMarket(id: $address) {
						id
						address
						homeOdds
						awayOdds
						drawOdds
						isOpen
						homeTeam
						awayTeam
					}
				}
			`;

			const data: any = await this.graphClient.request(query, {
				address: marketAddress.toLowerCase()
			});
			*/
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
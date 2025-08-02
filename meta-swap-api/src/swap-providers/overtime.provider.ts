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

// Overtime market interface
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

	// The Graph Network configuration
	private readonly GRAPH_API_KEY = this.configService?.get<string>('GRAPH_API_KEY', '') || '';
	// Note: Using the v1 hosted service endpoint for now
	// The v2 subgraph may not be migrated to the decentralized network yet
	private get GRAPH_URL(): string {
		// Try custom URL first if provided
		const customUrl = this.configService?.get<string>('GRAPH_SUBGRAPH_URL', '');
		if (customUrl) {
			return customUrl;
		}
		// Use the hosted service endpoint (still works for some subgraphs)
		return 'https://api.thegraph.com/subgraphs/name/thales-markets/overtime-arbitrum';
	}
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
		if (this.GRAPH_URL) {
			this.graphClient = new GraphQLClient(this.GRAPH_URL);
			this.logger.log(`GraphQL client initialized with URL: ${this.GRAPH_URL}`);
		} else {
			this.logger.warn('No Graph URL configured - using mock data');
		}
	}

	async getActiveMarkets(): Promise<OvertimeMarket[]> {
		try {
			// If GraphQL client is not initialized, return mock data
			if (!this.graphClient) {
				this.logger.log('Returning mock data - GraphQL client not initialized');
				return this.getMockMarkets();
			}

			console.log('Starting Graph query with URL:', this.GRAPH_URL);
			console.log('API Key present:', !!this.GRAPH_API_KEY);
			
			// Query The Graph for active markets
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

			const variables = {
				timestamp: Math.floor(Date.now() / 1000).toString(),
			};

			this.logger.log('Querying The Graph for active markets');
			const data: any = await this.graphClient.request(query, variables);

			if (!data.sportMarkets || data.sportMarkets.length === 0) {
				this.logger.log('No active markets found on The Graph');
				return [];
			}

			this.logger.log(`Found ${data.sportMarkets.length} active markets from The Graph`);

			// Transform Graph data to our format
			const markets: OvertimeMarket[] = data.sportMarkets.map((market: any) => ({
				address: market.address,
				sport: this.getSportFromTags(market.tags),
				homeTeam: market.homeTeam,
				awayTeam: market.awayTeam,
				homeOdds: parseFloat(market.homeOdds),
				awayOdds: parseFloat(market.awayOdds),
				drawOdds: market.drawOdds ? parseFloat(market.drawOdds) : undefined,
				maturityDate: new Date(parseInt(market.maturityDate) * 1000).toISOString(),
				isOpen: market.isOpen,
			}));

			return markets;
		} catch (error) {
			this.logger.error('Error fetching active markets from The Graph:', error);
			console.error('Full error object:', error);
			console.error('Graph URL:', this.GRAPH_URL);
			console.error('API Key exists:', !!this.GRAPH_API_KEY);
			this.logger.error('Error details:', {
				message: (error as any).message || 'No message',
				response: (error as any).response?.data || (error as any).response || 'No response',
				graphUrl: this.GRAPH_URL
			});
			// Return mock data as fallback
			return this.getMockMarkets();
		}
	}

	async getMarketOdds(marketAddress: string): Promise<{
		marketAddress: string;
		odds: {
			home: number;
			away: number;
			draw?: number;
		};
		timestamp: string;
	}> {
		// If GraphQL client is not initialized, return mock data
		if (!this.graphClient) {
			this.logger.log('Returning mock odds - GraphQL client not initialized');
			return this.getMockOdds(marketAddress);
		}

		try {
			// Query The Graph for specific market
			const query = gql`
				query GetMarketOdds($id: ID!) {
					sportMarket(id: $id) {
						id
						address
						homeOdds
						awayOdds
						drawOdds
						isOpen
						isCanceled
					}
				}
			`;

			const variables = {
				id: marketAddress.toLowerCase(),
			};

			this.logger.log(`Querying The Graph for market odds: ${marketAddress}`);
			const data: any = await this.graphClient.request(query, variables);

			if (!data.sportMarket || !data.sportMarket.isOpen) {
				this.logger.warn(`Market ${marketAddress} not found or not open`);
				return {
					marketAddress,
					odds: { home: 0, away: 0 },
					timestamp: new Date().toISOString()
				};
			}

			const market = data.sportMarket;
			const odds: any = {
				home: parseFloat(market.homeOdds),
				away: parseFloat(market.awayOdds)
			};

			if (market.drawOdds) {
				odds.draw = parseFloat(market.drawOdds);
			}

			return {
				marketAddress,
				odds,
				timestamp: new Date().toISOString()
			};
		} catch (error) {
			this.logger.error('Error fetching market odds from The Graph:', error);
			this.logger.error('Error details:', {
				message: (error as any).message,
				response: (error as any).response,
				graphUrl: this.GRAPH_URL,
				marketAddress
			});
			// Return mock data as fallback
			return this.getMockOdds(marketAddress);
		}
	}

	async placeBet(params: BetParams): Promise<BetResult> {
		try {
			// Validate parameters
			if (!this.signer) {
				return {
					success: false,
					status: "error",
					message: "No signer configured. Please provide ETH_PRIVATE_KEY.",
					details: { error: "Missing private key" }
				};
			}

			// Convert position to numeric value
			const positionMap: Record<string, number> = {
				"home": 0,
				"away": 1,
				"draw": 2
			};
			const positionValue = positionMap[params.position];

			// Create contract instance
			const sportsAMM = new ethers.Contract(
				this.OVERTIME_CONTRACTS.SportsAMM,
				this.SPORTS_AMM_ABI,
				this.signer
			);

			// Convert amount to wei (assuming sUSD has 18 decimals)
			const amountWei = ethers.utils.parseUnits(params.amount, 18);

			// Execute bet transaction
			this.logger.log(`Placing bet on market ${params.marketAddress} for position ${params.position} with amount ${params.amount} sUSD`);
			
			const tx = await sportsAMM.buyFromAMM(
				params.marketAddress,
				positionValue,
				amountWei
			);

			this.logger.log(`Transaction sent: ${tx.hash}`);

			// Wait for confirmation
			const receipt = await tx.wait();

			return {
				success: true,
				betId: receipt.transactionHash,
				txHash: receipt.transactionHash,
				status: "completed",
				message: "Bet placed successfully",
				details: {
					blockNumber: receipt.blockNumber,
					gasUsed: receipt.gasUsed.toString(),
					events: receipt.events
				}
			};
		} catch (error) {
			this.logger.error("Error placing bet:", error);
			return {
				success: false,
				status: "error",
				message: (error as any).message || "Failed to place bet",
				details: { error }
			};
		}
	}

	async getBetStatus(betId: string): Promise<BetResult> {
		try {
			// Check transaction status
			const tx = await this.provider.getTransaction(betId);
			if (!tx) {
				return {
					success: false,
					betId,
					status: "not_found",
					message: "Transaction not found"
				};
			}

			const receipt = await this.provider.getTransactionReceipt(betId);
			if (!receipt) {
				return {
					success: false,
					betId,
					txHash: betId,
					status: "pending",
					message: "Transaction is pending"
				};
			}

			return {
				success: receipt.status === 1,
				betId,
				txHash: betId,
				status: receipt.status === 1 ? "completed" : "failed",
				message: receipt.status === 1 ? "Bet completed successfully" : "Bet transaction failed",
				details: {
					blockNumber: receipt.blockNumber,
					gasUsed: receipt.gasUsed.toString()
				}
			};
		} catch (error) {
			this.logger.error("Error checking bet status:", error);
			return {
				success: false,
				betId,
				status: "error",
				message: (error as any).message || "Failed to check bet status",
				details: { error }
			};
		}
	}

	// Required abstract methods from BaseSwapProvider
	async getUnsignedTransaction(params: SwapParams): Promise<UnsignedSwapTransaction> {
		throw new Error(
			"Overtime provider does not support standard token swaps. Use placeBet for sports betting."
		);
	}

	async swap(params: SwapParams): Promise<UnsignedSwapTransaction> {
		throw new Error(
			"Overtime provider does not support standard token swaps. Use placeBet for sports betting."
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

	private getMockMarkets(): OvertimeMarket[] {
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

		this.logger.log(`Returning ${mockMarkets.length} demonstration markets (API key not configured)`);
		return mockMarkets;
	}

	private getMockOdds(marketAddress: string): any {
		const mockOdds: Record<string, any> = {
			"0x1234567890abcdef1234567890abcdef12345678": {
				home: 1.95,
				away: 1.95
			},
			"0x2345678901bcdef2345678901bcdef234567890": {
				home: 2.10,
				away: 1.75
			},
			"0x3456789012cdef3456789012cdef34567890123": {
				home: 2.45,
				away: 2.85,
				draw: 3.20
			},
			"0x456789ab12def456789ab12def456789ab12def": {
				home: 1.65,
				away: 2.35
			},
			"0x56789abc23ef56789abc23ef56789abc23ef567": {
				home: 1.80,
				away: 2.20
			}
		};

		const odds = mockOdds[marketAddress.toLowerCase()] || {
			home: 2.00,
			away: 2.00
		};

		return {
			marketAddress,
			odds,
			timestamp: new Date().toISOString()
		};
	}

	private getSportFromTags(tags: string[]): string {
		if (!tags || tags.length === 0) return "Unknown";
		
		// First tag usually contains the sport ID
		const sportId = tags[0];
		
		// Common Overtime sport IDs
		const sportMap: Record<string, string> = {
			"9001": "American Football",
			"9002": "Baseball", 
			"9003": "Basketball",
			"9004": "Boxing",
			"9005": "Cricket",
			"9006": "MMA",
			"9007": "Soccer",
			"9008": "Tennis",
			"9010": "Hockey",
			"9011": "Formula 1",
			"9012": "MotoGP",
			"9013": "Golf",
			"9014": "Nascar",
			"9016": "CS:GO",
			"9017": "League of Legends"
		};
		
		return sportMap[sportId] || "Other";
	}
}
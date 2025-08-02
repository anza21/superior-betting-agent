import { Injectable, Logger } from "@nestjs/common";
import { OvertimeProvider } from "../swap-providers/overtime.provider";
import { PlaceBetDto } from "./dto/place-bet.dto";
import { MarketDto } from "./dto/market.dto";
import { BetStatusDto } from "./dto/bet-status.dto";

@Injectable()
export class OvertimeService {
	private readonly logger = new Logger(OvertimeService.name);

	constructor(private readonly overtimeProvider: OvertimeProvider) {}

	async getActiveMarkets(): Promise<MarketDto[]> {
		this.logger.log("Fetching active sports betting markets");
		const markets = await this.overtimeProvider.getActiveMarkets();
		this.logger.log(`Found ${markets.length} active markets`);
		return markets;
	}

	async getMarketOdds(marketAddress: string) {
		this.logger.log(`Fetching odds for market: ${marketAddress}`);
		const odds = await this.overtimeProvider.getMarketOdds(marketAddress);
		return {
			marketAddress,
			odds,
			timestamp: new Date().toISOString(),
		};
	}

	async placeBet(placeBetDto: PlaceBetDto): Promise<BetStatusDto> {
		this.logger.log("Placing bet", {
			market: placeBetDto.market_address,
			position: placeBetDto.position,
			amount: placeBetDto.amount,
		});

		// Validate bet parameters
		this.validateBetParams(placeBetDto);

		// Place the bet
		const result = await this.overtimeProvider.placeBet({
			marketAddress: placeBetDto.market_address,
			position: placeBetDto.position,
			amount: placeBetDto.amount,
			odds: placeBetDto.odds,
			deadline: placeBetDto.deadline,
		});

		if (result.success) {
			this.logger.log(`Bet placed successfully: ${result.txHash}`);
		} else {
			this.logger.error(`Failed to place bet: ${result.message}`);
		}

		return {
			success: result.success,
			betId: result.betId,
			txHash: result.txHash,
			status: result.status,
			message: result.message,
			details: result.details,
			timestamp: new Date().toISOString(),
		};
	}

	async getBetStatus(betId: string): Promise<BetStatusDto> {
		this.logger.log(`Fetching status for bet: ${betId}`);
		const status = await this.overtimeProvider.getBetStatus(betId);
		return {
			...status,
			timestamp: new Date().toISOString(),
		};
	}

	private validateBetParams(params: PlaceBetDto): void {
		// Validate market address
		if (!params.market_address || !params.market_address.startsWith("0x")) {
			throw new Error("Invalid market address");
		}

		// Validate position
		const validPositions = ["home", "away", "draw"];
		if (!validPositions.includes(params.position)) {
			throw new Error("Invalid position. Must be home, away, or draw");
		}

		// Validate amount
		const amount = parseFloat(params.amount);
		if (isNaN(amount) || amount <= 0) {
			throw new Error("Invalid bet amount");
		}

		// Validate odds
		const odds = parseFloat(params.odds);
		if (isNaN(odds) || odds <= 1) {
			throw new Error("Invalid odds");
		}
	}
}
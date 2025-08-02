import {
	Body,
	Controller,
	Get,
	Headers,
	HttpException,
	HttpStatus,
	Param,
	Post,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { OvertimeService } from "./overtime.service";
import { PlaceBetDto } from "./dto/place-bet.dto";
import { MarketDto } from "./dto/market.dto";
import { BetStatusDto } from "./dto/bet-status.dto";

@ApiTags("overtime")
@Controller("overtime")
export class OvertimeController {
	constructor(private readonly overtimeService: OvertimeService) {}

	@Get("markets")
	@ApiOperation({ summary: "Get active sports betting markets" })
	@ApiResponse({
		status: 200,
		description: "List of active markets",
		type: [MarketDto],
	})
	async getActiveMarkets(): Promise<MarketDto[]> {
		try {
			return await this.overtimeService.getActiveMarkets();
		} catch (error: any) {
			throw new HttpException(
				error.message || "Failed to fetch markets",
				HttpStatus.INTERNAL_SERVER_ERROR
			);
		}
	}

	@Get("market/:address/odds")
	@ApiOperation({ summary: "Get odds for a specific market" })
	@ApiResponse({
		status: 200,
		description: "Market odds",
	})
	async getMarketOdds(@Param("address") address: string) {
		try {
			return await this.overtimeService.getMarketOdds(address);
		} catch (error: any) {
			throw new HttpException(
				error.message || "Failed to fetch odds",
				HttpStatus.INTERNAL_SERVER_ERROR
			);
		}
	}

	@Post("bet")
	@ApiOperation({ summary: "Place a sports bet" })
	@ApiResponse({
		status: 201,
		description: "Bet placed successfully",
		type: BetStatusDto,
	})
	@ApiResponse({
		status: 400,
		description: "Invalid bet parameters",
	})
	@ApiResponse({
		status: 500,
		description: "Failed to place bet",
	})
	async placeBet(
		@Body() placeBetDto: PlaceBetDto,
		@Headers("x-superior-agent-id") agentId?: string,
		@Headers("x-superior-session-id") sessionId?: string
	): Promise<BetStatusDto> {
		try {
			// Log agent and session info for tracking
			if (agentId || sessionId) {
				console.log(
					`Bet request from Agent: ${agentId}, Session: ${sessionId}`
				);
			}

			const result = await this.overtimeService.placeBet(placeBetDto);

			if (!result.success) {
				throw new HttpException(
					result.message || "Failed to place bet",
					HttpStatus.BAD_REQUEST
				);
			}

			return result;
		} catch (error: any) {
			if (error instanceof HttpException) {
				throw error;
			}

			// Handle specific error cases
			if (error.message?.includes("Insufficient")) {
				throw new HttpException(
					"Insufficient balance for bet",
					HttpStatus.BAD_REQUEST
				);
			}

			if (error.message?.includes("Network")) {
				throw new HttpException(
					"Network error occurred",
					HttpStatus.SERVICE_UNAVAILABLE
				);
			}

			throw new HttpException(
				"Failed to place bet",
				HttpStatus.INTERNAL_SERVER_ERROR
			);
		}
	}

	@Get("bet/:id")
	@ApiOperation({ summary: "Get bet status by ID" })
	@ApiResponse({
		status: 200,
		description: "Bet status",
		type: BetStatusDto,
	})
	@ApiResponse({
		status: 404,
		description: "Bet not found",
	})
	async getBetStatus(
		@Param("id") betId: string,
		@Headers("x-superior-agent-id") agentId?: string,
		@Headers("x-superior-session-id") sessionId?: string
	): Promise<BetStatusDto> {
		try {
			return await this.overtimeService.getBetStatus(betId);
		} catch (error: any) {
			throw new HttpException(
				error.message || "Bet not found",
				HttpStatus.NOT_FOUND
			);
		}
	}
}
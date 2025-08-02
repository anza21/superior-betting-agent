import { ApiProperty } from "@nestjs/swagger";

export class MarketDto {
	@ApiProperty({
		description: "Market contract address",
		example: "0x1234567890abcdef1234567890abcdef12345678",
	})
	address: string;

	@ApiProperty({
		description: "Sport type",
		example: "Football",
	})
	sport: string;

	@ApiProperty({
		description: "Home team name",
		example: "Real Madrid",
	})
	homeTeam: string;

	@ApiProperty({
		description: "Away team name",
		example: "Barcelona",
	})
	awayTeam: string;

	@ApiProperty({
		description: "Home team odds",
		example: 2.15,
	})
	homeOdds: number;

	@ApiProperty({
		description: "Away team odds",
		example: 3.4,
	})
	awayOdds: number;

	@ApiProperty({
		description: "Draw odds (if applicable)",
		example: 3.2,
		required: false,
	})
	drawOdds?: number;

	@ApiProperty({
		description: "Match start time",
		example: "2025-01-25T20:00:00Z",
	})
	maturityDate: string;

	@ApiProperty({
		description: "Whether the market is open for betting",
		example: true,
	})
	isOpen: boolean;
}
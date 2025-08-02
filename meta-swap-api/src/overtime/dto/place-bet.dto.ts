import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsIn, IsNumberString, IsOptional } from "class-validator";

export class PlaceBetDto {
	@ApiProperty({
		description: "Sports market contract address",
		example: "0x1234567890abcdef1234567890abcdef12345678",
	})
	@IsString()
	market_address: string;

	@ApiProperty({
		description: "Betting position",
		enum: ["home", "away", "draw"],
		example: "home",
	})
	@IsIn(["home", "away", "draw"])
	position: "home" | "away" | "draw";

	@ApiProperty({
		description: "Bet amount in sUSD",
		example: "10",
	})
	@IsNumberString()
	amount: string;

	@ApiProperty({
		description: "Decimal odds for the position",
		example: "2.15",
	})
	@IsNumberString()
	odds: string;

	@ApiProperty({
		description: "Optional deadline timestamp",
		required: false,
	})
	@IsOptional()
	@IsString()
	deadline?: string;
}
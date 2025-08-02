import { ApiProperty } from "@nestjs/swagger";

export class BetStatusDto {
	@ApiProperty({
		description: "Whether the bet was successful",
		example: true,
	})
	success: boolean;

	@ApiProperty({
		description: "Unique bet identifier",
		example: "bet_1737850000",
		required: false,
	})
	betId?: string;

	@ApiProperty({
		description: "Transaction hash",
		example: "0x123456...",
		required: false,
	})
	txHash?: string;

	@ApiProperty({
		description: "Bet status",
		example: "confirmed",
	})
	status: string;

	@ApiProperty({
		description: "Status message",
		example: "Bet placed successfully",
	})
	message: string;

	@ApiProperty({
		description: "Additional details",
		required: false,
	})
	details?: any;

	@ApiProperty({
		description: "Timestamp",
		example: "2025-01-24T20:00:00Z",
	})
	timestamp: string;
}
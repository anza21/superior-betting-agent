import { Module } from "@nestjs/common";
import { OvertimeProvider } from "../swap-providers/overtime.provider";
import { OvertimeController } from "./overtime.controller";
import { OvertimeService } from "./overtime.service";

@Module({
	controllers: [OvertimeController],
	providers: [OvertimeService, OvertimeProvider],
	exports: [OvertimeService],
})
export class OvertimeModule {}
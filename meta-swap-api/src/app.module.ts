import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AddressesModule } from "./addresses/addresses.module";
import { GlobalModule } from "./global/global.module";
import { LoggerModuleInstance } from "./logger.instance";
import { SwapModule } from "./swap/swap.module";
import { TransferModule } from "./transfer/transfer.module";
import { OvertimeModule } from "./overtime/overtime.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		...LoggerModuleInstance(),
		SwapModule,
		AddressesModule,
		GlobalModule,
		TransferModule,
		OvertimeModule,
	],
})
export class AppModule {}

import { Module } from "@nestjs/common";
import { OneInchV6Provider } from "./1inch.v6.provider";
import { KyberSwapProvider } from "./kyber.provider";
import { OkxSwapProvider } from "./okx.provider";
import { OpenOceanProvider } from "./openfinance.provider";
import { UniswapV3Provider } from "./uniswap.provider";
import { OvertimeProvider } from "./overtime.provider";

@Module({
	providers: [
		OkxSwapProvider,
		KyberSwapProvider,
		OneInchV6Provider,
		OpenOceanProvider,
		UniswapV3Provider,
		OvertimeProvider,
	],
	exports: [
		OkxSwapProvider,
		KyberSwapProvider,
		OneInchV6Provider,
		OpenOceanProvider,
		UniswapV3Provider,
		OvertimeProvider,
	],
})
export class SwapProvidersModule {}

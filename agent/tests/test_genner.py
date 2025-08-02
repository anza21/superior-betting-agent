import os

from dotenv import load_dotenv

from src.client.openrouter import OpenRouter
from src.genner import get_genner
from src.custom_types import ChatHistory, Message
from anthropic import Anthropic
import unittest
from src.genner.Base import OllamaGenner
from src.custom_types import ChatHistory, Message
from src.agent.trading import TradingPromptGenerator
from src.config import OllamaConfig

load_dotenv()


OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") or ""

print("OPENROUTER_API_KEY:", OPENROUTER_API_KEY)
or_client = OpenRouter(
	base_url="https://openrouter.ai/api/v1",
	api_key=OPENROUTER_API_KEY,
	include_reasoning=True,
)
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

genner = get_genner(
	"gemini",  # openai, gemini, claude
	or_client=or_client,
	anthropic_client=anthropic_client,
	stream_fn=lambda token: print(token, end="", flush=True),
)

completion = genner.ch_completion(
	ChatHistory(
		[
			Message(role="system", content="You are a helpful assistant."),
			Message(role="user", content="Hello, how are you?"),
		]
	)
)

print(completion)

class TestCoinGeckoAPI(unittest.TestCase):
    def setUp(self):
        # Setup the necessary components for testing
        ollama_config = OllamaConfig(model='example_model')  # Replace 'example_model' with the actual model name
        self.prompt_generator = TradingPromptGenerator(prompts={
            'address_research_code_prompt': 'Address research code prompt',
            'research_code_prompt': 'Research code prompt',
            'trading_code_prompt': 'Trading code prompt',
            'system_prompt': 'System prompt',
            'regen_code_prompt': 'Regen code prompt',
            'strategy_prompt': 'Strategy prompt',
            'research_code_prompt_first': 'Research code prompt first'
        }, genner=None)
        self.genner = OllamaGenner(config=ollama_config, identifier="test", stream_fn=None)

    def test_generate_address_research_code_prompt(self):
        # Create a chat history with the address research prompt
        chat_history = ChatHistory([
            Message(role="user", content=self.prompt_generator.generate_address_research_code_prompt())
        ])

        # Generate code using the genner
        result = self.genner.generate_code(chat_history)

        # Check if the result is successful
        self.assertTrue(result.is_ok(), "The code generation should be successful.")

        # Extract the generated code
        generated_code, raw_response = result.unwrap()

        # Verify the generated code contains the expected API call format
        self.assertIn("https://api.coingecko.com/api/v3/", generated_code[0], "The API call should be correctly formatted.")

if __name__ == "__main__":
    unittest.main()

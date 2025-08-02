from result import Ok
from typing import List, Tuple
from src.custom_types import ChatHistory
from src.genner import Genner  # adjust this import if necessary
from result import Result


class MockGenner(Genner):
	def __init__(self, identifier: str = "mock", do_stream: bool = False):
		super().__init__(identifier, do_stream)

	def ch_completion(self, messages: ChatHistory) -> Result[str, str]:
		mock_response = "This is a mocked completion response."
		return Ok(mock_response)

	def generate_code(
		self, messages: ChatHistory, blocks: List[str] = [""]
	) -> Tuple[List[str], str]:
		mock_code = ["print('Hello, world!')", "def add(a, b): return a + b"]
		mock_response = "\n".join(mock_code)
		return mock_code, mock_response

	def generate_list(
		self, messages: ChatHistory, blocks: List[str] = [""]
	) -> Tuple[List[List[str]], str]:
		mock_lists = [["item1", "item2"], ["item3", "item4"]]
		mock_response = "- item1\n- item2\n\n- item3\n- item4"
		return mock_lists, mock_response

	def extract_code(
		self, response: str, blocks: List[str] = []
	) -> List[str]:
		mock_extracted = response.split("\n")
		return mock_extracted

	def extract_list(
		self, response: str, block_name: List[str] = []
	) -> List[List[str]]:
		mock_extracted = [
			block.strip("- ").split("\n") for block in response.split("\n\n")
		]
		return mock_extracted

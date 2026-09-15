import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# Allow import from python/
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python")))

from gemini_rest import generate_content

class TestGeminiRetry(unittest.TestCase):
    
    @patch('time.sleep', return_value=None)
    @patch('requests.post')
    @patch.dict(os.environ, {"GEMINI_API_KEY": "mock_key", "GEMINI_MODEL": "test-model"})
    def test_retry_success(self, mock_post, mock_sleep):
        # Setup mock responses: 429, 429, then 200 SUCCESS
        mock_429 = MagicMock()
        mock_429.status_code = 429
        mock_429.headers = {"Retry-After": "1"}
        
        mock_200 = MagicMock()
        mock_200.status_code = 200
        mock_200.json.return_value = {
            "candidates": [{"content": {"parts": [{"text": "success payload"}]}}]
        }
        
        mock_post.side_effect = [mock_429, mock_429, mock_200]
        
        # Action
        res = generate_content("hello")
        
        # Assertions
        self.assertEqual(res, "success payload")
        self.assertEqual(mock_post.call_count, 3)
        self.assertEqual(mock_sleep.call_count, 2)
        
    @patch('time.sleep', return_value=None)
    @patch('requests.post')
    @patch('gemini_rest.generate_content_openrouter')
    @patch.dict(os.environ, {"GEMINI_API_KEY": "mock_key", "GEMINI_MODEL": "test-model"})
    def test_retry_exhaustion(self, mock_openrouter, mock_post, mock_sleep):
        mock_openrouter.return_value = "fallback completed"
        
        # Setup mock responses: Always 429
        mock_429 = MagicMock()
        mock_429.status_code = 429
        mock_429.headers = {"Retry-After": "2"}
        
        mock_post.return_value = mock_429
        
        # Action
        res = generate_content("hello")
        
        # Assertions
        self.assertEqual(res, "fallback completed")
        
        # It tries models (1 custom, 4 hardcoded). Let's see how many total 429s it executes.
        # It should try 5 models, 5 attempts each. So 25 total post calls!
        self.assertEqual(mock_post.call_count, 25)
        self.assertEqual(mock_sleep.call_count, 25)

if __name__ == '__main__':
    unittest.main()

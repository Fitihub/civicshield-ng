<?php
// api/config.example.php
// Copy this file to api/config.local.php and fill in your own key.
// config.local.php is git-ignored and only used for local XAMPP testing.

return [
    'GROQ_API_KEY' => 'your_groq_api_key_here',
    'GROQ_TEXT_MODEL' => 'openai/gpt-oss-120b',
    'GROQ_VISION_MODEL' => 'qwen/qwen3.6-27b',
];

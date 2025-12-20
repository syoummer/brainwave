# Security Guidelines

## API Key Management

### ⚠️ NEVER commit API keys to the repository

API keys are sensitive credentials that should never be stored in version control.

### Setting up API Keys

#### Option 1: Environment Variables (Recommended for Development)
1. Copy `.env.example` to `.env`
2. Replace placeholder values with your actual API keys
3. The `.env` file is already in `.gitignore` and will not be committed

#### Option 2: Settings Dialog (Recommended for End Users)
1. Launch the Electron app
2. Open Settings from the menu
3. Enter your API keys in the secure settings dialog
4. Keys are stored encrypted in your system's user data directory

### Getting API Keys

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)

#### Google Gemini API Key (Optional)
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Generative AI API
3. Create credentials and get your API key

### Security Best Practices

1. **Never share API keys** in chat, email, or public forums
2. **Revoke compromised keys** immediately from the provider's dashboard
3. **Use environment-specific keys** for development vs production
4. **Monitor usage** regularly in your API provider's dashboard
5. **Set usage limits** to prevent unexpected charges

### If You Accidentally Commit an API Key

1. **Immediately revoke** the exposed key from your provider's dashboard
2. **Generate a new key** to replace it
3. **Remove the key** from your repository and commit the change
4. **Consider the repository compromised** - anyone who had access may have seen the key

## Reporting Security Issues

If you discover a security vulnerability, please report it privately to the maintainers.
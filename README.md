
# Discord Suggestion Bot

This Discord bot allows users to set up a suggestion system in their servers. It provides features to create suggestions, react to them with emojis, and accept or reject suggestions with reasons provided via modals. 

## Features

- **Setup Suggestions Channel**: Configure a channel for suggestions, set reaction emojis, and specify a role that can use the buttons.
- **Reaction-Based Interaction**: Add emojis to messages for reaction-based suggestions.
- **Modals for Reasons**: Collect reasons for accepting or rejecting suggestions via modals.
- **Database Integration**: Store suggestions and their statuses in an SQLite database.
- **Automatic Notifications**: Notify users when their suggestions are accepted or rejected.

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/your-repo.git
   cd your-repo
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Create a `.env` File**
   Create a `.env` file in the root directory of your project and add the following environment variables:
   ```
   BOT_TOKEN=your-bot-token
   client_id=your-client-id
   ```

4. **Set Up the Database**
   The bot will automatically create an SQLite database named `suggestions.db` if it does not exist.

## Usage

1. **Start the Bot**
   ```bash
   node index.js
   ```

2. **Setup Suggestions**
   Use the `/setup-suggestions` command to set up a suggestions channel. Provide the required options:
   - **Channel**: The channel where suggestions will be sent.
   - **Emoji1**: The first emoji for reactions.
   - **Emoji2**: The second emoji for reactions.
   - **Role**: The role that can use the buttons to accept or reject suggestions.

3. **Add Suggestions**
   Users can send messages in the designated suggestions channel. Each message will be sent as an embedded suggestion with accept and reject buttons.

4. **React to Suggestions**
   React to suggestions with the configured emojis to initiate the process of acceptance or rejection.

## Commands

### `/setup-suggestions`

Sets up a channel for suggestions with specified emojis and role.

**Options:**
- **channel**: The channel to be set up.
- **emoji1**: The first reaction emoji.
- **emoji2**: The second reaction emoji.
- **role**: The role allowed to interact with the suggestions.

## Images

To include images in the README, place them in the `images` folder and reference them like this:

![Setup Command](images/setup-command.png)
*Figure 1: Setup Suggestions Command*

![Suggestion Embed](images/suggestion-embed.png)
*Figure 2: Suggestion Embed Example*

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [discord.js](https://discord.js.org/) - The library used for building the bot.

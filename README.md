# AskHandle API Based Messenger

This repository contains the code for the AskHandle API Based Messenger. The application allows users to interact with the AI model through a chat interface. This guide will help developers set up, run, and deploy the project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Project Locally](#running-the-project-locally)
- [Deployment](#deployment)
  - [Deploying to Vercel](#deploying-to-vercel)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js** (version 18.x or later)
- **npm** (comes with Node.js)
- **Vercel CLI** (optional, for local development and deployment)

## Project Structure

```
- api/
  - createRoom.js         # Serverless function for chat room creation
  - sendMessage.js        # Serverless function for handling chat messages
  - defaultQuestions.js   # Serverless function to show quick reply buttons
- public/
  - index.html            # Main HTML file for the chat interface
  - main.js               # JavaScript file for frontend logic
  - styles.css            # CSS styles for the chat interface
  - images/               # Directory containing image assets
- .env                    # Environment variables file (not committed to version control)
- package.json            # Project metadata and dependencies
- README.md               # This readme file
```

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/api-based-messenger.git
   cd api-based-messenger
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

   > **Note:** This will install the dependencies defined in `package.json` but **without SendGrid or OpenAI** as you've removed them.

## Environment Variables

The application uses the AskHandle API and requires an API key. You need to set up environment variables to run the project locally and in production.

1. **Create a `.env` File**

   At the root of the project, create a `.env` file:

   ```bash
   touch .env
   ```

2. **Add Your AskHandle API Token**

   Inside the `.env` file, add the following line:

   ```env
   ASKHANDLE_API_TOKEN=your_askhandle_token_here
   ```

   Replace `your_askhandle_token_here` with your actual AskHandle Token.

> **Note:** Never commit your `.env` file or API keys to version control. Ensure it's listed in your `.gitignore` file.

## Running the Project Locally

You can run the project locally using the Vercel development server, which emulates the production environment, including serverless functions.

1. **Install Vercel CLI (if not already installed)**

   ```bash
   npm install -g vercel
   ```

2. **Run the Development Server**

   ```bash
   vercel dev
   ```

   This command starts the application at `http://localhost:3000`.

3. **Access the Application**

   Open your web browser and navigate to `http://localhost:3000` to use the chat interface.

> **Note:** Since you're no longer using SendGrid or OpenAI, your app should only use the AskHandle API now.

## Deployment

### Deploying to Vercel

The application is designed to be deployed on Vercel, which supports serverless functions out of the box.

1. **Log In to Vercel CLI**

   If you haven't logged in before, run:

   ```bash
   vercel login
   ```

2. **Initialize the Project with Vercel**

   ```bash
   vercel
   ```

   - Follow the prompts to set up the project.
   - Choose the correct scope and project name.
   - When asked for the root directory, keep it as the default (`./`).

3. **Set Environment Variables on Vercel**

   - Go to your Vercel dashboard.
   - Navigate to **Settings** > **Environment Variables**.
   - Add the `ASKHANDLE_API_TOKEN` environment variable with your API key.

4. **Deploy the Application**

   ```bash
   vercel --prod
   ```

   This command deploys the application to Vercel's production environment.

5. **Access the Deployed Application**

   - After deployment, Vercel will provide a URL where your application is hosted.
   - You can also set up a custom domain in the Vercel dashboard if desired.

## Troubleshooting

- **Issue:** `Error: 'vercel dev' must not recursively invoke itself.`
  - **Solution:** Remove or modify the `dev` script in `package.json` to prevent recursive calls.

- **Issue:** API calls are not working on the custom domain.
  - **Solution:** Ensure that the frontend always uses `/api/sendMessage` as the endpoint for API requests.

- **Issue:** Environment variables are not available.
  - **Solution:** Verify that the `.env` file exists locally and that environment variables are set in Vercel's dashboard.

- **Issue:** Missing dependencies or modules.
  - **Solution:** Run `npm install` to ensure all dependencies are installed.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


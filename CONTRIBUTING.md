# Contributing to This Project

We welcome contributions from everyone. Here are a few guidelines to help you get started.

## Fork the Repository

Start by forking the repository to your own GitHub account. This allows you to propose changes to the codebase without access to the main repository.

## Clone the Repository

After forking the repository, you'll need to clone it to your local machine. This is where you'll be doing all of your work.

```sh
git clone https://github.com/<your-username>/homebridge-alexa-smarthome.git
```

## Create a New Branch

It's best practice to create a new branch for each new feature or bug fix you're working on. This keeps your changes organized and separated from the main branch.

## Local Setup

This project requires Node.js version 18.x, 20.x, or 22.x. If you don't have Node.js installed, you can download it from [the official Node.js website](https://nodejs.org/). After installing Node.js, you can verify the version by running `node -v` in your terminal.

Once you have the correct version of Node.js installed, navigate to the project directory and install the dependencies listed in the `package.json` file by running `npm install`. This will install all the necessary packages for you to be able to run the project locally.

## Make Your Changes

Now you're ready to make your changes! Feel free to make your changes in the editor of your choice.

## Add Tests

Please consider adding tests where appropriate. Depending on the complexity or magnitude of your changes, the project maintainer may require new tests.

## Lint Your Code

Make sure your code has been linted with Prettier and ESLint. This ensures that your code follows the style guidelines of the project.

```sh
npm run lint && npm run format
```

## Test Your Code

Lastly, before submitting your changes, make sure the tests pass.

```sh
npm run test-ci
```

You can run both the integration and unit tests using `npm test` as well, but that is optional. The integration tests require creating a `.env` file in the root of the repository (see [.env.example](./.env.example)) and a valid `.homebridge-alexa-smarthome` file in the root of the repository. You can copy the `.homebridge-alexa-smarthome` file from your Homebridge server if you have this plugin installed and working already.

## Submit a Pull Request

Once you've made your changes and ensured they're properly linted, you're ready to submit a pull request. Push your changes to your forked repository.

```sh
git push origin <branch-name>
```

Go to your forked repository on GitHub. Click the 'New pull request' button next to your branch. Review your changes and then click 'Create pull request'. Fill out the PR form, then click 'Create pull request' again to submit.

Thank you for your contribution!

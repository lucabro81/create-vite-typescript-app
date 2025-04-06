#!/usr/bin/env node

import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Converts a string to kebab-case
 * Handles PascalCase, camelCase, snake_case, and space-separated strings
 * @param {string} str - The string to convert
 * @return {string} The kebab-case version of the string
 */
function toKebabCase(str) {
  // Handle empty strings
  if (!str) return "";

  // Replace spaces, underscores, and dots with hyphens
  let result = str.replace(/[\s_\.]+/g, "-");

  // Handle camelCase and PascalCase
  result = result.replace(/([a-z])([A-Z])/g, "$1-$2");

  // Convert to lowercase and remove any non-alphanumeric characters except hyphens
  result = result.toLowerCase().replace(/[^a-z0-9-]/g, "");

  // Remove leading and trailing hyphens
  result = result.replace(/^-+|-+$/g, "");

  return result;
}

async function promptUser() {
  console.log(chalk.blue("Welcome to the project setup wizard!"));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: "What is your project name?",
      default: "my-app",
      validate: (input) => {
        if (/^[a-zA-Z0-9-_\s.]+$/.test(input)) return true;
        return "Project name may only include letters, numbers, underscores, hyphens, spaces and dots";
      },
    },
    {
      type: "input",
      name: "authorName",
      message: "What is your name (author)?",
      default: "",
    },
    {
      type: "input",
      name: "description",
      message: "Project description:",
      default: "",
    },
    {
      type: "input",
      name: "keywords",
      message: "Keywords (comma separated):",
      default: "",
      filter: (input) => {
        if (!input) return [];
        return input
          .split(",")
          .map((keyword) => keyword.trim())
          .filter((keyword) => keyword);
      },
    },
    {
      type: "input",
      name: "repositoryUrl",
      message: "Repository URL:",
      default: "",
    },
  ]);

  // Add the kebab-case version of the project name
  answers.projectNameKebab = toKebabCase(answers.projectName);

  return answers;
}

async function init() {
  try {
    const answers = await promptUser();
    console.log(
      chalk.green(
        `\nCreating a new project with name: ${chalk.bold(answers.projectName)}`
      )
    );

    if (answers.projectName !== answers.projectNameKebab) {
      console.log(
        chalk.yellow(
          `Using "${chalk.bold(
            answers.projectNameKebab
          )}" as the directory and package name`
        )
      );
    }

    if (answers.authorName) {
      console.log(chalk.green(`Author: ${chalk.bold(answers.authorName)}`));
    }

    if (answers.description) {
      console.log(chalk.green(`Description: ${answers.description}`));
    }

    if (answers.keywords.length > 0) {
      console.log(chalk.green(`Keywords: ${answers.keywords.join(", ")}`));
    }

    if (answers.repositoryUrl) {
      console.log(chalk.green(`Repository: ${answers.repositoryUrl}`));
    }

    const {
      projectName,
      projectNameKebab,
      authorName,
      description,
      keywords,
      repositoryUrl,
    } = answers;

    // Create the project directory
    const projectPath = path.join(process.cwd(), projectNameKebab);

    if (fs.existsSync(projectPath)) {
      console.log(chalk.red(`The folder ${projectNameKebab} already exists!`));
      process.exit(1);
    }

    fs.mkdirSync(projectPath);

    const directories = ["src", "src/core", "src/types", "src/utils"];

    directories.forEach((dir) => {
      fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
    });

    console.log(chalk.green("\nSuccess!"));
  } catch (error) {
    console.error(chalk.red("Error:"), error);
  }
}

init();

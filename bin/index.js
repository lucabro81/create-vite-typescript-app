#!/usr/bin/env node

import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";
import { execSync } from "child_process";

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
    {
      type: "list",
      name: "packageManager",
      message: "Which package manager do you want to use?",
      choices: ["pnpm", "npm", "yarn"],
      default: "pnpm",
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
      packageManager,
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

    // Create package.json from template
    const templateDir = path.join(__dirname, "..", "templates");

    // Load and compile the package.json template
    const packageJsonTemplatePath = path.join(templateDir, "package.json.hbs");
    const packageJsonTemplateContent = fs.readFileSync(
      packageJsonTemplatePath,
      "utf-8"
    );
    const packageJsonTemplate = Handlebars.compile(packageJsonTemplateContent);

    // Prepare template data
    const templateData = {
      name: projectNameKebab,
      description,
      author: authorName,
      keywords,
      repository: repositoryUrl,
    };

    // Generate package.json content
    const packageJsonContent = packageJsonTemplate(templateData);

    // Write package.json to project directory
    fs.writeFileSync(
      path.join(projectPath, "package.json"),
      packageJsonContent
    );

    console.log(chalk.green("Created package.json"));

    // Create vite.config.ts from template
    const viteConfigTemplatePath = path.join(templateDir, "vite.config.ts.hbs");
    const viteConfigTemplateContent = fs.readFileSync(
      viteConfigTemplatePath,
      "utf-8"
    );
    const viteConfigTemplate = Handlebars.compile(viteConfigTemplateContent);

    // Generate vite.config.ts content
    const viteConfigContent = viteConfigTemplate({
      name: projectName, // Using the original project name for the library name in vite config
    });

    // Write vite.config.ts to project directory
    fs.writeFileSync(
      path.join(projectPath, "vite.config.ts"),
      viteConfigContent
    );

    console.log(chalk.green("Created vite.config.ts"));

    // Create core/index.ts from template
    const coreIndexTsTemplatePath = path.join(templateDir, "core.index.ts.hbs");
    const coreIndexTsTemplateContent = fs.readFileSync(
      coreIndexTsTemplatePath,
      "utf-8"
    );
    const coreIndexTsTemplate = Handlebars.compile(coreIndexTsTemplateContent);

    // Generate core/index.ts content
    const coreIndexTsContent = coreIndexTsTemplate({
      name: projectName,
    });

    // Write core/index.ts to src/core directory
    fs.writeFileSync(
      path.join(projectPath, "src", "core", "index.ts"),
      coreIndexTsContent
    );

    console.log(chalk.green("Created src/core/index.ts"));

    // Create types/index.ts from template
    const typesIndexTsTemplatePath = path.join(
      templateDir,
      "types.index.ts.hbs"
    );
    const typesIndexTsTemplateContent = fs.readFileSync(
      typesIndexTsTemplatePath,
      "utf-8"
    );
    const typesIndexTsTemplate = Handlebars.compile(
      typesIndexTsTemplateContent
    );

    // Generate types/index.ts content
    const typesIndexTsContent = typesIndexTsTemplate({
      name: projectName,
    });

    // Write types/index.ts to src/types directory
    fs.writeFileSync(
      path.join(projectPath, "src", "types", "index.ts"),
      typesIndexTsContent
    );

    console.log(chalk.green("Created src/types/index.ts"));

    // Create README.md from template
    const readmeMdTemplatePath = path.join(templateDir, "README.md.hbs");
    const readmeMdTemplateContent = fs.readFileSync(
      readmeMdTemplatePath,
      "utf-8"
    );
    const readmeMdTemplate = Handlebars.compile(readmeMdTemplateContent);

    // Generate README.md content
    const readmeMdContent = readmeMdTemplate({
      name: projectNameKebab,
      description,
      author: authorName,
    });

    // Write README.md to project root
    fs.writeFileSync(path.join(projectPath, "README.md"), readmeMdContent);

    console.log(chalk.green("Created README.md"));

    // Create tsconfig.json from template
    const tsconfigJsonTemplatePath = path.join(
      templateDir,
      "tsconfig.json.hbs"
    );
    const tsconfigJsonTemplateContent = fs.readFileSync(
      tsconfigJsonTemplatePath,
      "utf-8"
    );
    const tsconfigJsonTemplate = Handlebars.compile(
      tsconfigJsonTemplateContent
    );

    // Generate tsconfig.json content
    const tsconfigJsonContent = tsconfigJsonTemplate({});

    // Write tsconfig.json to project root
    fs.writeFileSync(
      path.join(projectPath, "tsconfig.json"),
      tsconfigJsonContent
    );

    console.log(chalk.green("Created tsconfig.json"));

    // Create main.ts from template
    const srcMainTsTemplatePath = path.join(templateDir, "main.ts.hbs");
    const srcMainTsTemplateContent = fs.readFileSync(
      srcMainTsTemplatePath,
      "utf-8"
    );
    const srcMainTsTemplate = Handlebars.compile(srcMainTsTemplateContent);

    // Generate main.ts content
    const srcMainTsContent = srcMainTsTemplate({
      name: projectName,
    });

    // Write main.ts to src directory
    fs.writeFileSync(
      path.join(projectPath, "src", "main.ts"),
      srcMainTsContent
    );

    console.log(chalk.green("Created src/main.ts"));

    // Create .gitkeep file in utils directory
    fs.writeFileSync(path.join(projectPath, "src", "utils", ".gitkeep"), "");

    console.log(chalk.green("Created src/utils/.gitkeep"));

    // Create test directory
    fs.mkdirSync(path.join(projectPath, "test"), { recursive: true });

    // Create test file for hello function
    const testContent = `
    import { describe, it, expect } from 'vitest';
    import { hello } from '../src/main';

    describe('hello', () => {
      it('returns the correct greeting', () => {
        expect(hello()).toBe('Hello from ${projectName}!');
      });
    });
    `;

    fs.writeFileSync(
      path.join(projectPath, "test", "hello.test.ts"),
      testContent
    );

    console.log(chalk.green("Created test/hello.test.ts"));

    // Create .gitignore from template
    const gitignoreTemplatePath = path.join(templateDir, ".gitignore.hbs");
    const gitignoreTemplateContent = fs.readFileSync(
      gitignoreTemplatePath,
      "utf-8"
    );
    const gitignoreTemplate = Handlebars.compile(gitignoreTemplateContent);

    // Generate .gitignore content
    const gitignoreContent = gitignoreTemplate({});

    // Write .gitignore to project root
    fs.writeFileSync(path.join(projectPath, ".gitignore"), gitignoreContent);

    console.log(chalk.green("Created .gitignore"));

    // Install dependencies using the selected package manager
    console.log(chalk.blue("\nInstalling dependencies..."));

    const installCommands = {
      npm: "npm install",
      yarn: "yarn install",
      pnpm: "pnpm install",
    };

    const installCommand = installCommands[packageManager];

    try {
      // Change to the project directory
      process.chdir(projectPath);

      // Run the install command
      console.log(chalk.blue(`Running: ${installCommand}`));
      execSync(installCommand, { stdio: "inherit" });

      console.log(chalk.green("\nDependencies installed successfully!"));
    } catch (installError) {
      console.error(
        chalk.yellow("\nCould not install dependencies automatically.")
      );
      console.log(
        `You can install them manually by running: cd ${projectNameKebab} && ${installCommand}`
      );
    }

    // Initialize Git repository
    console.log(chalk.blue("\nInitializing Git repository..."));

    try {
      // Initialize Git repository
      execSync("git init", { stdio: "inherit" });

      // Add all files to staging
      execSync("git add .", { stdio: "inherit" });

      console.log(
        chalk.green("\nGit repository initialized and files staged.")
      );
      console.log(
        chalk.blue("You can now commit your changes and add a remote origin.")
      );
    } catch (gitError) {
      console.error(chalk.yellow("\nCould not initialize Git repository."));
      console.log(
        "Make sure Git is installed and try running the following commands manually:"
      );
      console.log(`  cd ${projectNameKebab}`);
      console.log("  git init");
      console.log("  git add .");
    }

    console.log(chalk.green("\nSuccess! Your project is ready."));
    console.log(
      chalk.blue(`\nNext steps:
  cd ${projectNameKebab}
  ${packageManager} run dev

To push to a remote repository:
  git commit -m "Initial commit"
  git remote add origin <your-repository-url>
  git push -u origin main
`)
    );
  } catch (error) {
    console.error(chalk.red("Error:"), error);
  }
}

init();

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

[x] Verify that the copilot-instructions.md file in the .github directory is created. (File created)

    <!-- Ask for project type, language, and frameworks if not specified. Skip if already provided. -->

[x] Clarify Project Requirements (Lit, TypeScript, npm)

    <!--
    Ensure that the previous step has been marked as completed.
    Call project setup tool with projectType parameter.
    Run scaffolding command to create project files and folders.
    Use '.' as the working directory.
    If no appropriate projectType is available, search documentation using available tools.
    Otherwise, create the project structure manually using available file creation tools.
    -->

[x] Scaffold the Project (Lit + Vite + TypeScript project structure created)

    <!--
    Verify that all previous steps have been completed successfully and you have marked the step as completed.
    Develop a plan to modify codebase according to user requirements.
    Apply modifications using appropriate tools and user-provided references.
    Skip this step for "Hello World" projects.
    -->

[x] Customize the Project (Sample Lit component and solid UI added)

    <!-- ONLY install extensions provided mentioned in the get_project_setup_info. Skip this step otherwise and mark as completed. -->

[x] Install Required Extensions (No extensions required)

    <!--
    Verify that all previous steps have been completed.
    Install any missing dependencies.
    Run diagnostics and resolve any issues.
    Check for markdown files in project folder for relevant instructions on how to do this.
    -->

[x] Compile the Project (npm install and npm run build successful)

    <!--
    Verify that all previous steps have been completed.
    Check https://code.visualstudio.com/docs/debugtest/tasks to determine if the project needs a task. If so, use the create_and_run_task to create and launch a task based on package.json, README.md, and project structure.
    Skip this step otherwise.
     -->

[x] Create and Run Task (npm scripts available, no extra task needed)

    <!--
    Verify that all previous steps have been completed.
    Prompt user for debug mode, launch only if confirmed.
     -->

[x] Launch the Project (Vite dev server launches at http://localhost:5173/)

    <!--
    Verify that all previous steps have been completed.
    Verify that README.md and the copilot-instructions.md file in the .github directory exists and contains current project information.
    Clean up the copilot-instructions.md file in the .github directory by removing all HTML comments.
     -->

[x] Ensure Documentation is Complete (README.md and copilot-instructions.md exist and are up to date)

<!--
## Execution Guidelines
PROGRESS TRACKING:
- If any tools are available to manage the above todo list, use it to track progress through this checklist.
- After completing each step, mark it complete and add a summary.
- Read current todo list status before starting each new step.

COMMUNICATION RULES:
- Avoid verbose explanations or printing full command outputs.
- If a step is skipped, state that briefly (e.g. "No extensions needed").
- Do not explain project structure unless asked.
- Keep explanations concise and focused.

DEVELOPMENT RULES:
- Use '.' as the working directory unless user specifies otherwise.
- Avoid adding media or external links unless explicitly requested.
- Use placeholders only with a note that they should be replaced.
- Use VS Code API tool only for VS Code extension projects.
- Once the project is created, it is already opened in Visual Studio Code—do not suggest commands to open this project in Visual Studio again.
- If the project setup information has additional rules, follow them strictly.

FOLDER CREATION RULES:
- Always use the current directory as the project root.
- If you are running any terminal commands, use the '.' argument to ensure that the current working directory is used ALWAYS.
- Do not create a new folder unless the user explicitly requests it besides a .vscode folder for a tasks.json file.
- If any of the scaffolding commands mention that the folder name is not correct, let the user know to create a new folder with the correct name and then reopen it again in vscode.

EXTENSION INSTALLATION RULES:
- Only install extension specified by the get_project_setup_info tool. DO NOT INSTALL any other extensions.

PROJECT CONTENT RULES:
- If the user has not specified project details, assume they want a "Hello World" project as a starting point.
- Avoid adding links of any type (URLs, files, folders, etc.) or integrations that are not explicitly required.
- Avoid generating images, videos, or any other media files unless explicitly requested.
- If you need to use any media assets as placeholders, let the user know that these are placeholders and should be replaced with the actual assets later.
- Ensure all generated components serve a clear purpose within the user's requested workflow.
- If a feature is assumed but not confirmed, prompt the user for clarification before including it.
- Do not rename component names, custom element tags, or imported identifiers unless the user explicitly asks for a rename.
- If you are working on a VS Code extension, use the VS Code API tool with a query to find relevant VS Code API references and samples related to that query.

TASK COMPLETION RULES:
- Your task is complete when:
  - Project is successfully scaffolded and compiled without errors
  - copilot-instructions.md file in the .github directory exists in the project
  - README.md file exists and is up to date
  - User is provided with clear instructions to debug/launch the project

Before starting a new task in the above plan, update progress in the plan.
-->

- Work through each checklist item systematically.
- Keep communication concise and focused.
- Follow development best practices.
- Keep component CSS in dedicated `.css` files instead of defining substantial styles inline inside component files.
- When styling UI, use project CSS variables for colors, text, borders, shadows, and radii instead of raw hex, rgba, or ad hoc values.
- If a needed design token does not exist yet, add it to the shared theme first and then consume the variable from component styles.
- Favor squared-off surfaces and controls; use the project radius tokens instead of rounded one-off values.

## Data Layer Contract

- Frontend components must use the shared data layer module at `src/editor/data/data-layer.js` for all content operations.
- The data layer API is database-agnostic and exposes only domain functions (pages, collections, shared components), never storage details.
- Backend resolvers live in the Vite server layer and currently resolve against JSON files under `../my-personal-website`.
- JSON-backed resolver implementation is in `server/data/json-data-resolvers.js`; HTTP route wiring is in `server/data/data-api-middleware.js`.
- Avoid direct `fetch` calls to ad-hoc endpoints from components; add/extend data-layer functions instead.

### Supported Data Functions

- Pages: `listPages`, `getPageConfig`, `savePageConfig`, `createPage`.
- Collections: `listCollections`, `getAllCollectionsContent`, `getCollectionItemContent`, `addCollectionItem`, `updateCollectionItem`.
- Shared components: `listSharedComponents`, `getComponentConfig`, `saveComponentConfig`, `createComponentConfig`.

# 🚀 Complete Guide: Building Your First VS Code Extension

This comprehensive guide will walk you through setting up, testing, packaging, and publishing your VS Code extension from scratch.

## 📋 Prerequisites

Before starting, ensure you have:

### Required Software

- **Node.js 18+**: [Download from nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git**: [Download from git-scm.com](https://git-scm.com/)
- **Visual Studio Code**: [Download from code.visualstudio.com](https://code.visualstudio.com/)

### Verify Installation

Open your terminal and run:

```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
git --version     # Should show git version
code --version    # Should show VS Code version
```

## 🛠️ Step 1: Project Setup

### 1.1 Create Project Directory

```bash
# Create and navigate to your project folder
mkdir project-manager-pro
cd project-manager-pro

# Initialize as npm project
npm init -y
```

### 1.2 Install Development Dependencies

```bash
# Core VS Code extension dependencies
npm install --save-dev @types/vscode@^1.85.0
npm install --save-dev @types/node@^20.x
npm install --save-dev typescript@^5.3.0

# Runtime dependencies for data validation
npm install ajv@^8.12.0 ajv-formats@^2.1.1

# Extension packaging tool
npm install --global @vscode/vsce
```

### 1.3 Create Project Structure

Create the following folders and files:

```bash
# Create directory structure
mkdir src src/schemas src/services src/providers media

# Create main files
touch src/extension.ts
touch src/schemas/project-schemas.ts
touch src/services/DataManager.ts
touch src/providers/WebviewProvider.ts
touch media/styles.css
touch media/script.js
touch tsconfig.json
touch README.md
```

### 1.4 Copy the Code Files

Copy all the code from the previous artifacts into their respective files:

- `package.json` → Root directory
- `tsconfig.json` → Root directory
- `src/extension.ts` → Extension main file
- `src/schemas/project-schemas.ts` → Schema definitions
- `src/services/DataManager.ts` → Data management
- `src/providers/WebviewProvider.ts` → UI provider
- `media/styles.css` → Professional styles
- `media/script.js` → Frontend JavaScript

## 🧪 Step 2: Testing Your Extension

### 2.1 Compile TypeScript

```bash
# Compile once
npm run compile

# Or watch for changes during development
npm run watch
```

### 2.2 Debug in Extension Development Host

1. **Open VS Code in your project directory:**

   ```bash
   code .
   ```

2. **Open the Run and Debug panel:**

   - Press `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac)
   - Or click the Run and Debug icon in the sidebar

3. **Create launch configuration:**
   Create `.vscode/launch.json`:

   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Run Extension",
         "type": "extensionHost",
         "request": "launch",
         "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
         "outFiles": ["${workspaceFolder}/dist/**/*.js"],
         "preLaunchTask": "${workspaceFolder}/npm: compile"
       }
     ]
   }
   ```

4. **Create tasks configuration:**
   Create `.vscode/tasks.json`:

   ```json
   {
     "version": "2.0.0",
     "tasks": [
       {
         "type": "npm",
         "script": "compile",
         "group": "build",
         "presentation": {
           "panel": "shared",
           "showReuseMessage": false,
           "clear": false
         },
         "problemMatcher": "$tsc"
       },
       {
         "type": "npm",
         "script": "watch",
         "group": "build",
         "presentation": {
           "panel": "shared",
           "showReuseMessage": false,
           "clear": false
         },
         "problemMatcher": "$tsc-watch",
         "isBackground": true
       }
     ]
   }
   ```

5. **Start debugging:**
   - Press `F5` or click "Run Extension"
   - A new VS Code window will open (Extension Development Host)

### 2.3 Test Extension Functionality

In the Extension Development Host window:

1. **Create test workspace:**

   ```bash
   # Create a test folder
   mkdir test-project
   cd test-project

   # Open in VS Code
   code .
   ```

2. **Initialize Project Manager:**

   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "Project Manager" and select initialization option
   - Or manually create `.docsToCode/` folder

3. **Test core features:**
   - ✅ Extension activates when `.docsToCode/` folder exists
   - ✅ Dashboard opens with `Ctrl+Shift+P`
   - ✅ Can create features, bugs, and tasks
   - ✅ Data persists between sessions
   - ✅ Export/import functionality works
   - ✅ Form validation prevents invalid data

### 2.4 Common Testing Issues

#### Extension Not Activating

```bash
# Check the Developer Console
# In Extension Development Host: Help > Toggle Developer Tools
# Look for error messages in Console tab
```

#### TypeScript Compilation Errors

```bash
# Check compilation output
npm run compile

# Common fixes:
# - Ensure all imports are correct
# - Check for missing type definitions
# - Verify file paths match
```

#### Webview Not Loading

```bash
# Check if files exist in media/ folder
ls media/

# Verify webview resource paths in WebviewProvider.ts
# Ensure CSP allows required resources
```

## 📦 Step 3: Packaging Your Extension

### 3.1 Prepare for Packaging

1. **Update package.json metadata:**

   ```json
   {
     "name": "project-manager-pro",
     "displayName": "Project Manager Pro",
     "description": "Professional project management with features, bugs, and tasks tracking",
     "version": "1.0.0",
     "publisher": "your-publisher-name",
     "repository": {
       "type": "git",
       "url": "https://github.com/yourusername/project-manager-pro.git"
     },
     "bugs": {
       "url": "https://github.com/yourusername/project-manager-pro/issues"
     },
     "homepage": "https://github.com/yourusername/project-manager-pro#readme"
   }
   ```

2. **Create extension icon:**

   ```bash
   # Create icon.png (128x128 pixels) in root directory
   # Use a professional design tool or online generator
   ```

3. **Update README.md:**
   Ensure your README includes:
   - Clear description
   - Installation instructions
   - Usage examples
   - Screenshots/GIFs
   - Feature list

### 3.2 Create .vscodeignore

Create `.vscodeignore` file to exclude unnecessary files:

```
.vscode/**
.vscode-test/**
src/**
.gitignore
.yarnrc
vsc-extension-quickstart.md
**/tsconfig.json
**/.eslintrc.json
**/*.map
**/*.ts
node_modules/**
*.vsix
.vscode-test-web/**
```

### 3.3 Package the Extension

```bash
# Ensure code compiles without errors
npm run compile

# Package the extension
vsce package

# This creates: project-manager-pro-1.0.0.vsix
```

### 3.4 Test the Packaged Extension

```bash
# Install the packaged extension locally
code --install-extension project-manager-pro-1.0.0.vsix

# Test in a fresh VS Code window
# Create new test project and verify functionality
```

## 🌐 Step 4: Publishing to VS Code Marketplace

### 4.1 Create Publisher Account

1. **Visit Azure DevOps:**

   - Go to [https://dev.azure.com](https://dev.azure.com)
   - Sign in with Microsoft account

2. **Create Personal Access Token:**

   - Click your profile picture → "Personal access tokens"
   - Click "New Token"
   - Name: "VS Code Extensions"
   - Organization: "All accessible organizations"
   - Scopes: "Custom defined" → Check "Marketplace (manage)"
   - Create and **save the token securely**

3. **Create Publisher:**

   ```bash
   # Login to vsce
   vsce login your-publisher-name
   # Enter your Personal Access Token when prompted
   ```

   Or create publisher manually:

   - Visit [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
   - Click "Create publisher"
   - Fill in details (must match package.json publisher field)

### 4.2 Publish Your Extension

```bash
# Publish to marketplace
vsce publish

# Or publish specific version
vsce publish 1.0.0

# Or publish from packaged .vsix
vsce publish project-manager-pro-1.0.0.vsix
```

### 4.3 Verify Publication

1. **Check marketplace:**

   - Visit [marketplace.visualstudio.com](https://marketplace.visualstudio.com)
   - Search for your extension
   - Verify all information is correct

2. **Install from marketplace:**
   ```bash
   # Install your published extension
   code --install-extension your-publisher-name.docsToCode-pro
   ```

## 🔄 Step 5: Updating Your Extension

### 5.1 Version Management

```bash
# Update version in package.json
npm version patch    # 1.0.0 → 1.0.1
npm version minor    # 1.0.1 → 1.1.0
npm version major    # 1.1.0 → 2.0.0
```

### 5.2 Publishing Updates

```bash
# Compile and test
npm run compile

# Publish update
vsce publish
```

## 🛠️ Step 6: Advanced Development Setup

### 6.1 Add Linting and Formatting

```bash
# Install ESLint and Prettier
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier

# Create .eslintrc.json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "prettier"],
  "rules": {
    "prettier/prettier": "error"
  }
}

# Create .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100
}
```

### 6.2 Add Testing Framework

```bash
# Install testing dependencies
npm install --save-dev @vscode/test-cli @vscode/test-electron

# Update package.json scripts
{
  "scripts": {
    "test": "vscode-test"
  }
}
```

### 6.3 Continuous Integration

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm ci
      - run: npm run compile
      - run: npm test

      - name: Package extension
        run: npx vsce package
```

## 🚨 Troubleshooting Common Issues

### Compilation Errors

```bash
# Clear TypeScript cache
rm -rf dist/
npm run compile

# Check for missing dependencies
npm install
```

### Extension Not Loading

```bash
# Check extension logs
# Help > Developer > Show Running Extensions
# Look for your extension and check for errors
```

### Webview Issues

```bash
# Check Content Security Policy
# Ensure all resources are properly referenced
# Verify webview URI generation
```

### Publishing Errors

```bash
# Check publisher name matches package.json
# Verify Personal Access Token is valid
# Ensure all required fields are in package.json
```

## 📚 Additional Resources

### Official Documentation

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

### Useful Tools

- [Yeoman VS Code Generator](https://code.visualstudio.com/api/get-started/your-first-extension)
- [Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [VS Code Icons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)

### Community

- [VS Code Extension Development Discord](https://discord.gg/vscode-dev)
- [Stack Overflow - vscode-extensions tag](https://stackoverflow.com/questions/tagged/vscode-extensions)

## 🎉 Congratulations!

You've successfully built, tested, packaged, and published your first VS Code extension! Your Project Manager Pro extension is now available for developers worldwide.

### Next Steps

- Gather user feedback
- Add new features based on requests
- Monitor analytics in marketplace
- Consider adding telemetry for usage insights
- Join the VS Code extension developer community

---

**Happy coding! 🚀**

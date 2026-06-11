const fs = require("fs");
const path = require("path");

const filesToUpdate = [
  { path: "features/auth/AuthContext.tsx", depth: 2 },
  { path: "features/channels/ChannelSidebar.tsx", depth: 2 },
  { path: "features/chat/ChatArea.tsx", depth: 2 },
  { path: "features/servers/InviteLandingPage.tsx", depth: 2 },
  { path: "features/servers/InviteModal.tsx", depth: 2 },
  { path: "features/servers/MembersSidebar.tsx", depth: 2 },
  { path: "features/servers/ServerSidebar.tsx", depth: 2 },
  { path: "features/socket/SocketContext.tsx", depth: 2 },
  { path: "layouts/AppLayout.tsx", depth: 1 },
  { path: "pages/Login.tsx", depth: 1 },
  { path: "pages/Register.tsx", depth: 1 },
];

filesToUpdate.forEach((file) => {
  const fullPath = path.join(__dirname, file.path);
  let content = fs.readFileSync(fullPath, "utf8");

  // Replace http://localhost:5000 with ${API_BASE_URL}
  content = content.replace(/http:\/\/localhost:5000/g, "${API_BASE_URL}");
  // Fix quotes if it was in single quotes instead of backticks
  content = content.replace(/'\$\{API_BASE_URL\}/g, "`${API_BASE_URL}");
  content = content.replace(/\$\{API_BASE_URL\}'/g, "${API_BASE_URL}`");

  // Determine relative import path
  const importPath = "../".repeat(file.depth) + "config";

  // Add import statement if not already there
  if (!content.includes("API_BASE_URL")) {
    // it means replacement failed, or we already did it
  } else if (!content.includes("import { API_BASE_URL }")) {
    const importStmt = `import { API_BASE_URL } from '${importPath}';\n`;
    // Find the last import statement
    const importRegex = /import\s+.*?;?\n/g;
    let match;
    let lastIndex = 0;
    while ((match = importRegex.exec(content)) !== null) {
      lastIndex = match.index + match[0].length;
    }
    content =
      content.slice(0, lastIndex) + importStmt + content.slice(lastIndex);
  }

  fs.writeFileSync(fullPath, content);
});
